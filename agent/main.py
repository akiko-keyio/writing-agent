"""Writing Agent WebSocket server on port 8765."""

from __future__ import annotations

import asyncio
import json
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import websockets
from dotenv import load_dotenv

from config import config
from connection import Connection
from handler import (
    error_event,
    handle_message_events,
    new_request_id,
    parse_json_message,
    run_chat_turn,
)
from session_store import SessionStore

SESSION_STORE = SessionStore()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def load_env() -> None:
    """Reload .env (config module loads it on first import; safe to call again)."""
    root = Path(__file__).resolve().parent.parent
    load_dotenv(root / ".env", override=True)
    load_dotenv(override=True)


@dataclass
class ActiveTurn:
    """Tracks the single in-flight chat turn for a connection (MVP: one at a time)."""

    task: asyncio.Task | None = None
    request_id: str | None = None
    cancel_event: asyncio.Event | None = None

    def is_running(self) -> bool:
        return self.task is not None and not self.task.done()

    def reset(self) -> None:
        self.task = None
        self.request_id = None
        self.cancel_event = None


@dataclass
class _Sender:
    """Serializes websocket sends across the loop and the turn task."""

    websocket: Any
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)

    async def send(self, msg: dict[str, Any]) -> None:
        async with self.lock:
            await self.websocket.send(json.dumps(msg, ensure_ascii=False))


async def serve_connection(conn: Connection, websocket: Any) -> None:
    """Per-connection loop: chat turns run as cancellable tasks while the loop
    keeps reading control frames (e.g. ``chat/cancel``)."""
    sender = _Sender(websocket=websocket)
    turn = ActiveTurn()

    async def _run_turn(raw: dict[str, Any], request_id: str, cancel_event: asyncio.Event) -> None:
        try:
            async for event in run_chat_turn(
                conn, raw, request_id=request_id, cancel_event=cancel_event
            ):
                await sender.send(event)
        except asyncio.CancelledError:
            await sender.send(
                {
                    "type": "chat/stream_end",
                    "stream_id": "",
                    "text": "",
                    "cancelled": True,
                    "request_id": request_id,
                }
            )
            raise
        except Exception:
            logger.exception("Chat turn failed")
            await sender.send(
                error_event(
                    "The writing agent could not complete your request.",
                    code="model_error",
                    request_id=request_id,
                )
            )
        finally:
            if turn.request_id == request_id:
                turn.reset()

    async for message in websocket:
        raw = parse_json_message(message)
        if raw is None:
            await sender.send(error_event("Invalid message format", code="invalid_json"))
            continue

        mtype = raw.get("type")

        if mtype == "chat/message":
            request_id = raw.get("request_id")
            if not isinstance(request_id, str) or not request_id.strip():
                request_id = new_request_id()
            if turn.is_running():
                await sender.send(
                    error_event(
                        "A chat turn is already in progress.",
                        code="turn_in_progress",
                        request_id=request_id,
                    )
                )
                continue
            cancel_event = asyncio.Event()
            turn.request_id = request_id
            turn.cancel_event = cancel_event
            turn.task = asyncio.create_task(_run_turn(raw, request_id, cancel_event))
            continue

        if mtype == "chat/cancel":
            target = raw.get("request_id")
            active_id = turn.request_id
            should_cancel = (
                turn.cancel_event is not None
                and (not isinstance(target, str) or not target or target == active_id)
            )
            if should_cancel and turn.cancel_event is not None:
                turn.cancel_event.set()
            await sender.send(
                {
                    "type": "chat/cancelled",
                    "request_id": active_id if should_cancel else target,
                }
            )
            continue

        # Fast control routes run inline (and may interleave with a live turn).
        async for resp in handle_message_events(conn, raw):
            await sender.send(resp)

    if turn.is_running() and turn.task is not None:
        turn.task.cancel()
        try:
            await turn.task
        except (asyncio.CancelledError, Exception):
            pass


async def connection_handler(websocket: websockets.ServerConnection) -> None:
    conn = Connection.create(SESSION_STORE)
    logger.info("Client connected from %s", websocket.remote_address)
    try:
        await serve_connection(conn, websocket)
    except websockets.ConnectionClosed:
        logger.info("Client disconnected")
    except Exception:
        logger.exception("Connection error")


def validate_env() -> None:
    if not config.openai_api_key or config.openai_api_key == "sk-your-key-here":
        logger.warning(
            "OPENAI_API_KEY is missing or still the placeholder — "
            "copy .env.example to .env at repo root and set your key"
        )
    else:
        logger.info("Strands + OpenAI model: %s", config.openai_model)


async def main_async() -> None:
    load_env()
    validate_env()
    async with websockets.serve(connection_handler, config.host, config.port):
        logger.info("Writing Agent listening on ws://%s:%s", config.host, config.port)
        await asyncio.Future()


def main() -> None:
    asyncio.run(main_async())


if __name__ == "__main__":
    main()

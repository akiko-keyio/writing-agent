"""Writing Agent WebSocket server on port 8765."""

from __future__ import annotations

import asyncio
import json
import logging
from pathlib import Path

import websockets
from dotenv import load_dotenv

from config import config
from connection import Connection
from handler import handle_message_events, parse_json_message
from session_store import SessionStore

SESSION_STORE = SessionStore()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def load_env() -> None:
    """Reload .env (config module loads it on first import; safe to call again)."""
    root = Path(__file__).resolve().parent.parent
    load_dotenv(root / ".env", override=True)
    load_dotenv(override=True)


async def connection_handler(websocket: websockets.ServerConnection) -> None:
    conn = Connection.create(SESSION_STORE)
    logger.info("Client connected from %s", websocket.remote_address)

    try:
        async for message in websocket:
            raw = parse_json_message(message)
            if raw is None:
                await websocket.send(
                    json.dumps({
                        "type": "error",
                        "message": "Invalid message format",
                    })
                )
                continue

            async for resp in handle_message_events(conn, raw):
                await websocket.send(json.dumps(resp, ensure_ascii=False))
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

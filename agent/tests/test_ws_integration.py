"""Optional live WebSocket smoke test (run server on :8765 first, or auto-skip)."""

from __future__ import annotations

import asyncio
import json
import os

import pytest
import websockets

from config import config

_DEFAULT_WS = f"ws://{config.host}:{config.port}"
# Prefer repo .env WS_PORT; only override when WRITING_AGENT_WS_URL is explicitly set.
WS_URL = os.getenv("WRITING_AGENT_WS_URL") or _DEFAULT_WS


async def _recv_until(types: set[str], ws: websockets.ClientConnection, limit: int = 8):
    seen: list[dict] = []
    for _ in range(limit):
        raw = await asyncio.wait_for(ws.recv(), timeout=5)
        msg = json.loads(raw)
        seen.append(msg)
        if msg.get("type") in types:
            return msg, seen
    raise AssertionError(f"Expected one of {types}, got {seen}")


async def _ws_session_lifecycle() -> None:
    async with websockets.connect(WS_URL) as ws:
            await ws.send(json.dumps({"type": "session/list"}))
            msg, _ = await _recv_until({"session/list"}, ws)
            assert "sessions" in msg

            await ws.send(json.dumps({"type": "session/create"}))
            msg, _ = await _recv_until({"session/created"}, ws)
            session_id = msg["session_id"]

            await ws.send(
                json.dumps(
                    {
                        "type": "document/open",
                        "path": "examples/test.md",
                        "document": "# Test\n",
                    },
                ),
            )
            await ws.send(json.dumps({"type": "session/clear"}))
            msg, _ = await _recv_until({"session/cleared"}, ws)
            assert msg["type"] == "session/cleared"
            assert msg.get("session_id") == session_id

            await ws.send(
                json.dumps({"type": "session/switch", "session_id": session_id}),
            )
            msg, _ = await _recv_until({"session/restored"}, ws)
            assert msg["session_id"] == session_id


async def _ws_chat_turn() -> None:
    async with websockets.connect(WS_URL) as ws:
        await ws.send(json.dumps({"type": "session/create"}))
        await _recv_until({"session/created"}, ws)

        await ws.send(
            json.dumps(
                {
                    "type": "document/open",
                    "path": "examples/test-text.md",
                    "document": "Hello from buffer.\n",
                },
            ),
        )
        await ws.send(
            json.dumps(
                {
                    "type": "chat/message",
                    "text": "Reply with exactly: pong",
                    "context": {
                        "active_path": "examples/test-text.md",
                        "buffer_snapshot": "Hello from buffer.\n",
                    },
                },
            ),
        )
        end, seen = await _recv_until({"chat/stream_end", "error"}, ws, limit=64)
        assert end["type"] == "chat/stream_end", seen
        assert end.get("text")


@pytest.mark.integration
def test_ws_session_lifecycle() -> None:
    try:
        asyncio.run(_ws_session_lifecycle())
    except (OSError, asyncio.TimeoutError, websockets.exceptions.WebSocketException):
        pytest.skip(f"WebSocket server not available at {WS_URL}")


@pytest.mark.integration
def test_ws_chat_turn() -> None:
    if not config.openai_api_key or config.openai_api_key == "sk-your-key-here":
        pytest.skip("OPENAI_API_KEY not configured in repo root .env")
    try:
        asyncio.run(_ws_chat_turn())
    except (OSError, asyncio.TimeoutError, websockets.exceptions.WebSocketException):
        pytest.skip(f"WebSocket server not available at {WS_URL}")

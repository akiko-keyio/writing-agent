"""Phase 1: request_id threading + cancellable turn lifecycle + typed errors."""

from __future__ import annotations

import asyncio
import json
from pathlib import Path

import pytest

from writing_agent.server.connection import Connection
from fakes import FakeModel, FakeToolCall, FakeTurn, fake_model_factory
from writing_agent.server.handler import error_event, handle_message_events, run_chat_turn
from writing_agent.server.main import serve_connection
from writing_agent.domain.session_store import SessionStore
from writing_agent.runtime.strands_runner import WritingAgentRunner


@pytest.fixture(autouse=True)
def _models(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("writing_agent.runtime.model_manager._MODELS_FILE", tmp_path / "models.yaml")


def _fake_conn(turns: list[FakeTurn], *, gate: asyncio.Event | None = None) -> Connection:
    store = SessionStore()
    conn = Connection.create(store)
    conn.runner = WritingAgentRunner(model=FakeModel(turns, gate=gate))
    conn.current_session_id = store.create_empty()
    return conn


async def _collect(conn: Connection, raw: dict) -> list[dict]:
    return [e async for e in handle_message_events(conn, raw)]


# ---- request_id threading -------------------------------------------------

def test_chat_message_carries_request_id() -> None:
    conn = _fake_conn([FakeTurn(text="hello")])
    events = asyncio.run(
        _collect(conn, {"type": "chat/message", "text": "hi", "request_id": "rid-1"}),
    )
    chat_events = [e for e in events if str(e["type"]).startswith("chat/")]
    assert chat_events
    assert all(e.get("request_id") == "rid-1" for e in chat_events)
    assert any(e["type"] == "chat/stream_start" for e in chat_events)
    assert any(e["type"] == "chat/stream_end" for e in chat_events)


def test_request_id_generated_when_absent() -> None:
    conn = _fake_conn([FakeTurn(text="hello")])
    events = asyncio.run(_collect(conn, {"type": "chat/message", "text": "hi"}))
    start = next(e for e in events if e["type"] == "chat/stream_start")
    assert isinstance(start.get("request_id"), str)
    assert start["request_id"].startswith("req-")


def test_tool_events_retain_request_id() -> None:
    conn = _fake_conn(
        [
            FakeTurn(tool_calls=[FakeToolCall(name="read_document", tool_input={"path": "a.md"})]),
            FakeTurn(text="done"),
        ],
    )
    conn.session.open_buffers["a.md"] = "buffer body"
    events = asyncio.run(
        _collect(conn, {"type": "chat/message", "text": "read it", "request_id": "rid-2"}),
    )
    tool_updates = [e for e in events if e["type"] == "chat/tool_update"]
    assert tool_updates, events
    assert all(e.get("request_id") == "rid-2" for e in tool_updates)


def test_empty_message_error_carries_request_id() -> None:
    conn = _fake_conn([FakeTurn(text="x")])
    events = []

    async def _go():
        async for e in run_chat_turn(conn, {"type": "chat/message", "text": "  "}, request_id="rid-3"):
            events.append(e)

    asyncio.run(_go())
    assert len(events) == 1
    assert events[0]["type"] == "error"
    assert events[0]["code"] == "empty_message"
    assert events[0]["request_id"] == "rid-3"


# ---- runner-level cancellation (deterministic) ----------------------------

def test_runner_cancel_event_emits_cancelled_end() -> None:
    conn = _fake_conn([FakeTurn(text="should not be forwarded")])
    cancel = asyncio.Event()
    cancel.set()  # cancelled before streaming begins

    async def _go():
        out = []
        async for e in conn.runner.chat_turn_stream(
            conn.session, "hi", request_id="rid", cancel_event=cancel,
        ):
            out.append(e)
        return out

    events = asyncio.run(_go())
    types = [e["type"] for e in events]
    assert types[0] == "chat/stream_start"
    end = next(e for e in events if e["type"] == "chat/stream_end")
    assert end.get("cancelled") is True
    # No text delta forwarded after cancellation.
    assert not any(e["type"] == "chat/message_delta" for e in events)


# ---- typed errors ---------------------------------------------------------

def test_unknown_message_returns_typed_error() -> None:
    conn = _fake_conn([FakeTurn(text="x")])
    events = asyncio.run(_collect(conn, {"type": "no/such/route"}))
    assert events == [error_event("Unknown message type", code="unknown_message")]


# ---- connection-loop concurrency -----------------------------------------

class FakeWebSocket:
    """Minimal websocket double: async-iterable inbound queue + recorded sends."""

    _STOP = object()

    def __init__(self) -> None:
        self._inbound: asyncio.Queue = asyncio.Queue()
        self.sent: list[dict] = []
        self.remote_address = ("test", 0)

    def feed(self, msg: dict) -> None:
        self._inbound.put_nowait(json.dumps(msg))

    def feed_raw(self, raw: str) -> None:
        self._inbound.put_nowait(raw)

    def close_inbound(self) -> None:
        self._inbound.put_nowait(self._STOP)

    def __aiter__(self) -> "FakeWebSocket":
        return self

    async def __anext__(self) -> str:
        item = await self._inbound.get()
        if item is self._STOP:
            raise StopAsyncIteration
        return item

    async def send(self, data: str) -> None:
        self.sent.append(json.loads(data))


async def _wait_for(pred, timeout: float = 5.0) -> None:
    loop = asyncio.get_running_loop()
    deadline = loop.time() + timeout
    while loop.time() < deadline:
        if pred():
            return
        await asyncio.sleep(0.01)
    raise AssertionError("condition not met in time")


def test_connection_processes_cancel_while_streaming() -> None:
    async def _go():
        gate = asyncio.Event()
        conn = _fake_conn([FakeTurn(text="late text")], gate=gate)
        ws = FakeWebSocket()
        serve = asyncio.create_task(serve_connection(conn, ws))

        ws.feed({"type": "chat/message", "text": "go", "request_id": "r1"})
        await _wait_for(lambda: any(m.get("type") == "chat/stream_start" for m in ws.sent))

        # The model is gated (mid-stream); cancel must still be processed.
        ws.feed({"type": "chat/cancel", "request_id": "r1"})
        await _wait_for(lambda: any(m.get("type") == "chat/cancelled" for m in ws.sent))

        # Release the model; runner observes cancellation and ends cancelled.
        gate.set()
        await _wait_for(
            lambda: any(
                m.get("type") == "chat/stream_end" and m.get("cancelled") for m in ws.sent
            ),
        )

        ws.close_inbound()
        await asyncio.wait_for(serve, timeout=5)
        return ws.sent

    sent = asyncio.run(_go())
    cancelled_ack = next(m for m in sent if m["type"] == "chat/cancelled")
    assert cancelled_ack["request_id"] == "r1"
    end = next(m for m in sent if m["type"] == "chat/stream_end" and m.get("cancelled"))
    assert end["request_id"] == "r1"
    # No real text delta forwarded after cancellation.
    assert not any(m.get("type") == "chat/message_delta" for m in sent)


def test_connection_rejects_second_turn_while_active() -> None:
    async def _go():
        gate = asyncio.Event()
        conn = _fake_conn([FakeTurn(text="first")], gate=gate)
        ws = FakeWebSocket()
        serve = asyncio.create_task(serve_connection(conn, ws))

        ws.feed({"type": "chat/message", "text": "one", "request_id": "a"})
        await _wait_for(lambda: any(m.get("type") == "chat/stream_start" for m in ws.sent))
        ws.feed({"type": "chat/message", "text": "two", "request_id": "b"})
        await _wait_for(
            lambda: any(m.get("code") == "turn_in_progress" for m in ws.sent),
        )

        gate.set()
        ws.close_inbound()
        await asyncio.wait_for(serve, timeout=5)
        return ws.sent

    sent = asyncio.run(_go())
    rejected = next(m for m in sent if m.get("code") == "turn_in_progress")
    assert rejected["request_id"] == "b"


def test_connection_invalid_json_returns_error() -> None:
    async def _go():
        conn = _fake_conn([FakeTurn(text="x")])
        ws = FakeWebSocket()
        serve = asyncio.create_task(serve_connection(conn, ws))
        ws.feed_raw("{not json")
        await _wait_for(lambda: any(m.get("code") == "invalid_json" for m in ws.sent))
        ws.close_inbound()
        await asyncio.wait_for(serve, timeout=5)
        return ws.sent

    sent = asyncio.run(_go())
    assert any(m["type"] == "error" and m["code"] == "invalid_json" for m in sent)

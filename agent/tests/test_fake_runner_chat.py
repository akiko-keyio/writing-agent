"""Fake-model chat turn: proves the runner streams without a live model and
that the legacy auto-patch path no longer emits document/patch."""

from __future__ import annotations

import asyncio
from pathlib import Path

import pytest

from connection import Connection
from fakes import FakeTurn, fake_model_factory
from handler import handle_message_events
from memory_store import KIND_PRINCIPLE, MemoryEntry
from session_store import SessionStore
from strands_runner import WritingAgentRunner


async def _collect(conn: Connection, raw: dict) -> list[dict]:
    out: list[dict] = []
    async for event in handle_message_events(conn, raw):
        out.append(event)
    return out


@pytest.fixture(autouse=True)
def _isolated_models(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("model_manager._MODELS_FILE", tmp_path / "models.yaml")


def _fake_conn(turns: list[FakeTurn]) -> tuple[Connection, SessionStore]:
    store = SessionStore()
    conn = Connection.create(store)
    conn.runner = WritingAgentRunner(model_factory=fake_model_factory(turns))
    conn.current_session_id = store.create_empty()
    return conn, store


def test_fake_chat_turn_streams_text() -> None:
    conn, store = _fake_conn([FakeTurn(text="hello world")])
    events = asyncio.run(_collect(conn, {"type": "chat/message", "text": "hi"}))
    types = [e["type"] for e in events]
    assert "chat/stream_start" in types
    assert "chat/stream_end" in types
    end = next(e for e in events if e["type"] == "chat/stream_end")
    assert "hello world" in end["text"]


def test_first_chat_turn_emits_session_title_before_stream() -> None:
    conn, store = _fake_conn([FakeTurn(text="Sure, I can help.")])
    events = asyncio.run(
        _collect(conn, {"type": "chat/message", "text": "Polish the intro"}),
    )
    updated = [e for e in events if e.get("type") == "session/title_updated"]
    assert len(updated) == 1
    assert updated[0]["title"] == "Polish the intro"
    title_idx = events.index(updated[0])
    stream_start_idx = next(
        i for i, e in enumerate(events) if e.get("type") == "chat/stream_start"
    )
    assert title_idx < stream_start_idx
    snap = store.load(conn.current_session_id)
    assert snap is not None
    assert snap.title == "Polish the intro"


def test_chat_turn_never_emits_document_patch() -> None:
    conn, _ = _fake_conn([FakeTurn(text="done")])
    # Even with stale legacy state populated, no document/patch must be emitted.
    conn.session.open_buffers["a.md"] = "old"
    conn.session.active_path = "a.md"
    conn.session.pending_replacements.append({"old": "old", "new": "new"})

    events = asyncio.run(_collect(conn, {"type": "chat/message", "text": "edit it"}))
    types = [e["type"] for e in events]
    assert "document/patch" not in types
    assert conn.session.pending_replacements == []


def test_chat_turn_injects_enabled_memory_into_prompt() -> None:
    conn, _ = _fake_conn([FakeTurn(text="I will follow that preference.")])
    conn.session.open_buffers["doc.md"] = "# Draft\n"
    conn.session.active_path = "doc.md"
    conn.memory_store.add(
        MemoryEntry(
            id="",
            kind=KIND_PRINCIPLE,
            scope="global",
            content="Prefer active voice.",
        ),
    )

    asyncio.run(_collect(conn, {"type": "chat/message", "text": "Revise this."}))

    user_prompt = conn.runner.messages[0]["content"][0]["text"]
    assert "Relevant writing memory" in user_prompt
    assert "Prefer active voice." in user_prompt


def test_chat_turn_omits_disabled_memory_from_prompt() -> None:
    conn, _ = _fake_conn([FakeTurn(text="No memory used.")])
    conn.session.open_buffers["doc.md"] = "# Draft\n"
    conn.session.active_path = "doc.md"
    conn.memory_store.add(
        MemoryEntry(
            id="",
            kind=KIND_PRINCIPLE,
            scope="global",
            content="Prefer active voice.",
        ),
    )
    conn.memory_store.set_enabled(False)

    asyncio.run(_collect(conn, {"type": "chat/message", "text": "Revise this."}))

    user_prompt = conn.runner.messages[0]["content"][0]["text"]
    assert "Relevant writing memory" not in user_prompt
    assert "Prefer active voice." not in user_prompt

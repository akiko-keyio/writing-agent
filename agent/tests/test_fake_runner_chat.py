"""Fake-model chat turn: proves the runner streams without a live model and
that the legacy auto-patch path no longer emits document/patch."""

from __future__ import annotations

import asyncio
from pathlib import Path

import pytest

from connection import Connection
from fakes import FakeTurn, fake_model_factory
from handler import handle_message_events
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
    conn, _ = _fake_conn([FakeTurn(text="hello world")])
    events = asyncio.run(_collect(conn, {"type": "chat/message", "text": "hi"}))
    types = [e["type"] for e in events]
    assert "chat/stream_start" in types
    assert "chat/stream_end" in types
    end = next(e for e in events if e["type"] == "chat/stream_end")
    assert "hello world" in end["text"]


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

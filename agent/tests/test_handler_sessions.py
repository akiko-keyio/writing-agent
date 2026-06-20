"""Handler routing tests (no WebSocket server or LLM)."""

from __future__ import annotations

import asyncio
from pathlib import Path

from writing_agent.server.connection import Connection
from writing_agent.server.handler import _apply_chat_context_buffers, handle_message_events
from writing_agent.server.protocol import SessionState
from writing_agent.domain.session_store import SessionStore


async def _collect(conn: Connection, raw: dict) -> list[dict]:
    out: list[dict] = []
    async for event in handle_message_events(conn, raw):
        out.append(event)
    return out


def test_session_clear_yields_cleared() -> None:
    store = SessionStore()
    conn = Connection.create(store)
    conn.current_session_id = store.create_empty()
    conn.runner.restore_conversation([{"role": "user", "text": "Hi"}])
    conn.session.open_buffers["draft.md"] = "# Draft"

    events = asyncio.run(_collect(conn, {"type": "session/clear"}))

    assert len(events) == 1
    assert events[0]["type"] == "session/cleared"
    assert events[0]["session_id"] == conn.current_session_id
    assert events[0]["messages"] == []
    assert conn.runner.messages == []
    assert conn.session.open_buffers == {}
    snap = store.load(conn.current_session_id)
    assert snap is not None
    assert snap.messages == []


def test_document_open_sets_buffers() -> None:
    store = SessionStore()
    conn = Connection.create(store)

    asyncio.run(
        _collect(
            conn,
            {
                "type": "document/open",
                "path": "notes/a.md",
                "document": "old",
            },
        ),
    )
    assert conn.session.open_buffers["notes/a.md"] == "old"
    assert conn.session.active_path == "notes/a.md"


def test_chat_context_buffer_snapshot() -> None:
    session = SessionState()
    session.open_buffers["notes/a.md"] = "old"
    _apply_chat_context_buffers(
        session,
        {"active_path": "notes/a.md", "buffer_snapshot": "fresh"},
    )
    assert session.open_buffers["notes/a.md"] == "fresh"
    assert session.active_path == "notes/a.md"


def test_session_switch_restores_buffers() -> None:
    store = SessionStore()
    conn = Connection.create(store)
    sid = store.create_empty()
    conn.current_session_id = sid
    conn.session.open_buffers["x.md"] = "buffered"
    conn.session.active_path = "x.md"
    conn.runner.restore_conversation([{"role": "user", "text": "Remember"}])
    store.save(sid, conn.runner, conn.session, title="Remember")

    other = store.create_empty()
    conn.current_session_id = other
    conn.session.clear_buffers()
    conn.runner.clear_conversation()

    events = asyncio.run(
        _collect(conn, {"type": "session/switch", "session_id": sid}),
    )
    assert events[0]["type"] == "session/restored"
    assert conn.session.open_buffers["x.md"] == "buffered"
    assert len(conn.runner.messages) == 1


def test_workspace_switch_scopes_session_list(tmp_path: Path) -> None:
    store = SessionStore()
    conn = Connection.create(store)
    default_root = conn.project_root

    created = asyncio.run(_collect(conn, {"type": "session/create"}))
    default_sid = created[0]["session_id"]

    other_root = tmp_path / "paper"
    other_root.mkdir()
    switched = asyncio.run(
        _collect(
            conn,
            {
                "type": "workspace/switch",
                "project_root": str(other_root),
                "display_name": "paper",
            },
        ),
    )
    assert switched[0]["type"] == "workspace/switched"
    assert switched[0]["sessions"] == []
    assert conn.project_root == other_root

    listed = asyncio.run(_collect(conn, {"type": "session/list"}))
    assert listed[0]["sessions"] == []

    created_other = asyncio.run(_collect(conn, {"type": "session/create"}))
    other_sid = created_other[0]["session_id"]
    assert other_sid != default_sid

    asyncio.run(
        _collect(
            conn,
            {
                "type": "workspace/switch",
                "project_root": str(default_root),
                "display_name": "Examples",
            },
        ),
    )
    listed_default = asyncio.run(_collect(conn, {"type": "session/list"}))
    assert [s["session_id"] for s in listed_default[0]["sessions"]] == [default_sid]


def test_session_switch_rejects_other_workspace_session(tmp_path: Path) -> None:
    store = SessionStore()
    conn = Connection.create(store)

    created = asyncio.run(_collect(conn, {"type": "session/create"}))
    default_sid = created[0]["session_id"]

    other_root = tmp_path / "other"
    other_root.mkdir()
    asyncio.run(
        _collect(
            conn,
            {
                "type": "workspace/switch",
                "project_root": str(other_root),
                "display_name": "other",
            },
        ),
    )

    events = asyncio.run(
        _collect(conn, {"type": "session/switch", "session_id": default_sid}),
    )
    assert events[0]["type"] == "error"
    assert events[0]["message"] == "Session not found"

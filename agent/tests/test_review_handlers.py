"""Phase 4: review/group + document/save WebSocket routes (no LLM)."""

from __future__ import annotations

import asyncio
from pathlib import Path

import pytest

from connection import Connection
from handler import handle_message_events
from session_store import SessionStore

DOC = "# Title\n\nWe utilize the API.\n\nFinal line.\n"


@pytest.fixture(autouse=True)
def _models(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("model_manager._MODELS_FILE", tmp_path / "models.yaml")


async def _collect(conn: Connection, raw: dict) -> list[dict]:
    return [e async for e in handle_message_events(conn, raw)]


def _conn(tmp_path: Path) -> Connection:
    store = SessionStore()
    conn = Connection.create(store)
    # Point the edit service at the test workspace.
    from edit_group_service import EditGroupService
    from edit_group_store import EditGroupStore

    conn.project_root = tmp_path
    conn.edit_service = EditGroupService(project_root=tmp_path, store=EditGroupStore())
    conn.current_session_id = store.create_empty()
    conn.session.open_buffers["doc.md"] = DOC
    conn.session.active_path = "doc.md"
    return conn


def _propose(conn: Connection) -> dict:
    events = asyncio.run(
        _collect(
            conn,
            {
                "type": "group/propose",
                "path": "doc.md",
                "title": "Tighten wording",
                "edits": [{"kind": "replace", "old_text": "utilize", "new_text": "use"}],
            },
        ),
    )
    assert events[0]["type"] == "group/propose"
    return events[0]["group"]


def test_group_propose_validates_and_returns_group(tmp_path: Path) -> None:
    conn = _conn(tmp_path)
    group = _propose(conn)
    assert group["path"] == "doc.md"
    assert group["status"] == "proposed"
    assert group["edits"][0]["old_text"] == "utilize"


def test_group_propose_invalid_returns_error(tmp_path: Path) -> None:
    conn = _conn(tmp_path)
    events = asyncio.run(
        _collect(
            conn,
            {
                "type": "group/propose",
                "path": "doc.md",
                "edits": [{"kind": "replace", "old_text": "missing-text", "new_text": "x"}],
            },
        ),
    )
    assert events[0]["type"] == "error"
    assert events[0]["code"] == "invalid_group"


def test_group_apply_updates_buffer(tmp_path: Path) -> None:
    conn = _conn(tmp_path)
    group = _propose(conn)
    events = asyncio.run(_collect(conn, {"type": "group/apply", "group_id": group["id"]}))
    types = [e["type"] for e in events]
    assert "group/update" in types
    assert "document/buffer" in types
    update = next(e for e in events if e["type"] == "group/update")
    assert update["group"]["status"] == "applied"
    buf = next(e for e in events if e["type"] == "document/buffer")
    assert "use the API" in buf["document"]
    assert "use the API" in conn.session.open_buffers["doc.md"]


def test_group_reject_and_delete(tmp_path: Path) -> None:
    conn = _conn(tmp_path)
    group = _propose(conn)
    rej = asyncio.run(_collect(conn, {"type": "group/reject", "group_id": group["id"]}))
    assert rej[0]["group"]["status"] == "rejected"

    group2 = _propose(conn)
    dele = asyncio.run(_collect(conn, {"type": "group/delete", "group_id": group2["id"]}))
    assert dele[0]["group"]["status"] == "deleted"


def test_group_state_lists_session_groups(tmp_path: Path) -> None:
    conn = _conn(tmp_path)
    _propose(conn)
    events = asyncio.run(_collect(conn, {"type": "group/state"}))
    assert events[0]["type"] == "group/state"
    assert events[0]["session_id"] == conn.current_session_id
    assert len(events[0]["groups"]) == 1


def test_document_save_writes_disk_atomically(tmp_path: Path) -> None:
    conn = _conn(tmp_path)
    group = _propose(conn)
    asyncio.run(_collect(conn, {"type": "group/apply", "group_id": group["id"]}))
    events = asyncio.run(_collect(conn, {"type": "document/save", "path": "doc.md"}))
    assert events[0]["type"] == "document/saved"
    assert events[0]["ok"] is True
    saved = (tmp_path / "doc.md").read_text(encoding="utf-8")
    assert "use the API" in saved


def test_document_save_rejects_path_traversal(tmp_path: Path) -> None:
    conn = _conn(tmp_path)
    events = asyncio.run(_collect(conn, {"type": "document/save", "path": "../escape.md"}))
    assert events[0]["type"] == "error"
    assert events[0]["code"] == "invalid_path"


def test_document_save_requires_open_buffer(tmp_path: Path) -> None:
    conn = _conn(tmp_path)
    events = asyncio.run(_collect(conn, {"type": "document/save", "path": "other.md"}))
    assert events[0]["type"] == "error"
    assert events[0]["code"] == "no_buffer"


def test_session_switch_emits_group_state(tmp_path: Path) -> None:
    conn = _conn(tmp_path)
    sid = conn.current_session_id
    _propose(conn)
    # Persist current session, switch away, then back.
    conn.session_store.save(sid, conn.runner, conn.session, title="t")
    other = conn.session_store.create_empty()
    asyncio.run(_collect(conn, {"type": "session/switch", "session_id": other}))
    events = asyncio.run(_collect(conn, {"type": "session/switch", "session_id": sid}))
    types = [e["type"] for e in events]
    assert "session/restored" in types
    assert "group/state" in types
    state = next(e for e in events if e["type"] == "group/state")
    assert len(state["groups"]) == 1

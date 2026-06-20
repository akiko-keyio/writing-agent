"""Phase 5: propose_edit_group tool + fake-runner chat turn (no live model)."""

from __future__ import annotations

import asyncio
from pathlib import Path

import pytest

from connection import Connection
from edit_group_service import EditGroupService
from edit_group_store import EditGroupStore
from fakes import FakeToolCall, FakeTurn
from handler import handle_message_events
from protocol import SessionState
from session_store import SessionStore
from strands_runner import WritingAgentRunner
from writing_tools import propose_edits

DOC = "# Title\n\nWe utilize the API to fetch data.\n\nFinal line.\n"


@pytest.fixture(autouse=True)
def _models(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("model_manager._MODELS_FILE", tmp_path / "models.yaml")


class _Ctx:
    def __init__(self, invocation_state: dict, tool_use: dict) -> None:
        self.invocation_state = invocation_state
        self.tool_use = tool_use


def _ctx(tmp_path: Path, session: SessionState, queue: list) -> _Ctx:
    service = EditGroupService(project_root=tmp_path, store=EditGroupStore())
    return _Ctx(
        invocation_state={
            "session": session,
            "project_root": tmp_path,
            "outbound_queue": queue,
            "session_id": "s1",
            "edit_service": service,
            "request_id": "rid-1",
        },
        tool_use={"name": "propose_edits", "toolUseId": "tu-1"},
    )


def test_direct_tool_call_creates_group(tmp_path: Path) -> None:
    session = SessionState()
    session.open_buffers["doc.md"] = DOC
    queue: list = []
    ctx = _ctx(tmp_path, session, queue)

    result = propose_edits(
        "doc.md",
        [{"kind": "replace", "old_text": "utilize", "new_text": "use"}],
        ctx,  # type: ignore[arg-type]
        title="Tighten",
    )
    assert result["status"] == "success"
    propose_evt = next(e for e in queue if e.get("type") == "group/propose")
    assert propose_evt["group"]["path"] == "doc.md"
    assert propose_evt["request_id"] == "rid-1"
    # Buffer is NOT mutated by proposing.
    assert session.open_buffers["doc.md"] == DOC


def test_invalid_tool_input_returns_structured_error(tmp_path: Path) -> None:
    session = SessionState()
    session.open_buffers["doc.md"] = DOC
    queue: list = []
    ctx = _ctx(tmp_path, session, queue)

    result = propose_edits(
        "doc.md",
        [{"kind": "replace", "old_text": "does-not-exist", "new_text": "x"}],
        ctx,  # type: ignore[arg-type]
    )
    assert result["status"] == "error"
    end = next(e for e in queue if e.get("type") == "chat/tool_end")
    assert end["status"] == "error"


def test_fake_chat_turn_proposes_group_without_mutating_doc(tmp_path: Path) -> None:
    store = SessionStore()
    conn = Connection.create(store)
    conn.project_root = tmp_path
    conn.edit_service = EditGroupService(project_root=tmp_path, store=EditGroupStore())
    conn.current_session_id = store.create_empty()
    conn.session.open_buffers["doc.md"] = DOC
    conn.session.active_path = "doc.md"

    from fakes import FakeModel

    conn.runner = WritingAgentRunner(
        model=FakeModel(
            [
                FakeTurn(
                    tool_calls=[
                        FakeToolCall(
                            name="propose_edits",
                            tool_input={
                                "path": "doc.md",
                                "title": "Tighten wording",
                                "edits": [
                                    {"kind": "replace", "old_text": "utilize", "new_text": "use"},
                                ],
                            },
                        ),
                    ],
                ),
                FakeTurn(text="I proposed one edit for your review."),
            ],
        ),
    )

    async def _go():
        return [
            e
            async for e in handle_message_events(
                conn, {"type": "chat/message", "text": "tighten the intro", "request_id": "rid-9"}
            )
        ]

    events = asyncio.run(_go())
    types = [e["type"] for e in events]
    assert "group/propose" in types
    assert "chat/tool_update" in types
    assert "chat/stream_end" in types

    propose_evt = next(e for e in events if e["type"] == "group/propose")
    assert propose_evt["group"]["edits"][0]["new_text"] == "use"
    # Document buffer unchanged — proposing does not mutate.
    assert conn.session.open_buffers["doc.md"] == DOC
    # The group is persisted and scoped to the session.
    groups = conn.edit_service.list_for_session(conn.current_session_id)
    assert len(groups) == 1


def test_subagents_do_not_get_write_tools() -> None:
    # Read-only specialists must not receive propose_edits.
    from writing_tools import READONLY_TOOLS

    names = {t.tool_name for t in READONLY_TOOLS}
    assert "read_document" in names
    assert "propose_edits" not in names

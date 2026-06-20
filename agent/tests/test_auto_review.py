"""Auto Review toggle: prompt injection, session persistence, handler wiring."""

from __future__ import annotations

import asyncio
from pathlib import Path

import pytest

from writing_agent.server.connection import Connection
from writing_agent.domain.edit_group_service import EditGroupService
from writing_agent.domain.edit_group_store import EditGroupStore
from writing_agent.runtime.fake_model import FakeModel, FakeTurn
from writing_agent.server.handler import handle_message_events
from writing_agent.domain.memory_store import MemoryStore
from writing_agent.server.protocol import SessionState
from writing_agent.domain.session_store import SessionStore
from writing_agent.runtime.strands_runner import (
    AUTO_REVIEW_STATE_KEY,
    WritingAgentRunner,
    _auto_review_instructions,
    read_auto_review,
    sync_auto_review_prompt,
)


@pytest.fixture(autouse=True)
def _models(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("writing_agent.runtime.model_manager._MODELS_FILE", tmp_path / "models.yaml")


def test_auto_review_instructions_on_off() -> None:
    on = _auto_review_instructions(True)
    off = _auto_review_instructions(False)
    assert "Auto Review (ON" in on
    assert "MUST" in on
    assert "review" in on.lower()
    assert "Auto Review (OFF" in off
    assert "only** when the user explicitly asks" in off or "only when the user explicitly asks" in off


def test_sync_auto_review_prompt_updates_system_prompt() -> None:
    runner = WritingAgentRunner()
    sync_auto_review_prompt(runner, True)
    assert "Auto Review (ON" in runner._agent.system_prompt
    assert read_auto_review(runner.snapshot_agent_state()) is True
    sync_auto_review_prompt(runner, False)
    assert "Auto Review (OFF" in runner._agent.system_prompt


def test_restore_snapshot_applies_auto_review_prompt(tmp_path: Path) -> None:
    runner = WritingAgentRunner(project_root=tmp_path)
    runner.restore_from_snapshot([], {AUTO_REVIEW_STATE_KEY: True})
    assert "Auto Review (ON" in runner._agent.system_prompt
    assert read_auto_review(runner.snapshot_agent_state()) is True


def _make_conn(tmp_path: Path, turns: list[FakeTurn] | None = None) -> Connection:
    session = SessionState()
    store = SessionStore(base_dir=tmp_path)
    return Connection(
        session=session,
        runner=WritingAgentRunner(
            project_root=tmp_path,
            model=FakeModel(turns or [FakeTurn(text="ok")]),
        ),
        project_root=tmp_path,
        session_store=store,
        edit_service=EditGroupService(project_root=tmp_path, store=EditGroupStore(base_dir=tmp_path)),
        memory_store=MemoryStore(base_dir=tmp_path),
        current_session_id=store.create_empty(),
    )


async def _collect(conn: Connection, raw: dict) -> list[dict]:
    return [event async for event in handle_message_events(conn, raw)]


def test_session_auto_review_persists(tmp_path: Path) -> None:
    conn = _make_conn(tmp_path)
    events = asyncio.run(_collect(conn, {"type": "session/auto_review", "enabled": True}))
    assert events[-1]["type"] == "session/auto_review"
    assert events[-1]["auto_review"] is True
    assert read_auto_review(conn.runner.snapshot_agent_state()) is True

    snap = conn.session_store.load(conn.current_session_id)
    assert snap is not None
    assert snap.agent_state.get(AUTO_REVIEW_STATE_KEY) is True


def test_chat_message_sets_auto_review(tmp_path: Path) -> None:
    conn = _make_conn(tmp_path)
    asyncio.run(
        _collect(
            conn,
            {"type": "chat/message", "text": "Hello", "auto_review": True, "request_id": "t1"},
        ),
    )
    assert read_auto_review(conn.runner.snapshot_agent_state()) is True
    assert "Auto Review (ON" in conn.runner._agent.system_prompt

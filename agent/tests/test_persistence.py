"""File-backed persistence: durability across store instances, tool blocks,
corrupt-file recovery, and atomic concurrent saves."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from writing_agent.server.protocol import SessionState
from writing_agent.domain.session_store import SessionStore
from writing_agent.domain.storage import CorruptStateError, atomic_write_json, read_json, state_root
from strands.types.content import Message
from writing_agent.runtime.strands_runner import WritingAgentRunner


@pytest.fixture(autouse=True)
def _models(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("writing_agent.runtime.model_manager._MODELS_FILE", tmp_path / "models.yaml")


def _runner() -> WritingAgentRunner:
    from fakes import fake_model_factory

    return WritingAgentRunner(model_factory=fake_model_factory())


def test_save_then_load_with_new_store_instance() -> None:
    store = SessionStore()
    sid = store.create_empty()
    runner = _runner()
    runner.restore_conversation([{"role": "user", "text": "persist me"}])
    session = SessionState()
    session.open_buffers["notes/a.md"] = "# Draft"
    session.active_path = "notes/a.md"
    store.save(sid, runner, session, title="persist me")

    # New instance reads the same on-disk state.
    reopened = SessionStore()
    snap = reopened.load(sid)
    assert snap is not None
    assert snap.title == "persist me"
    assert snap.open_buffers["notes/a.md"] == "# Draft"
    assert snap.active_path == "notes/a.md"
    assert len(snap.messages) == 1


def test_persist_tool_use_and_tool_result_blocks() -> None:
    store = SessionStore()
    sid = store.create_empty()
    runner = _runner()
    messages: list[Message] = [
        {"role": "user", "content": [{"text": "read it"}]},
        {
            "role": "assistant",
            "content": [
                {
                    "toolUse": {
                        "toolUseId": "tu-1",
                        "name": "read_document",
                        "input": {"path": "a.md"},
                    },
                },
            ],
        },
        {
            "role": "user",
            "content": [
                {
                    "toolResult": {
                        "toolUseId": "tu-1",
                        "status": "success",
                        "content": [{"text": "file body"}],
                    },
                },
            ],
        },
    ]
    runner.restore_from_snapshot(messages, {})
    store.save(sid, runner, SessionState())

    snap = SessionStore().load(sid)
    assert snap is not None
    assert len(snap.messages) == 3
    tool_use_block = snap.messages[1]["content"][0]
    assert tool_use_block["toolUse"]["name"] == "read_document"
    assert tool_use_block["toolUse"]["input"] == {"path": "a.md"}
    tool_result_block = snap.messages[2]["content"][0]
    assert tool_result_block["toolResult"]["toolUseId"] == "tu-1"
    assert tool_result_block["toolResult"]["content"][0]["text"] == "file body"


def test_corrupt_session_file_is_recoverable() -> None:
    store = SessionStore()
    sid = store.create_empty()
    # Corrupt the file on disk.
    path = (
        state_root()
        / "workspaces"
        / store.workspace_id
        / "sessions"
        / f"{sid}.json"
    )
    path.write_text("{not valid json", encoding="utf-8")

    # load() returns None, list_all() skips it â€?no crash.
    assert store.load(sid) is None
    assert store.list_all() == []


def test_read_json_raises_on_corrupt(tmp_path: Path) -> None:
    bad = tmp_path / "bad.json"
    bad.write_text("{oops", encoding="utf-8")
    with pytest.raises(CorruptStateError):
        read_json(bad)
    assert read_json(tmp_path / "missing.json") is None


def test_atomic_write_is_complete_under_repeated_saves(tmp_path: Path) -> None:
    target = tmp_path / "nested" / "state.json"
    for i in range(20):
        atomic_write_json(target, {"i": i, "version": 1})
    data = json.loads(target.read_text(encoding="utf-8"))
    assert data["i"] == 19
    # No leftover temp files in the directory.
    leftovers = [p.name for p in target.parent.iterdir() if p.name != "state.json"]
    assert leftovers == []


def test_path_traversal_rejected() -> None:
    from writing_agent.workspace.project_root import normalize_workspace_path, resolve_workspace_path

    with pytest.raises(ValueError):
        normalize_workspace_path("../etc/passwd")
    with pytest.raises(ValueError):
        normalize_workspace_path("a/../../b")
    root = Path.cwd()
    with pytest.raises(ValueError):
        resolve_workspace_path(root, "../outside.md")


def test_repeated_same_session_saves_keep_valid_file() -> None:
    store = SessionStore()
    sid = store.create_empty()
    runner = _runner()
    session = SessionState()
    # Two store instances writing the same session id; last write wins, file stays valid.
    other = SessionStore()
    for i in range(10):
        runner.restore_conversation([{"role": "user", "text": f"msg {i}"}])
        (store if i % 2 == 0 else other).save(sid, runner, session, title=f"t{i}")
    snap = SessionStore().load(sid)
    assert snap is not None
    assert snap.title == "t9"
    assert len(snap.messages) == 1

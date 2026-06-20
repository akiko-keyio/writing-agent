"""Phase 7: memory store, learning hooks, and routes (no LLM)."""

from __future__ import annotations

import asyncio
from pathlib import Path

import pytest

from connection import Connection
from edit_group_service import EditGroupService
from edit_group_store import EditGroupStore
from handler import handle_message_events
from memory_store import (
    KIND_EXAMPLE,
    KIND_KNOWLEDGE,
    KIND_PRINCIPLE,
    MemoryEntry,
    MemoryStore,
    learn_from_apply,
    learn_from_dismiss,
    learn_from_replace,
)
from session_store import SessionStore

DOC = "# Doc\n\nWe utilize the API and we utilize caching elsewhere.\n"


@pytest.fixture(autouse=True)
def _models(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("model_manager._MODELS_FILE", tmp_path / "models.yaml")


async def _collect(conn: Connection, raw: dict) -> list[dict]:
    return [e async for e in handle_message_events(conn, raw)]


def _conn(tmp_path: Path) -> Connection:
    store = SessionStore()
    conn = Connection.create(store)
    conn.project_root = tmp_path
    conn.edit_service = EditGroupService(project_root=tmp_path, store=EditGroupStore())
    conn.memory_store = MemoryStore()
    conn.current_session_id = store.create_empty()
    conn.session.open_buffers["doc.md"] = DOC
    conn.session.active_path = "doc.md"
    return conn


# ---- store basics ---------------------------------------------------------


def test_memory_crud_and_persist() -> None:
    store = MemoryStore()
    entry = store.add(
        MemoryEntry(id="", kind="principle", scope="global", content="Prefer active voice."),
    )
    assert entry.id
    # New instance reads from disk.
    again = MemoryStore()
    loaded = again.get(entry.id)
    assert loaded is not None
    assert loaded.content == "Prefer active voice."
    assert again.delete(entry.id) is True
    assert again.get(entry.id) is None


def test_memory_can_be_disabled() -> None:
    store = MemoryStore()
    assert store.is_enabled() is True
    store.set_enabled(False)
    assert MemoryStore().is_enabled() is False


def test_retrieve_for_prompt_includes_enabled_relevant_memory() -> None:
    store = MemoryStore()
    store.add(
        MemoryEntry(
            id="",
            kind=KIND_PRINCIPLE,
            scope="global",
            content="Prefer active voice.",
        ),
    )
    store.add(
        MemoryEntry(
            id="",
            kind=KIND_KNOWLEDGE,
            scope="document",
            path="doc.md",
            content="The target reader knows diffusion models.",
        ),
    )
    store.add(
        MemoryEntry(
            id="",
            kind=KIND_EXAMPLE,
            scope="document",
            path="doc.md",
            content="Accepted replace: 'utilizes' -> 'uses'",
        ),
    )
    store.add(
        MemoryEntry(
            id="",
            kind=KIND_EXAMPLE,
            scope="document",
            path="other.md",
            content="Do not leak this other document example.",
        ),
    )

    prompt_memory = store.retrieve_for_prompt("doc.md", max_chars=1000)

    assert "Prefer active voice." in prompt_memory
    assert "The target reader knows diffusion models." in prompt_memory
    assert "Accepted replace" in prompt_memory
    assert "Do not leak" not in prompt_memory


def test_retrieve_for_prompt_obeys_priority_budget() -> None:
    store = MemoryStore()
    store.add(
        MemoryEntry(
            id="",
            kind=KIND_PRINCIPLE,
            scope="global",
            content="Prefer active voice.",
        ),
    )
    store.add(
        MemoryEntry(
            id="",
            kind=KIND_KNOWLEDGE,
            scope="document",
            path="doc.md",
            content="Reader background: signal processing.",
        ),
    )
    store.add(
        MemoryEntry(
            id="",
            kind=KIND_EXAMPLE,
            scope="document",
            path="doc.md",
            content="Accepted verbose example that should be clipped first.",
        ),
    )

    prompt_memory = store.retrieve_for_prompt("doc.md", max_chars=90)

    assert len(prompt_memory) <= 90
    assert "Prefer active voice." in prompt_memory
    assert "Reader background" in prompt_memory
    assert "verbose example" not in prompt_memory


def test_retrieve_for_prompt_returns_empty_when_disabled() -> None:
    store = MemoryStore()
    store.add(
        MemoryEntry(
            id="",
            kind=KIND_PRINCIPLE,
            scope="global",
            content="Prefer active voice.",
        ),
    )
    store.set_enabled(False)

    assert store.retrieve_for_prompt("doc.md", max_chars=1000) == ""


# ---- learning hooks -------------------------------------------------------


def test_accepted_edit_becomes_positive_example(tmp_path: Path) -> None:
    conn = _conn(tmp_path)
    events = asyncio.run(
        _collect(
            conn,
            {
                "type": "group/propose",
                "path": "doc.md",
                "edits": [
                    {
                        "kind": "replace",
                        "old_text": "utilize the API",
                        "new_text": "use the API",
                    },
                ],
            },
        ),
    )
    gid = events[0]["group"]["id"]
    asyncio.run(_collect(conn, {"type": "group/apply", "group_id": gid}))
    examples = conn.memory_store.list(kind=KIND_EXAMPLE)
    assert len(examples) == 1
    assert examples[0].polarity == "positive"


def test_dismissed_group_writes_no_memory(tmp_path: Path) -> None:
    conn = _conn(tmp_path)
    events = asyncio.run(
        _collect(
            conn,
            {
                "type": "group/propose",
                "path": "doc.md",
                "edits": [
                    {
                        "kind": "replace",
                        "old_text": "utilize the API",
                        "new_text": "use the API",
                    },
                ],
            },
        ),
    )
    gid = events[0]["group"]["id"]
    asyncio.run(_collect(conn, {"type": "group/dismiss", "group_id": gid}))
    examples = conn.memory_store.list(kind=KIND_EXAMPLE)
    assert examples == []


def test_replaced_edit_records_preference(tmp_path: Path) -> None:
    conn = _conn(tmp_path)
    events = asyncio.run(
        _collect(
            conn,
            {
                "type": "group/propose",
                "path": "doc.md",
                "edits": [
                    {
                        "kind": "replace",
                        "old_text": "utilize the API",
                        "new_text": "use the API",
                    },
                ],
            },
        ),
    )
    group = events[0]["group"]
    gid = group["id"]
    edit_id = group["edits"][0]["id"]
    asyncio.run(
        _collect(
            conn,
            {
                "type": "group/replace_edit",
                "group_id": gid,
                "edit_id": edit_id,
                "edit": {
                    "kind": "replace",
                    "old_text": "utilize the API",
                    "new_text": "call the API",
                },
            },
        ),
    )
    examples = conn.memory_store.list(kind=KIND_EXAMPLE)
    pref = [e for e in examples if e.polarity == "preference"]
    assert len(pref) == 1
    assert pref[0].metadata["before"] == "use the API"
    assert pref[0].metadata["after"] == "call the API"


def test_stale_edit_does_not_write_memory(tmp_path: Path) -> None:
    conn = _conn(tmp_path)
    events = asyncio.run(
        _collect(
            conn,
            {
                "type": "group/propose",
                "path": "doc.md",
                "edits": [
                    {
                        "kind": "replace",
                        "old_text": "utilize the API",
                        "new_text": "use the API",
                    },
                ],
            },
        ),
    )
    gid = events[0]["group"]["id"]
    # Change the buffer so the edit is stale, then apply -> nothing applied.
    conn.session.open_buffers["doc.md"] = "# Doc\n\nCompletely different text.\n"
    asyncio.run(_collect(conn, {"type": "group/apply", "group_id": gid}))
    assert conn.memory_store.list(kind=KIND_EXAMPLE) == []


def test_disabled_memory_records_nothing(tmp_path: Path) -> None:
    conn = _conn(tmp_path)
    conn.memory_store.set_enabled(False)
    events = asyncio.run(
        _collect(
            conn,
            {
                "type": "group/propose",
                "path": "doc.md",
                "edits": [
                    {"kind": "replace", "old_text": "utilize the API", "new_text": "use the API"},
                ],
            },
        ),
    )
    gid = events[0]["group"]["id"]
    asyncio.run(_collect(conn, {"type": "group/apply", "group_id": gid}))
    assert conn.memory_store.list(kind=KIND_EXAMPLE) == []


# ---- routes ---------------------------------------------------------------


def test_memory_read_and_update_routes(tmp_path: Path) -> None:
    conn = _conn(tmp_path)
    read = asyncio.run(_collect(conn, {"type": "memory/read"}))
    assert read[0]["type"] == "memory/data"
    assert read[0]["enabled"] is True

    added = asyncio.run(
        _collect(
            conn,
            {
                "type": "memory/update",
                "action": "add",
                "entry": {"kind": "principle", "scope": "global", "content": "Be concise."},
            },
        ),
    )
    principles = added[0]["memory"]["principle"]
    assert len(principles) == 1
    assert principles[0]["content"] == "Be concise."

    disabled = asyncio.run(
        _collect(conn, {"type": "memory/update", "action": "set_enabled", "enabled": False}),
    )
    assert disabled[0]["enabled"] is False


def test_candidate_principle_not_in_prompt() -> None:
    from memory_store import propose_candidate_principle

    store = MemoryStore()
    propose_candidate_principle(
        store,
        content="Prefer active voice.",
        rationale="From rejected edits.",
        case_ids=["m-1"],
    )
    prompt = store.retrieve_for_prompt("doc.md", max_chars=2000)
    assert "Prefer active voice." not in prompt


def test_accept_candidate_promotes_to_prompt() -> None:
    from memory_store import accept_candidate_principle, propose_candidate_principle

    store = MemoryStore()
    entry = propose_candidate_principle(
        store,
        content="Prefer 'use' over 'utilize'.",
        case_ids=[],
    )
    accept_candidate_principle(store, entry.id)
    prompt = store.retrieve_for_prompt("doc.md", max_chars=2000)
    assert "Prefer 'use' over 'utilize'." in prompt


def test_memory_accept_reject_candidate_routes(tmp_path: Path) -> None:
    from memory_store import CANDIDATE_STATUS, propose_candidate_principle

    conn = _conn(tmp_path)
    entry = propose_candidate_principle(
        conn.memory_store,
        content="Keep one claim per sentence.",
        case_ids=[],
    )
    accepted = asyncio.run(
        _collect(
            conn,
            {"type": "memory/update", "action": "accept_candidate", "id": entry.id},
        ),
    )
    principles = accepted[0]["memory"]["principle"]
    assert any(
        p["id"] == entry.id and p.get("metadata", {}).get("status") != CANDIDATE_STATUS
        for p in principles
    )

    entry2 = propose_candidate_principle(
        conn.memory_store,
        content="Discard me.",
        case_ids=[],
    )
    asyncio.run(
        _collect(
            conn,
            {"type": "memory/update", "action": "reject_candidate", "id": entry2.id},
        ),
    )
    assert conn.memory_store.get(entry2.id) is None

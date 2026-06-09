"""Phase 3: EditGroup domain + store + service (no LLM)."""

from __future__ import annotations

from pathlib import Path

import pytest

from edit_group_service import EditGroupService
from edit_group_store import EditGroupStore
from edit_groups import (
    EDIT_APPLIED,
    EDIT_REPLACED,
    EDIT_STALE,
    GROUP_APPLIED,
    GROUP_PARTIALLY_APPLIED,
    GROUP_REJECTED,
    GROUP_STALE,
    EditValidationError,
    apply_group,
    build_group,
    refresh_group,
)
from protocol import SessionState

DOC = """# Title

We utilize the API to fetch data.

The second paragraph explains the method in detail.

Final remarks go here.
"""


def _service(tmp_path: Path) -> EditGroupService:
    return EditGroupService(project_root=tmp_path, store=EditGroupStore())


def _session(path: str = "doc.md", body: str = DOC) -> SessionState:
    s = SessionState()
    s.open_buffers[path] = body
    s.active_path = path
    return s


# ---- validation -----------------------------------------------------------


def test_unique_replacement_validates() -> None:
    group = build_group(
        session_id="s1",
        path="doc.md",
        buffer=DOC,
        edits=[{"kind": "replace", "old_text": "utilize", "new_text": "use"}],
    )
    assert len(group.edits) == 1
    assert group.edits[0].status == "proposed"


def test_missing_old_text_rejected() -> None:
    with pytest.raises(EditValidationError, match="not found"):
        build_group(
            session_id="s1",
            path="doc.md",
            buffer=DOC,
            edits=[{"kind": "replace", "old_text": "nonexistent", "new_text": "x"}],
        )


def test_ambiguous_repeated_text_requires_anchor() -> None:
    buffer = "foo bar foo baz foo"
    with pytest.raises(EditValidationError, match="ambiguous"):
        build_group(
            session_id="s1",
            path="doc.md",
            buffer=buffer,
            edits=[{"kind": "replace", "old_text": "foo", "new_text": "X"}],
        )


def test_ambiguous_resolved_by_anchor() -> None:
    buffer = "foo bar foo baz foo"
    group = build_group(
        session_id="s1",
        path="doc.md",
        buffer=buffer,
        edits=[
            {
                "kind": "replace",
                "old_text": "foo",
                "new_text": "X",
                "anchor": {"prefix_context": "baz "},
            },
        ],
    )
    new_buffer, group = apply_group(group, buffer)
    assert new_buffer == "foo bar foo baz X"


def test_overlapping_edits_rejected() -> None:
    buffer = "abcdefgh"
    with pytest.raises(EditValidationError, match="[Oo]verlap"):
        build_group(
            session_id="s1",
            path="doc.md",
            buffer=buffer,
            edits=[
                {"kind": "replace", "old_text": "abcd", "new_text": "X"},
                {"kind": "replace", "old_text": "cdef", "new_text": "Y"},
            ],
        )


# ---- insertion + deletion -------------------------------------------------


def test_insertion_anchored_between_paragraphs() -> None:
    group = build_group(
        session_id="s1",
        path="doc.md",
        buffer=DOC,
        edits=[
            {
                "kind": "insert",
                "new_text": "An inserted sentence. ",
                "anchor": {
                    "prefix_context": "fetch data.\n\n",
                    "suffix_context": "The second paragraph",
                },
            },
        ],
    )
    new_buffer, group = apply_group(group, DOC)
    assert group.status == GROUP_APPLIED
    assert "An inserted sentence. The second paragraph" in new_buffer


def test_deletion_validates_and_applies() -> None:
    group = build_group(
        session_id="s1",
        path="doc.md",
        buffer=DOC,
        edits=[{"kind": "delete", "old_text": "Final remarks go here.\n"}],
    )
    new_buffer, group = apply_group(group, DOC)
    assert group.status == GROUP_APPLIED
    assert "Final remarks" not in new_buffer


# ---- apply contract -------------------------------------------------------


def test_apply_is_offset_independent_for_multi_edit() -> None:
    buffer = "alpha beta gamma delta"
    group = build_group(
        session_id="s1",
        path="doc.md",
        buffer=buffer,
        edits=[
            {"kind": "replace", "old_text": "alpha", "new_text": "AAAAAAAAAA"},
            {"kind": "replace", "old_text": "delta", "new_text": "D"},
        ],
    )
    new_buffer, group = apply_group(group, buffer)
    assert new_buffer == "AAAAAAAAAA beta gamma D"
    assert all(e.status == EDIT_APPLIED for e in group.edits)


def test_reapply_applied_group_rejected() -> None:
    group = build_group(
        session_id="s1",
        path="doc.md",
        buffer=DOC,
        edits=[{"kind": "replace", "old_text": "utilize", "new_text": "use"}],
    )
    new_buffer, group = apply_group(group, DOC)
    assert group.status == GROUP_APPLIED
    with pytest.raises(EditValidationError, match="already applied"):
        apply_group(group, new_buffer)


def test_partial_apply_when_one_edit_stale() -> None:
    buffer = "keep one and change two"
    group = build_group(
        session_id="s1",
        path="doc.md",
        buffer=buffer,
        edits=[
            {"kind": "replace", "old_text": "one", "new_text": "1"},
            {"kind": "replace", "old_text": "two", "new_text": "2"},
        ],
    )
    # Mutate the buffer so the second edit's target disappears before apply.
    changed = "keep one and change TWO"
    new_buffer, group = apply_group(group, changed)
    assert group.status == GROUP_PARTIALLY_APPLIED
    statuses = sorted(e.status for e in group.edits)
    assert EDIT_APPLIED in statuses
    assert EDIT_STALE in statuses
    assert new_buffer == "keep 1 and change TWO"


def test_stale_detection_after_buffer_change() -> None:
    group = build_group(
        session_id="s1",
        path="doc.md",
        buffer=DOC,
        edits=[{"kind": "replace", "old_text": "utilize", "new_text": "use"}],
    )
    changed = DOC.replace("utilize", "leverage")
    refresh_group(group, changed)
    assert group.status == GROUP_STALE
    assert group.edits[0].status == EDIT_STALE


# ---- replace lineage ------------------------------------------------------


def test_replace_edit_links_lineage(tmp_path: Path) -> None:
    svc = _service(tmp_path)
    session = _session()
    group = svc.propose(
        session,
        session_id="s1",
        path="doc.md",
        edits=[{"kind": "replace", "old_text": "utilize", "new_text": "use"}],
    )
    old_id = group.edits[0].id
    group, new_edit = svc.replace_edit(
        session,
        group.id,
        old_id,
        {"kind": "replace", "old_text": "utilize", "new_text": "employ"},
    )
    old = group.get_edit(old_id)
    assert old.status == EDIT_REPLACED
    assert old.replaced_by == new_edit.id
    assert new_edit.replaces == old_id


# ---- service / store ------------------------------------------------------


def test_service_apply_updates_buffer_not_disk(tmp_path: Path) -> None:
    disk = tmp_path / "doc.md"
    disk.write_text(DOC, encoding="utf-8")
    svc = _service(tmp_path)
    session = _session()
    group = svc.propose(
        session,
        session_id="s1",
        path="doc.md",
        edits=[{"kind": "replace", "old_text": "utilize", "new_text": "use"}],
    )
    applied = svc.apply(session, group.id)
    assert applied.status == GROUP_APPLIED
    assert "use the API" in session.open_buffers["doc.md"]
    # Disk is unchanged: apply != save.
    assert disk.read_text(encoding="utf-8") == DOC


def test_service_reject_updates_status(tmp_path: Path) -> None:
    svc = _service(tmp_path)
    session = _session()
    group = svc.propose(
        session,
        session_id="s1",
        path="doc.md",
        edits=[{"kind": "replace", "old_text": "utilize", "new_text": "use"}],
    )
    rejected = svc.reject(group.id)
    assert rejected.status == GROUP_REJECTED


def test_groups_scoped_and_persist(tmp_path: Path) -> None:
    svc = _service(tmp_path)
    session = _session()
    svc.propose(
        session,
        session_id="s1",
        path="doc.md",
        edits=[{"kind": "replace", "old_text": "utilize", "new_text": "use"}],
    )
    svc.propose(
        session,
        session_id="s2",
        path="doc.md",
        edits=[{"kind": "replace", "old_text": "method", "new_text": "approach"}],
    )
    # New store instance reads from disk; scoping by session_id works.
    fresh = EditGroupService(project_root=tmp_path, store=EditGroupStore())
    s1_groups = fresh.list_for_session("s1")
    s2_groups = fresh.list_for_session("s2")
    assert len(s1_groups) == 1
    assert len(s2_groups) == 1
    assert s1_groups[0].edits[0].old_text == "utilize"


def test_service_rejects_path_traversal(tmp_path: Path) -> None:
    svc = _service(tmp_path)
    session = _session()
    with pytest.raises(ValueError):
        svc.propose(
            session,
            session_id="s1",
            path="../escape.md",
            edits=[{"kind": "replace", "old_text": "x", "new_text": "y"}],
        )

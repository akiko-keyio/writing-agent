"""Review / EditGroup / document-save routes.

Split out of ``handler.py`` because the review route family is large enough to
materially enlarge the main router. These functions return lists of outbound
event dicts (the operations are synchronous; no streaming).
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any

from writing_agent.domain.edit_groups import EditGroup, EditValidationError
from writing_agent.workspace.project_root import normalize_workspace_path, resolve_workspace_path
from writing_agent.domain.storage import atomic_write_text

if TYPE_CHECKING:
    from writing_agent.server.connection import Connection

logger = logging.getLogger(__name__)


def _error(message: str, *, code: str | None = None, request_id: str | None = None) -> dict[str, Any]:
    event: dict[str, Any] = {"type": "error", "message": message}
    if code:
        event["code"] = code
    if request_id:
        event["request_id"] = request_id
    return event


def _group_update(group: EditGroup) -> dict[str, Any]:
    return {"type": "group/update", "group": group.to_dict()}


def _document_buffer(path: str, document: str, *, reason: str) -> dict[str, Any]:
    return {
        "type": "document/buffer",
        "path": path,
        "document": document,
        "reason": reason,
    }


def group_state_events(conn: "Connection") -> list[dict[str, Any]]:
    """Full group state for the active session (used on session restore)."""
    if not conn.current_session_id:
        return [{"type": "group/state", "session_id": None, "groups": []}]
    groups = conn.edit_service.refresh_session(conn.session, conn.current_session_id)
    return [
        {
            "type": "group/state",
            "session_id": conn.current_session_id,
            "groups": [g.to_dict() for g in groups],
        },
    ]


def handle_group_propose(conn: "Connection", raw: dict[str, Any]) -> list[dict[str, Any]]:
    """Create + validate a group from explicit edits.

    Used by the agent tool bridge (Phase 5) and by deterministic UI/dev testing.
    The backend always validates anchors before the group becomes state.
    """
    path = raw.get("path")
    edits = raw.get("edits")
    if not isinstance(path, str) or not path.strip():
        return [_error("path is required", code="invalid_group")]
    if not isinstance(edits, list) or not edits:
        return [_error("edits must be a non-empty list", code="invalid_group")]
    if not conn.current_session_id:
        conn.current_session_id = conn.session_store.create_empty()
    try:
        group = conn.edit_service.propose(
            conn.session,
            session_id=conn.current_session_id,
            path=path,
            edits=edits,
            title=str(raw.get("title", "")),
            summary=str(raw.get("summary", "")),
            rationale=str(raw.get("rationale", "")),
            source_agent=str(raw.get("source_agent", "")),
            confidence=float(raw.get("confidence", 0.0) or 0.0),
        )
    except EditValidationError as exc:
        return [_error(str(exc), code="invalid_group")]
    except ValueError as exc:
        return [_error(str(exc), code="invalid_path")]
    return [{"type": "group/propose", "group": group.to_dict()}]


def handle_group_apply(conn: "Connection", raw: dict[str, Any]) -> list[dict[str, Any]]:
    group_id = str(raw.get("group_id", "")).strip()
    if not group_id:
        return [_error("group_id is required", code="invalid_group")]
    try:
        group = conn.edit_service.apply(conn.session, group_id)
    except EditValidationError as exc:
        return [_error(str(exc), code="apply_failed")]
    _learn(conn, "apply", group)
    events: list[dict[str, Any]] = [_group_update(group)]
    new_doc = conn.session.open_buffers.get(group.path)
    if new_doc is not None:
        events.append(_document_buffer(group.path, new_doc, reason="apply"))
    _persist_session(conn)
    return events


def handle_group_dismiss(conn: "Connection", raw: dict[str, Any]) -> list[dict[str, Any]]:
    group_id = str(raw.get("group_id", "")).strip()
    if not group_id:
        return [_error("group_id is required", code="invalid_group")]
    try:
        group = conn.edit_service.dismiss(group_id)
    except EditValidationError as exc:
        return [_error(str(exc), code="dismiss_failed")]
    _persist_session(conn)
    return [_group_update(group)]


def handle_group_reject(conn: "Connection", raw: dict[str, Any]) -> list[dict[str, Any]]:
    group_id = str(raw.get("group_id", "")).strip()
    edit_id = str(raw.get("edit_id", "")).strip()
    if not group_id or not edit_id:
        return [_error("group_id and edit_id are required", code="invalid_group")]
    try:
        group, edit = conn.edit_service.reject_edit(group_id, edit_id)
    except EditValidationError as exc:
        return [_error(str(exc), code="reject_failed")]
    _learn_reject(conn, group, edit)
    _persist_session(conn)
    return [_group_update(group)]


def handle_group_replace_edit(conn: "Connection", raw: dict[str, Any]) -> list[dict[str, Any]]:
    group_id = str(raw.get("group_id", "")).strip()
    edit_id = str(raw.get("edit_id", "")).strip()
    new_edit = raw.get("edit")
    if not group_id or not edit_id or not isinstance(new_edit, dict):
        return [_error("group_id, edit_id, and edit are required", code="invalid_group")]
    existing = conn.edit_service.get(group_id)
    old_edit = existing.get_edit(edit_id) if existing else None
    try:
        group, new = conn.edit_service.replace_edit(conn.session, group_id, edit_id, new_edit)
    except EditValidationError as exc:
        return [_error(str(exc), code="replace_failed")]
    if old_edit is not None:
        _learn_replace(conn, group, old_edit, new)
    _persist_session(conn)
    return [_group_update(group)]


def handle_group_state(conn: "Connection", raw: dict[str, Any]) -> list[dict[str, Any]]:
    return group_state_events(conn)


def handle_memory_read(conn: "Connection", raw: dict[str, Any]) -> list[dict[str, Any]]:
    store = conn.memory_store
    return [
        {
            "type": "memory/data",
            "enabled": store.is_enabled(),
            "memory": store.export(),
        },
    ]


def handle_memory_update(conn: "Connection", raw: dict[str, Any]) -> list[dict[str, Any]]:
    from writing_agent.domain.memory_store import KINDS, MemoryEntry

    store = conn.memory_store
    action = raw.get("action")

    if action == "set_enabled":
        if "enabled" not in raw:
            return [_error("enabled is required", code="invalid_memory")]
        store.set_enabled(bool(raw.get("enabled")))
    elif action == "add":
        entry = raw.get("entry")
        if not isinstance(entry, dict):
            return [_error("entry object is required", code="invalid_memory")]
        kind = str(entry.get("kind", ""))
        if kind not in KINDS:
            return [_error(f"Unknown memory kind: {kind}", code="invalid_memory")]
        try:
            store.add(MemoryEntry.from_dict({**entry, "id": entry.get("id") or ""}))
        except ValueError as exc:
            return [_error(str(exc), code="invalid_memory")]
    elif action == "delete":
        entry_id = str(raw.get("id", "")).strip()
        if not entry_id:
            return [_error("id is required", code="invalid_memory")]
        store.delete(entry_id)
    elif action == "clear_all":
        store.clear()
    elif action == "accept_candidate":
        from writing_agent.domain.memory_store import accept_candidate_principle

        entry_id = str(raw.get("id", "")).strip()
        if not entry_id:
            return [_error("id is required", code="invalid_memory")]
        content = raw.get("content")
        updated = accept_candidate_principle(
            store,
            entry_id,
            content=str(content) if isinstance(content, str) else None,
        )
        if updated is None:
            return [_error("Candidate principle not found", code="invalid_memory")]
    elif action == "reject_candidate":
        from writing_agent.domain.memory_store import reject_candidate_principle

        entry_id = str(raw.get("id", "")).strip()
        if not entry_id:
            return [_error("id is required", code="invalid_memory")]
        if not reject_candidate_principle(store, entry_id):
            return [_error("Candidate principle not found", code="invalid_memory")]
    else:
        return [_error(f"Unknown memory action: {action}", code="invalid_memory")]

    return [
        {
            "type": "memory/data",
            "enabled": store.is_enabled(),
            "memory": store.export(),
        },
    ]


def handle_document_save(conn: "Connection", raw: dict[str, Any]) -> list[dict[str, Any]]:
    raw_path = raw.get("path")
    if not isinstance(raw_path, str) or not raw_path.strip():
        return [_error("path is required", code="invalid_path")]
    try:
        norm = normalize_workspace_path(raw_path)
        abs_path = resolve_workspace_path(conn.project_root, norm)
    except ValueError as exc:
        return [_error(str(exc), code="invalid_path")]

    # Prefer the explicit content sent with the save request: it is the exact
    # text the editor intends to persist for this path. Falling back to the
    # shared session buffer is unsafe if that buffer was set for a different
    # document (path/content desync), so an explicit content always wins.
    raw_content = raw.get("content")
    if isinstance(raw_content, str):
        content = raw_content
        conn.session.open_buffers[norm] = content
    elif norm in conn.session.open_buffers:
        content = conn.session.open_buffers[norm]
    else:
        return [_error(f"No open buffer for {norm}", code="no_buffer")]

    try:
        atomic_write_text(abs_path, content)
    except OSError as exc:
        logger.exception("document/save failed")
        return [_error(f"Save failed: {exc}", code="save_failed")]
    return [{"type": "document/saved", "path": norm, "ok": True}]


def _learn(conn: "Connection", decision: str, group: EditGroup) -> None:
    """Best-effort memory learning from an edit decision (never breaks the route)."""
    store = getattr(conn, "memory_store", None)
    if store is None:
        return
    try:
        from writing_agent.domain.memory_store import learn_from_apply

        if decision == "apply":
            learn_from_apply(store, group)
    except Exception:  # noqa: BLE001
        logger.exception("memory learning failed (%s)", decision)


def _learn_reject(conn: "Connection", group: EditGroup, edit: Any) -> None:
    store = getattr(conn, "memory_store", None)
    if store is None:
        return
    try:
        from writing_agent.domain.memory_store import learn_from_reject

        learn_from_reject(store, group, edit)
    except Exception:  # noqa: BLE001
        logger.exception("memory learning failed (reject)")


def _learn_replace(conn: "Connection", group: EditGroup, old_edit: Any, new_edit: Any) -> None:
    store = getattr(conn, "memory_store", None)
    if store is None:
        return
    try:
        from writing_agent.domain.memory_store import learn_from_replace

        learn_from_replace(store, group, old_edit, new_edit)
    except Exception:  # noqa: BLE001
        logger.exception("memory learning failed (replace)")


def _persist_session(conn: "Connection") -> None:
    if not conn.current_session_id:
        return
    conn.session_store.save(
        conn.current_session_id,
        conn.runner,
        conn.session,
    )

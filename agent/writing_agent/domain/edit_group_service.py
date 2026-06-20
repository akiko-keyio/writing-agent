"""EditGroupService: buffer-aware orchestration over the EditGroup domain.

Resolves the document buffer (open editor buffer first, disk second), validates
proposals through the domain layer, persists groups, and applies them to the
session's open buffer. Applying never writes disk — that is ``document/save``.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from writing_agent.domain.edit_group_store import EditGroupStore
from writing_agent.domain.edit_groups import (
    EditGroup,
    EditValidationError,
    apply_group,
    build_group,
    dismiss_group,
    reject_edit,
    refresh_group,
    replace_edit,
)
from writing_agent.workspace.project_root import normalize_workspace_path, resolve_workspace_path
from writing_agent.server.protocol import SessionState

logger = logging.getLogger(__name__)


class EditGroupService:
    def __init__(
        self,
        project_root: Path,
        store: EditGroupStore | None = None,
    ) -> None:
        self.project_root = project_root
        self.store = store or EditGroupStore()

    # ---- buffer resolution -------------------------------------------------

    def resolve_buffer(self, session: SessionState, path: str) -> str:
        norm = normalize_workspace_path(path)
        if norm in session.open_buffers:
            return session.open_buffers[norm]
        try:
            abs_path = resolve_workspace_path(self.project_root, norm)
            if abs_path.is_file():
                return abs_path.read_text(encoding="utf-8")
        except (ValueError, OSError):
            logger.debug("Disk fallback failed for %s", norm, exc_info=True)
        return ""

    # ---- lifecycle ---------------------------------------------------------

    def propose(
        self,
        session: SessionState,
        *,
        session_id: str,
        path: str,
        edits: list[dict[str, Any]],
        title: str = "",
        summary: str = "",
        rationale: str = "",
        source_agent: str = "",
        confidence: float = 0.0,
    ) -> EditGroup:
        norm = normalize_workspace_path(path)
        buffer = self.resolve_buffer(session, norm)
        group = build_group(
            session_id=session_id,
            path=norm,
            buffer=buffer,
            edits=edits,
            title=title,
            summary=summary,
            rationale=rationale,
            source_agent=source_agent,
            confidence=confidence,
        )
        self.store.save(group)
        return group

    def get(self, group_id: str) -> EditGroup | None:
        return self.store.get(group_id)

    def list_for_session(
        self,
        session_id: str,
        *,
        path: str | None = None,
    ) -> list[EditGroup]:
        return self.store.list_for_session(session_id, path=path)

    def apply(self, session: SessionState, group_id: str) -> EditGroup:
        group = self.store.get(group_id)
        if group is None:
            raise EditValidationError(f"Edit group not found: {group_id}")
        buffer = self.resolve_buffer(session, group.path)
        new_buffer, group = apply_group(group, buffer)
        session.open_buffers[group.path] = new_buffer
        session.active_path = group.path
        self.store.save(group)
        return group

    def refresh_for_path(
        self,
        session: SessionState,
        session_id: str,
        path: str,
    ) -> list[EditGroup]:
        norm = normalize_workspace_path(path)
        buffer = self.resolve_buffer(session, norm)
        out: list[EditGroup] = []
        for group in self.store.list_for_session(session_id, path=norm):
            refresh_group(group, buffer)
            self.store.save(group)
            out.append(group)
        return out

    def refresh_session(
        self,
        session: SessionState,
        session_id: str,
    ) -> list[EditGroup]:
        """Recompute stale status for every group in a session against current buffers."""
        out: list[EditGroup] = []
        for group in self.store.list_for_session(session_id):
            buffer = self.resolve_buffer(session, group.path)
            refresh_group(group, buffer)
            self.store.save(group)
            out.append(group)
        return out

    def dismiss(self, group_id: str) -> EditGroup:
        group = self.store.get(group_id)
        if group is None:
            raise EditValidationError(f"Edit group not found: {group_id}")
        dismiss_group(group)
        self.store.save(group)
        return group

    def reject_edit(self, group_id: str, edit_id: str):
        group = self.store.get(group_id)
        if group is None:
            raise EditValidationError(f"Edit group not found: {group_id}")
        rejected = reject_edit(group, edit_id)
        self.store.save(group)
        return group, rejected

    def replace_edit(
        self,
        session: SessionState,
        group_id: str,
        edit_id: str,
        new_fields: dict[str, Any],
    ):
        group = self.store.get(group_id)
        if group is None:
            raise EditValidationError(f"Edit group not found: {group_id}")
        buffer = self.resolve_buffer(session, group.path)
        new_edit = replace_edit(group, edit_id, new_fields, buffer)
        self.store.save(group)
        return group, new_edit

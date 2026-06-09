"""File-backed EditGroup persistence under ``.writing-agent/edit-groups/``.

Groups are scoped by ``session_id`` and workspace-relative ``path`` so the
frontend can restore exactly the groups belonging to the active chat/document
instead of guessing.
"""

from __future__ import annotations

import logging
from pathlib import Path

from edit_groups import EditGroup
from storage import (
    CorruptStateError,
    atomic_write_json,
    ensure_dir,
    read_json,
    state_root,
)

logger = logging.getLogger(__name__)


class EditGroupStore:
    def __init__(self, base_dir: Path | None = None) -> None:
        root = base_dir if base_dir is not None else state_root()
        self._dir = ensure_dir(Path(root) / "edit-groups")

    def _path(self, group_id: str) -> Path:
        return self._dir / f"{group_id}.json"

    def save(self, group: EditGroup) -> None:
        atomic_write_json(self._path(group.id), group.to_dict())

    def get(self, group_id: str) -> EditGroup | None:
        try:
            data = read_json(self._path(group_id))
        except CorruptStateError:
            logger.warning("Skipping corrupt edit-group file: %s", group_id)
            return None
        if not isinstance(data, dict):
            return None
        return EditGroup.from_dict(data)

    def delete(self, group_id: str) -> None:
        self._path(group_id).unlink(missing_ok=True)

    def _load_all(self) -> list[EditGroup]:
        groups: list[EditGroup] = []
        for path in self._dir.glob("*.json"):
            try:
                data = read_json(path)
            except CorruptStateError:
                logger.warning("Skipping corrupt edit-group file: %s", path)
                continue
            if isinstance(data, dict):
                groups.append(EditGroup.from_dict(data))
        return groups

    def list_for_session(
        self,
        session_id: str,
        *,
        path: str | None = None,
    ) -> list[EditGroup]:
        groups = [g for g in self._load_all() if g.session_id == session_id]
        if path is not None:
            groups = [g for g in groups if g.path == path]
        groups.sort(key=lambda g: g.created_at)
        return groups

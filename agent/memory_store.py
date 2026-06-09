"""File-backed memory under ``.writing-agent/memory/``.

Three kinds, with scopes preserved (never flattened into one bucket):

- ``principle`` — global writing rules / user preferences (cross-document).
- ``knowledge`` — facts about the current project or document.
- ``example``  — concrete accepted / rejected / replaced edit cases (document-
  scoped), which may link back to principles.

Memory is visible and controllable. It is recorded from explicit edit
decisions, never silently invented, and (in this phase) does NOT influence the
agent's prompts — it is inspectable state only, gated by an ``enabled`` flag.
"""

from __future__ import annotations

import logging
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from storage import (
    CorruptStateError,
    atomic_write_json,
    ensure_dir,
    read_json,
    state_root,
)

logger = logging.getLogger(__name__)

KIND_PRINCIPLE = "principle"
KIND_KNOWLEDGE = "knowledge"
KIND_EXAMPLE = "example"
KINDS = (KIND_PRINCIPLE, KIND_KNOWLEDGE, KIND_EXAMPLE)

SCOPE_GLOBAL = "global"
SCOPE_DOCUMENT = "document"

# Example polarity
POS = "positive"
NEG = "negative"
PREFERENCE = "preference"
NEUTRAL = "neutral"


def _new_id() -> str:
    return f"m-{uuid.uuid4().hex[:12]}"


@dataclass
class MemoryEntry:
    id: str
    kind: str
    scope: str
    content: str
    path: str | None = None
    polarity: str = NEUTRAL
    source: str = ""
    links: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)
    created_at: float = 0.0

    def to_dict(self) -> dict[str, Any]:
        return {
            "version": 1,
            "id": self.id,
            "kind": self.kind,
            "scope": self.scope,
            "content": self.content,
            "path": self.path,
            "polarity": self.polarity,
            "source": self.source,
            "links": list(self.links),
            "metadata": dict(self.metadata),
            "created_at": self.created_at,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> MemoryEntry:
        return cls(
            id=str(data.get("id") or _new_id()),
            kind=str(data.get("kind", KIND_KNOWLEDGE)),
            scope=str(data.get("scope", SCOPE_DOCUMENT)),
            content=str(data.get("content", "")),
            path=data.get("path"),
            polarity=str(data.get("polarity", NEUTRAL)),
            source=str(data.get("source", "")),
            links=list(data.get("links", []) or []),
            metadata=dict(data.get("metadata", {}) or {}),
            created_at=float(data.get("created_at", 0.0)),
        )


class MemoryStore:
    def __init__(self, base_dir: Path | None = None) -> None:
        root = base_dir if base_dir is not None else state_root()
        self._dir = ensure_dir(Path(root) / "memory")
        self._config_path = self._dir / "config.json"
        for kind in KINDS:
            ensure_dir(self._dir / kind)

    # ---- enable/disable ----------------------------------------------------

    def is_enabled(self) -> bool:
        try:
            data = read_json(self._config_path)
        except CorruptStateError:
            return True
        if isinstance(data, dict) and "enabled" in data:
            return bool(data["enabled"])
        return True

    def set_enabled(self, enabled: bool) -> None:
        atomic_write_json(self._config_path, {"enabled": bool(enabled)})

    # ---- CRUD --------------------------------------------------------------

    def _path(self, kind: str, entry_id: str) -> Path:
        return self._dir / kind / f"{entry_id}.json"

    def add(self, entry: MemoryEntry) -> MemoryEntry:
        if entry.kind not in KINDS:
            raise ValueError(f"Unknown memory kind: {entry.kind}")
        if not entry.id:
            entry.id = _new_id()
        if not entry.created_at:
            entry.created_at = time.time()
        atomic_write_json(self._path(entry.kind, entry.id), entry.to_dict())
        return entry

    def get(self, entry_id: str) -> MemoryEntry | None:
        for kind in KINDS:
            path = self._path(kind, entry_id)
            try:
                data = read_json(path)
            except CorruptStateError:
                continue
            if isinstance(data, dict):
                return MemoryEntry.from_dict(data)
        return None

    def delete(self, entry_id: str) -> bool:
        deleted = False
        for kind in KINDS:
            path = self._path(kind, entry_id)
            if path.exists():
                path.unlink(missing_ok=True)
                deleted = True
        return deleted

    def list(
        self,
        *,
        kind: str | None = None,
        scope: str | None = None,
        path: str | None = None,
    ) -> list[MemoryEntry]:
        kinds = [kind] if kind else list(KINDS)
        out: list[MemoryEntry] = []
        for k in kinds:
            for file in (self._dir / k).glob("*.json"):
                try:
                    data = read_json(file)
                except CorruptStateError:
                    logger.warning("Skipping corrupt memory file: %s", file)
                    continue
                if not isinstance(data, dict):
                    continue
                entry = MemoryEntry.from_dict(data)
                if scope and entry.scope != scope:
                    continue
                if path is not None and entry.path != path:
                    continue
                out.append(entry)
        out.sort(key=lambda e: e.created_at)
        return out

    def clear(self) -> int:
        count = 0
        for kind in KINDS:
            for file in (self._dir / kind).glob("*.json"):
                file.unlink(missing_ok=True)
                count += 1
        return count

    def export(self) -> dict[str, list[dict[str, Any]]]:
        return {kind: [e.to_dict() for e in self.list(kind=kind)] for kind in KINDS}


# --------------------------------------------------------------------------
# Learning hooks (recorded from explicit edit decisions only)
# --------------------------------------------------------------------------


def _example(
    *,
    group_id: str,
    path: str,
    edit_id: str,
    polarity: str,
    content: str,
    metadata: dict[str, Any],
) -> MemoryEntry:
    return MemoryEntry(
        id=_new_id(),
        kind=KIND_EXAMPLE,
        scope=SCOPE_DOCUMENT,
        content=content,
        path=path,
        polarity=polarity,
        source=f"{group_id}/{edit_id}",
        metadata=metadata,
    )


def learn_from_apply(store: MemoryStore, group: Any) -> list[MemoryEntry]:
    """Applied edits become positive examples. Stale/replaced edits are skipped."""
    if not store.is_enabled():
        return []
    from edit_groups import EDIT_APPLIED

    out: list[MemoryEntry] = []
    for edit in group.edits:
        if edit.status != EDIT_APPLIED:
            continue
        out.append(
            store.add(
                _example(
                    group_id=group.id,
                    path=group.path,
                    edit_id=edit.id,
                    polarity=POS,
                    content=f"Accepted {edit.kind}: '{edit.old_text}' -> '{edit.new_text}'",
                    metadata={
                        "kind": edit.kind,
                        "old_text": edit.old_text,
                        "new_text": edit.new_text,
                        "rationale": edit.rationale,
                    },
                ),
            ),
        )
    return out


def learn_from_reject(store: MemoryStore, group: Any) -> list[MemoryEntry]:
    """Rejected edits become negative examples — but not ones superseded by a
    replacement (those are preference signals handled by ``learn_from_replace``)."""
    if not store.is_enabled():
        return []
    from edit_groups import EDIT_REJECTED

    out: list[MemoryEntry] = []
    for edit in group.edits:
        if edit.status != EDIT_REJECTED or edit.replaced_by:
            continue
        out.append(
            store.add(
                _example(
                    group_id=group.id,
                    path=group.path,
                    edit_id=edit.id,
                    polarity=NEG,
                    content=f"Rejected {edit.kind}: '{edit.old_text}' -> '{edit.new_text}'",
                    metadata={
                        "kind": edit.kind,
                        "old_text": edit.old_text,
                        "new_text": edit.new_text,
                    },
                ),
            ),
        )
    return out


def learn_from_replace(
    store: MemoryStore,
    group: Any,
    old_edit: Any,
    new_edit: Any,
) -> MemoryEntry | None:
    """A replaced edit is the strongest signal: the user wanted a *different*
    version. Records before/after with replace lineage."""
    if not store.is_enabled():
        return None
    return store.add(
        _example(
            group_id=group.id,
            path=group.path,
            edit_id=new_edit.id,
            polarity=PREFERENCE,
            content=(
                f"Preferred a different edit: '{old_edit.new_text}' -> '{new_edit.new_text}'"
            ),
            metadata={
                "replaces": old_edit.id,
                "before": old_edit.new_text,
                "after": new_edit.new_text,
                "old_text": new_edit.old_text,
            },
        ),
    )

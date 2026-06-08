"""Chat-first WebSocket message types (mirrors frontend agent-protocol.ts)."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import TypedDict

try:
    from typing import NotRequired
except ImportError:
    from typing_extensions import NotRequired


class SelectionContext(TypedDict, total=False):
    from_: int
    to: int
    text: str


class ChatContext(TypedDict, total=False):
    active_path: str
    buffer_snapshot: str
    filename: str
    selection: SelectionContext
    mentions: list[str]


class Replacement(TypedDict):
    old: str
    new: str


@dataclass
class SessionState:
    """Per-session document overlay and pending patch queue (not chat history)."""

    open_buffers: dict[str, str] = field(default_factory=dict)
    active_path: str | None = None
    pending_replacements: list[Replacement] = field(default_factory=list)

    def clear_pending_edits(self) -> None:
        self.pending_replacements.clear()

    def clear_buffers(self) -> None:
        self.open_buffers.clear()
        self.active_path = None

    def active_document(self) -> str:
        if self.active_path and self.active_path in self.open_buffers:
            return self.open_buffers[self.active_path]
        return ""


def apply_replacements(document: str, replacements: list[Replacement]) -> tuple[str, list[str]]:
    """Apply unique substring replacements. Returns (new_doc, errors)."""
    errors: list[str] = []
    result = document
    for rep in replacements:
        old = rep.get("old", "")
        new = rep.get("new", "")
        if not old:
            errors.append("Empty 'old' in replacement")
            continue
        count = result.count(old)
        if count == 0:
            errors.append(f"Text not found: {old[:40]!r}…")
        elif count > 1:
            errors.append(f"Text not unique ({count} matches): {old[:40]!r}…")
        else:
            result = result.replace(old, new, 1)
    return result, errors

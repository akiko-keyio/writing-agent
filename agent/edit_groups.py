"""EditGroup domain: the product's core edit lifecycle.

The agent *proposes* edits; the backend validates and owns the typed state. The
document buffer is never mutated by selecting individual candidates — a coherent
group is validated and applied through this module (apply-group model).

Anchoring is content-based (not offset-based): edits locate their target text in
the *current* buffer via the exact text plus optional prefix/suffix context and
heading/paragraph hints. This keeps apply offset-independent and lets the
frontend mirror the same stale rules.
"""

from __future__ import annotations

import hashlib
import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Literal

EditKind = Literal["replace", "delete", "insert"]

# Edit statuses. Removal is a single terminal state: ``dismissed``. An adjustment
# leaves the superseded edit ``dismissed`` with a ``replaced_by`` pointer — the
# pointer (not a separate status) distinguishes "wanted a different version" from
# a plain dismissal.
EDIT_PROPOSED = "proposed"
EDIT_APPLIED = "applied"
EDIT_STALE = "stale"
EDIT_DISMISSED = "dismissed"

# Group statuses.
GROUP_PROPOSED = "proposed"
GROUP_PARTIALLY_APPLIED = "partially_applied"
GROUP_APPLIED = "applied"
GROUP_DISMISSED = "dismissed"
GROUP_STALE = "stale"

RISK_LEVELS = {"low", "medium", "high"}

# Edit statuses that are still candidates for application.
_APPLICABLE = {EDIT_PROPOSED, EDIT_STALE}


class EditValidationError(ValueError):
    """Raised when a proposed edit/group cannot be validated against the buffer."""


def _new_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:10]}"


def content_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:16]


@dataclass
class EditAnchor:
    prefix_context: str = ""
    suffix_context: str = ""
    heading_path: list[str] = field(default_factory=list)
    paragraph_hint: str = ""
    content_hash: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "prefix_context": self.prefix_context,
            "suffix_context": self.suffix_context,
            "heading_path": list(self.heading_path),
            "paragraph_hint": self.paragraph_hint,
            "content_hash": self.content_hash,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any] | str | None) -> EditAnchor:
        if isinstance(data, str):
            if data:
                return cls(prefix_context=data)
            return cls()
        data = data or {}
        return cls(
            prefix_context=str(data.get("prefix_context", "")),
            suffix_context=str(data.get("suffix_context", "")),
            heading_path=list(data.get("heading_path", []) or []),
            paragraph_hint=str(data.get("paragraph_hint", "")),
            content_hash=str(data.get("content_hash", "")),
        )


@dataclass
class Edit:
    id: str
    kind: EditKind
    old_text: str = ""
    new_text: str = ""
    anchor: EditAnchor = field(default_factory=EditAnchor)
    replaces: str | None = None
    replaced_by: str | None = None
    rationale: str = ""
    risk: str = "low"
    status: str = EDIT_PROPOSED

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "kind": self.kind,
            "old_text": self.old_text,
            "new_text": self.new_text,
            "anchor": self.anchor.to_dict(),
            "replaces": self.replaces,
            "replaced_by": self.replaced_by,
            "rationale": self.rationale,
            "risk": self.risk,
            "status": self.status,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Edit:
        return cls(
            id=str(data.get("id") or _new_id("e")),
            kind=data.get("kind", "replace"),
            old_text=str(data.get("old_text", "")),
            new_text=str(data.get("new_text", "")),
            anchor=EditAnchor.from_dict(data.get("anchor")),
            replaces=data.get("replaces"),
            replaced_by=data.get("replaced_by"),
            rationale=str(data.get("rationale", "")),
            risk=str(data.get("risk", "low")),
            status=str(data.get("status", EDIT_PROPOSED)),
        )


@dataclass
class EditGroup:
    id: str
    session_id: str
    path: str
    title: str = ""
    summary: str = ""
    rationale: str = ""
    source_agent: str = ""
    confidence: float = 0.0
    status: str = GROUP_PROPOSED
    created_at: float = 0.0
    updated_at: float = 0.0
    edits: list[Edit] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "version": 1,
            "id": self.id,
            "session_id": self.session_id,
            "path": self.path,
            "title": self.title,
            "summary": self.summary,
            "rationale": self.rationale,
            "source_agent": self.source_agent,
            "confidence": self.confidence,
            "status": self.status,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "edits": [e.to_dict() for e in self.edits],
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> EditGroup:
        return cls(
            id=str(data.get("id") or _new_id("g")),
            session_id=str(data.get("session_id", "")),
            path=str(data.get("path", "")),
            title=str(data.get("title", "")),
            summary=str(data.get("summary", "")),
            rationale=str(data.get("rationale", "")),
            source_agent=str(data.get("source_agent", "")),
            confidence=float(data.get("confidence", 0.0)),
            status=str(data.get("status", GROUP_PROPOSED)),
            created_at=float(data.get("created_at", 0.0)),
            updated_at=float(data.get("updated_at", 0.0)),
            edits=[Edit.from_dict(e) for e in data.get("edits", [])],
        )

    def get_edit(self, edit_id: str) -> Edit | None:
        for e in self.edits:
            if e.id == edit_id:
                return e
        return None


# --------------------------------------------------------------------------
# Locating edits in a buffer (content-anchored, offset-independent)
# --------------------------------------------------------------------------


def _all_indices(haystack: str, needle: str) -> list[int]:
    if not needle:
        return []
    out: list[int] = []
    start = 0
    while True:
        i = haystack.find(needle, start)
        if i == -1:
            break
        out.append(i)
        start = i + 1
    return out


def _matches_prefix(buffer: str, start: int, prefix: str) -> bool:
    if not prefix:
        return True
    return start >= len(prefix) and buffer[start - len(prefix):start] == prefix


def _matches_suffix(buffer: str, end: int, suffix: str) -> bool:
    if not suffix:
        return True
    return buffer[end:end + len(suffix)] == suffix


def _heading_ok(buffer: str, start: int, heading_path: list[str]) -> bool:
    """Loose narrowing: the last heading before ``start`` should match the deepest
    heading in ``heading_path`` (markdown ``#`` lines)."""
    if not heading_path:
        return True
    target = heading_path[-1].strip().lstrip("#").strip()
    if not target:
        return True
    prefix = buffer[:start]
    last_heading = ""
    for line in prefix.splitlines():
        stripped = line.strip()
        if stripped.startswith("#"):
            last_heading = stripped.lstrip("#").strip()
    return last_heading == target


@dataclass
class _Span:
    edit: Edit
    start: int
    end: int
    new_text: str


def _locate_replace_spans(buffer: str, edit: Edit) -> list[tuple[int, int]]:
    """Return candidate (start, end) spans for a replace/delete edit."""
    candidates = _all_indices(buffer, edit.old_text)
    spans: list[tuple[int, int]] = []
    for i in candidates:
        end = i + len(edit.old_text)
        if not _matches_prefix(buffer, i, edit.anchor.prefix_context):
            continue
        if not _matches_suffix(buffer, end, edit.anchor.suffix_context):
            continue
        if not _heading_ok(buffer, i, edit.anchor.heading_path):
            continue
        spans.append((i, end))
    return spans


def _locate_insert_points(buffer: str, edit: Edit) -> list[int]:
    """Return candidate insertion indices for an insert edit (anchor-only)."""
    prefix = edit.anchor.prefix_context
    suffix = edit.anchor.suffix_context
    points: list[int] = []
    if prefix and suffix:
        joined = prefix + suffix
        for i in _all_indices(buffer, joined):
            point = i + len(prefix)
            if _heading_ok(buffer, point, edit.anchor.heading_path):
                points.append(point)
    elif prefix:
        for i in _all_indices(buffer, prefix):
            point = i + len(prefix)
            if _heading_ok(buffer, point, edit.anchor.heading_path):
                points.append(point)
    elif suffix:
        for i in _all_indices(buffer, suffix):
            if _heading_ok(buffer, i, edit.anchor.heading_path):
                points.append(i)
    return points


@dataclass
class LocateResult:
    """Outcome of locating one edit in a buffer."""

    status: Literal["ok", "not_found", "ambiguous", "invalid"]
    start: int = -1
    end: int = -1


def locate_edit(buffer: str, edit: Edit) -> LocateResult:
    """Locate one edit in the current buffer using content anchors."""
    if edit.kind in ("replace", "delete"):
        if not edit.old_text:
            return LocateResult("invalid")
        spans = _locate_replace_spans(buffer, edit)
        if not spans:
            return LocateResult("not_found")
        if len(spans) > 1:
            return LocateResult("ambiguous")
        start, end = spans[0]
        return LocateResult("ok", start, end)
    if edit.kind == "insert":
        if not (edit.anchor.prefix_context or edit.anchor.suffix_context):
            return LocateResult("invalid")
        points = _locate_insert_points(buffer, edit)
        if not points:
            return LocateResult("not_found")
        if len(points) > 1:
            return LocateResult("ambiguous")
        return LocateResult("ok", points[0], points[0])
    return LocateResult("invalid")


def _new_text_for(edit: Edit) -> str:
    if edit.kind == "delete":
        return ""
    return edit.new_text


# --------------------------------------------------------------------------
# Group construction (validation at creation time)
# --------------------------------------------------------------------------


def _normalize_raw_edit(raw: dict[str, Any]) -> dict[str, Any]:
    """Normalize a raw edit dict before parsing.

    Handles common LLM mistakes: bare-string anchor, 'position' field used
    instead of proper anchor object, and missing anchor for insert kind.
    """
    if not isinstance(raw, dict):
        raise EditValidationError(
            f"Each edit must be a dict, got {type(raw).__name__}."
        )
    anchor = raw.get("anchor")
    position = raw.pop("position", None)
    if raw.get("kind") == "insert" and not anchor and raw.get("old_text"):
        old = raw.pop("old_text")
        if position == "before":
            anchor = {"suffix_context": old}
        else:
            anchor = {"prefix_context": old}
        raw["anchor"] = anchor
    elif isinstance(anchor, str) and anchor:
        if position == "before":
            raw["anchor"] = {"suffix_context": anchor}
        else:
            raw["anchor"] = {"prefix_context": anchor}
    return raw


def build_group(
    *,
    session_id: str,
    path: str,
    buffer: str,
    edits: list[dict[str, Any]],
    title: str = "",
    summary: str = "",
    rationale: str = "",
    source_agent: str = "",
    confidence: float = 0.0,
) -> EditGroup:
    """Validate proposed edits against ``buffer`` and build a stored group.

    Raises:
        EditValidationError: any edit is invalid, not found, ambiguous without a
            disambiguating anchor, or overlaps another edit at creation time.
    """
    if not edits:
        raise EditValidationError("An edit group must contain at least one edit.")

    now = time.time()
    group = EditGroup(
        id=_new_id("g"),
        session_id=session_id,
        path=path,
        title=title,
        summary=summary,
        rationale=rationale,
        source_agent=source_agent,
        confidence=float(confidence),
        status=GROUP_PROPOSED,
        created_at=now,
        updated_at=now,
    )

    spans: list[tuple[int, int]] = []
    for raw in edits:
        raw = _normalize_raw_edit(raw)
        edit = Edit.from_dict({**raw, "id": raw.get("id") or _new_id("e")})
        if edit.kind not in ("replace", "delete", "insert"):
            raise EditValidationError(f"Unknown edit kind: {edit.kind!r}")
        if edit.risk not in RISK_LEVELS:
            edit.risk = "low"
        if not edit.anchor.content_hash and edit.old_text:
            edit.anchor.content_hash = content_hash(edit.old_text)

        result = locate_edit(buffer, edit)
        if result.status == "invalid":
            raise EditValidationError(
                f"Edit {edit.id}: missing required text/anchor for kind {edit.kind!r}.",
            )
        if result.status == "not_found":
            raise EditValidationError(
                f"Edit {edit.id}: target text not found in the current buffer.",
            )
        if result.status == "ambiguous":
            raise EditValidationError(
                f"Edit {edit.id}: target text is ambiguous; provide prefix/suffix anchor.",
            )
        spans.append((result.start, result.end))
        group.edits.append(edit)

    _reject_overlaps(spans)
    return group


def _reject_overlaps(spans: list[tuple[int, int]]) -> None:
    ordered = sorted(spans, key=lambda s: (s[0], s[1]))
    for (a_start, a_end), (b_start, b_end) in zip(ordered, ordered[1:]):
        # Overlap if the next span starts strictly before the previous one ends.
        # Touching spans (a_end == b_start) and pure insertions at the same point
        # of distinct zero-width edits are allowed only if not strictly nested.
        if b_start < a_end:
            raise EditValidationError("Overlapping edits are not allowed in one group.")


# --------------------------------------------------------------------------
# Stale refresh + apply
# --------------------------------------------------------------------------


def refresh_group(group: EditGroup, buffer: str) -> EditGroup:
    """Recompute edit/group status against the current buffer (stale detection).

    Terminal edits (applied/dismissed) are left untouched.
    """
    active = False
    stale = False
    for edit in group.edits:
        if edit.status not in _APPLICABLE:
            continue
        result = locate_edit(buffer, edit)
        if result.status == "ok":
            edit.status = EDIT_PROPOSED
            active = True
        else:
            edit.status = EDIT_STALE
            stale = True

    if group.status in (GROUP_APPLIED, GROUP_DISMISSED):
        return group
    if active:
        group.status = GROUP_PROPOSED
    elif stale:
        group.status = GROUP_STALE
    group.updated_at = time.time()
    return group


def apply_group(group: EditGroup, buffer: str) -> tuple[str, EditGroup]:
    """Apply all eligible edits to ``buffer`` (offset-independent).

    Returns the new buffer and the mutated group. Does not write disk.

    Raises:
        EditValidationError: the group is already applied (re-apply rejected).
    """
    if group.status == GROUP_APPLIED:
        raise EditValidationError("Group is already applied.")
    if group.status == GROUP_DISMISSED:
        raise EditValidationError(f"Cannot apply a {group.status} group.")

    spans: list[_Span] = []
    applied_any = False
    stale_any = False
    eligible_any = False

    for edit in group.edits:
        if edit.status not in _APPLICABLE:
            continue
        eligible_any = True
        result = locate_edit(buffer, edit)
        if result.status == "ok":
            spans.append(_Span(edit, result.start, result.end, _new_text_for(edit)))
        else:
            edit.status = EDIT_STALE
            stale_any = True

    # Apply from the highest start offset downward so earlier offsets are stable.
    spans.sort(key=lambda s: s.start, reverse=True)
    new_buffer = buffer
    for span in spans:
        new_buffer = new_buffer[: span.start] + span.new_text + new_buffer[span.end:]
        span.edit.status = EDIT_APPLIED
        applied_any = True

    if applied_any and stale_any:
        group.status = GROUP_PARTIALLY_APPLIED
    elif applied_any:
        group.status = GROUP_APPLIED
    elif eligible_any:
        group.status = GROUP_STALE
    group.updated_at = time.time()
    return new_buffer, group


def dismiss_group(group: EditGroup) -> EditGroup:
    """Dismiss a group. Applicable edits become ``dismissed`` (keeping any
    ``replaced_by`` pointer). This is a neutral group-level removal."""
    group.status = GROUP_DISMISSED
    for edit in group.edits:
        if edit.status in _APPLICABLE:
            edit.status = EDIT_DISMISSED
    group.updated_at = time.time()
    return group


def reject_edit(group: EditGroup, edit_id: str) -> Edit:
    """Reject one edit while keeping any remaining candidates reviewable."""
    edit = group.get_edit(edit_id)
    if edit is None:
        raise EditValidationError(f"Edit not found: {edit_id}")
    if edit.status not in _APPLICABLE:
        raise EditValidationError(f"Cannot reject a {edit.status} edit.")

    edit.status = EDIT_DISMISSED
    if all(e.status == EDIT_DISMISSED for e in group.edits):
        group.status = GROUP_DISMISSED
    elif any(e.status in _APPLICABLE for e in group.edits):
        group.status = GROUP_PROPOSED
    group.updated_at = time.time()
    return edit


def replace_edit(
    group: EditGroup,
    edit_id: str,
    new_fields: dict[str, Any],
    buffer: str,
) -> Edit:
    """Supersede ``edit_id`` with a new validated edit, linking replace lineage.

    The old edit becomes ``deleted`` with ``replaced_by`` set; the new edit
    carries ``replaces`` pointing back. Memory uses this pointer to distinguish a
    dismissal (no pointer) from "user wanted a different version" (pointer).
    """
    old = group.get_edit(edit_id)
    if old is None:
        available = [e.id for e in group.edits if e.status == EDIT_PROPOSED]
        raise EditValidationError(
            f"Edit not found: {edit_id}. "
            f"Available edit IDs in group {group.id}: {available}"
        )

    new_edit = Edit.from_dict({**new_fields, "id": _new_id("e")})
    if not new_edit.anchor.content_hash and new_edit.old_text:
        new_edit.anchor.content_hash = content_hash(new_edit.old_text)
    result = locate_edit(buffer, new_edit)
    if result.status != "ok":
        raise EditValidationError(
            f"Replacement edit could not be validated: {result.status}",
        )
    new_edit.replaces = old.id
    new_edit.status = EDIT_PROPOSED
    old.replaced_by = new_edit.id
    old.status = EDIT_DISMISSED
    group.edits.append(new_edit)
    group.updated_at = time.time()
    return new_edit

"""Strands tools for the writing IDE agent."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from strands import tool
from strands.types.tools import ToolContext

from project_root import normalize_workspace_path, resolve_workspace_path
from strands_file_read_adapter import (
    SUPPORTED_READ_MODES,
    ReadMode,
    apply_read_mode_to_text,
    read_path_content,
)

MAX_READ_BYTES = 512_000
REFERENCES_DIR = "references"
DEFAULT_SEARCH_MAX_RESULTS = 8


def _queue_tool_event(tool_context: ToolContext, payload: dict[str, Any]) -> None:
    queue = tool_context.invocation_state.get("outbound_queue")
    if isinstance(queue, list):
        queue.append(payload)


def _handle_tool_error(
    tool_context: ToolContext,
    tool_id: str,
    path: str,
    msg: str,
    *,
    tool_name: str | None = None,
) -> dict[str, Any]:
    name = tool_name or tool_context.tool_use.get("name", "tool")
    _queue_tool_event(
        tool_context,
        {
            "type": "chat/tool_end",
            "tool_id": tool_id,
            "name": name,
            "status": "error",
            "error": msg,
            "output": {"path": path, "error": msg},
        },
    )
    return {"status": "error", "content": [{"text": msg}]}


def _project_root(tool_context: ToolContext) -> Path:
    root = tool_context.invocation_state.get("project_root")
    if isinstance(root, Path):
        return root
    if isinstance(root, str) and root.strip():
        return Path(root).resolve()
    raise ValueError("Project root is not configured on this connection.")


def _memory_store(tool_context: ToolContext):
    store = tool_context.invocation_state.get("memory_store")
    if store is None:
        raise ValueError("Memory store is not configured on this connection.")
    return store


@tool(context=True)
def read_document(
    path: str,
    tool_context: ToolContext,
    mode: ReadMode = "view",
    search_pattern: str | None = None,
    start_line: int | None = None,
    end_line: int | None = None,
    context_lines: int = 2,
) -> dict[str, Any]:
    """Read a text file under the project root.

    Paths are relative to project_root. Open editor buffers take priority
    over disk. Use this to inspect drafts; do not assume file contents
    without reading.

    Modes (Strands ``file_read`` on disk; same semantics on open buffers):

    - ``view`` — full file (default)
    - ``lines`` — line range via ``start_line`` / ``end_line`` (0-based)
    - ``search`` — regex search with ``search_pattern`` and ``context_lines``

    Args:
        path: Project-relative file path.
        mode: Reading mode — view, lines, or search.
        search_pattern: Regex pattern when mode is search.
        start_line: Start line (0-based) when mode is lines.
        end_line: End line (inclusive) when mode is lines.
        context_lines: Context lines around search hits.

    Returns:
        File contents and metadata for the model.
    """
    tool_use = tool_context.tool_use
    tool_id = tool_use["toolUseId"]
    name = tool_use.get("name", "read_document")

    if mode not in SUPPORTED_READ_MODES:
        return _handle_tool_error(
            tool_context,
            tool_id,
            path,
            f"Unsupported mode: {mode}. Use view, lines, or search.",
            tool_name=name,
        )

    tool_input: dict[str, Any] = {"path": path, "mode": mode}
    if search_pattern is not None:
        tool_input["search_pattern"] = search_pattern
    if start_line is not None:
        tool_input["start_line"] = start_line
    if end_line is not None:
        tool_input["end_line"] = end_line
    if context_lines != 2:
        tool_input["context_lines"] = context_lines

    _queue_tool_event(
        tool_context,
        {
            "type": "chat/tool_start",
            "tool_id": tool_id,
            "name": name,
            "input": tool_input,
        },
    )

    try:
        session = tool_context.invocation_state.get("session")
        norm_path = normalize_workspace_path(path)
        source = "buffer"

        if (
            session is not None
            and hasattr(session, "open_buffers")
            and norm_path in session.open_buffers
        ):
            raw_text = session.open_buffers[norm_path]
            text, read_error = apply_read_mode_to_text(
                raw_text,
                mode=mode,
                search_pattern=search_pattern,
                start_line=start_line,
                end_line=end_line,
                context_lines=context_lines,
            )
            if text is None:
                return _handle_tool_error(
                    tool_context,
                    tool_id,
                    path,
                    read_error or "Could not read buffer",
                    tool_name=name,
                )
            size_bytes = len(raw_text.encode("utf-8"))
        else:
            root = _project_root(tool_context)
            abs_path = resolve_workspace_path(root, path)
            source = "disk"

            if not abs_path.is_file():
                return _handle_tool_error(
                    tool_context,
                    tool_id,
                    path,
                    f"Not a file: {path}",
                    tool_name=name,
                )

            file_size = abs_path.stat().st_size
            if mode == "view" and file_size > MAX_READ_BYTES:
                return _handle_tool_error(
                    tool_context,
                    tool_id,
                    path,
                    f"File too large ({file_size} bytes, max {MAX_READ_BYTES})",
                    tool_name=name,
                )

            text, read_error = read_path_content(
                abs_path,
                mode=mode,
                search_pattern=search_pattern,
                start_line=start_line,
                end_line=end_line,
                context_lines=context_lines,
            )
            if text is None:
                return _handle_tool_error(
                    tool_context,
                    tool_id,
                    path,
                    read_error or f"Could not read: {path}",
                    tool_name=name,
                )
            size_bytes = file_size if mode == "view" else len(text.encode("utf-8"))

        _queue_tool_event(
            tool_context,
            {
                "type": "chat/tool_end",
                "tool_id": tool_id,
                "name": name,
                "status": "completed",
                "output": {
                    "path": norm_path,
                    "mode": mode,
                    "size_bytes": size_bytes,
                    "source": source,
                    "preview": text[:2000] + ("…" if len(text) > 2000 else ""),
                },
            },
        )
        return {
            "status": "success",
            "content": [
                {
                    "text": (
                        f"Read {norm_path} ({size_bytes} bytes, "
                        f"{len(text.splitlines())} lines, {source}, mode={mode}).\n\n"
                        f"{text}"
                    ),
                },
            ],
        }
    except Exception as exc:
        return _handle_tool_error(tool_context, tool_id, path, str(exc), tool_name=name)


def _lexical_terms(query: str) -> list[str]:
    return [part.lower() for part in query.split() if part.strip()]


def _line_matches_terms(line: str, terms: list[str]) -> bool:
    lowered = line.lower()
    return all(term in lowered for term in terms)


@tool(context=True)
def search_references(
    query: str,
    tool_context: ToolContext,
    max_results: int = DEFAULT_SEARCH_MAX_RESULTS,
) -> dict[str, Any]:
    """Lexical search over markdown files in the project's ``references/`` folder.

    Returns matching line snippets with paths. Use ``read_document`` to load
    a full reference file after locating a hit.

    Args:
        query: Space-separated terms (all must appear on a line).
        max_results: Maximum number of matching lines to return.
    """
    tool_use = tool_context.tool_use
    tool_id = tool_use["toolUseId"]
    name = tool_use.get("name", "search_references")
    terms = _lexical_terms(query)

    tool_input = {"query": query, "max_results": max_results}
    _queue_tool_event(
        tool_context,
        {
            "type": "chat/tool_start",
            "tool_id": tool_id,
            "name": name,
            "input": tool_input,
        },
    )

    if not terms:
        return _handle_tool_error(
            tool_context,
            tool_id,
            REFERENCES_DIR,
            "query must include at least one search term",
            tool_name=name,
        )

    try:
        root = _project_root(tool_context)
        refs_dir = root / REFERENCES_DIR
        if not refs_dir.is_dir():
            return _handle_tool_error(
                tool_context,
                tool_id,
                REFERENCES_DIR,
                f"No {REFERENCES_DIR}/ directory under project root",
                tool_name=name,
            )

        hits: list[dict[str, str | int]] = []
        for file_path in sorted(refs_dir.rglob("*.md")):
            if not file_path.is_file():
                continue
            try:
                rel = file_path.relative_to(root).as_posix()
                lines = file_path.read_text(encoding="utf-8").splitlines()
            except OSError:
                continue
            for line_no, line in enumerate(lines, start=1):
                if not _line_matches_terms(line, terms):
                    continue
                hits.append(
                    {
                        "path": rel,
                        "line": line_no,
                        "text": line.strip(),
                    },
                )
                if len(hits) >= max(1, min(max_results, 32)):
                    break
            if len(hits) >= max(1, min(max_results, 32)):
                break

        output = {
            "query": query,
            "terms": terms,
            "hit_count": len(hits),
            "hits": hits,
        }
        summary = (
            f"Found {len(hits)} line(s) in {REFERENCES_DIR}/ for {terms!r}."
            if hits
            else f"No lines in {REFERENCES_DIR}/ matched all terms {terms!r}."
        )

        _queue_tool_event(
            tool_context,
            {
                "type": "chat/tool_end",
                "tool_id": tool_id,
                "name": name,
                "status": "completed",
                "output": output,
            },
        )
        return {
            "status": "success",
            "content": [{"text": summary + "\n\n" + str(hits)}],
        }
    except Exception as exc:
        return _handle_tool_error(
            tool_context,
            tool_id,
            REFERENCES_DIR,
            str(exc),
            tool_name=name,
        )


def _format_reference_report_summary(report: Any) -> str:
    """Human-readable summary for the model and chat tool output."""
    if report.ok:
        return f"Reference check for {report.path}: OK — no issues found."
    lines = [
        f"Reference check for {report.path}: {len(report.findings)} issue(s) found.",
        "",
    ]
    for finding in report.findings:
        line = f"[{finding.kind}] {finding.message}"
        if finding.detail:
            line += f" — {finding.detail}"
        lines.append(line)
    return "\n".join(lines)


@tool(context=True)
def check_references(
    path: str,
    tool_context: ToolContext,
    offline: bool = False,
) -> dict[str, Any]:
    """Check external references in a markdown document.

    Validates DOI reachability (CrossRef), URL accessibility, consistency with
    the project's ``references/`` folder, and flags claims that may lack local
    evidence. Does not modify the document.

    Args:
        path: Project-relative markdown file path.
        offline: When true, skip network checks (local corpus + claim overlap only).
    """
    from reference_check import check_text, urllib_fetcher

    tool_use = tool_context.tool_use
    tool_id = tool_use["toolUseId"]
    name = tool_use.get("name", "check_references")

    _queue_tool_event(
        tool_context,
        {
            "type": "chat/tool_start",
            "tool_id": tool_id,
            "name": name,
            "input": {"path": path, "offline": offline},
        },
    )

    try:
        session = tool_context.invocation_state.get("session")
        root = _project_root(tool_context)
        norm_path = normalize_workspace_path(path)
        source = "disk"
        text: str | None = None

        if (
            session is not None
            and hasattr(session, "open_buffers")
            and norm_path in session.open_buffers
        ):
            text = session.open_buffers[norm_path]
            source = "buffer"
        else:
            abs_path = resolve_workspace_path(root, path)
            if not abs_path.is_file():
                return _handle_tool_error(
                    tool_context,
                    tool_id,
                    path,
                    f"Not a file: {path}",
                    tool_name=name,
                )
            text = abs_path.read_text(encoding="utf-8")

        online = not offline
        fetcher = None if offline else urllib_fetcher()
        report = check_text(
            text,
            project_root=root,
            path_label=norm_path,
            fetcher=fetcher,
            online=online,
        )
        summary = _format_reference_report_summary(report)
        output = {
            "path": norm_path,
            "source": source,
            "offline": offline,
            "ok": report.ok,
            "finding_count": len(report.findings),
            "findings": [f.to_dict() for f in report.findings],
            "summary": summary,
        }

        _queue_tool_event(
            tool_context,
            {
                "type": "chat/tool_end",
                "tool_id": tool_id,
                "name": name,
                "status": "completed",
                "output": output,
            },
        )
        return {
            "status": "success",
            "content": [{"text": summary}],
        }
    except Exception as exc:
        return _handle_tool_error(tool_context, tool_id, path, str(exc), tool_name=name)


import re as _re

_SENTENCE_END_RE = _re.compile(r'[.!?;]\s')
_GRANULARITY_CHAR_THRESHOLD = 250
_GRANULARITY_SENTENCE_THRESHOLD = 3


def _check_edit_granularity(group) -> str:
    """Return a warning string if any edit looks too coarse (paragraph-level)."""
    from edit_groups import EditGroup
    coarse: list[str] = []
    for e in group.edits:
        if e.kind != "replace" or not e.old_text:
            continue
        if len(e.old_text) < _GRANULARITY_CHAR_THRESHOLD:
            continue
        sentence_breaks = len(_SENTENCE_END_RE.findall(e.old_text))
        if sentence_breaks >= _GRANULARITY_SENTENCE_THRESHOLD:
            coarse.append(
                f"{e.id} spans ~{sentence_breaks + 1} sentences "
                f"({len(e.old_text)} chars)"
            )
    if not coarse:
        return ""
    return (
        f"{len(coarse)} edit(s) appear paragraph-level: "
        + "; ".join(coarse)
        + ". Split on sentence boundaries — one old_text per sentence — "
        "so the user can accept or reject each independently."
    )


@tool(context=True)
def propose_edits(
    path: str,
    edits: list[dict[str, Any]],
    tool_context: ToolContext,
    title: str = "",
    summary: str = "",
    rationale: str = "",
    confidence: float = 0.5,
) -> dict[str, Any]:
    """Propose a coherent group of document edits for user review.

    The document is not modified until the user applies the group. Each edit
    needs ``kind``, ``old_text``/``new_text`` as appropriate, and optional
    ``anchor`` (prefix/suffix context) when text repeats.

    Args:
        path: Project-relative document path.
        edits: Non-empty list of edit objects.
        title: Short card headline (≤8 words).
        summary: One-line card subtitle (≤120 chars).
        rationale: Optional why-this-helps sentence.
        confidence: 0.0-1.0 confidence in the proposal.
    """
    from edit_group_service import EditGroupService
    from edit_groups import EditValidationError

    tool_use = tool_context.tool_use
    tool_id = tool_use["toolUseId"]
    name = tool_use.get("name", "propose_edits")
    inv = tool_context.invocation_state

    _queue_tool_event(
        tool_context,
        {
            "type": "chat/tool_start",
            "tool_id": tool_id,
            "name": name,
            "input": {"path": path, "edit_count": len(edits) if isinstance(edits, list) else 0},
        },
    )

    session = inv.get("session")
    session_id = str(inv.get("session_id") or "")
    service = inv.get("edit_service")
    if service is None:
        service = EditGroupService(project_root=_project_root(tool_context))

    if not isinstance(edits, list) or not edits:
        return _handle_tool_error(
            tool_context, tool_id, path, "edits must be a non-empty list",
        )

    try:
        group = service.propose(
            session,
            session_id=session_id,
            path=path,
            edits=edits,
            title=title,
            summary=summary,
            rationale=rationale,
            source_agent=str(inv.get("source_agent", "")),
            confidence=float(confidence),
        )
    except (EditValidationError, ValueError) as exc:
        return _handle_tool_error(tool_context, tool_id, path, str(exc))

    _queue_tool_event(
        tool_context,
        {
            "type": "group/propose",
            "group": group.to_dict(),
            "request_id": inv.get("request_id"),
        },
    )
    _queue_tool_event(
        tool_context,
        {
            "type": "chat/tool_end",
            "tool_id": tool_id,
            "status": "completed",
            "output": {
                "group_id": group.id,
                "path": group.path,
                "edit_count": len(group.edits),
            },
        },
    )
    edit_ids = ", ".join(e.id for e in group.edits)
    granularity_warning = _check_edit_granularity(group)
    msg = (
        f"Proposed edit group {group.id} for {group.path} with "
        f"{len(group.edits)} edit(s): [{edit_ids}]. Awaiting user "
        f"review; the document is unchanged until the user applies it."
    )
    if granularity_warning:
        msg += f"\n\n⚠️ GRANULARITY WARNING: {granularity_warning}"
    return {
        "status": "success",
        "content": [{"text": msg}],
    }


@tool(context=True)
def revise_edit(
    group_id: str,
    edit_id: str,
    edit: dict[str, Any],
    tool_context: ToolContext,
) -> dict[str, Any]:
    """Replace one existing edit proposal after user feedback.

    Use when the user rejected or asked to adjust a specific edit in chat.
    Validates against the current buffer; preserves ``replaces`` lineage.

    Args:
        group_id: Edit group id from a prior ``propose_edits`` call.
        edit_id: Id of the edit to replace inside the group.
        edit: New edit fields (``kind``, ``old_text``, ``new_text``, optional ``anchor``).
    """
    from edit_group_service import EditGroupService
    from edit_groups import EditValidationError

    tool_use = tool_context.tool_use
    tool_id = tool_use["toolUseId"]
    name = tool_use.get("name", "revise_edit")
    inv = tool_context.invocation_state

    _queue_tool_event(
        tool_context,
        {
            "type": "chat/tool_start",
            "tool_id": tool_id,
            "name": name,
            "input": {"group_id": group_id, "edit_id": edit_id},
        },
    )

    session = inv.get("session")
    service = inv.get("edit_service")
    if service is None:
        service = EditGroupService(project_root=_project_root(tool_context))

    if not isinstance(edit, dict):
        return _handle_tool_error(
            tool_context, tool_id, group_id, "edit must be an object",
        )

    existing = service.get(group_id)
    old_edit = existing.get_edit(edit_id) if existing else None

    try:
        group, new_edit = service.replace_edit(session, group_id, edit_id, edit)
    except EditValidationError as exc:
        return _handle_tool_error(tool_context, tool_id, group_id, str(exc))

    if old_edit is not None:
        store = inv.get("memory_store")
        if store is not None:
            try:
                from memory_store import learn_from_replace

                learn_from_replace(store, group, old_edit, new_edit)
            except Exception:  # noqa: BLE001
                pass

    _queue_tool_event(
        tool_context,
        {"type": "group/update", "group": group.to_dict()},
    )
    _queue_tool_event(
        tool_context,
        {
            "type": "chat/tool_end",
            "tool_id": tool_id,
            "status": "completed",
            "output": {
                "group_id": group.id,
                "edit_id": new_edit.id,
                "replaces": edit_id,
            },
        },
    )
    return {
        "status": "success",
        "content": [
            {
                "text": (
                    f"Revised edit {edit_id} in group {group_id}; new edit id "
                    f"{new_edit.id}. Awaiting user review."
                ),
            },
        ],
    }


@tool(context=True)
def remember_context(
    content: str,
    category: str,
    tool_context: ToolContext,
    path: str = "",
) -> dict[str, Any]:
    """Record cross-session knowledge visible in Settings → Memory.

    Use for target reader profile, domain terminology, or project facts the
    user confirmed. Do not store writing principles here — use
    ``propose_principle`` instead.

    Args:
        content: The knowledge to remember (one concise statement).
        category: One of ``reader``, ``terminology``, ``domain``.
        path: Document path when the fact is document-specific; omit for global.
    """
    from memory_store import KIND_KNOWLEDGE, SCOPE_DOCUMENT, SCOPE_GLOBAL, MemoryEntry

    tool_use = tool_context.tool_use
    tool_id = tool_use["toolUseId"]
    name = tool_use.get("name", "remember_context")

    _queue_tool_event(
        tool_context,
        {
            "type": "chat/tool_start",
            "tool_id": tool_id,
            "name": name,
            "input": {"category": category, "path": path or None},
        },
    )

    text = content.strip()
    if not text:
        return _handle_tool_error(tool_context, tool_id, "", "content is required")

    cat = category.strip().lower()
    if cat not in {"reader", "terminology", "domain"}:
        return _handle_tool_error(
            tool_context, tool_id, "", f"Unknown category: {category}",
        )

    try:
        store = _memory_store(tool_context)
    except ValueError as exc:
        return _handle_tool_error(tool_context, tool_id, "", str(exc))

    norm_path = None
    scope = SCOPE_GLOBAL
    if path.strip():
        try:
            norm_path = normalize_workspace_path(path)
            scope = SCOPE_DOCUMENT
        except ValueError as exc:
            return _handle_tool_error(tool_context, tool_id, path, str(exc))

    entry = store.add(
        MemoryEntry(
            id="",
            kind=KIND_KNOWLEDGE,
            scope=scope,
            content=text,
            path=norm_path,
            source="remember_context",
            metadata={"category": cat},
        ),
    )

    _queue_tool_event(
        tool_context,
        {
            "type": "memory/data",
            "enabled": store.is_enabled(),
            "memory": store.export(),
        },
    )
    _queue_tool_event(
        tool_context,
        {
            "type": "chat/tool_end",
            "tool_id": tool_id,
            "status": "completed",
            "output": {"entry_id": entry.id, "category": cat},
        },
    )
    return {
        "status": "success",
        "content": [
            {
                "text": (
                    f"Recorded {cat} knowledge (id {entry.id}). "
                    f"Visible in Settings → Memory."
                ),
            },
        ],
    }


@tool(context=True)
def propose_principle(
    content: str,
    rationale: str,
    case_ids: list[str],
    tool_context: ToolContext,
) -> dict[str, Any]:
    """Propose a candidate writing principle from observed edit cases.

    The candidate appears in Settings → Memory for user Accept/Reject.
    It is NOT injected into prompts until the user confirms.

    Args:
        content: Proposed principle text (one reusable rule).
        rationale: Why these cases support the principle.
        case_ids: Memory example ids that motivated this proposal.
    """
    from memory_store import propose_candidate_principle

    tool_use = tool_context.tool_use
    tool_id = tool_use["toolUseId"]
    name = tool_use.get("name", "propose_principle")

    _queue_tool_event(
        tool_context,
        {
            "type": "chat/tool_start",
            "tool_id": tool_id,
            "name": name,
            "input": {"case_count": len(case_ids) if isinstance(case_ids, list) else 0},
        },
    )

    text = content.strip()
    if not text:
        return _handle_tool_error(tool_context, tool_id, "", "content is required")

    ids = [str(i).strip() for i in (case_ids or []) if str(i).strip()]

    try:
        store = _memory_store(tool_context)
    except ValueError as exc:
        return _handle_tool_error(tool_context, tool_id, "", str(exc))

    entry = propose_candidate_principle(
        store,
        content=text,
        rationale=rationale.strip(),
        case_ids=ids,
    )

    _queue_tool_event(
        tool_context,
        {
            "type": "memory/data",
            "enabled": store.is_enabled(),
            "memory": store.export(),
        },
    )
    _queue_tool_event(
        tool_context,
        {
            "type": "chat/tool_end",
            "tool_id": tool_id,
            "status": "completed",
            "output": {"candidate_id": entry.id, "case_ids": ids},
        },
    )
    return {
        "status": "success",
        "content": [
            {
                "text": (
                    f"Proposed candidate principle {entry.id} for user review. "
                    f"It will not affect prompts until accepted in Settings → Memory."
                ),
            },
        ],
    }


#: Read-only tools for isolated specialists (review sub-agent).
READONLY_TOOLS = [read_document, search_references, check_references]

#: MVP tool set for the main writing agent.
WRITING_TOOLS = [
    read_document,
    check_references,
    propose_edits,
    revise_edit,
    remember_context,
    propose_principle,
]


def get_enabled_writing_tools() -> list:
    """Return built-in tools that are enabled in tools.yaml."""
    from tool_manager import get_enabled_tool_ids

    enabled = get_enabled_tool_ids()
    return [tool for tool in WRITING_TOOLS if tool.tool_name in enabled]

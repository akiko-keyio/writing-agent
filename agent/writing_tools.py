"""Strands tools for the writing IDE agent."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from strands import tool
from strands.types.tools import ToolContext

from project_root import normalize_workspace_path, resolve_workspace_path

MAX_READ_BYTES = 512_000


def _queue_tool_event(tool_context: ToolContext, payload: dict[str, Any]) -> None:
    queue = tool_context.invocation_state.get("outbound_queue")
    if isinstance(queue, list):
        queue.append(payload)


def _handle_tool_error(
    tool_context: ToolContext, tool_id: str, path: str, msg: str
) -> dict[str, Any]:
    _queue_tool_event(
        tool_context,
        {
            "type": "chat/tool_end",
            "tool_id": tool_id,
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


@tool(context=True)
def read_file(path: str, tool_context: ToolContext) -> dict[str, Any]:
    """Read a text file under the project root.

    Paths are relative to project_root (e.g. ``examples/test-text.md``).
    Use this to inspect drafts; do not assume file contents without reading.

    Args:
        path: Project-relative file path.

    Returns:
        File contents and metadata for the model.
    """
    tool_use = tool_context.tool_use
    tool_id = tool_use["toolUseId"]
    name = tool_use.get("name", "read_file")

    _queue_tool_event(
        tool_context,
        {
            "type": "chat/tool_start",
            "tool_id": tool_id,
            "name": name,
            "input": {"path": path},
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
            text = session.open_buffers[norm_path]
            size_bytes = len(text.encode("utf-8"))
            abs_path = None
        else:
            root = _project_root(tool_context)
            abs_path = resolve_workspace_path(root, path)
            source = "disk"

            if not abs_path.is_file():
                return _handle_tool_error(tool_context, tool_id, path, f"Not a file: {path}")

            raw = abs_path.read_bytes()
            if len(raw) > MAX_READ_BYTES:
                return _handle_tool_error(
                    tool_context,
                    tool_id,
                    path,
                    f"File too large ({len(raw)} bytes, max {MAX_READ_BYTES})",
                )

            text = raw.decode("utf-8")
            size_bytes = len(raw)

        output = {
            "path": norm_path,
            "absolute_path": str(abs_path) if abs_path else None,
            "size_bytes": size_bytes,
            "source": source,
            "content": text,
        }
        _queue_tool_event(
            tool_context,
            {
                "type": "chat/tool_end",
                "tool_id": tool_id,
                "status": "completed",
                "output": {
                    "path": norm_path,
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
                        f"{len(text.splitlines())} lines, {source}).\n\n"
                        f"{text}"
                    ),
                },
            ],
        }
    except Exception as exc:
        return _handle_tool_error(tool_context, tool_id, path, str(exc))


@tool(context=True)
def propose_edit_group(
    path: str,
    edits: list[dict[str, Any]],
    tool_context: ToolContext,
    title: str = "",
    summary: str = "",
    rationale: str = "",
    confidence: float = 0.5,
) -> dict[str, Any]:
    """Propose a coherent group of document edits for user review.

    Use this ONLY to change document text. Never claim you changed a file
    directly — the backend validates every edit against the current buffer and
    the user applies the group. The document is not modified until the user
    applies it.

    Each item in ``edits`` is an object:

    - ``kind``: "replace" | "delete" | "insert".
    - ``old_text``: exact existing text (required for replace/delete).
    - ``new_text``: replacement/insertion text (empty for delete).
    - ``anchor`` (optional but required to disambiguate repeated text or to
      position an insertion): an object with ``prefix_context`` (text immediately
      before the target/insertion point) and ``suffix_context`` (text immediately
      after). For insertions, prefix+suffix must surround the insertion point.
    - ``rationale`` (optional): why this edit helps the reader.
    - ``risk`` (optional): "low" | "medium" | "high".

    Args:
        path: Project-relative document path (e.g. ``examples/test-text.md``).
        edits: List of edit objects as described above.
        title: Short title for the group (the issue it addresses).
        summary: One-line summary of the change set.
        rationale: Why this group of edits improves the document for readers.
        confidence: 0.0-1.0 confidence in the proposal.

    Returns:
        Structured success/error for the model.
    """
    from edit_group_service import EditGroupService
    from edit_groups import EditValidationError

    tool_use = tool_context.tool_use
    tool_id = tool_use["toolUseId"]
    name = tool_use.get("name", "propose_edit_group")
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
    return {
        "status": "success",
        "content": [
            {
                "text": (
                    f"Proposed edit group {group.id} for {group.path} with "
                    f"{len(group.edits)} edit(s). Awaiting user review; the "
                    f"document is unchanged until the user applies it."
                ),
            },
        ],
    }


def _resolve_buffer_text(tool_context: ToolContext, path: str) -> tuple[str, str]:
    """Return (text, source) for ``path``, open buffer first then disk."""
    session = tool_context.invocation_state.get("session")
    norm = normalize_workspace_path(path)
    if (
        session is not None
        and hasattr(session, "open_buffers")
        and norm in session.open_buffers
    ):
        return session.open_buffers[norm], "buffer"
    abs_path = resolve_workspace_path(_project_root(tool_context), path)
    if not abs_path.is_file():
        raise FileNotFoundError(f"Not a file: {path}")
    return abs_path.read_text(encoding="utf-8"), "disk"


# Spelling-variant pairs flagged when BOTH forms appear in one document.
_SPELLING_VARIANTS = (
    ("color", "colour"),
    ("behavior", "behaviour"),
    ("organize", "organise"),
    ("analyze", "analyse"),
    ("modeling", "modelling"),
    ("center", "centre"),
)


@tool(context=True)
def check_consistency(path: str, tool_context: ToolContext) -> dict[str, Any]:
    """Run deterministic mechanical consistency checks on a document.

    This is a rule-based checker (no model judgment). It flags trailing
    whitespace, tab characters, multiple consecutive blank lines, double spaces
    inside text, and US/UK spelling-variant mixing. Use it to find mechanical
    issues, then propose fixes with ``propose_edit_group``. Read-only.

    Args:
        path: Project-relative document path.

    Returns:
        A structured list of findings for the model.
    """
    tool_use = tool_context.tool_use
    tool_id = tool_use["toolUseId"]
    name = tool_use.get("name", "check_consistency")

    _queue_tool_event(
        tool_context,
        {"type": "chat/tool_start", "tool_id": tool_id, "name": name, "input": {"path": path}},
    )

    try:
        text, _source = _resolve_buffer_text(tool_context, path)
    except (ValueError, OSError) as exc:
        return _handle_tool_error(tool_context, tool_id, path, str(exc))

    findings: list[str] = []
    lines = text.splitlines()
    blank_run = 0
    for i, line in enumerate(lines, start=1):
        if line.strip() == "":
            blank_run += 1
            if blank_run == 2:
                findings.append(f"line {i}: multiple consecutive blank lines")
        else:
            blank_run = 0
        if line.rstrip() != line:
            findings.append(f"line {i}: trailing whitespace")
        if "\t" in line:
            findings.append(f"line {i}: tab character")
        if "  " in line.strip():
            findings.append(f"line {i}: double space inside text")

    lower = text.lower()
    for a, b in _SPELLING_VARIANTS:
        if a in lower and b in lower:
            findings.append(f"spelling variants both present: '{a}' and '{b}'")

    _queue_tool_event(
        tool_context,
        {
            "type": "chat/tool_end",
            "tool_id": tool_id,
            "status": "completed",
            "output": {"path": path, "finding_count": len(findings)},
        },
    )

    if findings:
        body = "\n".join(f"- {f}" for f in findings)
        summary = f"{len(findings)} mechanical issue(s) in {path}:\n{body}"
    else:
        summary = f"No mechanical consistency issues found in {path}."
    return {"status": "success", "content": [{"text": summary}]}


@tool(context=True)
def search_references(query: str, tool_context: ToolContext) -> dict[str, Any]:
    """Search the project reference/evidence base for snippets matching a query.

    Searches markdown files under the references directory (``references/`` under
    the project root by default) and returns matching lines with their source.
    Use this to gather evidence before verifying factual claims. This tool is
    read-only and never modifies documents.

    Args:
        query: Words to look for (case-insensitive; any term may match).

    Returns:
        Matching snippets with source paths, for the model.
    """
    tool_use = tool_context.tool_use
    tool_id = tool_use["toolUseId"]
    name = tool_use.get("name", "search_references")
    inv = tool_context.invocation_state

    _queue_tool_event(
        tool_context,
        {"type": "chat/tool_start", "tool_id": tool_id, "name": name, "input": {"query": query}},
    )

    refs_dir_raw = inv.get("references_dir")
    if isinstance(refs_dir_raw, (str, Path)) and str(refs_dir_raw).strip():
        refs_dir = Path(refs_dir_raw)
    else:
        try:
            refs_dir = _project_root(tool_context) / "references"
        except ValueError as exc:
            return _handle_tool_error(tool_context, tool_id, "references", str(exc))

    terms = [t for t in query.lower().split() if t]
    matches: list[dict[str, Any]] = []
    if refs_dir.is_dir():
        for ref_file in sorted(refs_dir.rglob("*.md")):
            try:
                text = ref_file.read_text(encoding="utf-8")
            except OSError:
                continue
            for line in text.splitlines():
                low = line.lower()
                if terms and any(term in low for term in terms):
                    matches.append({"source": ref_file.name, "snippet": line.strip()})
                    if len(matches) >= 20:
                        break
            if len(matches) >= 20:
                break

    _queue_tool_event(
        tool_context,
        {
            "type": "chat/tool_end",
            "tool_id": tool_id,
            "status": "completed",
            "output": {"query": query, "match_count": len(matches)},
        },
    )

    if not matches:
        body = f"No references matched: {query!r}"
    else:
        body = "\n".join(f"[{m['source']}] {m['snippet']}" for m in matches)
    return {
        "status": "success",
        "content": [{"text": f"Reference search for {query!r} ({len(matches)} matches):\n{body}"}],
    }


#: Tools safe for read-only specialists (no document mutation).
READONLY_TOOLS = [read_file, search_references, check_consistency]

#: Full built-in tool set for the main writing agent (proposes edits).
WRITING_TOOLS = [read_file, search_references, check_consistency, propose_edit_group]


def get_enabled_writing_tools() -> list:
    """Return built-in tools that are enabled in tools.yaml."""
    from tool_manager import get_enabled_tool_ids

    enabled = get_enabled_tool_ids()
    return [tool for tool in WRITING_TOOLS if tool.tool_name in enabled]

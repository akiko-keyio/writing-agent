"""Strands community tools — customized for the writing agent.

``strands-agents-tools`` is installed as the base implementation layer
(see ``pyproject.toml``). The writing agent exposes a **restricted** subset
suited to AgentSkills Tier 3 (progressive disclosure):

- ``read_skill_resource`` — read files under a skill's ``references/``,
  ``scripts/``, or ``assets/`` directories. Delegates to
  ``strands_tools.file_read`` (``view``, ``lines``, ``search`` modes) with
  UTF-8 fallbacks on Windows.

Not registered on the main agent (by design):

- ``shell`` — arbitrary command execution; unsupported on Windows.
- ``file_write`` / ``editor`` — document mutation belongs to ``propose_edits``.
- Other community tools (browser, AWS, memory backends, …) — out of scope for
  the writing IDE; enable deliberately if a future skill requires them.
"""

from __future__ import annotations

from pathlib import Path, PurePosixPath
from typing import Any, Literal

from strands import tool
from strands.types.tools import ToolContext

from writing_agent.adapters.strands_file_read_adapter import (
    SUPPORTED_READ_MODES,
    ReadMode,
    read_path_content,
)
from writing_agent.tools.writing_tools import _handle_tool_error, _queue_tool_event

from writing_agent.paths import PLUGINS_DIR

_ACADEMIC_SKILL_DIR = PLUGINS_DIR / "academic-writing"
_RESOURCE_TOP_DIRS = frozenset({"references", "scripts", "assets"})
_LEGACY_REFERENCE_DIR = "reference"
MAX_SKILL_RESOURCE_BYTES = 256_000
SkillReadMode = Literal["view", "lines", "search"]


def skill_resource_roots() -> list[Path]:
    """Skill directories whose bundled resources may be read."""
    if _ACADEMIC_SKILL_DIR.is_dir():
        return [_ACADEMIC_SKILL_DIR.resolve()]
    return []


def resolve_skill_resource_path(relative_path: str) -> tuple[Path | None, str | None]:
    """Resolve and validate a path relative to a skill directory."""
    raw = relative_path.strip().replace("\\", "/")
    if not raw:
        return None, "path is required"
    if raw.startswith(("/", "~")):
        return None, "path must be relative to the skill directory (e.g. references/narrative-theory.md)"

    posix = PurePosixPath(raw)
    if any(part == ".." for part in posix.parts):
        return None, "path must not contain '..'"

    roots = skill_resource_roots()
    if not roots:
        return None, "No skill resources are configured on this agent."

    skill_root = roots[0]

    if len(posix.parts) == 1 and posix.suffix:
        candidate = skill_root / "references" / posix
    else:
        candidate = skill_root / posix

    try:
        resolved = candidate.resolve()
        skill_resolved = skill_root.resolve()
    except OSError as exc:
        return None, str(exc)

    if resolved != skill_resolved and skill_resolved not in resolved.parents:
        return None, "path escapes the skill directory"

    try:
        rel = resolved.relative_to(skill_resolved)
    except ValueError:
        return None, "path escapes the skill directory"

    if not rel.parts:
        return None, "path must name a file inside references/, scripts/, or assets/"

    top = rel.parts[0]
    if top == _LEGACY_REFERENCE_DIR:
        hint = "references/" + "/".join(rel.parts[1:])
        return None, f"Use references/ not reference/ (AgentSkills spec): {hint}"
    if top not in _RESOURCE_TOP_DIRS:
        return None, (
            f"Skill resources must live under references/, scripts/, or assets/ (got {top}/)"
        )

    if not resolved.is_file():
        return None, f"Not a file: {relative_path}"

    size = resolved.stat().st_size
    if size > MAX_SKILL_RESOURCE_BYTES:
        return None, f"File too large ({size} bytes; max {MAX_SKILL_RESOURCE_BYTES})"

    return resolved, None


@tool(context=True)
def read_skill_resource(
    path: str,
    tool_context: ToolContext,
    mode: SkillReadMode = "view",
    search_pattern: str | None = None,
    start_line: int | None = None,
    end_line: int | None = None,
    context_lines: int = 2,
) -> dict[str, Any]:
    """Read a file bundled with an activated Agent Skill.

    Paths are relative to the skill directory, e.g.
    ``references/narrative-theory.md``. Call ``skills(...)`` first to list
    available resources. Use ``read_document`` for project workspace files.

    Modes (same as strands ``file_read``, path-restricted to skill resources):

    - ``view`` — full file (default)
    - ``lines`` — line range via ``start_line`` / ``end_line`` (0-based)
    - ``search`` — pattern search with ``search_pattern`` and ``context_lines``

    Args:
        path: Skill-relative path under references/, scripts/, or assets/.
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
    name = tool_use.get("name", "read_skill_resource")

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

    resolved, error = resolve_skill_resource_path(path)
    if resolved is None:
        return _handle_tool_error(
            tool_context,
            tool_id,
            path,
            error or "Invalid path",
            tool_name=name,
        )

    content, read_error = read_path_content(
        resolved,
        mode=mode,
        search_pattern=search_pattern,
        start_line=start_line,
        end_line=end_line,
        context_lines=context_lines,
    )
    if content is None:
        return _handle_tool_error(
            tool_context,
            tool_id,
            path,
            read_error or f"Could not read: {path}",
            tool_name=name,
        )

    rel = resolved.relative_to(skill_resource_roots()[0]).as_posix()
    size_bytes = len(content.encode("utf-8"))
    output = {
        "path": path,
        "mode": mode,
        "skill_relative_path": rel,
        "size_bytes": size_bytes,
        "content": content,
        "preview": content[:500] + ("…" if len(content) > 500 else ""),
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
        "content": [{"text": content}],
    }


STRANDS_SKILL_TOOLS = [read_skill_resource]


def get_strands_skill_tools() -> list:
    """Tools from strands-agents-tools, customized for AgentSkills Tier 3."""
    if not skill_resource_roots():
        return []
    return list(STRANDS_SKILL_TOOLS)

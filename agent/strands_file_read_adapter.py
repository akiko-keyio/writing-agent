"""Shared Strands ``file_read`` delegation + in-memory read modes."""

from __future__ import annotations

import logging
import re
from pathlib import Path
from typing import Any, Literal

from strands.types.tools import ToolUse

logger = logging.getLogger(__name__)

ReadMode = Literal["view", "lines", "search"]
SUPPORTED_READ_MODES = frozenset({"view", "lines", "search"})


def _read_text_via_strands_file_read(
    abs_path: Path,
    *,
    mode: ReadMode = "view",
    search_pattern: str | None = None,
    start_line: int | None = None,
    end_line: int | None = None,
    context_lines: int = 2,
) -> tuple[str | None, str | None]:
    """Use strands-agents-tools ``file_read`` with a validated absolute path."""
    try:
        from strands_tools.file_read import file_read as strands_file_read
    except ImportError:
        return None, "strands-agents-tools is not installed"

    tool_input: dict[str, Any] = {"path": str(abs_path), "mode": mode}
    if mode == "search":
        if not search_pattern:
            return None, "search_pattern is required when mode is search"
        tool_input["search_pattern"] = search_pattern
        tool_input["context_lines"] = context_lines
    elif mode == "lines":
        if start_line is not None:
            tool_input["start_line"] = start_line
        if end_line is not None:
            tool_input["end_line"] = end_line

    tool_use: ToolUse = {
        "toolUseId": "strands_file_read",
        "name": "file_read",
        "input": tool_input,
    }
    try:
        result = strands_file_read(tool_use)
    except Exception as exc:
        logger.debug("strands file_read raised: %s", exc)
        return None, str(exc)

    if result.get("status") != "success":
        texts = [
            block.get("text", "")
            for block in result.get("content", [])
            if isinstance(block, dict)
        ]
        return None, " ".join(texts).strip() or "file_read failed"

    parts: list[str] = []
    for block in result.get("content", []):
        if not isinstance(block, dict):
            continue
        text = block.get("text")
        if not isinstance(text, str):
            continue
        if text.startswith("Error reading file") or text.startswith("Error processing file"):
            return None, text
        parts.append(text)

    content = "\n".join(parts).strip()
    if not content:
        return None, "file_read returned empty content"
    return content, None


def _read_lines_from_text(
    text: str,
    start_line: int | None,
    end_line: int | None,
) -> str:
    lines = text.splitlines(keepends=True)
    start = max(0, start_line or 0)
    end = len(lines) if end_line is None else min(len(lines), end_line + 1)
    if start >= len(lines):
        return ""
    return "".join(lines[start:end])


def _search_text(text: str, pattern: str, context_lines: int) -> str:
    lines = text.splitlines()
    regex = re.compile(pattern)
    hits: list[str] = []
    for index, line in enumerate(lines):
        if not regex.search(line):
            continue
        lo = max(0, index - context_lines)
        hi = min(len(lines), index + context_lines + 1)
        block = "\n".join(
            f"{lo + offset + 1:4d}| {lines[lo + offset]}" for offset in range(hi - lo)
        )
        hits.append(block)
    if not hits:
        return f"No matches for pattern: {pattern}"
    return "\n\n---\n\n".join(hits)


def apply_read_mode_to_text(
    text: str,
    *,
    mode: ReadMode = "view",
    search_pattern: str | None = None,
    start_line: int | None = None,
    end_line: int | None = None,
    context_lines: int = 2,
) -> tuple[str | None, str | None]:
    """Apply view/lines/search to in-memory text (editor buffers)."""
    if mode == "view":
        return text, None
    if mode == "lines":
        return _read_lines_from_text(text, start_line, end_line), None
    if mode == "search":
        if not search_pattern:
            return None, "search_pattern is required when mode is search"
        return _search_text(text, search_pattern, context_lines), None
    return None, f"Unsupported mode: {mode}"


def read_path_content(
    abs_path: Path,
    *,
    mode: ReadMode = "view",
    search_pattern: str | None = None,
    start_line: int | None = None,
    end_line: int | None = None,
    context_lines: int = 2,
) -> tuple[str | None, str | None]:
    """Read a validated absolute path (Strands file_read + UTF-8 fallback)."""
    content, err = _read_text_via_strands_file_read(
        abs_path,
        mode=mode,
        search_pattern=search_pattern,
        start_line=start_line,
        end_line=end_line,
        context_lines=context_lines,
    )
    if content is not None:
        return content, None

    try:
        raw = abs_path.read_text(encoding="utf-8")
        return apply_read_mode_to_text(
            raw,
            mode=mode,
            search_pattern=search_pattern,
            start_line=start_line,
            end_line=end_line,
            context_lines=context_lines,
        )
    except OSError as exc:
        return None, err or str(exc)

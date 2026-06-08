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


WRITING_TOOLS = [read_file]


def get_enabled_writing_tools() -> list:
    """Return built-in tools that are enabled in tools.yaml."""
    from tool_manager import get_enabled_tool_ids

    enabled = get_enabled_tool_ids()
    return [tool for tool in WRITING_TOOLS if tool.tool_name in enabled]

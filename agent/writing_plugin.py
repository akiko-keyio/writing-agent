"""Project-level Strands plugin (hooks; tools added in later phases)."""

from __future__ import annotations

from typing import Any

from strands.hooks import AfterToolCallEvent, BeforeToolCallEvent
from strands.plugins import Plugin, hook

_TOOLS_WITH_OWN_END_EVENTS = frozenset({"read_document", "propose_edits", "revise_edit"})


def _tool_id(tool_use: dict[str, Any]) -> str | None:
    raw = tool_use.get("toolUseId") or tool_use.get("tool_use_id")
    return str(raw) if raw else None


def _preview_from_result(result: Any) -> dict[str, Any]:
    if not isinstance(result, dict):
        return {"result": result}
    content = result.get("content")
    if isinstance(content, list):
        texts: list[str] = []
        for block in content:
            if isinstance(block, dict) and "text" in block:
                texts.append(str(block["text"]))
        combined = "\n".join(texts).strip()
        if combined:
            clipped = combined[:2000] + ("…" if len(combined) > 2000 else "")
            return {"preview": clipped}
    return {"result": result}


def _error_text_from_result(result: Any) -> str:
    if isinstance(result, dict):
        content = result.get("content")
        if isinstance(content, list) and content:
            first = content[0]
            if isinstance(first, dict) and first.get("text"):
                return str(first["text"])
        err = result.get("error")
        if err:
            return str(err)
    return "Tool execution failed"


def _tool_end_payload(event: AfterToolCallEvent) -> dict[str, Any] | None:
    tool_use = event.tool_use or {}
    name = str(tool_use.get("name", ""))
    if name in _TOOLS_WITH_OWN_END_EVENTS:
        return None

    tool_id = _tool_id(tool_use)
    if not tool_id:
        return None

    base: dict[str, Any] = {
        "type": "chat/tool_end",
        "tool_id": tool_id,
        "name": name,
        "input": tool_use.get("input"),
    }

    if event.exception is not None:
        return {
            **base,
            "status": "error",
            "error": str(event.exception),
            "output": {"error": str(event.exception)},
        }

    result = event.result
    if isinstance(result, dict) and str(result.get("status", "success")) == "error":
        return {
            **base,
            "status": "error",
            "error": _error_text_from_result(result),
            "output": _preview_from_result(result),
        }

    return {
        **base,
        "status": "completed",
        "output": _preview_from_result(result),
    }


class WritingPlugin(Plugin):
    """Writing IDE hooks — tool UI events for non-core tools."""

    name = "writing"

    @hook
    def notify_tool_start(self, event: BeforeToolCallEvent) -> None:
        """Forward tool start to the WebSocket outbound queue when present."""
        tool_use = event.tool_use or {}
        name = str(tool_use.get("name", ""))
        if name in _TOOLS_WITH_OWN_END_EVENTS:
            return

        queue = event.invocation_state.get("outbound_queue")
        if not isinstance(queue, list):
            return

        tool_id = _tool_id(tool_use)
        if not tool_id:
            return

        queue.append(
            {
                "type": "chat/tool_start",
                "tool_id": tool_id,
                "name": name,
                "input": tool_use.get("input"),
            },
        )

    @hook
    def notify_tool_end(self, event: AfterToolCallEvent) -> None:
        """Forward tool completion for sub-agents (check, review, skills, …)."""
        queue = event.invocation_state.get("outbound_queue")
        if not isinstance(queue, list):
            return

        payload = _tool_end_payload(event)
        if payload is not None:
            queue.append(payload)

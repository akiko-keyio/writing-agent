"""Map Strands stream_async callback events to WebSocket outbound messages."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class StreamAccum:
    stream_id: str
    text_parts: list[str] = field(default_factory=list)
    reasoning_parts: list[str] = field(default_factory=list)
    tool_ids_seen: set[str] = field(default_factory=set)

    @property
    def text(self) -> str:
        return "".join(self.text_parts)


def _tool_update_message(
    accum: StreamAccum,
    tool_id: str,
    name: str,
    status: str,
    *,
    input_payload: Any = None,
    output: Any = None,
    error: str | None = None,
) -> dict[str, Any]:
    msg: dict[str, Any] = {
        "type": "chat/tool_update",
        "stream_id": accum.stream_id,
        "tool_id": tool_id,
        "name": name,
        "status": status,
    }
    if input_payload is not None:
        msg["input"] = input_payload
    if output is not None:
        msg["output"] = output
    if error:
        msg["error"] = error
    return msg


def strands_callback_to_ws(
    event: dict[str, Any],
    accum: StreamAccum,
) -> list[dict[str, Any]]:
    """Turn one Strands callback dict into zero or more WS messages."""
    out: list[dict[str, Any]] = []
    sid = accum.stream_id

    if event.get("type") == "tool_use_stream":
        ctu = event.get("current_tool_use")
        if isinstance(ctu, dict):
            tool_id = str(ctu.get("toolUseId") or ctu.get("tool_use_id") or "")
            name = str(ctu.get("name") or "tool")
            if tool_id and tool_id not in accum.tool_ids_seen:
                accum.tool_ids_seen.add(tool_id)
                out.append(
                    _tool_update_message(
                        accum,
                        tool_id,
                        name,
                        "running",
                        input_payload=ctu.get("input"),
                    ),
                )
            elif tool_id:
                out.append(
                    _tool_update_message(
                        accum,
                        tool_id,
                        name,
                        "running",
                        input_payload=ctu.get("input"),
                    ),
                )
        return out

    reasoning = event.get("reasoningText")
    if isinstance(reasoning, str) and reasoning:
        accum.reasoning_parts.append(reasoning)
        out.append({
            "type": "chat/reasoning_delta",
            "stream_id": sid,
            "text": reasoning,
        })

    data = event.get("data")
    if isinstance(data, str) and data:
        accum.text_parts.append(data)
        out.append({
            "type": "chat/message_delta",
            "stream_id": sid,
            "text": data,
        })

    return out


def queue_event_to_ws(
    payload: dict[str, Any],
    accum: StreamAccum,
) -> list[dict[str, Any]]:
    """Map tool queue events from read_file (etc.) to WS messages."""
    event_type = payload.get("type")
    tool_id = str(payload.get("tool_id", ""))
    if not tool_id:
        return []

    if event_type == "chat/tool_start":
        accum.tool_ids_seen.add(tool_id)
        return [
            _tool_update_message(
                accum,
                tool_id,
                str(payload.get("name", "tool")),
                "running",
                input_payload=payload.get("input"),
            ),
        ]

    if event_type == "chat/tool_end":
        status = str(payload.get("status", "completed"))
        ws_status = "error" if status == "error" else "completed"
        return [
            _tool_update_message(
                accum,
                tool_id,
                str(payload.get("name", "read_file")),
                ws_status,
                input_payload=payload.get("input"),
                output=payload.get("output"),
                error=str(payload.get("error", "")) or None,
            ),
        ]

    return []

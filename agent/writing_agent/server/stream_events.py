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
    tool_names: dict[str, str] = field(default_factory=dict)

    @property
    def text(self) -> str:
        return "".join(self.text_parts)


def _remember_tool_name(accum: StreamAccum, tool_id: str, name: str) -> str:
    cleaned = name.strip()
    if cleaned and cleaned != "tool":
        accum.tool_names[tool_id] = cleaned
        return cleaned
    return accum.tool_names.get(tool_id, cleaned or "tool")


def _resolve_tool_name(accum: StreamAccum, tool_id: str, name: str) -> str:
    return _remember_tool_name(accum, tool_id, name)


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
            raw_name = str(ctu.get("name") or "")
            if not tool_id:
                return out
            name = _resolve_tool_name(accum, tool_id, raw_name)
            if raw_name and raw_name != "tool":
                if tool_id not in accum.tool_ids_seen:
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
                elif ctu.get("input") is not None:
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
    """Map tool queue events to WS messages.

    Tool start/end events are normalized to ``chat/tool_update``. Other
    backend-originated events placed on the queue (e.g. ``group/propose`` from
    the ``propose_edit_group`` tool) are passed through unchanged.
    """
    event_type = payload.get("type")

    if event_type in ("chat/tool_start", "chat/tool_end"):
        tool_id = str(payload.get("tool_id", ""))
        if not tool_id:
            return []
        if event_type == "chat/tool_start":
            accum.tool_ids_seen.add(tool_id)
            name = _remember_tool_name(
                accum,
                tool_id,
                str(payload.get("name", "tool")),
            )
            return [
                _tool_update_message(
                    accum,
                    tool_id,
                    name,
                    "running",
                    input_payload=payload.get("input"),
                ),
            ]
        status = str(payload.get("status", "completed"))
        ws_status = "error" if status == "error" else "completed"
        name = _resolve_tool_name(
            accum,
            tool_id,
            str(payload.get("name", "tool")),
        )
        return [
            _tool_update_message(
                accum,
                tool_id,
                name,
                ws_status,
                input_payload=payload.get("input"),
                output=payload.get("output"),
                error=str(payload.get("error", "")) or None,
            ),
        ]

    # Pass-through for non-tool queue events (e.g. group/propose).
    return [payload]

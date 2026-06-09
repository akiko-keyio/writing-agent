"""Strands Agent runner for the writing IDE."""

from __future__ import annotations

import asyncio
import logging
import uuid
from collections.abc import AsyncIterator
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from strands import Agent
from strands.types.agent import Limits
from strands.types.content import Message
from strands.vended_plugins.skills.agent_skills import AgentSkills

from model_factory import ModelFactory, create_active_model
from protocol import SessionState
from project_root import resolve_project_root
from stream_events import StreamAccum, queue_event_to_ws, strands_callback_to_ws
from subagents import create_subagent_tools
from writing_plugin import WritingPlugin
from writing_tools import WRITING_TOOLS, get_enabled_writing_tools

_AGENT_DIR = Path(__file__).resolve().parent
_ACADEMIC_SKILL_DIR = _AGENT_DIR / "plugins" / "academic-writing"

logger = logging.getLogger(__name__)

MAX_MESSAGES = 40
INVOCATION_TURN_LIMIT = 12

USER_FACING_ERROR = (
    "The writing agent could not complete your request. Please try again in a moment."
)


def _system_prompt(project_root: Path) -> str:
    return f"""You are a writing assistant in a markdown IDE.

## Project root
All file paths are relative to:
{project_root}

## Reading files
You have a ``read_file`` tool. Use it whenever you need the contents of a draft or any project file.
Do not invent or assume file contents you have not read.
Do not ask the user to paste entire documents — read them with ``read_file`` instead.

## Conversation
The user may reference files with @path or share a short editor selection. Those are hints only;
open files with ``read_file`` when you need the full text.

Answer clearly about structure, clarity, and revisions. Only describe document changes after reading the relevant files.

## Proposing document changes
Never claim you edited a file directly and never paste a full rewritten document as the change.
To modify a document, call the ``propose_edit_group`` tool with a coherent group of edits
(replace / delete / insert). The backend validates each edit against the current text and the
user reviews and applies the group. Provide ``old_text`` exactly as it appears, and use
``anchor`` (prefix/suffix context) when the target text repeats or when inserting between
paragraphs. The document stays unchanged until the user applies your proposal.

## Tools and specialists
Decide for yourself when to discuss, read files, check, gather evidence, or propose edits.
Available tools and specialists:
- ``read_file`` — read a draft or any project file.
- ``check_consistency`` — deterministic mechanical checks (whitespace, blank lines, spelling
  variant mixing). Use it for mechanical issues; then propose fixes with ``propose_edit_group``.
- ``search_references`` — search the local reference base for evidence.
- ``review`` — an independent reader-perspective reviewer (isolated context). Delegate to it
  when you want an unbiased read of how the target reader experiences the text.
- ``researcher`` — an evidence specialist that works only from local references (no downloads).
Only use a specialist when its isolated perspective adds value; otherwise do the work directly.
Do not claim to use capabilities you do not have (e.g. downloading papers).
"""


def _frontend_role_to_strands(role: str) -> str | None:
    if role == "user":
        return "user"
    if role in ("agent", "assistant"):
        return "assistant"
    return None


def messages_to_ui(messages: list[Message]) -> list[dict[str, str]]:
    """Best-effort export of Strands messages for the chat UI."""
    out: list[dict[str, str]] = []
    for msg in messages:
        role = msg.get("role", "")
        ui_role = "agent" if role == "assistant" else "user"
        if ui_role != "user" and role != "assistant":
            continue
        parts: list[str] = []
        for block in msg.get("content", []):
            if isinstance(block, dict) and "text" in block:
                parts.append(str(block["text"]))
        text = "".join(parts).strip()
        if text:
            out.append({"role": ui_role, "text": text})
    return out


def _messages_from_frontend(
    items: list[dict[str, str]],
) -> list[Message]:
    out: list[Message] = []
    for item in items:
        text = str(item.get("text", "")).strip()
        if not text:
            continue
        strands_role = _frontend_role_to_strands(str(item.get("role", "")))
        if strands_role is None:
            continue
        out.append({"role": strands_role, "content": [{"text": text}]})
    return out


def _trim_messages(messages: list[Message], max_count: int) -> list[Message]:
    if len(messages) <= max_count:
        return messages
    return messages[-max_count:]


def _build_user_prompt(
    text: str,
    session: SessionState,
    context: dict[str, Any] | None,
) -> str:
    """User turn metadata only — no full document body."""
    parts: list[str] = []
    if session.active_path:
        parts.append(f"Active editor file: {session.active_path}")
    elif context:
        legacy = context.get("filename")
        if isinstance(legacy, str) and legacy.strip():
            parts.append(f"Active editor file: {legacy}")
    if context:
        mentions = context.get("mentions")
        if isinstance(mentions, list) and mentions:
            parts.append(
                "Referenced paths (use read_file to load): "
                + ", ".join(str(m) for m in mentions),
            )
        sel = context.get("selection")
        if isinstance(sel, dict) and sel.get("text"):
            parts.append(
                "Editor selection snippet (not the full file): "
                + str(sel.get("text", ""))[:500],
            )
    parts.append(text)
    return "\n".join(parts)


def _new_stream_id() -> str:
    return f"s-{uuid.uuid4().hex[:12]}"


@dataclass
class WritingAgentRunner:
    """Strands agent; conversation history lives in ``agent.messages`` only."""

    project_root: Path

    def __init__(
        self,
        project_root: Path | None = None,
        *,
        model: Any | None = None,
        model_factory: ModelFactory | None = None,
    ) -> None:
        root = project_root or resolve_project_root()
        self.project_root = root
        # Injection seam: tests/evals pass a fake model or factory; production
        # falls back to the active model from models.yaml / .env.
        self._model_factory: ModelFactory = model_factory or create_active_model
        active_model = model if model is not None else self._model_factory()
        self._model = active_model
        self._agent = self._build_agent(active_model)

    def _build_agent(self, model: Any) -> Agent:
        """Construct a fresh Strands agent bound to ``model``.

        The model is a thin HTTP client; it is shared with sub-agents so that a
        single active-model choice drives the orchestrator and its specialists.
        """
        plugins: list[Any] = [WritingPlugin()]
        if _ACADEMIC_SKILL_DIR.is_dir():
            plugins.append(AgentSkills(skills=[str(_ACADEMIC_SKILL_DIR)]))

        tools = [*get_enabled_writing_tools(), *create_subagent_tools(model=model)]
        return Agent(
            model=model,
            system_prompt=_system_prompt(self.project_root),
            tools=tools,
            plugins=plugins,
            callback_handler=None,
        )

    def rebuild_model(self) -> None:
        """Rebuild the agent with a freshly resolved active model.

        Conversation history and agent state are preserved through the existing
        snapshot/restore path so switching models never wipes chat history.
        """
        messages = list(self._agent.messages)
        agent_state = self.snapshot_agent_state()
        new_model = self._model_factory()
        self._model = new_model
        self._agent = self._build_agent(new_model)
        self.restore_from_snapshot(messages, agent_state)

    def sync_subagents(self) -> None:
        """Reconcile the live registry with enabled subagents (Settings toggles).

        Rebuilds the agent with the same model + preserved conversation so that
        enabling/disabling a specialist takes effect without losing chat state.
        """
        messages = list(self._agent.messages)
        agent_state = self.snapshot_agent_state()
        self._agent = self._build_agent(self._model)
        self.restore_from_snapshot(messages, agent_state)

    @property
    def messages(self) -> list[Message]:
        return self._agent.messages

    def sync_writing_tools(self) -> None:
        """Apply tools.yaml enabled flags to the live agent registry."""
        enabled = {tool.tool_name for tool in get_enabled_writing_tools()}
        registry = self._agent.tool_registry

        for tool in WRITING_TOOLS:
            name = tool.tool_name
            registered = name in registry.registry
            should_register = name in enabled
            if should_register and not registered:
                registry.register_tool(tool)
            elif not should_register and registered:
                del registry.registry[name]
                registry.dynamic_tools.pop(name, None)

    def clear_conversation(self) -> None:
        self._agent.messages = []

    def restore_conversation(self, items: list[dict[str, str]]) -> None:
        self._agent.messages = _messages_from_frontend(items)

    def snapshot_agent_state(self) -> dict[str, Any]:
        """Export Strands ``agent.state`` (JSONSerializableDict supports ``get(None)``)."""
        state = getattr(self._agent, "state", None)
        if state is None:
            return {}
        get_fn = getattr(state, "get", None)
        if callable(get_fn):
            data = get_fn(None)
            if isinstance(data, dict):
                return dict(data)
        if isinstance(state, dict):
            return dict(state)
        return {}

    def restore_from_snapshot(
        self,
        messages: list[Message],
        agent_state: dict[str, Any] | None = None,
    ) -> None:
        self._agent.messages = list(messages)
        if not agent_state:
            return
        state = getattr(self._agent, "state", None)
        if state is None:
            return
        get_fn = getattr(state, "get", None)
        set_fn = getattr(state, "set", None)
        delete_fn = getattr(state, "delete", None)
        if callable(get_fn) and callable(set_fn) and callable(delete_fn):
            existing = get_fn(None)
            if isinstance(existing, dict):
                for key in existing:
                    delete_fn(key)
            for key, value in agent_state.items():
                set_fn(key, value)
            return
        if isinstance(state, dict):
            state.clear()
            state.update(agent_state)

    def title_from_messages(self) -> str:
        for msg in self._agent.messages:
            if msg.get("role") != "user":
                continue
            for block in msg.get("content", []):
                if isinstance(block, dict) and "text" in block:
                    text = str(block["text"]).strip()
                    if text:
                        return text[:40] + ("…" if len(text) > 40 else "")
        return "New chat"

    async def chat_turn_stream(
        self,
        session: SessionState,
        user_text: str,
        context: dict[str, Any] | None = None,
        *,
        request_id: str | None = None,
        cancel_event: "asyncio.Event | None" = None,
        invocation_extra: dict[str, Any] | None = None,
    ) -> AsyncIterator[dict[str, Any]]:
        """Stream Strands events as WebSocket-ready dicts.

        Every event carries ``request_id`` (when provided) so the frontend can
        correlate stream/tool/error/edit-group frames and cancellation. If
        ``cancel_event`` is set mid-stream, forwarding stops and a final
        ``chat/stream_end`` with ``cancelled: True`` is emitted; the model may
        still finish server-side but its late deltas are not forwarded.
        """
        session.pending_replacements.clear()
        prompt = _build_user_prompt(user_text, session, context)
        stream_id = _new_stream_id()
        accum = StreamAccum(stream_id=stream_id)
        outbound_queue: list[dict[str, Any]] = []

        def _stamp(event: dict[str, Any]) -> dict[str, Any]:
            if request_id is not None:
                event.setdefault("request_id", request_id)
            return event

        def _cancelled() -> bool:
            return cancel_event is not None and cancel_event.is_set()

        yield _stamp({"type": "chat/stream_start", "stream_id": stream_id})

        try:
            async for event in self._agent.stream_async(
                prompt,
                invocation_state={
                    "session": session,
                    "project_root": self.project_root,
                    "outbound_queue": outbound_queue,
                    "request_id": request_id,
                    **(invocation_extra or {}),
                },
                limits=Limits(turns=INVOCATION_TURN_LIMIT),
            ):
                if _cancelled():
                    self._agent.messages = _trim_messages(self._agent.messages, MAX_MESSAGES)
                    yield _stamp({
                        "type": "chat/stream_end",
                        "stream_id": stream_id,
                        "text": accum.text.strip(),
                        "cancelled": True,
                    })
                    return

                while outbound_queue:
                    queued = outbound_queue.pop(0)
                    for ws in queue_event_to_ws(queued, accum):
                        yield _stamp(ws)

                if not isinstance(event, dict):
                    continue
                if "result" in event:
                    continue
                for ws in strands_callback_to_ws(event, accum):
                    yield _stamp(ws)

            while outbound_queue:
                queued = outbound_queue.pop(0)
                for ws in queue_event_to_ws(queued, accum):
                    yield _stamp(ws)

        except Exception:
            logger.exception("Strands stream_async failed")
            yield _stamp({
                "type": "error",
                "message": USER_FACING_ERROR,
                "code": "model_error",
            })
            yield _stamp({
                "type": "chat/stream_end",
                "stream_id": stream_id,
                "text": "",
            })
            return

        if _cancelled():
            self._agent.messages = _trim_messages(self._agent.messages, MAX_MESSAGES)
            yield _stamp({
                "type": "chat/stream_end",
                "stream_id": stream_id,
                "text": accum.text.strip(),
                "cancelled": True,
            })
            return

        reply = accum.text.strip() or "(No response)"
        self._agent.messages = _trim_messages(self._agent.messages, MAX_MESSAGES)

        end_msg: dict[str, Any] = {
            "type": "chat/stream_end",
            "stream_id": stream_id,
            "text": reply,
        }
        if accum.reasoning_parts:
            end_msg["reasoning"] = "".join(accum.reasoning_parts)
        yield _stamp(end_msg)

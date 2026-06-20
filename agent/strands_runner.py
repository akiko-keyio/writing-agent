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
from strands_community_tools import get_strands_skill_tools
from subagents import create_subagent_tools
from writing_plugin import WritingPlugin
from writing_tools import WRITING_TOOLS, get_enabled_writing_tools
from session_title import USER_MESSAGE_SEP, extract_user_message

_AGENT_DIR = Path(__file__).resolve().parent
_ACADEMIC_SKILL_DIR = _AGENT_DIR / "plugins" / "academic-writing"

logger = logging.getLogger(__name__)

MAX_MESSAGES = 40
INVOCATION_TURN_LIMIT = 12
AUTO_REVIEW_STATE_KEY = "auto_review"

USER_FACING_ERROR = (
    "The writing agent could not complete your request. Please try again in a moment."
)


def _system_prompt(project_root: Path, *, auto_review: bool = False) -> str:
    auto_review_block = _auto_review_instructions(auto_review)
    return f"""You are a writing assistant in a markdown IDE.
You help the user improve documents by proposing edits they can review, apply, or dismiss —
you never modify files directly.

## Project root
All file paths are relative to:
{project_root}

## Reading & conversation
Use ``read_document`` for **project workspace** files (drafts, notes under the project root).
For **Agent Skill** reference files (``references/``, ``scripts/``, ``assets/``), activate the skill
with ``skills(...)`` then read paths it lists via ``read_skill_resource`` — not ``read_document``.
Do not invent or assume file contents you have not read.
Do not ask the user to paste entire documents — read them with the appropriate tool instead.

The user may reference files with @path or share a short editor selection. Those are hints only;
open files with ``read_document`` when you need the full text.

Always reply in the same language the user writes in. If the user writes in Chinese, reply in
Chinese; if in English, reply in English. The document itself may be in a different language —
edit the document in its own language, but converse with the user in theirs.

## Proposing document changes
To modify a document, call the ``propose_edits`` tool with a coherent group of edits
(replace / delete / insert). The backend validates each edit against the current text and the
user reviews and applies the group. Do not claim you edited the file directly or paste a full
rewritten document. Provide ``old_text`` exactly as it appears in the buffer (character-exact,
including whitespace and line breaks). Use ``anchor`` when the target text repeats or when
inserting. The ``anchor`` field must be an **object** with ``prefix_context`` and/or
``suffix_context`` keys — never a bare string. The document stays unchanged until the user
applies your proposal.

### Using ``insert`` kind

To insert text at a specific position (without replacing anything), use ``kind: "insert"``
with an anchor object. Do NOT put the target location in ``old_text`` — use anchor instead:

  GOOD: {{"kind": "insert", "new_text": "\\n\\nNew paragraph.", "anchor": {{"prefix_context": "end of previous sentence."}}}}
  BAD:  {{"kind": "insert", "old_text": "end of previous sentence.", "new_text": "\\n\\nNew paragraph.", "position": "after"}}

The anchor determines where the text is inserted: after ``prefix_context`` or before
``suffix_context``. There is no ``position`` field — use prefix vs. suffix to control placement.

### Using ``revise_edit``

When the user rejects an edit or asks to adjust one in chat, call ``revise_edit`` with the
``group_id``, ``edit_id``, and revised edit fields — do not create an unrelated new group.
The ``edit_id`` is assigned by the system (format: ``e-xxxxxxxxxx``); use the exact ID from
the ``propose_edits`` result — never guess or invent IDs like "edit-1" or "edit-2".
The result always lists exact IDs, e.g. ``[e-a1b2c3d4e5, e-f6g7h8i9j0]``.

### What the user sees after ``propose_edits``

Your proposal appears in three places on the user's screen at the same time:

1. **Chat** — your conversational text (this is the only part you write freely).
2. **Review card** (embedded in chat) — a collapsible card showing:
   - ``title`` (header, always visible even when collapsed)
   - ``summary`` (subtitle, visible when expanded)
   - ``rationale`` (why-this-helps, visible when expanded)
   - Inline diff for every edit (red = deleted, green = inserted)
   - **Apply all** / **Dismiss all** buttons at the bottom
3. **Document panel** — clicking a diff row highlights the corresponding passage.

The user reads your chat text and the review card together. Everything about *what* changes
and *why* is already visible in the card. Your chat text should add value the card cannot.

### Writing review card labels

Write for a busy author scanning a list of changes:

- ``title`` (≤8 words): the writing problem or outcome — not a step number or file name.
- ``summary`` (≤120 chars): what will change, in plain language.
- ``rationale`` (optional, 1–2 sentences): why this helps the reader. Omit when ``summary``
  already makes it obvious.

### Edit granularity (CRITICAL — violations trigger a system warning)

Each edit MUST target a single sentence (period-delimited) or a single clause
(comma-delimited phrase) — never an entire paragraph. The system automatically checks
and will emit a ⚠️ GRANULARITY WARNING if any edit spans 3+ sentences or 250+ chars.
If you see this warning, your next proposal MUST split the coarse edits.

- Split on sentence boundaries first: one ``old_text`` = one sentence (ending with period/
  question mark/semicolon). If you need to rewrite three sentences, create three separate
  edits in one group — NOT one big replace spanning the whole paragraph.
- Within a long sentence, you may split on clause boundaries (comma, dash, semicolon)
  when only part of the sentence needs changing.
- Only replace a full paragraph when every sentence in it must change AND the rewrite
  fundamentally restructures the paragraph order (extremely rare — justify in rationale).

BAD (one edit replacing an entire 5-sentence paragraph):
  old_text: "The volume of ... terminological conventions."  (entire paragraph)
  new_text: "Scientific publishing ... evidence-based conclusions."

GOOD (three edits in one group, each targeting one sentence):
  edit 1: old_text: "The volume of scientific publishing has grown at an unprecedented rate, with over 5 million peer-reviewed articles now appearing annually [1], creating a pressing need for automated tools"
          new_text: "Scientific publishing now produces over 5 million peer-reviewed articles annually [1], creating a pressing need for automated tools"
  edit 2: old_text: "that can assist researchers in synthesizing findings across studies, identifying knowledge gaps, and establishing evidence-based conclusions"
          new_text: "capable of integrating findings across studies, identifying knowledge gaps, and establishing evidence-based conclusions"
  edit 3: old_text: "especially for interdisciplinary topics spanning multiple databases and terminological conventions."
          new_text: "particularly for interdisciplinary topics that span multiple databases and terminological conventions."

### Grouping edits

Group by coherent goal (same paragraph, same issue type). Prefer several small groups over
one large batch. When one goal spans multiple spots (e.g. three repetitive transition words),
put separate edits in the same group — not one giant paragraph-level replace.

### Your chat text after proposing

The review card already carries title, summary, rationale, and full diffs. Decide what your
chat text should say based on what the card *cannot* convey:

- **Card is self-explanatory** (clear title + summary covers it): keep chat minimal. A brief
  pointer is enough, e.g. "请看 **Vary transition words** 这组修改。"
- **Rationale needs more context** (trade-offs, domain reasoning, alternative approaches that
  don't fit in 2 sentences): explain in chat — this is where your expertise adds value.
- **Multiple groups proposed**: briefly describe the overall strategy, priority order, or
  dependencies — orchestration context each card can't show on its own.
- **User needs a decision from you**: state your recommendation and reasoning.

Never instruct the user how to interact with the review UI (e.g. "you can Apply or Dismiss
each group"). The buttons are self-explanatory. Do not re-list proposed groups in a summary
table — the review cards already show title, summary, and diffs for every group.

### When not to propose edits

Not every request needs a ``propose_edits`` call. When the user asks for explanation,
strategy, structural advice, or feedback — answer in chat. Propose edits only when the
user wants the document text to change.

## Tools and specialists
Available tools and specialists:
- ``read_document`` — read a draft or any project file (buffer-first).
- ``check_references`` — validate DOIs, URLs, local ``references/`` consistency, and
  unsupported claims in a markdown file (read-only).
- ``read_skill_resource`` — read bundled skill references after ``skills(...)`` activation
  (modes: ``view``, ``lines``, ``search``; paths under ``references/``, ``scripts/``, ``assets/`` only).
- ``skills`` — activate an Agent Skill (metadata is in your system prompt).
- ``propose_edits`` — propose validated edit groups for user review.
- ``revise_edit`` — replace one edit inside an existing group after user feedback.
- ``remember_context`` — record target reader, terminology, or domain knowledge (Settings → Memory).
- ``propose_principle`` — propose a candidate writing principle from edit cases (user must confirm).
- ``review`` — an independent reader-perspective reviewer (isolated context). It returns a
  diagnostic report (Pass/Fail per dimension); you decide whether and how to revise.
  **You must include the verbatim passage text in your call** — the reviewer cannot read
  files on its own. Do not ask it to open or read a file path; paste the text directly.

Use ``remember_context`` when the user confirms reader profile or terminology worth reusing.
When stored memory is relevant, it appears at the start of the user's message under
"Relevant writing memory". Treat it as context — follow confirmed principles, apply
saved terminology — but do not repeat it back to the user.
Use ``check_references`` when the user asks to verify citations, DOI reachability, or
reference consistency — report findings; do not invent fixes for broken DOIs.
Use ``propose_principle`` when several edit cases suggest a reusable preference — never write
principles silently. Only use ``review`` when its isolated perspective adds value.

{auto_review_block}
"""


def _auto_review_instructions(auto_review: bool) -> str:
    if auto_review:
        return """## Auto Review (ON for this session)
Before any substantive ``propose_edits`` (paragraph-level clarity, structure, argument,
or tone) you MUST first call ``review`` with the verbatim document text included in the
call (read the passage with ``read_document`` first if you haven't already — then paste
it into the review call). Read the diagnostic report — if any dimension fails, adjust
your revision plan accordingly. Only then call ``propose_edits``. Skip review for
mechanical fixes (typos, formatting, punctuation)."""
    return """## Auto Review (OFF for this session)
Propose edits directly when appropriate. Call ``review`` **only** when the user explicitly asks
for reader feedback or an unbiased assessment — not before every proposal."""


def read_auto_review(agent_state: dict[str, Any] | None) -> bool:
    if not agent_state:
        return False
    return bool(agent_state.get(AUTO_REVIEW_STATE_KEY))


def write_auto_review(agent: Agent, enabled: bool) -> None:
    state = getattr(agent, "state", None)
    if state is None:
        return
    set_fn = getattr(state, "set", None)
    if callable(set_fn):
        set_fn(AUTO_REVIEW_STATE_KEY, bool(enabled))
        return
    if isinstance(state, dict):
        state[AUTO_REVIEW_STATE_KEY] = bool(enabled)


def sync_auto_review_prompt(runner: "WritingAgentRunner", enabled: bool) -> None:
    """Update the live agent system prompt when Auto Review toggles."""
    write_auto_review(runner._agent, enabled)
    runner._agent.system_prompt = _system_prompt(runner.project_root, auto_review=enabled)


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
            if ui_role == "user":
                text = extract_user_message(text)
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
    memory_text: str = "",
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
                "Referenced paths (use read_document to load): "
                + ", ".join(str(m) for m in mentions),
            )
        sel = context.get("selection")
        if isinstance(sel, dict) and sel.get("text"):
            parts.append(
                "Editor selection snippet (not the full file): "
                + str(sel.get("text", ""))[:500],
            )
        edit_review = context.get("edit_review")
        if isinstance(edit_review, dict):
            gid = edit_review.get("group_id")
            eid = edit_review.get("edit_id")
            summary = edit_review.get("summary", "")
            parts.append(
                "User is adjusting a proposed edit "
                f"(group_id={gid}, edit_id={eid}): {summary}. "
                "Use ``revise_edit`` to update that proposal when ready."
            )
    if memory_text.strip():
        parts.append("Relevant writing memory:\n" + memory_text.strip())
    if parts:
        return "\n".join(parts) + USER_MESSAGE_SEP + text
    return text


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
        skill_tools: list[Any] = []
        if _ACADEMIC_SKILL_DIR.is_dir():
            plugins.append(AgentSkills(skills=[str(_ACADEMIC_SKILL_DIR)]))
            skill_tools = get_strands_skill_tools()

        tools = [
            *get_enabled_writing_tools(),
            *skill_tools,
            *create_subagent_tools(model=model),
        ]
        return Agent(
            model=model,
            system_prompt=_system_prompt(
                self.project_root,
                auto_review=read_auto_review(self.snapshot_agent_state()),
            ),
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

    def switch_project_root(self, project_root: Path) -> None:
        """Bind future tool calls and prompts to a different workspace root."""
        self.project_root = project_root
        self._agent = self._build_agent(self._model)

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
        agent = getattr(self, "_agent", None)
        if agent is None:
            return {}
        state = getattr(agent, "state", None)
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
            self._agent.system_prompt = _system_prompt(self.project_root, auto_review=False)
            return
        state = getattr(self._agent, "state", None)
        if state is None:
            self._agent.system_prompt = _system_prompt(
                self.project_root,
                auto_review=read_auto_review(agent_state),
            )
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
            self._agent.system_prompt = _system_prompt(
                self.project_root,
                auto_review=read_auto_review(agent_state),
            )
            return
        if isinstance(state, dict):
            state.clear()
            state.update(agent_state)
            self._agent.system_prompt = _system_prompt(
                self.project_root,
                auto_review=read_auto_review(agent_state),
            )

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
        memory_text = ""
        if invocation_extra:
            store = invocation_extra.get("memory_store")
            retrieve = getattr(store, "retrieve_for_prompt", None)
            if callable(retrieve):
                memory_text = str(retrieve(session.active_path, max_chars=2000))
        prompt = _build_user_prompt(user_text, session, context, memory_text)
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

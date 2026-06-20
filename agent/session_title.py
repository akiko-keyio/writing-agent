"""Generate short session titles from the user's first message."""

from __future__ import annotations

import logging
import re
from typing import TYPE_CHECKING, Protocol

if TYPE_CHECKING:
    from strands_runner import WritingAgentRunner

logger = logging.getLogger(__name__)

_TITLE_PROMPT = """Generate a short chat title (3 to 6 words) summarizing the user's writing task.
Focus on the topic and action — not a verbatim copy of the request.
Use the same language as the user. No quotes, no trailing punctuation, no colons.
Good: "润色 Introduction 段落"
Bad: "请帮我润色一下introduction"  (this just repeats the request)
Output only the title."""

_MAX_SNIPPET = 800
_MAX_TITLE_LEN = 80

# Appended by ``_build_user_prompt`` when metadata prefixes precede the user turn.
USER_MESSAGE_SEP = "\n---\n"

_ACTIVE_FILE_PREFIX_RE = re.compile(
    r"^Active editor file:\s*[\w./-]+(?:\s*\n|\s+)",
    re.MULTILINE,
)
_MENTION_PREFIX_RE = re.compile(
    r"^@[\w./-]+(?::\d+[-–]\d+)?\s*",
    re.MULTILINE,
)


def extract_user_message(text: str) -> str:
    """Return the author's message without agent metadata prefixes."""
    if USER_MESSAGE_SEP in text:
        return text.rsplit(USER_MESSAGE_SEP, 1)[-1].strip()
    stripped = _ACTIVE_FILE_PREFIX_RE.sub("", text.strip(), count=1)
    stripped = _MENTION_PREFIX_RE.sub("", stripped)
    return stripped.strip()


class TitleGenerator(Protocol):
    def __call__(self, user_text: str, assistant_text: str) -> str: ...


_CN_PREFIX_RE = re.compile(
    r"^(?:你好[，,]?\s*)?(?:请|能不能|能否|可以|麻烦)?\s*(?:帮我|帮忙)?\s*",
)
_CN_SUFFIX_RE = re.compile(
    r"[，,]\s*(?:并(?:提出|给出|给予)[^，。,]*|同时[^，。,]*)[。？?!！]*$"
    r"|(?:一下|好吗|可以吗|吗|谢谢)[。？?!！]*$",
)

_MAX_FALLBACK_LEN = 30


def _simplify_chinese(text: str) -> str:
    """Strip conversational request phrasing from Chinese text."""
    if not re.search(r"[\u4e00-\u9fff]", text):
        return text
    result = _CN_PREFIX_RE.sub("", text)
    result = _CN_SUFFIX_RE.sub("", result)
    return result.strip() or text


def fallback_title(user_text: str) -> str:
    """Produce a concise title from user text when LLM is unavailable."""
    text = extract_user_message(user_text)
    if not text:
        return "New chat"
    text = _simplify_chinese(text)
    return text[:_MAX_FALLBACK_LEN] + ("…" if len(text) > _MAX_FALLBACK_LEN else "")


def _normalize_title(raw: str, *, fallback: str) -> str:
    title = raw.strip().strip("\"'""''")
    title = re.sub(r"\s+", " ", title)
    title = title.rstrip(".:;，。：；")
    if not title:
        return fallback
    if len(title) > _MAX_TITLE_LEN:
        title = title[: _MAX_TITLE_LEN - 1].rstrip() + "…"
    return title


def generate_session_title(user_text: str, assistant_text: str) -> str:
    """Optional LLM title (not used on the hot path). Kept for tests / future use."""
    from model_factory import resolve_model_settings

    user = extract_user_message(user_text)
    fb = fallback_title(user_text)
    assistant = assistant_text.strip()
    if not user:
        return fb

    settings = resolve_model_settings()
    api_key = str(settings.get("api_key", "")).strip()
    model_id = str(settings.get("model_id", "")).strip()
    if not api_key or not model_id:
        logger.debug("session title: no api_key or model_id configured, using fallback")
        return fb

    base_url = str(settings.get("api_base", "")).strip() or None

    try:
        from openai import OpenAI

        client = OpenAI(api_key=api_key, base_url=base_url)
        response = client.chat.completions.create(
            model=model_id,
            messages=[
                {"role": "system", "content": _TITLE_PROMPT},
                {
                    "role": "user",
                    "content": (
                        f"User:\n{user[:_MAX_SNIPPET]}\n\n"
                        f"Assistant:\n{assistant[:_MAX_SNIPPET] or '(no reply)'}"
                    ),
                },
            ],
            temperature=0.3,
            max_tokens=48,
        )
        content = response.choices[0].message.content
        if not content:
            return fb
        return _normalize_title(content, fallback=fb)
    except Exception:
        logger.warning(
            "session title generation failed (model=%s base=%s), using fallback",
            model_id,
            base_url,
            exc_info=True,
        )
        return fb


def _is_human_user_message(msg: dict) -> bool:
    """Distinguish real user input from tool-result messages.

    In the Strands/Bedrock Converse format both carry ``role: "user"``,
    but tool-result messages contain only ``toolResult`` blocks while
    human messages contain at least one ``text`` block.
    """
    if msg.get("role") != "user":
        return False
    content = msg.get("content", [])
    if not isinstance(content, list) or not content:
        return False
    return any(isinstance(b, dict) and "text" in b for b in content)


def is_first_chat_turn(runner: WritingAgentRunner) -> bool:
    """True when the conversation has exactly one human-authored user turn.

    Tool-result messages also carry ``role="user"`` in the Bedrock/Converse
    format but are not human-authored turns and must be excluded.
    """
    count = 0
    for msg in runner.messages:
        if _is_human_user_message(msg):
            count += 1
    return count == 1


def initial_session_title(user_text: str) -> str:
    """Title from the first user message — sync, no LLM, before the agent runs."""
    return fallback_title(user_text)


def resolve_session_title(
    runner: WritingAgentRunner,
    *,
    user_text: str,
    assistant_text: str,
    existing_title: str,
    generator: TitleGenerator | None = None,
) -> str:
    """Preserve a title set before the turn; backfill only if still default."""
    _ = runner, assistant_text, generator  # kept for call-site compatibility
    if existing_title and existing_title != "New chat":
        return existing_title
    return initial_session_title(user_text)

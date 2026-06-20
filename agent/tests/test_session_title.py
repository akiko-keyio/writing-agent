"""Session title generation (first turn, sync LLM)."""

from __future__ import annotations

import pytest

from writing_agent.domain.session_title import (
    USER_MESSAGE_SEP,
    extract_user_message,
    fallback_title,
    generate_session_title,
    initial_session_title,
    is_first_chat_turn,
    resolve_session_title,
)
from writing_agent.runtime.strands_runner import WritingAgentRunner

_ELLIPSIS = "…"


def test_fallback_title_truncates() -> None:
    long = "x" * 50
    assert fallback_title(long).endswith(_ELLIPSIS)
    assert len(fallback_title(long)) == 31


def test_fallback_title_simplifies_chinese() -> None:
    assert fallback_title("你好，请帮我润色引言") == "润色引言"
    assert fallback_title("帮我改引言") == "改引言"
    assert fallback_title("请帮忙检查一下") == "检查"
    assert (
        fallback_title("系统性的分析、审视 introduction 存在的问题，并提出修复建议")
        == "系统性的分析、审视 introduction 存在的问题"
    )
    assert fallback_title("Fix the introduction") == "Fix the introduction"


def test_extract_user_message_sep_and_same_line_active_file() -> None:
    msg = "你好，请帮我润色引言"
    assert (
        extract_user_message(
            "Active editor file: demo-manuscript.md"
            + USER_MESSAGE_SEP
            + msg,
        )
        == msg
    )
    assert (
        extract_user_message(
            "Active editor file: demo-manuscript.md " + msg,
        )
        == msg
    )


def test_is_first_chat_turn() -> None:
    runner = WritingAgentRunner.__new__(WritingAgentRunner)
    runner._agent = type("A", (), {"messages": []})()
    assert is_first_chat_turn(runner) is False

    runner._agent.messages = [{"role": "user", "content": [{"text": "hi"}]}]
    assert is_first_chat_turn(runner) is True

    runner._agent.messages.append({"role": "assistant", "content": [{"text": "hello"}]})
    runner._agent.messages.append({"role": "user", "content": [{"text": "again"}]})
    assert is_first_chat_turn(runner) is False


def test_is_first_chat_turn_ignores_tool_result_messages() -> None:
    runner = WritingAgentRunner.__new__(WritingAgentRunner)
    runner._agent = type("A", (), {"messages": []})()
    runner._agent.messages = [
        {"role": "user", "content": [{"text": "请润色 Abstract"}]},
        {"role": "assistant", "content": [{"toolUse": {"toolUseId": "tu-1", "name": "read_document", "input": {"path": "demo.md"}}}]},
        {"role": "user", "content": [{"toolResult": {"toolUseId": "tu-1", "status": "success", "content": [{"text": "# Abstract\n..."}]}}]},
        {"role": "assistant", "content": [{"toolUse": {"toolUseId": "tu-2", "name": "propose_edits", "input": {"path": "demo.md", "edits": []}}}]},
        {"role": "user", "content": [{"toolResult": {"toolUseId": "tu-2", "status": "success", "content": [{"text": "Proposed edit group g-1"}]}}]},
        {"role": "assistant", "content": [{"text": "已提交编辑建议"}]},
    ]
    assert is_first_chat_turn(runner) is True


def test_initial_session_title_matches_fallback() -> None:
    assert initial_session_title("你好，请帮我润色引言") == "润色引言"


def test_resolve_session_title_keeps_pre_turn_title() -> None:
    runner = WritingAgentRunner.__new__(WritingAgentRunner)
    runner._agent = type("A", (), {"messages": []})()
    runner._agent.messages = [
        {"role": "user", "content": [{"text": "one"}]},
        {"role": "assistant", "content": [{"text": "two"}]},
    ]
    title = resolve_session_title(runner, user_text="one", assistant_text="two", existing_title="润色引言")
    assert title == "润色引言"


def test_resolve_session_title_backfills_when_still_new_chat() -> None:
    runner = WritingAgentRunner.__new__(WritingAgentRunner)
    runner._agent = type("A", (), {"messages": []})()
    title = resolve_session_title(runner, user_text="你好，请帮我润色引言", assistant_text="好的", existing_title="New chat")
    assert title == "润色引言"


def test_resolve_session_title_keeps_existing_after_first_turn() -> None:
    runner = WritingAgentRunner.__new__(WritingAgentRunner)
    runner._agent = type("A", (), {"messages": []})()
    runner._agent.messages = [
        {"role": "user", "content": [{"text": "one"}]},
        {"role": "assistant", "content": [{"text": "two"}]},
        {"role": "user", "content": [{"text": "three"}]},
    ]
    title = resolve_session_title(runner, user_text="three", assistant_text="four", existing_title="已有标题")
    assert title == "已有标题"


def test_generate_session_title_without_api_key_falls_back(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        "writing_agent.runtime.model_factory.resolve_model_settings",
        lambda: {"api_key": "", "api_base": "", "model_id": ""},
    )
    assert generate_session_title("帮我改引言", "好的") == "改引言"

"""Tests for Strands writing tools (no live LLM)."""

from pathlib import Path

from project_root import resolve_workspace_path
from protocol import SessionState
from strands.types.tools import ToolUse
from writing_tools import read_file


def _tool_context(tmp_path: Path, queue: list) -> dict:
    return {
        "session": SessionState(),
        "project_root": tmp_path,
        "outbound_queue": queue,
    }


def test_read_file_success(tmp_path: Path) -> None:
    sample = tmp_path / "examples"
    sample.mkdir()
    file_path = sample / "note.md"
    file_path.write_text("# Hello\n", encoding="utf-8")

    queue: list = []
    spec: ToolUse = {
        "name": "read_file",
        "toolUseId": "tu-1",
        "input": {"path": "examples/note.md"},
    }

    class Ctx:
        invocation_state = _tool_context(tmp_path, queue)
        tool_use = spec

    result = read_file("examples/note.md", Ctx())  # type: ignore[arg-type]
    assert result["status"] == "success"
    assert "Hello" in result["content"][0]["text"]
    assert any(e.get("type") == "chat/tool_start" for e in queue)
    assert any(e.get("type") == "chat/tool_end" for e in queue)


def test_read_file_rejects_escape(tmp_path: Path) -> None:
    queue: list = []

    class Ctx:
        invocation_state = _tool_context(tmp_path, queue)
        tool_use: ToolUse = {
            "name": "read_file",
            "toolUseId": "tu-2",
            "input": {"path": "../secret"},
        }

    result = read_file("../secret", Ctx())  # type: ignore[arg-type]
    assert result["status"] == "error"


def test_resolve_workspace_path() -> None:
    root = Path("Y:/agent/writing-agent").resolve()
    p = resolve_workspace_path(root, "examples/test.md")
    assert p == (root / "examples" / "test.md").resolve()

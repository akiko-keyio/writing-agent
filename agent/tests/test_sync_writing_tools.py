"""Tests for live agent tool sync after settings changes."""

from pathlib import Path

import pytest

from writing_agent.runtime.strands_runner import WritingAgentRunner
from writing_agent.runtime.tool_manager import set_tool_enabled


@pytest.fixture
def tools_yaml(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    path = tmp_path / "tools.yaml"
    monkeypatch.setattr("writing_agent.runtime.tool_manager._TOOLS_FILE", path)
    return path


def test_sync_writing_tools_removes_read_document(tools_yaml: Path):
    runner = WritingAgentRunner()
    assert "read_document" in runner._agent.tool_names

    set_tool_enabled("read_document", False)
    runner.sync_writing_tools()
    assert "read_document" not in runner._agent.tool_names

    set_tool_enabled("read_document", True)
    runner.sync_writing_tools()
    assert "read_document" in runner._agent.tool_names

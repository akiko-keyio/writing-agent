"""Tests for built-in tool preferences."""

from pathlib import Path

import pytest
import yaml

from tool_manager import (
    get_enabled_tool_ids,
    list_tools_for_settings,
    load_tool_prefs,
    set_tool_enabled,
)
from writing_tools import get_enabled_writing_tools


@pytest.fixture
def tools_yaml(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    path = tmp_path / "tools.yaml"
    monkeypatch.setattr("tool_manager._TOOLS_FILE", path)
    return path


def test_defaults_all_enabled(tools_yaml: Path):
    assert load_tool_prefs()["read_file"] is True
    assert "read_file" in get_enabled_tool_ids()


def test_disable_and_persist(tools_yaml: Path):
    set_tool_enabled("read_file", False)
    assert tools_yaml.exists()
    data = yaml.safe_load(tools_yaml.read_text(encoding="utf-8"))
    assert data["tools"]["read_file"]["enabled"] is False
    assert "read_file" not in get_enabled_tool_ids()
    assert all(t.tool_name != "read_file" for t in get_enabled_writing_tools())


def test_list_tools_for_settings_reflects_state(tools_yaml: Path):
    set_tool_enabled("read_file", False)
    items = list_tools_for_settings()
    read_file = next(item for item in items if item["id"] == "read_file")
    assert read_file["enabled"] is False
    assert read_file["name"] == "read_file"


def test_unknown_tool_raises(tools_yaml: Path):
    with pytest.raises(ValueError, match="Unknown tool"):
        set_tool_enabled("missing", True)

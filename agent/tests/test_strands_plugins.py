from pathlib import Path

import pytest

from strands_runner import WritingAgentRunner, _ACADEMIC_SKILL_DIR


@pytest.fixture(autouse=True)
def _subagents_yaml(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    path = tmp_path / "subagents.yaml"
    path.write_text(
        "subagents:\n  review:\n    enabled: true\n  researcher:\n    enabled: false\n",
        encoding="utf-8",
    )
    monkeypatch.setattr("subagent_manager._SUBAGENTS_FILE", path)


def test_runner_loads_plugins_and_subagents():
    runner = WritingAgentRunner()
    names = set(runner._agent.tool_names)
    assert "read_document" in names
    assert "check_references" in names
    assert "propose_edits" in names
    assert "revise_edit" in names
    assert "remember_context" in names
    assert "propose_principle" in names
    assert "skills" in names
    assert "read_skill_resource" in names
    assert "file_read" not in names
    assert "review" in names
    assert "researcher" not in names
    assert "editor" not in names
    assert "reference_list" not in names
    assert _ACADEMIC_SKILL_DIR.is_dir()

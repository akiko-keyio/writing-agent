from strands_runner import WritingAgentRunner, _ACADEMIC_SKILL_DIR


def test_runner_loads_plugins_and_subagents():
    runner = WritingAgentRunner()
    names = set(runner._agent.tool_names)
    assert "read_file" in names
    assert "skills" in names
    assert {"review", "check", "researcher", "reference_list"} <= names
    assert _ACADEMIC_SKILL_DIR.is_dir()

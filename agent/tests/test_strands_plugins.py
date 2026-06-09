from strands_runner import WritingAgentRunner, _ACADEMIC_SKILL_DIR


def test_runner_loads_plugins_and_subagents():
    runner = WritingAgentRunner()
    names = set(runner._agent.tool_names)
    # Built-in tools (check/verify are deterministic tools now, not subagents).
    assert "read_file" in names
    assert "check_consistency" in names
    assert "search_references" in names
    assert "propose_edit_group" in names
    assert "skills" in names
    # Remaining specialists after the audit.
    assert {"review", "researcher"} <= names
    assert "editor" not in names
    assert "reference_list" not in names
    assert _ACADEMIC_SKILL_DIR.is_dir()

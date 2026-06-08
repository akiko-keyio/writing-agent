from pathlib import Path

from subagents import DEFAULT_AGENTS_DIR, load_subagent_specs, subagent_tool_name


def test_load_academic_writing_subagents():
    specs = load_subagent_specs()
    assert len(specs) >= 4
    names = {s.name for s in specs}
    assert "review" in names
    assert "check" in names
    assert "researcher" in names
    assert "reference-list" in names
    ref = next(s for s in specs if s.name == "reference-list")
    assert ref.tool_name == "reference_list"
    assert ref.tool_name == subagent_tool_name("reference-list")
    assert all(s.system_prompt for s in specs)
    assert DEFAULT_AGENTS_DIR.is_dir()


def test_subagent_markdown_paths_exist():
    agents = Path(__file__).resolve().parent.parent / "plugins" / "academic-writing" / "agents"
    assert (agents / "review.md").is_file()
    assert (agents.parent / "SKILL.md").is_file()

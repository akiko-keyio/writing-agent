from pathlib import Path

from writing_agent.runtime.subagents import DEFAULT_AGENTS_DIR, load_subagent_specs, subagent_tool_name


def test_load_academic_writing_subagents():
    # After the subagent audit only specialists with a clear isolation benefit and
    # honest, runnable prompts remain: review (independent reader) and researcher
    # (local-evidence only). check/verifier became deterministic tools; editor's
    # job is done by the main agent; arbiter/reference-list were removed.
    specs = load_subagent_specs()
    names = {s.name for s in specs}
    assert "review" in names
    assert "researcher" in names
    assert "editor" not in names
    assert "arbiter" not in names
    assert "check" not in names
    assert "verifier" not in names
    assert "reference-list" not in names
    review = next(s for s in specs if s.name == "review")
    assert review.tool_name == subagent_tool_name("review")
    assert all(s.system_prompt for s in specs)
    assert DEFAULT_AGENTS_DIR.is_dir()


def test_subagent_markdown_paths_exist():
    from writing_agent.paths import PLUGINS_DIR

    agents = PLUGINS_DIR / "academic-writing" / "agents"
    assert (agents / "review.md").is_file()
    assert (agents.parent / "SKILL.md").is_file()


def test_permission_metadata_parsed(tmp_path: Path):
    (tmp_path / "ro.md").write_text(
        "---\nname: reader\ndescription: read only\nreadonly: true\n"
        "is_background: true\n---\nReader specialist body.",
        encoding="utf-8",
    )
    (tmp_path / "rw.md").write_text(
        "---\nname: writer\ndescription: writes\n---\nWriter specialist body.",
        encoding="utf-8",
    )
    specs = {s.name: s for s in load_subagent_specs(tmp_path)}
    assert specs["reader"].readonly is True
    assert specs["reader"].is_background is True
    assert specs["writer"].readonly is False
    assert specs["writer"].is_background is False


def test_malformed_subagent_file_does_not_crash(tmp_path: Path):
    # No frontmatter / empty body files are skipped, valid ones still load.
    (tmp_path / "empty.md").write_text("", encoding="utf-8")
    (tmp_path / "no-frontmatter.md").write_text("just a heading\n", encoding="utf-8")
    (tmp_path / "good.md").write_text(
        "---\nname: good\ndescription: ok\n---\nGood body.",
        encoding="utf-8",
    )
    specs = load_subagent_specs(tmp_path)
    names = {s.name for s in specs}
    assert "good" in names
    # "empty.md" has no body -> skipped; loader must not raise.


def test_scan_plugins_exposes_subagent_permissions():
    from writing_agent.runtime.plugin_scanner import scan_plugins

    data = scan_plugins()
    for sub in data["subagents"]:
        assert "readonly" in sub
        assert "is_background" in sub

from pathlib import Path

import pytest

from writing_agent.adapters.strands_file_read_adapter import read_path_content
from writing_agent.adapters.strands_community_tools import (
    resolve_skill_resource_path,
    skill_resource_roots,
)
from writing_agent.runtime.strands_runner import _ACADEMIC_SKILL_DIR


def test_skill_resource_roots_include_academic_writing():
    roots = skill_resource_roots()
    assert roots
    assert _ACADEMIC_SKILL_DIR.resolve() in roots


def test_resolve_references_path():
    resolved, err = resolve_skill_resource_path("references/narrative-theory.md")
    assert err is None
    assert resolved is not None
    assert resolved.name == "narrative-theory.md"
    assert resolved.parent.name == "references"


def test_resolve_bare_filename_under_references():
    resolved, err = resolve_skill_resource_path("word-choice.md")
    assert err is None
    assert resolved is not None
    assert resolved.name == "word-choice.md"


def test_rejects_legacy_reference_prefix():
    _, err = resolve_skill_resource_path("reference/narrative-theory.md")
    assert err is not None
    assert "references/" in err


def test_rejects_path_traversal():
    _, err = resolve_skill_resource_path("../SKILL.md")
    assert err is not None


def test_rejects_workspace_relative_paths():
    _, err = resolve_skill_resource_path("examples/demo-manuscript.md")
    assert err is not None


def test_read_skill_file_content_view_mode():
    resolved, _ = resolve_skill_resource_path("references/narrative-theory.md")
    assert resolved is not None
    content, err = read_path_content(resolved, mode="view")
    assert err is None
    assert content
    assert len(content) > 100


def test_read_skill_file_content_lines_mode():
    resolved, _ = resolve_skill_resource_path("references/narrative-theory.md")
    assert resolved is not None
    content, err = read_path_content(resolved, mode="lines", start_line=0, end_line=2)
    assert err is None
    assert content
    assert content.count("\n") <= 2 or len(content.splitlines()) <= 3


def test_read_skill_file_content_search_mode():
    resolved, _ = resolve_skill_resource_path("references/section-guide.md")
    assert resolved is not None
    content, err = read_path_content(
        resolved,
        mode="search",
        search_pattern="section|Section",
        context_lines=1,
    )
    assert err is None
    assert content
    assert "No matches" not in content


def test_references_directory_exists():
    refs = _ACADEMIC_SKILL_DIR / "references"
    assert refs.is_dir()
    assert (refs / "narrative-theory.md").is_file()

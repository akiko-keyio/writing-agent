"""Default workspace root resolves to repo ``examples/``."""

from __future__ import annotations

from writing_agent.workspace.project_root import resolve_project_root, resolve_repo_root


def test_default_project_root_is_examples(monkeypatch) -> None:
    monkeypatch.delenv("WRITING_AGENT_PROJECT_ROOT", raising=False)
    repo = resolve_repo_root()
    root = resolve_project_root()
    assert root == (repo / "examples").resolve()
    assert root.is_dir()

"""Default workspace root resolves to repo ``examples/``."""

from __future__ import annotations

from writing_agent.paths import repo_config_path
from writing_agent.workspace.project_root import resolve_project_root, resolve_repo_root


def test_default_project_root_is_examples(monkeypatch) -> None:
    monkeypatch.delenv("WRITING_AGENT_PROJECT_ROOT", raising=False)
    repo = resolve_repo_root()
    root = resolve_project_root()
    assert root == (repo / "examples").resolve()


def test_repo_config_path_prefers_config_dir(tmp_path, monkeypatch) -> None:
    monkeypatch.setattr("writing_agent.paths.REPO_ROOT", tmp_path)
    monkeypatch.setattr("writing_agent.paths.CONFIG_DIR", tmp_path / "config")
    (tmp_path / "config").mkdir()
    legacy = tmp_path / "models.yaml"
    preferred = tmp_path / "config" / "models.yaml"
    legacy.write_text("legacy: true\n", encoding="utf-8")
    assert repo_config_path("models.yaml") == legacy
    preferred.write_text("preferred: true\n", encoding="utf-8")
    assert repo_config_path("models.yaml") == preferred


def test_repo_config_path_defaults_to_config_dir(tmp_path, monkeypatch) -> None:
    monkeypatch.setattr("writing_agent.paths.REPO_ROOT", tmp_path)
    config_dir = tmp_path / "config"
    monkeypatch.setattr("writing_agent.paths.CONFIG_DIR", config_dir)
    assert repo_config_path("tools.yaml") == config_dir / "tools.yaml"

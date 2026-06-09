"""Model factory + runner injection seam (no live model)."""

from __future__ import annotations

from pathlib import Path

import pytest
import yaml

from fakes import FakeModel, FakeTurn, fake_model_factory
from model_factory import has_active_model_config, resolve_model_settings
from strands_runner import WritingAgentRunner


@pytest.fixture
def models_yaml(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    path = tmp_path / "models.yaml"
    monkeypatch.setattr("model_manager._MODELS_FILE", path)
    return path


def _write(path: Path, active: str, models: list[dict]) -> None:
    path.write_text(
        yaml.safe_dump({"active": active, "models": models}),
        encoding="utf-8",
    )


def test_resolve_prefers_active_model_from_yaml(models_yaml: Path) -> None:
    _write(
        models_yaml,
        "m1",
        [
            {
                "id": "m1",
                "provider": "OpenAI",
                "model": "gpt-test",
                "api_key": "sk-secret-key-123",
                "api_base": "https://example/v1",
                "temperature": 0.5,
            },
        ],
    )
    settings = resolve_model_settings()
    assert settings["model_id"] == "gpt-test"
    assert settings["api_key"] == "sk-secret-key-123"
    assert settings["api_base"] == "https://example/v1"
    assert settings["temperature"] == 0.5
    assert settings["source"] == "models.yaml"
    assert settings["model_config_id"] == "m1"


def test_resolve_falls_back_to_env_when_yaml_empty(models_yaml: Path) -> None:
    # No models.yaml content -> env fallback path.
    settings = resolve_model_settings()
    assert settings["source"] == "env"


def test_set_active_model_changes_factory_result(models_yaml: Path) -> None:
    from model_manager import add_model, set_active_model
    from model_manager import ModelEntry

    add_model(
        ModelEntry(
            id="alpha",
            provider="OpenAI",
            model="model-alpha",
            api_key="sk-alpha",
            api_base="https://a/v1",
        ),
    )
    add_model(
        ModelEntry(
            id="beta",
            provider="OpenAI",
            model="model-beta",
            api_key="sk-beta",
            api_base="https://b/v1",
        ),
    )
    set_active_model("alpha")
    assert resolve_model_settings()["model_id"] == "model-alpha"
    set_active_model("beta")
    assert resolve_model_settings()["model_id"] == "model-beta"


def test_has_active_model_config(models_yaml: Path) -> None:
    _write(
        models_yaml,
        "m1",
        [
            {
                "id": "m1",
                "provider": "OpenAI",
                "model": "gpt-test",
                "api_key": "sk-key",
                "api_base": "https://example/v1",
                "temperature": 0.3,
            },
        ],
    )
    assert has_active_model_config() is True


def test_runner_constructs_with_injected_fake_model(models_yaml: Path) -> None:
    runner = WritingAgentRunner(model=FakeModel())
    assert runner.messages == []


def test_runner_constructs_with_fake_factory(models_yaml: Path) -> None:
    runner = WritingAgentRunner(model_factory=fake_model_factory())
    assert runner.messages == []


def test_rebuild_model_preserves_conversation(models_yaml: Path) -> None:
    runner = WritingAgentRunner(model_factory=fake_model_factory([FakeTurn(text="ok")]))
    runner.restore_conversation([{"role": "user", "text": "remember this"}])
    assert len(runner.messages) == 1
    runner.rebuild_model()
    assert len(runner.messages) == 1
    assert runner.messages[0]["role"] == "user"

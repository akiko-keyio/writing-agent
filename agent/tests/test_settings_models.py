"""Settings model behavior: no-write read, masked field, active rebuild."""

from __future__ import annotations

import asyncio
from pathlib import Path

import pytest

from writing_agent.server.connection import Connection
from writing_agent.server.handler import handle_message_events
from writing_agent.domain.session_store import SessionStore


@pytest.fixture
def models_yaml(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    path = tmp_path / "models.yaml"
    monkeypatch.setattr("writing_agent.runtime.model_manager._MODELS_FILE", path)
    return path


async def _collect(conn: Connection, raw: dict) -> list[dict]:
    return [e async for e in handle_message_events(conn, raw)]


def _conn() -> Connection:
    store = SessionStore()
    conn = Connection.create(store)
    return conn


def _add(conn: Connection, model: str, key: str, base: str) -> list[dict]:
    return asyncio.run(
        _collect(
            conn,
            {
                "type": "settings/update",
                "action": "add_model",
                "model": {"model": model, "api_key": key, "api_base": base},
            },
        ),
    )


def test_settings_read_does_not_write_models_yaml(models_yaml: Path) -> None:
    conn = _conn()
    events = asyncio.run(_collect(conn, {"type": "settings/read"}))
    assert events[0]["type"] == "settings/data"
    # Reading settings must never create a secret-bearing file.
    assert not models_yaml.exists()


def test_settings_read_masks_key_field(models_yaml: Path) -> None:
    conn = _conn()
    _add(conn, "gpt-test", "sk-supersecret-1234", "https://example/v1")
    events = asyncio.run(_collect(conn, {"type": "settings/read"}))
    model = events[0]["config"]["models"][0]
    assert "api_key" not in model  # raw key never leaves the backend
    assert "api_key_masked" in model
    assert "supersecret" not in model["api_key_masked"]
    assert model["api_key_masked"].endswith("1234")


def test_no_temperature_required_and_defaulted(models_yaml: Path) -> None:
    conn = _conn()
    _add(conn, "m1", "sk-key-abc", "https://e/v1")
    events = asyncio.run(_collect(conn, {"type": "settings/read"}))
    model = events[0]["config"]["models"][0]
    # Temperature is an internal default; it is present but not user-facing.
    assert model["temperature"] == 0.3


def test_add_model_updated_response_has_masked_key(models_yaml: Path) -> None:
    conn = _conn()
    events = _add(conn, "m1", "sk-abcd1234", "https://e/v1")
    updated = next(e for e in events if e["type"] == "settings/updated")
    model = updated["config"]["models"][0]
    assert "api_key" not in model
    assert model["api_key_masked"].endswith("1234")


def test_remove_active_model_reselects(models_yaml: Path) -> None:
    from writing_agent.runtime.model_manager import load_models

    conn = _conn()
    _add(conn, "alpha", "sk-alpha-key", "https://a/v1")
    _add(conn, "beta", "sk-beta-key", "https://b/v1")
    cfg = load_models()
    assert cfg.active == cfg.models[0].id
    active_id = cfg.active

    asyncio.run(
        _collect(
            conn,
            {"type": "settings/update", "action": "remove_model", "model_id": active_id},
        ),
    )
    cfg2 = load_models()
    assert len(cfg2.models) == 1
    assert cfg2.active == cfg2.models[0].id
    assert cfg2.active != active_id


def test_remove_unknown_model_errors(models_yaml: Path) -> None:
    conn = _conn()
    events = asyncio.run(
        _collect(
            conn,
            {"type": "settings/update", "action": "remove_model", "model_id": "missing"},
        ),
    )
    assert events[-1]["type"] == "error"
    assert "not found" in events[-1]["message"].lower()


def test_remove_env_display_model_errors(models_yaml: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    from types import SimpleNamespace

    monkeypatch.setattr(
        "writing_agent.config.config",
        SimpleNamespace(
            openai_api_key="sk-env-secret",
            openai_model="env-model",
            openai_api_base="https://env/v1",
        ),
    )
    conn = _conn()
    events = asyncio.run(
        _collect(
            conn,
            {"type": "settings/update", "action": "remove_model", "model_id": "env"},
        ),
    )
    assert events[-1]["type"] == "error"
    assert ".env" in events[-1]["message"]


def test_load_models_strips_invalid_entries(models_yaml: Path) -> None:
    models_yaml.write_text(
        """active: '3'
models:
- id: ''
  provider: ''
  model: ''
  api_key: ''
  api_base: ''
  temperature: 0.3
- id: '3'
  provider: OpenAI
  model: '3'
  api_key: '3'
  api_base: '3'
  temperature: 0.3
""",
        encoding="utf-8",
    )
    from writing_agent.runtime.model_manager import load_models

    config = load_models()
    assert config.models == []
    assert config.active == ""
    saved = models_yaml.read_text(encoding="utf-8")
    assert "id: '3'" not in saved


def test_env_fallback_shown_without_persisting(
    models_yaml: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    from types import SimpleNamespace

    # config is a frozen dataclass; replace the module-level instance that
    # env_fallback_entry reads via ``from config import config``.
    monkeypatch.setattr(
        "writing_agent.config.config",
        SimpleNamespace(
            openai_api_key="sk-env-secret",
            openai_model="env-model",
            openai_api_base="https://env/v1",
        ),
    )

    conn = _conn()
    events = asyncio.run(_collect(conn, {"type": "settings/read"}))
    models = events[0]["config"]["models"]
    assert any(m["model"] == "env-model" for m in models)
    assert models[0].get("readonly") is True
    # Fallback display must not persist a models.yaml.
    assert not models_yaml.exists()

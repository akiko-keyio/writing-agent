"""Multi-model configuration manager using models.yaml."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml

_MODELS_FILE = Path(__file__).resolve().parent.parent / "models.yaml"


@dataclass
class ModelEntry:
    """One model configuration."""
    id: str
    provider: str
    model: str
    api_key: str
    api_base: str
    temperature: float = 0.3
    readonly: bool = False

    def to_dict(self, mask_key: bool = False) -> dict[str, Any]:
        """Serialize a model entry.

        When ``mask_key`` is True (outbound to the frontend) the raw key is never
        included — only ``api_key_masked``. When False (persisted to yaml) the
        real ``api_key`` is written.
        """
        base: dict[str, Any] = {
            "id": self.id,
            "provider": self.provider,
            "model": self.model,
            "api_base": self.api_base,
            "temperature": self.temperature,
        }
        if mask_key:
            base["api_key_masked"] = _mask_key(self.api_key)
            if self.readonly:
                base["readonly"] = True
        else:
            base["api_key"] = self.api_key
        return base


@dataclass
class ModelsConfig:
    """Full models configuration."""
    active: str = ""
    models: list[ModelEntry] = field(default_factory=list)

    def get_active(self) -> ModelEntry | None:
        for m in self.models:
            if m.id == self.active:
                return m
        return self.models[0] if self.models else None

    def to_dict(self, mask_keys: bool = False) -> dict[str, Any]:
        return {
            "active": self.active,
            "models": [m.to_dict(mask_key=mask_keys) for m in self.models],
        }


def _mask_key(key: str) -> str:
    if not key or len(key) <= 8:
        return "***"
    return f"{key[:3]}...{key[-4:]}"


def entry_is_valid(entry: ModelEntry) -> bool:
    """Persisted models must have id, model id, HTTP(S) base URL, and a real API key."""
    model = entry.model.strip()
    api_base = entry.api_base.strip()
    api_key = entry.api_key.strip()
    return bool(
        entry.id.strip()
        and len(model) >= 2
        and api_base.startswith(("http://", "https://"))
        and len(api_key) >= 8
    )


def _entry_from_raw(item: dict[str, Any]) -> ModelEntry:
    return ModelEntry(
        id=str(item.get("id", "")).strip(),
        provider=str(item.get("provider", "")).strip(),
        model=str(item.get("model", "")).strip(),
        api_key=str(item.get("api_key", "")).strip(),
        api_base=str(item.get("api_base", "")).strip(),
        temperature=float(item.get("temperature", 0.3)),
    )


def _normalize_config(raw: dict[str, Any]) -> ModelsConfig:
    active = str(raw.get("active", "") or "").strip()
    models = [
        entry
        for item in raw.get("models") or []
        if isinstance(item, dict)
        for entry in [_entry_from_raw(item)]
        if entry_is_valid(entry)
    ]
    active_ids = {m.id for m in models}
    if active not in active_ids:
        active = models[0].id if models else ""
    return ModelsConfig(active=active, models=models)


def _raw_had_invalid_entries(raw: dict[str, Any], normalized: ModelsConfig) -> bool:
    raw_items = raw.get("models") or []
    if not isinstance(raw_items, list):
        return True
    if str(raw.get("active", "") or "").strip() != normalized.active:
        return True
    if len(raw_items) != len(normalized.models):
        return True
    return False


def _slugify(text: str) -> str:
    """Create a URL/filesystem-safe slug."""
    return re.sub(r"[^a-z0-9-]", "-", text.lower()).strip("-")


def env_fallback_entry() -> ModelEntry | None:
    """Build an in-memory model entry from .env (never persisted).

    Used purely to display a usable fallback in Settings when ``models.yaml`` is
    empty. ``settings/read`` must not write secret-bearing config to disk.
    """
    from config import config as env_config

    if not env_config.openai_api_key:
        return None
    return ModelEntry(
        id="env",
        provider="OpenAI (.env)",
        model=env_config.openai_model or "gpt-4o-mini",
        api_key=env_config.openai_api_key,
        api_base=env_config.openai_api_base,
        temperature=0.3,
        readonly=True,
    )


def display_models_config() -> ModelsConfig:
    """Models config for Settings display.

    Returns the persisted ``models.yaml`` config, or an in-memory env fallback
    when empty. This function never writes to disk.
    """
    config = load_models()
    if config.models:
        return config
    fallback = env_fallback_entry()
    if fallback is not None:
        return ModelsConfig(active=fallback.id, models=[fallback])
    return config


def load_models() -> ModelsConfig:
    """Load models configuration from models.yaml."""
    if not _MODELS_FILE.exists():
        return ModelsConfig()

    with open(_MODELS_FILE, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}

    if not isinstance(data, dict):
        data = {}

    config = _normalize_config(data)
    if _raw_had_invalid_entries(data, config):
        save_models(config)
    return config


def save_models(config: ModelsConfig) -> None:
    """Save models configuration to models.yaml."""
    data = {
        "active": config.active,
        "models": [m.to_dict() for m in config.models],
    }
    with open(_MODELS_FILE, "w", encoding="utf-8") as f:
        yaml.dump(data, f, default_flow_style=False, allow_unicode=True, sort_keys=False)


def add_model(entry: ModelEntry) -> ModelsConfig:
    """Add a new model to the pool."""
    if not entry.model.strip() or not entry.api_base.strip() or not entry.api_key.strip():
        raise ValueError("Model name, base URL, and API key are required")
    if not entry.api_base.strip().startswith(("http://", "https://")):
        raise ValueError("Base URL must start with http:// or https://")
    if len(entry.api_key.strip()) < 8:
        raise ValueError("API key looks too short")
    if len(entry.model.strip()) < 2:
        raise ValueError("Model name looks too short")
    config = load_models()
    if not entry.id:
        entry.id = _slugify(entry.model or entry.provider)
    # Ensure unique ID
    existing_ids = {m.id for m in config.models}
    base_id = entry.id
    counter = 1
    while entry.id in existing_ids:
        entry.id = f"{base_id}-{counter}"
        counter += 1
    config.models.append(entry)
    if not config.active:
        config.active = entry.id
    save_models(config)
    return config


def update_model(model_id: str, updates: dict[str, Any]) -> ModelsConfig:
    """Update an existing model's configuration."""
    config = load_models()
    found = False
    for m in config.models:
        if m.id == model_id:
            found = True
            for key, val in updates.items():
                if hasattr(m, key) and key != "id":
                    if key == "api_key" and not str(val).strip():
                        continue
                    if key == "temperature":
                        setattr(m, key, float(val))
                    else:
                        setattr(m, key, val)
            break
    if not found:
        if model_id == "env":
            raise ValueError(
                "The .env model is display-only. Add a model in Settings to edit endpoints."
            )
        raise ValueError(f"Model not found: {model_id}")
    save_models(config)
    return config


def remove_model(model_id: str) -> ModelsConfig:
    """Remove a model from the pool."""
    config = load_models()
    if not any(m.id == model_id for m in config.models):
        if model_id == "env":
            raise ValueError(
                "This model comes from .env and cannot be deleted here. "
                "Remove OPENAI_API_KEY from .env or add a models.yaml entry instead."
            )
        raise ValueError(f"Model not found: {model_id}")
    config.models = [m for m in config.models if m.id != model_id]
    if config.active == model_id:
        config.active = config.models[0].id if config.models else ""
    save_models(config)
    return config


def set_active_model(model_id: str) -> ModelsConfig:
    """Set the active model."""
    config = load_models()
    if not any(m.id == model_id for m in config.models):
        if model_id == "env":
            raise ValueError(
                "The .env model is display-only. Add a model in Settings to choose an active endpoint."
            )
        raise ValueError(f"Model not found: {model_id}")
    config.active = model_id
    save_models(config)
    return config


def settings_models_config() -> ModelsConfig:
    """Models config for Settings responses after mutations.

    Uses the same display rules as ``settings/read`` so the UI does not
    diverge (e.g. env fallback after deleting the last yaml entry).
    """
    return display_models_config()

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

    def to_dict(self, mask_key: bool = False) -> dict[str, Any]:
        return {
            "id": self.id,
            "provider": self.provider,
            "model": self.model,
            "api_key": _mask_key(self.api_key) if mask_key else self.api_key,
            "api_base": self.api_base,
            "temperature": self.temperature,
        }


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


def _slugify(text: str) -> str:
    """Create a URL/filesystem-safe slug."""
    return re.sub(r"[^a-z0-9-]", "-", text.lower()).strip("-")


def load_models() -> ModelsConfig:
    """Load models configuration from models.yaml."""
    if not _MODELS_FILE.exists():
        return ModelsConfig()

    with open(_MODELS_FILE, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}

    active = data.get("active", "")
    models: list[ModelEntry] = []
    for item in data.get("models", []):
        models.append(ModelEntry(
            id=item.get("id", ""),
            provider=item.get("provider", ""),
            model=item.get("model", ""),
            api_key=item.get("api_key", ""),
            api_base=item.get("api_base", ""),
            temperature=float(item.get("temperature", 0.3)),
        ))

    return ModelsConfig(active=active, models=models)


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
    for m in config.models:
        if m.id == model_id:
            for key, val in updates.items():
                if hasattr(m, key) and key != "id":
                    if key == "temperature":
                        setattr(m, key, float(val))
                    else:
                        setattr(m, key, val)
            break
    save_models(config)
    return config


def remove_model(model_id: str) -> ModelsConfig:
    """Remove a model from the pool."""
    config = load_models()
    config.models = [m for m in config.models if m.id != model_id]
    if config.active == model_id:
        config.active = config.models[0].id if config.models else ""
    save_models(config)
    return config


def set_active_model(model_id: str) -> ModelsConfig:
    """Set the active model."""
    config = load_models()
    if not any(m.id == model_id for m in config.models):
        raise ValueError(f"Model not found: {model_id}")
    config.active = model_id
    save_models(config)
    return config

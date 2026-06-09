"""Model factory: build the active model from models.yaml, falling back to .env.

This is the single seam through which the runner obtains a model. Keeping it
here (instead of inline in ``strands_runner``) makes the runner injectable for
fake-model tests and evals, and lets ``settings/update set_active_model`` change
runtime behavior by rebuilding the runner's model.
"""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

from strands.models.openai import OpenAIModel

from config import config
from model_manager import load_models

ModelFactory = Callable[[], Any]


def resolve_model_settings() -> dict[str, Any]:
    """Resolve active model connection settings.

    Order of precedence:
    1. Active model in ``models.yaml`` (if it has a key + model id).
    2. ``.env`` / environment config.
    """
    active = load_models().get_active()
    if active is not None and active.api_key and active.model:
        return {
            "api_key": active.api_key,
            "api_base": active.api_base or config.openai_api_base,
            "model_id": active.model,
            "temperature": active.temperature,
            "source": "models.yaml",
            "model_config_id": active.id,
        }
    return {
        "api_key": config.openai_api_key,
        "api_base": config.openai_api_base,
        "model_id": config.openai_model,
        "temperature": 0.3,
        "source": "env",
        "model_config_id": "",
    }


def has_active_model_config() -> bool:
    """Whether a usable model (key + model id) is configured anywhere."""
    settings = resolve_model_settings()
    return bool(settings["api_key"] and settings["model_id"])


def create_active_model() -> OpenAIModel:
    """Create an ``OpenAIModel`` from the active configuration."""
    settings = resolve_model_settings()
    return OpenAIModel(
        client_args={
            "api_key": settings["api_key"],
            "base_url": settings["api_base"],
        },
        model_id=settings["model_id"],
        params={"temperature": settings["temperature"]},
    )

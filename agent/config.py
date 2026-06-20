"""Centralized configuration for the writing agent."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv

from project_root import resolve_project_root

_REPO_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(_REPO_ROOT / ".env")
load_dotenv()


def _env_int(*keys: str, default: int) -> int:
    for key in keys:
        raw = os.getenv(key, "").strip()
        if raw:
            return int(raw)
    return default


def _env_str(*keys: str, default: str) -> str:
    for key in keys:
        raw = os.getenv(key, "").strip()
        if raw:
            return raw
    return default


@dataclass(frozen=True)
class Config:
    """Application configuration loaded from environment variables."""

    # Server configuration (AGENT_* or WS_* from repo root .env)
    host: str = field(
        default_factory=lambda: _env_str("AGENT_HOST", "WS_HOST", default="localhost"),
    )
    port: int = field(
        default_factory=lambda: _env_int("AGENT_PORT", "WS_PORT", default=8765),
    )

    # OpenAI configuration
    openai_api_key: str = field(
        default_factory=lambda: os.getenv("OPENAI_API_KEY", "")
    )
    openai_api_base: str = field(
        default_factory=lambda: os.getenv("OPENAI_API_BASE", "https://api.openai.com/v1")
    )
    openai_model: str = field(
        default_factory=lambda: os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    )

    # Project configuration (default writing workspace: repo/examples/)
    project_root: Path = field(default_factory=resolve_project_root)

    # Frontend configuration (for display only)
    frontend_openai_model: str = field(
        default_factory=lambda: os.getenv("VITE_OPENAI_MODEL", "")
    )


# Global config instance
config = Config()

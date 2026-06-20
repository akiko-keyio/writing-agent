"""Filesystem anchors for the writing-agent package."""

from pathlib import Path

PACKAGE_DIR = Path(__file__).resolve().parent
AGENT_ROOT = PACKAGE_DIR.parent
REPO_ROOT = AGENT_ROOT.parent
PLUGINS_DIR = AGENT_ROOT / "plugins"
CONFIG_DIR = REPO_ROOT / "config"


def repo_config_path(filename: str) -> Path:
    """Path to a repo config file. Prefer ``config/``; fall back to repo root."""
    preferred = CONFIG_DIR / filename
    legacy = REPO_ROOT / filename
    if preferred.exists():
        return preferred
    if legacy.exists():
        return legacy
    return preferred

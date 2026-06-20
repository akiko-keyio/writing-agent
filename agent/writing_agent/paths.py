"""Filesystem anchors for the writing-agent package."""

from pathlib import Path

PACKAGE_DIR = Path(__file__).resolve().parent
AGENT_ROOT = PACKAGE_DIR.parent
REPO_ROOT = AGENT_ROOT.parent
PLUGINS_DIR = AGENT_ROOT / "plugins"

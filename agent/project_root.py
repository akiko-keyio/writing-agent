"""Resolve the writing workspace root on disk."""

from __future__ import annotations

import os
from pathlib import Path

_AGENT_DIR = Path(__file__).resolve().parent
_DEFAULT_ROOT = _AGENT_DIR.parent


def resolve_project_root() -> Path:
    """Repo / workspace root (parent of ``agent/``), overridable via env."""
    raw = os.getenv("WRITING_AGENT_PROJECT_ROOT", "").strip()
    if raw:
        return Path(raw).expanduser().resolve()
    return _DEFAULT_ROOT.resolve()


def normalize_workspace_path(relative_path: str) -> str:
    """Canonical project-relative path (forward slashes, no leading slash)."""
    rel = relative_path.strip().replace("\\", "/").lstrip("/")
    if not rel:
        raise ValueError("Path is required")
    parts = [p for p in rel.split("/") if p]
    if ".." in parts:
        raise ValueError("Path must not contain '..'")
    return "/".join(parts)


def resolve_workspace_path(project_root: Path, relative_path: str) -> Path:
    """Map a project-relative path to an absolute path under ``project_root``."""
    rel = relative_path.strip().replace("\\", "/").lstrip("/")
    if not rel:
        raise ValueError("Path is required")
    parts = [p for p in rel.split("/") if p]
    if ".." in parts:
        raise ValueError("Path must not contain '..'")
    resolved = (project_root / Path(*parts)).resolve()
    root = project_root.resolve()
    try:
        resolved.relative_to(root)
    except ValueError as exc:
        raise ValueError("Path is outside project root") from exc
    return resolved

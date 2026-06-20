"""Workspace identity and path binding for per-project agent state."""

from __future__ import annotations

import hashlib
import os
import re
from dataclasses import dataclass
from pathlib import Path

from writing_agent.workspace.project_root import resolve_project_root

_SAFE_ID_RE = re.compile(r"[^A-Za-z0-9_.-]+")


@dataclass(frozen=True)
class WorkspaceContext:
    workspace_id: str
    project_root: Path
    display_name: str


def _canonical_root(root: Path) -> str:
    text = str(root.expanduser().resolve()).replace("\\", "/")
    return text.lower() if os.name == "nt" else text


def workspace_id_for_root(root: Path) -> str:
    digest = hashlib.sha256(_canonical_root(root).encode("utf-8")).hexdigest()
    return f"ws-{digest[:16]}"


def sanitize_workspace_id(value: str) -> str:
    cleaned = _SAFE_ID_RE.sub("-", value.strip()).strip(".-")
    return cleaned or "workspace"


def workspace_context_for_root(
    root: Path,
    *,
    display_name: str | None = None,
) -> WorkspaceContext:
    resolved = root.expanduser().resolve()
    return WorkspaceContext(
        workspace_id=workspace_id_for_root(resolved),
        project_root=resolved,
        display_name=(display_name or resolved.name or "Workspace").strip(),
    )


def default_workspace_context() -> WorkspaceContext:
    root = resolve_project_root()
    return workspace_context_for_root(root, display_name="Examples")

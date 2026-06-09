"""Shared file-backed persistence helpers for local user state.

All durable backend state (sessions, edit groups, memory, eval runs) lives under
a single state root, by default ``<project_root>/.writing-agent/`` (git-ignored).
These helpers provide atomic writes and recoverable reads so that future stores
(EditGroupStore, MemoryStore) reuse one pattern instead of reinventing it.
"""

from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path
from typing import Any

from project_root import resolve_project_root

STATE_DIR_ENV = "WRITING_AGENT_STATE_DIR"

#: Bump when the on-disk schema changes in a backward-incompatible way.
STORE_VERSION = 1


class CorruptStateError(Exception):
    """Raised when a state file exists but cannot be parsed as valid JSON."""


def state_root() -> Path:
    """Resolve the base directory for all local state.

    Order: ``WRITING_AGENT_STATE_DIR`` env override, then
    ``<project_root>/.writing-agent``. Tests point the env var at a tmp dir.
    """
    raw = os.getenv(STATE_DIR_ENV, "").strip()
    if raw:
        return Path(raw).expanduser().resolve()
    return (resolve_project_root() / ".writing-agent").resolve()


def ensure_dir(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


def _json_default(value: Any) -> Any:
    if isinstance(value, bytes):
        # Writing-agent tools are text-only; fall back to a lossy decode rather
        # than crash if a provider ever returns raw bytes.
        return value.decode("utf-8", errors="replace")
    if isinstance(value, (set, tuple)):
        return list(value)
    if isinstance(value, Path):
        return str(value)
    return str(value)


def atomic_write_json(path: Path, data: Any) -> None:
    """Write JSON atomically: temp file in the same dir, fsync, then replace."""
    ensure_dir(path.parent)
    fd, tmp_name = tempfile.mkstemp(
        prefix=f".{path.name}.",
        suffix=".tmp",
        dir=str(path.parent),
    )
    tmp_path = Path(tmp_name)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            json.dump(data, fh, ensure_ascii=False, indent=2, default=_json_default)
            fh.flush()
            os.fsync(fh.fileno())
        os.replace(tmp_path, path)
    except BaseException:
        tmp_path.unlink(missing_ok=True)
        raise


def atomic_write_text(path: Path, text: str) -> None:
    """Write text atomically (used by document/save)."""
    ensure_dir(path.parent)
    fd, tmp_name = tempfile.mkstemp(
        prefix=f".{path.name}.",
        suffix=".tmp",
        dir=str(path.parent),
    )
    tmp_path = Path(tmp_name)
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="") as fh:
            fh.write(text)
            fh.flush()
            os.fsync(fh.fileno())
        os.replace(tmp_path, path)
    except BaseException:
        tmp_path.unlink(missing_ok=True)
        raise


def read_json(path: Path) -> Any | None:
    """Read JSON, returning ``None`` if missing.

    Raises:
        CorruptStateError: The file exists but is not valid JSON.
    """
    try:
        raw = path.read_text(encoding="utf-8")
    except FileNotFoundError:
        return None
    if not raw.strip():
        return None
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise CorruptStateError(f"Corrupt state file: {path}") from exc

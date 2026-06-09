"""File-backed session snapshots under ``.writing-agent/sessions/``.

State survives backend restart. Reads are recoverable: a corrupt session file is
skipped in listings and treated as a missing session on load, rather than
crashing the connection.
"""

from __future__ import annotations

import logging
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from protocol import SessionState
from storage import (
    STORE_VERSION,
    CorruptStateError,
    atomic_write_json,
    ensure_dir,
    read_json,
    state_root,
)
from strands.types.content import Message
from strands_runner import WritingAgentRunner

logger = logging.getLogger(__name__)


@dataclass
class SessionSnapshot:
    session_id: str
    title: str
    created_at: float
    messages: list[Message]
    agent_state: dict[str, Any]
    open_buffers: dict[str, str]
    active_path: str | None
    updated_at: float = field(default=0.0)

    def to_dict(self) -> dict[str, Any]:
        return {
            "version": STORE_VERSION,
            "session_id": self.session_id,
            "title": self.title,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "messages": self.messages,
            "agent_state": self.agent_state,
            "open_buffers": self.open_buffers,
            "active_path": self.active_path,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> SessionSnapshot:
        return cls(
            session_id=str(data.get("session_id", "")),
            title=str(data.get("title", "New chat")),
            created_at=float(data.get("created_at", 0.0)),
            updated_at=float(data.get("updated_at", 0.0)),
            messages=list(data.get("messages", [])),
            agent_state=dict(data.get("agent_state", {})),
            open_buffers=dict(data.get("open_buffers", {})),
            active_path=data.get("active_path"),
        )


class SessionStore:
    """Persists session snapshots as JSON files keyed by session_id."""

    def __init__(self, base_dir: Path | None = None) -> None:
        root = base_dir if base_dir is not None else state_root()
        self._dir = ensure_dir(Path(root) / "sessions")

    def _path(self, session_id: str) -> Path:
        return self._dir / f"{session_id}.json"

    def save(
        self,
        session_id: str,
        runner: WritingAgentRunner,
        session: SessionState,
        *,
        title: str | None = None,
    ) -> None:
        existing = self.load(session_id)
        resolved_title = title or (existing.title if existing else "New chat")
        created = existing.created_at if existing else time.time()
        snap = SessionSnapshot(
            session_id=session_id,
            title=resolved_title,
            created_at=created,
            updated_at=time.time(),
            messages=list(runner.messages),
            agent_state=runner.snapshot_agent_state(),
            open_buffers=dict(session.open_buffers),
            active_path=session.active_path,
        )
        atomic_write_json(self._path(session_id), snap.to_dict())

    def load(self, session_id: str) -> SessionSnapshot | None:
        try:
            data = read_json(self._path(session_id))
        except CorruptStateError:
            logger.warning("Skipping corrupt session file for %s", session_id)
            return None
        if not isinstance(data, dict):
            return None
        return SessionSnapshot.from_dict(data)

    def list_all(self) -> list[dict[str, Any]]:
        items: list[SessionSnapshot] = []
        for path in self._dir.glob("*.json"):
            try:
                data = read_json(path)
            except CorruptStateError:
                logger.warning("Skipping corrupt session file: %s", path)
                continue
            if isinstance(data, dict):
                items.append(SessionSnapshot.from_dict(data))
        items.sort(key=lambda s: s.created_at, reverse=True)
        return [
            {
                "session_id": s.session_id,
                "title": s.title,
                "created_at": s.created_at,
            }
            for s in items
        ]

    def create_empty(self) -> str:
        session_id = f"sess-{uuid.uuid4().hex[:12]}"
        now = time.time()
        snap = SessionSnapshot(
            session_id=session_id,
            title="New chat",
            created_at=now,
            updated_at=now,
            messages=[],
            agent_state={},
            open_buffers={},
            active_path=None,
        )
        atomic_write_json(self._path(session_id), snap.to_dict())
        return session_id

"""In-memory session snapshots (MVP; replaceable with file/DB later)."""

from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field
from typing import Any

from protocol import SessionState
from strands.types.content import Message
from strands_runner import WritingAgentRunner


@dataclass
class SessionSnapshot:
    session_id: str
    title: str
    created_at: float
    messages: list[Message]
    agent_state: dict[str, Any]
    open_buffers: dict[str, str]
    active_path: str | None


class SessionStore:
    """MVP in-memory store keyed by session_id."""

    def __init__(self) -> None:
        self.sessions: dict[str, SessionSnapshot] = {}

    def save(
        self,
        session_id: str,
        runner: WritingAgentRunner,
        session: SessionState,
        *,
        title: str | None = None,
    ) -> None:
        existing = self.sessions.get(session_id)
        resolved_title = title or (existing.title if existing else "New chat")
        created = existing.created_at if existing else time.time()
        self.sessions[session_id] = SessionSnapshot(
            session_id=session_id,
            title=resolved_title,
            created_at=created,
            messages=list(runner.messages),
            agent_state=runner.snapshot_agent_state(),
            open_buffers=dict(session.open_buffers),
            active_path=session.active_path,
        )

    def load(self, session_id: str) -> SessionSnapshot | None:
        return self.sessions.get(session_id)

    def list_all(self) -> list[dict[str, Any]]:
        items = sorted(
            self.sessions.values(),
            key=lambda s: s.created_at,
            reverse=True,
        )
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
        self.sessions[session_id] = SessionSnapshot(
            session_id=session_id,
            title="New chat",
            created_at=now,
            messages=[],
            agent_state={},
            open_buffers={},
            active_path=None,
        )
        return session_id

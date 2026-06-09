"""Per-WebSocket connection state (session data + Strands runner)."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from edit_group_service import EditGroupService
from memory_store import MemoryStore
from protocol import SessionState
from project_root import resolve_project_root
from session_store import SessionStore
from strands_runner import WritingAgentRunner


@dataclass
class Connection:
    """One browser WebSocket tab: document overlay + Strands conversation."""

    session: SessionState
    runner: WritingAgentRunner
    project_root: Path
    session_store: SessionStore
    edit_service: EditGroupService
    memory_store: MemoryStore
    current_session_id: str | None = None

    @classmethod
    def create(cls, session_store: SessionStore) -> Connection:
        root = resolve_project_root()
        return cls(
            session=SessionState(),
            runner=WritingAgentRunner(project_root=root),
            project_root=root,
            session_store=session_store,
            edit_service=EditGroupService(project_root=root),
            memory_store=MemoryStore(),
        )

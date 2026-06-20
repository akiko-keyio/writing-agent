"""Per-WebSocket connection state (session data + Strands runner)."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from writing_agent.domain.edit_group_service import EditGroupService
from writing_agent.domain.edit_group_store import EditGroupStore
from writing_agent.domain.memory_store import MemoryStore
from writing_agent.server.protocol import SessionState
from writing_agent.domain.session_store import SessionStore
from writing_agent.runtime.strands_runner import WritingAgentRunner
from writing_agent.domain.workspace_context import (
    WorkspaceContext,
    default_workspace_context,
    workspace_context_for_root,
)


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
    workspace_id: str = ""
    workspace_display_name: str = ""
    edit_group_store: EditGroupStore | None = None

    def __post_init__(self) -> None:
        if not self.workspace_id or not self.workspace_display_name:
            workspace = workspace_context_for_root(self.project_root)
            if not self.workspace_id:
                self.workspace_id = workspace.workspace_id
            if not self.workspace_display_name:
                self.workspace_display_name = workspace.display_name
        if self.edit_group_store is None:
            self.edit_group_store = self.edit_service.store

    @classmethod
    def create(cls, session_store: SessionStore) -> Connection:
        workspace = default_workspace_context()
        scoped_sessions = session_store.for_workspace(
            workspace.workspace_id,
            project_root=workspace.project_root,
        )
        edit_group_store = EditGroupStore().for_workspace(workspace.workspace_id)
        return cls(
            session=SessionState(),
            runner=WritingAgentRunner(project_root=workspace.project_root),
            project_root=workspace.project_root,
            workspace_id=workspace.workspace_id,
            workspace_display_name=workspace.display_name,
            session_store=scoped_sessions,
            edit_group_store=edit_group_store,
            edit_service=EditGroupService(
                project_root=workspace.project_root,
                store=edit_group_store,
            ),
            memory_store=MemoryStore(),
        )

    def switch_workspace(self, workspace: WorkspaceContext) -> None:
        self.project_root = workspace.project_root
        self.workspace_id = workspace.workspace_id
        self.workspace_display_name = workspace.display_name
        self.session_store = self.session_store.for_workspace(
            workspace.workspace_id,
            project_root=workspace.project_root,
        )
        self.edit_group_store = self.edit_group_store.for_workspace(workspace.workspace_id)
        self.edit_service = EditGroupService(
            project_root=workspace.project_root,
            store=self.edit_group_store,
        )
        self.session.clear_pending_edits()
        self.session.clear_buffers()
        self.current_session_id = None
        self.runner.switch_project_root(workspace.project_root)

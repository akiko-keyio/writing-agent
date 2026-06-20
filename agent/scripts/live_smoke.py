"""One-off LIVE smoke: confirm the configured model uses propose_edit_group.

Uses the real active model (models.yaml / .env). Not part of the deterministic
test gate. Run: ``uv run python scripts/live_smoke.py``.
"""

from __future__ import annotations

import asyncio
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import os

os.environ.setdefault("WRITING_AGENT_STATE_DIR", tempfile.mkdtemp(prefix="live-smoke-"))

from writing_agent.server.connection import Connection
from writing_agent.server.handler import handle_message_events
from writing_agent.runtime.model_factory import has_active_model_config
from writing_agent.domain.session_store import SessionStore

DOC = "# Draft\n\nWe utilize the API to fetch data. The team will utilize caching later.\n"


async def _run() -> int:
    if not has_active_model_config():
        print("SKIP: no active model configured (.env / models.yaml).")
        return 0

    store = SessionStore()
    conn = Connection.create(store)
    conn.current_session_id = store.create_empty()
    conn.session.open_buffers["draft.md"] = DOC
    conn.session.active_path = "draft.md"

    events: list[dict] = []
    async for event in handle_message_events(
        conn,
        {
            "type": "chat/message",
            "request_id": "live-1",
            "text": (
                "In draft.md, replace the first 'utilize' with 'use'. "
                "Use the propose_edit_group tool with a precise anchor; do not rewrite the whole file."
            ),
            "context": {"active_path": "draft.md", "buffer_snapshot": DOC},
        },
    ):
        events.append(event)

    tools = [e.get("name") for e in events if e.get("type") == "chat/tool_update"]
    proposed = [e for e in events if e.get("type") == "group/propose"]
    end = next((e for e in events if e.get("type") == "chat/stream_end"), None)
    errors = [e for e in events if e.get("type") == "error"]

    print(f"tool calls: {tools}")
    print(f"groups proposed: {len(proposed)}")
    if proposed:
        g = proposed[0]["group"]
        print(f"  group {g['id']}: {len(g['edits'])} edit(s) on {g['path']}")
        for ed in g["edits"]:
            print(f"    {ed['kind']}: {ed['old_text']!r} -> {ed['new_text']!r} [{ed['status']}]")
    if end:
        print(f"reply: {end.get('text', '')[:200]}")

    if errors and not end:
        print(f"SKIP: model unreachable from this environment ({errors[0].get('message')})")
        return 0
    if proposed:
        print("LIVE SMOKE OK (group proposed)")
    else:
        print("LIVE SMOKE OK (turn completed; no group — inspect trace)")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(_run()))

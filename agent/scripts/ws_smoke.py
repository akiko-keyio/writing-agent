"""Self-contained end-to-end WebSocket smoke (no live model).

Starts the real server in-process and drives the deterministic product loop over
a real socket: session -> open document -> propose edit group -> apply ->
save to disk. Proves serve_connection + routing + EditGroup + document/save work
end to end. Run: ``uv run python scripts/ws_smoke.py``.
"""

from __future__ import annotations

import asyncio
import json
import sys
import tempfile
from pathlib import Path

# Ensure the agent package root is importable when run as a script.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import os

# Isolate durable state for the smoke run.
_STATE = tempfile.mkdtemp(prefix="ws-smoke-state-")
os.environ.setdefault("WRITING_AGENT_STATE_DIR", _STATE)

import websockets

from main import connection_handler

HOST = "localhost"
PORT = 8799
URL = f"ws://{HOST}:{PORT}"
DOC_PATH = "examples/_ws_smoke.md"
ORIGINAL = "# Smoke\n\nWe utilize the API to fetch data.\n"


async def _recv_until(ws, types, limit=40):
    for _ in range(limit):
        msg = json.loads(await asyncio.wait_for(ws.recv(), timeout=5))
        if msg.get("type") in types:
            return msg
    raise AssertionError(f"Did not receive any of {types}")


async def _client() -> int:
    async with websockets.connect(URL) as ws:
        await ws.send(json.dumps({"type": "session/create"}))
        await _recv_until(ws, {"session/created"})

        await ws.send(
            json.dumps({"type": "document/open", "path": DOC_PATH, "document": ORIGINAL}),
        )

        await ws.send(
            json.dumps(
                {
                    "type": "group/propose",
                    "path": DOC_PATH,
                    "title": "Tighten wording",
                    "edits": [{"kind": "replace", "old_text": "utilize", "new_text": "use"}],
                },
            ),
        )
        proposed = await _recv_until(ws, {"group/propose", "error"})
        assert proposed["type"] == "group/propose", proposed
        group_id = proposed["group"]["id"]
        print(f"  proposed group {group_id} ({len(proposed['group']['edits'])} edit)")

        await ws.send(json.dumps({"type": "group/apply", "group_id": group_id}))
        buffer = await _recv_until(ws, {"document/buffer"})
        assert "use the API" in buffer["document"], buffer
        print("  applied -> buffer updated")

        await ws.send(json.dumps({"type": "document/save", "path": DOC_PATH}))
        saved = await _recv_until(ws, {"document/saved", "error"})
        assert saved["type"] == "document/saved" and saved["ok"], saved
        print("  saved -> document/saved ok")

    # Verify on disk.
    from project_root import resolve_project_root

    disk = resolve_project_root() / "examples" / "_ws_smoke.md"
    content = disk.read_text(encoding="utf-8")
    assert "use the API" in content, content
    disk.unlink(missing_ok=True)
    print("  disk file updated and cleaned up")
    return 0


async def _main() -> int:
    async with websockets.serve(connection_handler, HOST, PORT):
        print(f"WS smoke server on {URL}")
        return await _client()


if __name__ == "__main__":
    code = asyncio.run(_main())
    print("WS SMOKE PASS" if code == 0 else "WS SMOKE FAIL")
    sys.exit(code)

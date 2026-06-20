#!/usr/bin/env python3
"""Talk to the Writing Agent from the terminal — no frontend required.

Uses the same handler + Strands runner as the WebSocket server, in-process.

Examples:
  # One-shot (needs models.yaml / .env)
  uv run python scripts/agent_chat.py -m "Improve the intro" --doc examples/demo-citations.md

  # Interactive REPL
  uv run python scripts/agent_chat.py --doc examples/demo-citations.md

  # Deterministic fake model (no API key)
  uv run python scripts/agent_chat.py --fake -m "tighten wording" --doc draft.md

  # Review queue helpers (after agent proposes edits)
  /groups          list pending edit groups
  /apply <group>   apply a group to the buffer
  /reject <group> <edit>  reject one edit
  /quit            exit
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from connection import Connection
from handler import handle_message_events
from project_root import normalize_workspace_path, resolve_project_root
from session_store import SessionStore


def _print_event(event: dict) -> None:
    etype = event.get("type", "")
    if etype == "chat/stream_start":
        print("\n[agent]", end=" ", flush=True)
    elif etype == "chat/message_delta":
        print(event.get("text", ""), end="", flush=True)
    elif etype == "chat/stream_end":
        print(flush=True)
        reasoning = event.get("reasoning")
        if reasoning:
            print(f"  (reasoning: {str(reasoning)[:120]}…)" if len(str(reasoning)) > 120 else f"  (reasoning: {reasoning})")
    elif etype == "chat/tool_update":
        status = event.get("status", "")
        name = event.get("name", "?")
        if status == "running":
            print(f"  -> tool {name} ...")
        elif status == "completed":
            out = event.get("output")
            summary = ""
            if isinstance(out, dict):
                keys = ("group_id", "path", "edit_count", "entry_id", "candidate_id")
                summary = " ".join(f"{k}={out[k]}" for k in keys if k in out)
            print(f"  ok tool {name}" + (f" ({summary})" if summary else ""))
        elif status == "error":
            print(f"  FAIL tool {name}: {event.get('error', 'error')}")
    elif etype == "group/propose":
        g = event["group"]
        print(f"\n  [propose] group {g['id']} on {g['path']} ({len(g['edits'])} edit(s))")
        for ed in g["edits"]:
            preview = (ed.get("old_text") or "")[:40]
            print(f"     [{ed['id']}] {ed['kind']}: {preview!r} → {ed.get('new_text', '')[:40]!r}")
    elif etype == "group/update":
        g = event["group"]
        print(f"  [group] {g['id']} status={g['status']}")
    elif etype == "document/buffer":
        print(f"  [buffer] updated ({event.get('path')}, reason={event.get('reason')})")
    elif etype == "memory/data":
        mem = event.get("memory", {})
        total = sum(len(mem.get(k, [])) for k in ("principle", "knowledge", "example"))
        print(f"  [memory] updated ({total} entries)")
    elif etype == "error":
        print(f"  ERROR: {event.get('message')}")


async def _collect(conn: Connection, raw: dict) -> list[dict]:
    events: list[dict] = []
    async for event in handle_message_events(conn, raw):
        events.append(event)
        _print_event(event)
    return events


def _load_doc(path: str | None) -> tuple[str | None, str | None]:
    if not path:
        return None, None
    norm = normalize_workspace_path(path)
    root = resolve_project_root()
    abs_path = root / norm
    if abs_path.is_file():
        return norm, abs_path.read_text(encoding="utf-8")
    return norm, f"# {norm}\n\n(empty placeholder — create the file or edit buffer in REPL)\n"


def _build_connection(*, fake: bool, doc_path: str | None = None) -> Connection:
    store = SessionStore()
    conn = Connection.create(store)
    conn.current_session_id = store.create_empty()

    if fake:
        from fake_model import FakeModel, FakeToolCall, FakeTurn

        path = doc_path or "draft.md"
        conn.runner = conn.runner.__class__(
            project_root=conn.project_root,
            model=FakeModel(
                [
                    FakeTurn(
                        tool_calls=[
                            FakeToolCall(
                                name="read_document",
                                tool_input={"path": path},
                            ),
                        ],
                    ),
                    FakeTurn(
                        tool_calls=[
                            FakeToolCall(
                                name="propose_edits",
                                tool_input={
                                    "path": path,
                                    "title": "Tighten wording",
                                    "summary": "Replace utilize with use.",
                                    "edits": [
                                        {
                                            "kind": "replace",
                                            "old_text": "utilize",
                                            "new_text": "use",
                                        },
                                    ],
                                },
                            ),
                        ],
                    ),
                    FakeTurn(text="Proposed one edit for your review."),
                ],
            ),
        )
    return conn


async def _chat_turn(
    conn: Connection,
    text: str,
    *,
    doc_path: str | None,
    doc_text: str | None,
    auto_review: bool,
) -> None:
    context: dict | None = None
    if doc_path and doc_text is not None:
        conn.session.open_buffers[doc_path] = doc_text
        conn.session.active_path = doc_path
        context = {"active_path": doc_path, "buffer_snapshot": doc_text}

    payload: dict = {
        "type": "chat/message",
        "text": text,
        "request_id": f"cli-{id(text)}",
    }
    if context:
        payload["context"] = context
    if auto_review:
        payload["auto_review"] = True

    await _collect(conn, payload)


async def _cmd_groups(conn: Connection) -> None:
    events = await _collect(conn, {"type": "group/state"})
    state = next((e for e in events if e.get("type") == "group/state"), None)
    if not state:
        print("  (no group state)")
        return
    groups = state.get("groups", [])
    if not groups:
        print("  (no edit groups)")
        return
    for g in groups:
        print(f"  {g['id']} [{g['status']}] {g['path']} — {g.get('title') or '(untitled)'}")
        for ed in g.get("edits", []):
            if ed.get("status") != "dismissed":
                print(f"    {ed['id']} {ed['status']} {ed['kind']}")


async def _cmd_apply(conn: Connection, group_id: str) -> None:
    await _collect(conn, {"type": "group/apply", "group_id": group_id})


async def _cmd_reject(conn: Connection, group_id: str, edit_id: str) -> None:
    await _collect(conn, {"type": "group/reject", "group_id": group_id, "edit_id": edit_id})


async def _repl(
    conn: Connection,
    *,
    doc_path: str | None,
    doc_text: str | None,
    auto_review: bool,
) -> int:
    print("Writing Agent CLI (type /help for commands, /quit to exit)")
    if doc_path:
        print(f"  document: {doc_path}")
    while True:
        try:
            line = input("\nYou> ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            return 0
        if not line:
            continue
        if line.startswith("/"):
            parts = line.split()
            cmd = parts[0].lower()
            if cmd in ("/quit", "/exit", "/q"):
                return 0
            if cmd == "/help":
                print(__doc__)
                continue
            if cmd == "/groups":
                await _cmd_groups(conn)
                continue
            if cmd == "/apply" and len(parts) >= 2:
                await _cmd_apply(conn, parts[1])
                continue
            if cmd == "/reject" and len(parts) >= 3:
                await _cmd_reject(conn, parts[1], parts[2])
                continue
            print("Unknown command. Try /help /groups /apply <id> /reject <group> <edit> /quit")
            continue
        await _chat_turn(
            conn, line, doc_path=doc_path, doc_text=doc_text, auto_review=auto_review,
        )


async def _main_async(args: argparse.Namespace) -> int:
    if args.state_dir:
        import os

        os.environ["WRITING_AGENT_STATE_DIR"] = args.state_dir
    elif args.ephemeral:
        import os

        os.environ.setdefault("WRITING_AGENT_STATE_DIR", tempfile.mkdtemp(prefix="agent-chat-"))

    doc_path, doc_text = _load_doc(args.doc)
    conn = _build_connection(fake=args.fake, doc_path=doc_path)
    if args.fake and doc_path:
        doc_text = "# Draft\n\nWe utilize the API to fetch data.\n"
    if doc_path and doc_text:
        conn.session.open_buffers[doc_path] = doc_text
        conn.session.active_path = doc_path
        if args.open:
            await _collect(
                conn,
                {"type": "document/open", "path": doc_path, "document": doc_text},
            )

    if args.message:
        await _chat_turn(
            conn,
            args.message,
            doc_path=doc_path,
            doc_text=doc_text,
            auto_review=args.auto_review,
        )
        if args.json:
            print(json.dumps({"session_id": conn.current_session_id}, indent=2))
        return 0

    return await _repl(
        conn,
        doc_path=doc_path,
        doc_text=doc_text,
        auto_review=args.auto_review,
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="CLI chat with the Writing Agent (no frontend).")
    parser.add_argument("-m", "--message", help="Single message then exit")
    parser.add_argument(
        "--doc",
        help="Document path relative to project root (default workspace: examples/)",
    )
    parser.add_argument("--open", action="store_true", help="Send document/open before chat")
    parser.add_argument("--auto-review", action="store_true", help="Enable Auto Review for the session")
    parser.add_argument(
        "--fake",
        action="store_true",
        help="Use deterministic FakeModel (no API key; fixed read+propose script)",
    )
    parser.add_argument("--ephemeral", action="store_true", help="Use a temp .writing-agent state dir")
    parser.add_argument("--state-dir", help="Override WRITING_AGENT_STATE_DIR")
    parser.add_argument("--json", action="store_true", help="Print session metadata JSON (with -m)")
    args = parser.parse_args(argv)
    return asyncio.run(_main_async(args))


if __name__ == "__main__":
    raise SystemExit(main())

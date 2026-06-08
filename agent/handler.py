"""WebSocket message routing."""

from __future__ import annotations

import json
import logging
from collections.abc import AsyncIterator
from typing import Any

from connection import Connection
from project_root import normalize_workspace_path
from protocol import SessionState, apply_replacements
from strands_runner import messages_to_ui

logger = logging.getLogger(__name__)


def _mask_api_key(key: str) -> str:
    """Return masked API key for display (e.g., 'sk-...abcd')."""
    if not key or len(key) <= 8:
        return "***"
    return f"{key[:3]}...{key[-4:]}"


def _resolve_document_path(raw: dict[str, Any]) -> str | None:
    path = raw.get("path")
    if isinstance(path, str) and path.strip():
        try:
            return normalize_workspace_path(path)
        except ValueError:
            return None
    fn = raw.get("filename")
    if isinstance(fn, str) and fn.strip():
        try:
            return normalize_workspace_path(fn)
        except ValueError:
            return None
    return None


def _apply_document_open(session: SessionState, raw: dict[str, Any]) -> None:
    path = _resolve_document_path(raw)
    document = str(raw.get("document", ""))
    if path:
        session.open_buffers[path] = document
        session.active_path = path


def _apply_document_change(session: SessionState, raw: dict[str, Any]) -> None:
    path = _resolve_document_path(raw)
    if not path:
        return
    session.open_buffers[path] = str(raw.get("document", ""))


def _apply_chat_context_buffers(session: SessionState, context: dict[str, Any] | None) -> None:
    if not context:
        return
    active = context.get("active_path")
    snapshot = context.get("buffer_snapshot")
    if isinstance(active, str) and active.strip() and isinstance(snapshot, str):
        try:
            norm = normalize_workspace_path(active)
        except ValueError:
            return
        session.open_buffers[norm] = snapshot
        session.active_path = norm


def _persist_current(conn: Connection) -> None:
    if not conn.current_session_id:
        return
    title = conn.runner.title_from_messages()
    conn.session_store.save(
        conn.current_session_id,
        conn.runner,
        conn.session,
        title=title,
    )


def _load_snapshot_into_connection(conn: Connection, session_id: str) -> bool:
    snap = conn.session_store.load(session_id)
    if snap is None:
        return False
    conn.current_session_id = session_id
    conn.session.open_buffers = dict(snap.open_buffers)
    conn.session.active_path = snap.active_path
    conn.session.clear_pending_edits()
    conn.runner.restore_from_snapshot(snap.messages, snap.agent_state)
    return True


async def handle_message_events(
    conn: Connection,
    raw: dict[str, Any],
) -> AsyncIterator[dict[str, Any]]:
    """Yield outbound messages (supports multi-frame streaming for chat)."""
    session = conn.session
    runner = conn.runner
    msg_type = raw.get("type")

    if msg_type == "ping":
        yield {"type": "pong"}
        return

    if msg_type == "document/open":
        _apply_document_open(session, raw)
        return

    if msg_type == "document/change":
        _apply_document_change(session, raw)
        return

    if msg_type == "session/clear":
        session.clear_pending_edits()
        session.clear_buffers()
        runner.clear_conversation()
        if conn.current_session_id:
            conn.session_store.save(
                conn.current_session_id,
                runner,
                session,
                title="New chat",
            )
        yield {
            "type": "session/cleared",
            "session_id": conn.current_session_id,
            "messages": [],
        }
        return

    if msg_type == "session/create":
        _persist_current(conn)
        session_id = conn.session_store.create_empty()
        conn.current_session_id = session_id
        session.clear_pending_edits()
        session.clear_buffers()
        runner.clear_conversation()
        yield {
            "type": "session/created",
            "session_id": session_id,
            "messages": [],
        }
        return

    if msg_type == "session/list":
        yield {
            "type": "session/list",
            "sessions": conn.session_store.list_all(),
        }
        return

    if msg_type == "session/switch":
        target = raw.get("session_id")
        if not isinstance(target, str) or not target.strip():
            yield {"type": "error", "message": "session_id is required"}
            return
        _persist_current(conn)
        if not _load_snapshot_into_connection(conn, target.strip()):
            yield {"type": "error", "message": "Session not found"}
            return
        yield {
            "type": "session/restored",
            "session_id": conn.current_session_id,
            "messages": messages_to_ui(runner.messages),
        }
        return

    if msg_type == "session/restore":
        logger.warning("Deprecated message type session/restore — use session/switch")
        yield {
            "type": "error",
            "message": "session/restore is deprecated; use session/switch",
        }
        return

    if msg_type == "settings/read":
        from model_manager import ModelEntry, add_model, load_models
        from plugin_scanner import scan_plugins

        mc = load_models()

        # Seed from .env if models.yaml is empty
        if not mc.models:
            from config import config as env_config
            if env_config.openai_api_key:
                entry = ModelEntry(
                    id=env_config.openai_model or "default",
                    provider="OpenAI",
                    model=env_config.openai_model or "gpt-4o-mini",
                    api_key=env_config.openai_api_key,
                    api_base=env_config.openai_api_base,
                    temperature=0.3,
                )
                mc = add_model(entry)

        from tool_manager import list_tools_for_settings

        yield {
            "type": "settings/data",
            "config": mc.to_dict(mask_keys=True),
            "tools": list_tools_for_settings(),
            "plugins": scan_plugins(),
        }
        return

    if msg_type == "settings/update":
        from model_manager import add_model, remove_model, set_active_model, update_model, ModelEntry
        from tool_manager import list_tools_for_settings, set_tool_enabled

        action = raw.get("action")
        model_data = raw.get("model", {})
        model_id = raw.get("model_id", "")

        try:
            if action == "add_model":
                model_name = str(model_data.get("model", "")).strip()
                api_base = str(model_data.get("api_base", "")).strip()
                api_key = str(model_data.get("api_key", "")).strip()
                if not model_name or not api_base or not api_key:
                    yield {
                        "type": "error",
                        "message": "Model name, base URL, and API key are required",
                    }
                    return
                entry = ModelEntry(
                    id=model_data.get("id", ""),
                    provider=model_data.get("provider", "OpenAI"),
                    model=model_name,
                    api_key=api_key,
                    api_base=api_base,
                    temperature=float(model_data.get("temperature", 0.3)),
                )
                config = add_model(entry)
            elif action == "update_model":
                if not model_id:
                    yield {"type": "error", "message": "model_id required for update"}
                    return
                updates = {k: v for k, v in model_data.items() if k != "id"}
                if "model" in updates and not str(updates["model"]).strip():
                    yield {"type": "error", "message": "Model name is required"}
                    return
                if "api_base" in updates and not str(updates["api_base"]).strip():
                    yield {"type": "error", "message": "Base URL is required"}
                    return
                config = update_model(model_id, updates)
            elif action == "remove_model":
                if not model_id:
                    yield {"type": "error", "message": "model_id required for remove"}
                    return
                config = remove_model(model_id)
            elif action == "set_active_model":
                if not model_id:
                    yield {"type": "error", "message": "model_id required for set_active_model"}
                    return
                config = set_active_model(model_id)
            elif action == "set_tool_enabled":
                tool_id = str(raw.get("tool_id", "")).strip()
                if not tool_id:
                    yield {"type": "error", "message": "tool_id required for set_tool_enabled"}
                    return
                if "enabled" not in raw:
                    yield {"type": "error", "message": "enabled required for set_tool_enabled"}
                    return
                tools = set_tool_enabled(tool_id, bool(raw.get("enabled")))
                runner.sync_writing_tools()
                yield {
                    "type": "settings/updated",
                    "tools": tools,
                }
                return
            else:
                yield {"type": "error", "message": f"Unknown action: {action}"}
                return

            yield {
                "type": "settings/updated",
                "config": config.to_dict(mask_keys=True),
            }
        except Exception as e:
            yield {"type": "error", "message": str(e)}
        return

    if msg_type == "plugins/list":
        from plugin_scanner import scan_plugins

        yield {"type": "plugins/data", "plugins": scan_plugins()}
        return

    if msg_type == "chat/cancel":
        # UI stop — generation may continue server-side until stream ends.
        return

    if msg_type == "chat/message":
        text = str(raw.get("text", "")).strip()
        if not text:
            yield {"type": "error", "message": "Empty message"}
            return

        context = raw.get("context")
        if context is not None and not isinstance(context, dict):
            context = None

        _apply_chat_context_buffers(session, context)

        if not conn.current_session_id:
            conn.current_session_id = conn.session_store.create_empty()
            session.clear_pending_edits()
            session.clear_buffers()
            runner.clear_conversation()

        async for event in runner.chat_turn_stream(session, text, context):
            if event.get("type") == "error":
                yield event
                return
            yield event

        if conn.current_session_id:
            conn.session_store.save(
                conn.current_session_id,
                runner,
                session,
                title=runner.title_from_messages(),
            )

        if session.pending_replacements:
            doc = session.active_document()
            new_doc, _errs = apply_replacements(doc, session.pending_replacements)
            if session.active_path:
                session.open_buffers[session.active_path] = new_doc
            yield {
                "type": "document/patch",
                "path": session.active_path,
                "document": new_doc,
                "replacements": list(session.pending_replacements),
            }
            session.clear_pending_edits()
        return

    logger.warning("Unknown inbound message type: %s", msg_type)
    yield {"type": "error", "message": "Unknown message type"}


def parse_json_message(data: str | bytes) -> dict[str, Any] | None:
    try:
        if isinstance(data, bytes):
            data = data.decode("utf-8")
        parsed = json.loads(data)
        if isinstance(parsed, dict):
            return parsed
    except (json.JSONDecodeError, UnicodeDecodeError):
        logger.debug("Invalid JSON from client", exc_info=True)
    return None

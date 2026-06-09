"""Built-in agent tool preferences (tools.yaml)."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml

_TOOLS_FILE = Path(__file__).resolve().parent.parent / "tools.yaml"


@dataclass(frozen=True)
class ToolCatalogEntry:
    """Metadata for a built-in writing tool exposed in Settings."""

    id: str
    name: str
    description: str


TOOL_CATALOG: tuple[ToolCatalogEntry, ...] = (
    ToolCatalogEntry(
        id="read_file",
        name="read_file",
        description=(
            "Read a file from the project workspace. "
            "Open editor buffers take priority over files on disk."
        ),
    ),
    ToolCatalogEntry(
        id="search_references",
        name="search_references",
        description=(
            "Search the project reference/evidence base for snippets matching a "
            "query. Read-only; used to gather evidence for verification."
        ),
    ),
    ToolCatalogEntry(
        id="check_consistency",
        name="check_consistency",
        description=(
            "Deterministic mechanical consistency checks (whitespace, blank lines, "
            "double spaces, US/UK spelling mixing). Read-only."
        ),
    ),
    ToolCatalogEntry(
        id="propose_edit_group",
        name="propose_edit_group",
        description=(
            "Propose a validated group of document edits for user review. "
            "The document is not modified until the user applies the group."
        ),
    ),
)

_CATALOG_BY_ID = {entry.id: entry for entry in TOOL_CATALOG}


def _default_enabled() -> dict[str, bool]:
    return {entry.id: True for entry in TOOL_CATALOG}


def load_tool_prefs() -> dict[str, bool]:
    """Load per-tool enabled flags. Unknown tools default to enabled."""
    enabled = _default_enabled()
    if not _TOOLS_FILE.exists():
        return enabled

    with open(_TOOLS_FILE, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}

    tools_section = data.get("tools", {})
    if not isinstance(tools_section, dict):
        return enabled

    for tool_id, item in tools_section.items():
        if tool_id not in _CATALOG_BY_ID:
            continue
        if isinstance(item, dict) and "enabled" in item:
            enabled[tool_id] = bool(item["enabled"])
        elif isinstance(item, bool):
            enabled[tool_id] = item

    return enabled


def save_tool_prefs(enabled: dict[str, bool]) -> None:
    """Persist tool preferences to tools.yaml."""
    data = {
        "tools": {
            tool_id: {"enabled": bool(enabled.get(tool_id, True))}
            for tool_id in _CATALOG_BY_ID
        },
    }
    with open(_TOOLS_FILE, "w", encoding="utf-8") as f:
        yaml.dump(data, f, default_flow_style=False, allow_unicode=True, sort_keys=False)


def list_tools_for_settings() -> list[dict[str, Any]]:
    """Return catalog entries with current enabled state for the Settings UI."""
    prefs = load_tool_prefs()
    return [
        {
            "id": entry.id,
            "name": entry.name,
            "description": entry.description,
            "enabled": prefs.get(entry.id, True),
        }
        for entry in TOOL_CATALOG
    ]


def get_enabled_tool_ids() -> set[str]:
    """IDs of built-in tools that should be registered on the agent."""
    prefs = load_tool_prefs()
    return {tool_id for tool_id, on in prefs.items() if on}


def set_tool_enabled(tool_id: str, enabled: bool) -> list[dict[str, Any]]:
    """Update one tool's enabled flag."""
    if tool_id not in _CATALOG_BY_ID:
        raise ValueError(f"Unknown tool: {tool_id}")

    prefs = load_tool_prefs()
    prefs[tool_id] = enabled
    save_tool_prefs(prefs)
    return list_tools_for_settings()

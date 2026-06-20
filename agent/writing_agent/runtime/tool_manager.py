"""Built-in agent tool preferences (tools.yaml)."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml

from writing_agent.paths import repo_config_path

_TOOLS_FILE = repo_config_path("tools.yaml")

# Legacy ids kept for migration when reading old tools.yaml files.
_LEGACY_TOOL_IDS: dict[str, str] = {
    "read_file": "read_document",
    "propose_edit_group": "propose_edits",
}


@dataclass(frozen=True)
class ToolCatalogEntry:
    """Metadata for a built-in writing tool exposed in Settings."""

    id: str
    name: str
    description: str


TOOL_CATALOG: tuple[ToolCatalogEntry, ...] = (
    ToolCatalogEntry(
        id="read_document",
        name="read_document",
        description=(
            "Read a document from the project workspace. "
            "Open editor buffers take priority over files on disk."
        ),
    ),
    ToolCatalogEntry(
        id="check_references",
        name="check_references",
        description=(
            "Check DOI/URL reachability, local references/ consistency, "
            "and claims that may lack evidence. Read-only; does not modify the document."
        ),
    ),
    ToolCatalogEntry(
        id="propose_edits",
        name="propose_edits",
        description=(
            "Propose a validated group of document edits for user review. "
            "The document is not modified until the user applies the group."
        ),
    ),
    ToolCatalogEntry(
        id="revise_edit",
        name="revise_edit",
        description=(
            "Replace one existing edit proposal inside a group after user feedback. "
            "Preserves lineage; the document stays unchanged until apply."
        ),
    ),
    ToolCatalogEntry(
        id="remember_context",
        name="remember_context",
        description=(
            "Record cross-session knowledge (target reader, terminology, domain facts). "
            "Visible in Settings → Memory."
        ),
    ),
    ToolCatalogEntry(
        id="propose_principle",
        name="propose_principle",
        description=(
            "Propose a candidate writing principle from observed edit cases. "
            "Requires user confirmation before it affects future prompts."
        ),
    ),
)

_CATALOG_BY_ID = {entry.id: entry for entry in TOOL_CATALOG}


def _default_enabled() -> dict[str, bool]:
    return {entry.id: True for entry in TOOL_CATALOG}


def _normalize_tool_id(tool_id: str) -> str:
    return _LEGACY_TOOL_IDS.get(tool_id, tool_id)


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
        canonical = _normalize_tool_id(tool_id)
        if canonical not in _CATALOG_BY_ID:
            continue
        if isinstance(item, dict) and "enabled" in item:
            enabled[canonical] = bool(item["enabled"])
        elif isinstance(item, bool):
            enabled[canonical] = item

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
    canonical = _normalize_tool_id(tool_id)
    if canonical not in _CATALOG_BY_ID:
        raise ValueError(f"Unknown tool: {tool_id}")

    prefs = load_tool_prefs()
    prefs[canonical] = enabled
    save_tool_prefs(prefs)
    return list_tools_for_settings()

"""Per-subagent enable/disable preferences (subagents.yaml).

Subagents are discovered from plugin markdown; this module records which ones are
active so Settings can toggle them and the runner only registers enabled ones.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

from subagents import load_subagent_specs

_SUBAGENTS_FILE = Path(__file__).resolve().parent.parent / "subagents.yaml"


def load_subagent_prefs() -> dict[str, bool]:
    """Map subagent name -> enabled. Unknown/new subagents default to enabled."""
    enabled: dict[str, bool] = {spec.name: True for spec in load_subagent_specs()}
    if not _SUBAGENTS_FILE.exists():
        return enabled

    with open(_SUBAGENTS_FILE, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}

    section = data.get("subagents", {})
    if not isinstance(section, dict):
        return enabled

    for name, item in section.items():
        if isinstance(item, dict) and "enabled" in item:
            enabled[name] = bool(item["enabled"])
        elif isinstance(item, bool):
            enabled[name] = item
    return enabled


def save_subagent_prefs(enabled: dict[str, bool]) -> None:
    data = {"subagents": {name: {"enabled": bool(on)} for name, on in enabled.items()}}
    with open(_SUBAGENTS_FILE, "w", encoding="utf-8") as f:
        yaml.dump(data, f, default_flow_style=False, allow_unicode=True, sort_keys=False)


def get_enabled_subagent_names() -> set[str]:
    return {name for name, on in load_subagent_prefs().items() if on}


def set_subagent_enabled(name: str, enabled: bool) -> dict[str, bool]:
    known = {spec.name for spec in load_subagent_specs()}
    if name not in known:
        raise ValueError(f"Unknown subagent: {name}")
    prefs = load_subagent_prefs()
    prefs[name] = enabled
    save_subagent_prefs(prefs)
    return prefs


def list_subagents_for_settings() -> list[dict[str, Any]]:
    prefs = load_subagent_prefs()
    out: list[dict[str, Any]] = []
    for spec in load_subagent_specs():
        out.append(
            {
                "id": spec.name,
                "name": spec.name,
                "tool_name": spec.tool_name,
                "description": spec.description,
                "readonly": spec.readonly,
                "is_background": spec.is_background,
                "enabled": prefs.get(spec.name, True),
            },
        )
    return out

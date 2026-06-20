"""Scan plugin directories and return structured metadata for the Settings UI."""

from __future__ import annotations

from pathlib import Path

from writing_agent.runtime.subagents import _parse_frontmatter, load_subagent_specs

from writing_agent.paths import AGENT_ROOT, PLUGINS_DIR, REPO_ROOT

_PLUGINS_DIR = PLUGINS_DIR


def _relative(path: Path) -> str:
    """Return project-relative path string (forward slashes)."""
    try:
        return str(path.relative_to(REPO_ROOT)).replace(
            "\\", "/"
        )
    except ValueError:
        return str(path).replace("\\", "/")


def _scan_skill(skill_dir: Path) -> dict | None:
    """Parse a single plugin's SKILL.md."""
    skill_file = skill_dir / "SKILL.md"
    if not skill_file.is_file():
        return None
    raw = skill_file.read_text(encoding="utf-8")
    meta, body = _parse_frontmatter(raw)
    name = meta.get("name") or skill_dir.name
    description = meta.get("description", "")

    # Collect associated reference files
    ref_dir = skill_dir / "reference"
    references: list[dict[str, str]] = []
    if ref_dir.is_dir():
        for ref_file in sorted(ref_dir.glob("*.md")):
            ref_raw = ref_file.read_text(encoding="utf-8")
            ref_meta, _ = _parse_frontmatter(ref_raw)
            # Try to extract title from first heading
            title = ref_meta.get("name") or ref_file.stem
            for line in ref_raw.splitlines():
                if line.startswith("# "):
                    title = line[2:].strip()
                    break
            references.append(
                {"name": title, "path": _relative(ref_file)}
            )

    return {
        "id": skill_dir.name,
        "name": name,
        "type": "skill",
        "description": description,
        "path": _relative(skill_file),
        "preview": body[:300] if body else "",
        "references": references,
    }


def _scan_subagents(agents_dir: Path, plugin_id: str) -> list[dict]:
    """Parse subagent specs using the existing loader."""
    from writing_agent.runtime.subagent_manager import load_subagent_prefs

    prefs = load_subagent_prefs()
    specs = load_subagent_specs(agents_dir)
    items: list[dict] = []
    for spec in specs:
        items.append(
            {
                "id": f"{plugin_id}/{spec.name}",
                "name": spec.name,
                "type": "subagent",
                "description": spec.description,
                "path": _relative(spec.source_path),
                "preview": spec.system_prompt[:300],
                "readonly": spec.readonly,
                "is_background": spec.is_background,
                "enabled": prefs.get(spec.name, True),
            }
        )
    return items


def _scan_references(ref_dir: Path, plugin_id: str) -> list[dict]:
    """List reference markdown files."""
    if not ref_dir.is_dir():
        return []
    items: list[dict] = []
    for ref_file in sorted(ref_dir.glob("*.md")):
        raw = ref_file.read_text(encoding="utf-8")
        meta, _ = _parse_frontmatter(raw)
        title = meta.get("name") or ref_file.stem
        for line in raw.splitlines():
            if line.startswith("# "):
                title = line[2:].strip()
                break
        items.append(
            {
                "id": f"{plugin_id}/{ref_file.stem}",
                "name": title,
                "type": "reference",
                "description": "",
                "path": _relative(ref_file),
            }
        )
    return items


def _scan_rules(rules_dir: Path, plugin_id: str) -> list[dict]:
    """Parse .mdc rule files."""
    if not rules_dir.is_dir():
        return []
    items: list[dict] = []
    for rule_file in sorted(rules_dir.glob("*.mdc")):
        raw = rule_file.read_text(encoding="utf-8")
        meta, body = _parse_frontmatter(raw)
        items.append(
            {
                "id": f"{plugin_id}/{rule_file.stem}",
                "name": rule_file.stem.replace("-", " ").replace("_", " "),
                "type": "rule",
                "description": meta.get("description", ""),
                "path": _relative(rule_file),
                "preview": body[:300] if body else "",
            }
        )
    return items


def scan_plugins(plugins_dir: Path | None = None) -> dict:
    """Scan all plugins and return structured data for the Settings UI.

    Returns::

        {
            "skills": [...],
            "subagents": [...],
            "references": [...],
            "rules": [...],
        }
    """
    root = plugins_dir or _PLUGINS_DIR
    if not root.is_dir():
        return {"skills": [], "subagents": [], "references": [], "rules": []}

    skills: list[dict] = []
    subagents: list[dict] = []
    references: list[dict] = []
    rules: list[dict] = []

    for plugin_dir in sorted(p for p in root.iterdir() if p.is_dir()):
        plugin_id = plugin_dir.name

        # Skill
        skill = _scan_skill(plugin_dir)
        if skill:
            skills.append(skill)

        # Subagents
        agents_dir = plugin_dir / "agents"
        if agents_dir.is_dir():
            subagents.extend(_scan_subagents(agents_dir, plugin_id))

        # References
        references.extend(_scan_references(plugin_dir / "reference", plugin_id))

        # Rules
        rules.extend(_scan_rules(plugin_dir / "rules", plugin_id))

    return {
        "skills": skills,
        "subagents": subagents,
        "references": references,
        "rules": rules,
    }

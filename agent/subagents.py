"""Load sub-agent definitions from plugin agents/*.md and expose as Agent tools."""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from strands import Agent
from strands.types.tools import AgentTool

from writing_tools import WRITING_TOOLS

_AGENT_DIR = Path(__file__).resolve().parent
DEFAULT_AGENTS_DIR = _AGENT_DIR / "plugins" / "academic-writing" / "agents"

_FRONTMATTER_RE = re.compile(r"^---\r?\n(.*?)\r?\n---\r?\n(.*)", re.DOTALL)


@dataclass(frozen=True)
class SubagentSpec:
    """One specialist defined under ``plugins/.../agents/*.md``."""

    name: str  # frontmatter ``name`` (may contain hyphens)
    tool_name: str  # Strands tool id (underscores)
    description: str
    system_prompt: str
    source_path: Path
    readonly: bool = False
    is_background: bool = False


def subagent_tool_name(name: str) -> str:
    """Map frontmatter name to a valid Strands tool identifier."""
    return name.replace("-", "_")


def _parse_frontmatter(text: str) -> tuple[dict[str, str], str]:
    match = _FRONTMATTER_RE.match(text)
    if not match:
        return {}, text.strip()
    meta: dict[str, str] = {}
    for line in match.group(1).splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        meta[key.strip()] = value.strip()
    return meta, match.group(2).strip()


def load_subagent_specs(agents_dir: Path | None = None) -> list[SubagentSpec]:
    """Parse all ``*.md`` files under ``plugins/.../agents/``."""
    root = agents_dir or DEFAULT_AGENTS_DIR
    if not root.is_dir():
        return []

    specs: list[SubagentSpec] = []
    for path in sorted(root.glob("*.md")):
        raw = path.read_text(encoding="utf-8")
        meta, body = _parse_frontmatter(raw)
        name = meta.get("name") or path.stem
        description = meta.get("description") or f"Run the {name} specialist."
        readonly = meta.get("readonly", "").lower() == "true"
        is_background = meta.get("is_background", "").lower() == "true"
        if not body:
            continue
        specs.append(
            SubagentSpec(
                name=name,
                tool_name=subagent_tool_name(name),
                description=description,
                system_prompt=body,
                source_path=path,
                readonly=readonly,
                is_background=is_background,
            ),
        )
    return specs


def create_subagent_tools(
    *,
    model: Any,
    agents_dir: Path | None = None,
) -> list[AgentTool]:
    """Build ``Agent.as_tool()`` wrappers for each sub-agent markdown definition."""
    tools: list[AgentTool] = []
    for spec in load_subagent_specs(agents_dir):
        sub = Agent(
            model=model,
            system_prompt=spec.system_prompt,
            tools=WRITING_TOOLS,
            callback_handler=None,
        )
        tools.append(
            sub.as_tool(
                name=spec.tool_name,
                description=spec.description,
            ),
        )
    return tools

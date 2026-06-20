"""Load sub-agent definitions from plugin agents/*.md and expose as Agent tools."""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from strands import Agent
from strands.types.tools import AgentTool

from writing_agent.adapters.strands_community_tools import get_strands_skill_tools
from writing_agent.tools.writing_tools import READONLY_TOOLS, WRITING_TOOLS

from writing_agent.paths import PLUGINS_DIR

DEFAULT_AGENTS_DIR = PLUGINS_DIR / "academic-writing" / "agents"

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


def tools_for_spec(spec: SubagentSpec) -> list:
    """Permission-aware tool set for a specialist.

    Read-only specialists (reviewer, check, researcher, verifier, arbiter,
    reference-list) get only read tools and can never mutate documents. A
    write-capable specialist (editor) additionally gets ``propose_edit_group``.

    All specialists receive ``read_skill_resource`` when academic-writing
    skill resources are configured (same path sandbox as the main agent).
    """
    skill_tools = get_strands_skill_tools()
    base = list(READONLY_TOOLS) if spec.readonly else list(WRITING_TOOLS)
    return [*base, *skill_tools]


def create_subagent_tools(
    *,
    model: Any,
    agents_dir: Path | None = None,
    enabled_names: set[str] | None = None,
) -> list[AgentTool]:
    """Build ``Agent.as_tool()`` wrappers for each enabled sub-agent definition.

    Disabled subagents (per ``subagents.yaml``) are not registered. Each
    specialist receives a permission-scoped tool set.
    """
    if enabled_names is None:
        from writing_agent.runtime.subagent_manager import get_enabled_subagent_names

        enabled_names = get_enabled_subagent_names()

    tools: list[AgentTool] = []
    for spec in load_subagent_specs(agents_dir):
        if spec.name not in enabled_names:
            continue
        sub = Agent(
            model=model,
            system_prompt=spec.system_prompt,
            tools=tools_for_spec(spec),
            callback_handler=None,
        )
        tools.append(
            sub.as_tool(
                name=spec.tool_name,
                description=spec.description,
            ),
        )
    return tools

/**
 * Human-readable labels for Strands tool names (API uses underscores).
 * Keep in sync with `agent/subagents.py` `as_tool(name=...)`.
 */

const TOOL_LABELS: Record<string, string> = {
  read_file: "Read file",
  skills: "Skills",
  review: "Review",
  check: "Check",
  researcher: "Researcher",
  reference_list: "Reference list",
}

/** Display name for tool UI (chain steps, tool cards). */
export function formatAgentToolLabel(toolName: string): string {
  const known = TOOL_LABELS[toolName]
  if (known) return known

  return toolName
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

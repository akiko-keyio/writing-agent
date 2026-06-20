/**
 * Human-readable labels for Strands tool names (API uses underscores).
 * Keep in sync with `agent/subagents.py` `as_tool(name=...)`.
 *
 * Convention: verb-first phrases (Read …, Invoke …, Run …, Propose …).
 */

const TOOL_LABELS: Record<string, string> = {
  read_document: "Read file",
  read_file: "Read file",
  read_skill_resource: "Read reference",
  search_references: "Search references",
  check_references: "Check references",
  skills: "Invoke skills",
  propose_edits: "Propose edits",
  revise_edit: "Revise edit",
  remember_context: "Remember context",
  propose_principle: "Propose principle",
  review: "Run review",
  check: "Run check",
  researcher: "Run research",
  reference_list: "Generate reference list",
  editor: "Run editor",
  arbiter: "Run arbiter",
  verifier: "Verify output",
}

function normalizeToolName(toolName: string): string {
  return toolName.trim().replace(/-/g, "_")
}

function fallbackToolLabel(toolName: string): string {
  const phrase = toolName.split("_").join(" ")
  return phrase.charAt(0).toUpperCase() + phrase.slice(1)
}

/** Display name for tool UI (chain steps, tool cards, Settings → Tools). */
export function formatAgentToolLabel(toolName: string): string {
  const key = normalizeToolName(toolName)
  const known = TOOL_LABELS[key]
  if (known) return known

  return fallbackToolLabel(key)
}

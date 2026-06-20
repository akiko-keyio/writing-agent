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

const GROUPED_TOOL_LABELS: Record<string, (count: number) => string> = {
  read_skill_resource: (count) =>
    count === 1 ? "Read reference" : `Read ${count} references`,
  read_document: (count) =>
    count === 1 ? "Read file" : `Read ${count} files`,
  read_file: (count) => (count === 1 ? "Read file" : `Read ${count} files`),
  search_references: (count) =>
    count === 1 ? "Search references" : `Search ${count} references`,
  skills: (count) => (count === 1 ? "Invoke skills" : `Invoke skills ×${count}`),
  propose_edits: (count) =>
    count === 1 ? "Proposed edits" : `Proposed ${count} edit groups`,
}

/** Label when consecutive same-name tools are grouped (e.g. Read 4 references). */
export function formatGroupedToolLabel(toolName: string, count: number): string {
  const key = normalizeToolName(toolName)
  const formatter = GROUPED_TOOL_LABELS[key]
  if (formatter) return formatter(count)
  const base = formatAgentToolLabel(toolName)
  return count === 1 ? base : `${base} ×${count}`
}

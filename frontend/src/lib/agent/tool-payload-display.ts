const MAX_EDIT_FIELD_CHARS = 120
const MAX_JSON_CHARS = 8_000

function truncateText(text: string, max: number): string {
  if (text.length <= max) return text
  return `${text.slice(0, max)}…`
}

/** Shrink large tool payloads before JSON display (esp. propose_edit_group edits). */
export function summarizeToolPayloadForDisplay(
  toolName: string,
  kind: "input" | "output",
  payload: unknown,
): unknown {
  if (payload == null || typeof payload !== "object") return payload

  if (toolName === "propose_edit_group" && kind === "input") {
    const p = payload as Record<string, unknown>
    const edits = Array.isArray(p.edits) ? p.edits : []
    return {
      path: p.path,
      title: p.title,
      summary: p.summary,
      rationale:
        typeof p.rationale === "string"
          ? truncateText(p.rationale, 240)
          : p.rationale,
      confidence: p.confidence,
      edit_count: edits.length,
      edits: edits.map((raw) => {
        if (!raw || typeof raw !== "object") return raw
        const e = raw as Record<string, unknown>
        return {
          kind: e.kind,
          old_text:
            typeof e.old_text === "string"
              ? truncateText(e.old_text, MAX_EDIT_FIELD_CHARS)
              : e.old_text,
          new_text:
            typeof e.new_text === "string"
              ? truncateText(e.new_text, MAX_EDIT_FIELD_CHARS)
              : e.new_text,
          anchor: e.anchor,
          rationale: e.rationale,
          risk: e.risk,
        }
      }),
    }
  }

  if (toolName === "read_file" && kind === "output") {
    const p = payload as Record<string, unknown>
    if (typeof p.content === "string" && p.content.length > 2_000) {
      const preview =
        typeof p.preview === "string"
          ? p.preview
          : truncateText(p.content, 2_000)
      return { ...p, content: preview, preview }
    }
  }

  if (toolName === "read_skill_resource" && kind === "output") {
    const p = payload as Record<string, unknown>
    if (typeof p.content === "string" && p.content.length > 2_000) {
      const preview =
        typeof p.preview === "string"
          ? p.preview
          : truncateText(p.content, 2_000)
      return { ...p, content: preview, preview }
    }
  }

  if (toolName === "check_references" && kind === "output") {
    const p = payload as Record<string, unknown>
    const findings = Array.isArray(p.findings) ? p.findings : []
    return {
      path: p.path,
      ok: p.ok,
      offline: p.offline,
      finding_count: p.finding_count,
      summary: p.summary,
      findings: findings.map((raw) => {
        if (!raw || typeof raw !== "object") return raw
        const f = raw as Record<string, unknown>
        return {
          kind: f.kind,
          message: f.message,
          detail:
            typeof f.detail === "string"
              ? truncateText(f.detail, 200)
              : f.detail,
        }
      }),
    }
  }

  return payload
}

export function formatToolPayloadForDisplay(
  toolName: string,
  kind: "input" | "output",
  payload: unknown,
): string {
  if (typeof payload === "string") {
    return truncateText(payload, MAX_JSON_CHARS)
  }
  if (payload === undefined) return ""

  const summarized = summarizeToolPayloadForDisplay(toolName, kind, payload)
  try {
    const json = JSON.stringify(summarized, null, 2)
    return truncateText(json, MAX_JSON_CHARS)
  } catch {
    return truncateText(String(summarized), MAX_JSON_CHARS)
  }
}

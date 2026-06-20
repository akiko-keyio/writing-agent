import { describe, expect, it } from "vitest"

import {
  formatToolPayloadForDisplay,
  summarizeToolPayloadForDisplay,
} from "@/lib/agent/tool-payload-display"

describe("tool-payload-display", () => {
  it("truncates propose_edit_group edit bodies in input", () => {
    const long = "x".repeat(200)
    const summarized = summarizeToolPayloadForDisplay(
      "propose_edit_group",
      "input",
      {
        path: "test-text.md",
        edits: [{ kind: "replace", old_text: long, new_text: long }],
      },
    ) as { edits: { old_text: string }[] }

    expect(summarized.edits[0]!.old_text.length).toBeLessThan(200)
    expect(summarized.edits[0]!.old_text.endsWith("…")).toBe(true)
  })

  it("formats check_references findings for display", () => {
    const summarized = summarizeToolPayloadForDisplay(
      "check_references",
      "output",
      {
        path: "demo-manuscript.md",
        ok: false,
        finding_count: 1,
        summary: "Reference check for demo-manuscript.md: 1 issue(s) found.",
        findings: [
          {
            kind: "doi_unreachable",
            message: "DOI not found",
            detail: "x".repeat(300),
          },
        ],
      },
    ) as { findings: { detail: string }[] }

    expect(summarized.findings[0]!.detail.length).toBeLessThan(300)
    expect(summarized.findings[0]!.detail.endsWith("…")).toBe(true)
  })
})

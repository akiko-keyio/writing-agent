import { describe, expect, it } from "vitest"

import { editKindLabel } from "@/components/edit-diff-preview"
import { computeEditTextDiffPreview } from "@/lib/edit-text-diff"

describe("computeEditTextDiffPreview", () => {
  it("keeps unchanged context in replace previews", () => {
    const parts = computeEditTextDiffPreview(
      "# Title\n\nOld paragraph with alpha token.",
      "# Title\n\nOld paragraph with beta token.",
    )
    expect(parts.some((part) => part.op === "equal")).toBe(true)
    expect(parts.some((part) => part.op === "delete" && part.text.includes("alpha"))).toBe(
      true,
    )
    expect(parts.some((part) => part.op === "insert" && part.text.includes("beta"))).toBe(
      true,
    )
  })
})

describe("editKindLabel", () => {
  it("maps edit kinds to queue labels", () => {
    expect(editKindLabel("insert")).toBe("Add")
    expect(editKindLabel("delete")).toBe("Remove")
    expect(editKindLabel("replace")).toBe("Change")
  })
})

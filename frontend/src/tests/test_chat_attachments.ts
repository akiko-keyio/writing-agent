import { describe, expect, it } from "vitest"

import {
  composeMessageTextWithAttachments,
  makeSelectionAttachment,
  type ChatAttachment,
} from "@/lib/chat/attachments"

describe("composeMessageTextWithAttachments", () => {
  const selection = makeSelectionAttachment({
    path: "demo-manuscript.md",
    from: 0,
    to: 10,
    text: "sample",
    startLine: 3,
    endLine: 4,
  })

  it("prepends attachment labels separated from body text", () => {
    expect(
      composeMessageTextWithAttachments("请改进这段摘要。", [selection]),
    ).toBe("@demo-manuscript.md:3-4\n\n请改进这段摘要。")
  })

  it("returns trimmed body when there are no attachments", () => {
    expect(composeMessageTextWithAttachments("  hello  ", [])).toBe("hello")
  })

  it("does not duplicate labels already present in the body", () => {
    const body = "@demo-manuscript.md:3-4\n\n请改进这段摘要。"
    expect(composeMessageTextWithAttachments(body, [selection])).toBe(body)
  })

  it("prepends only missing labels", () => {
    const other: ChatAttachment = {
      id: "file-other",
      kind: "file",
      path: "notes.md",
      label: "@notes.md",
    }
    expect(
      composeMessageTextWithAttachments("@notes.md\n\n继续", [selection, other]),
    ).toBe("@demo-manuscript.md:3-4\n\n@notes.md\n\n继续")
  })
})

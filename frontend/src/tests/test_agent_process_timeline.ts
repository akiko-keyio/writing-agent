import { describe, expect, it } from "vitest"

import {
  applyReasoningDelta,
  applyToolUpdateToProcess,
  completeActiveReasoning,
  compactProcessTimeline,
  groupConsecutiveTools,
  processForDisplay,
  startImplicitReasoningAfterTool,
  summarizeProcessTimeline,
} from "@/lib/agent/process-timeline"

describe("agent-process-timeline", () => {
  it("closes reasoning when a new tool appears", () => {
    let process = applyReasoningDelta([], "plan", () => "r1")
    process = applyToolUpdateToProcess(
      process,
      {
        type: "chat/tool_update",
        stream_id: "s1",
        tool_id: "t1",
        name: "read_file",
        status: "running",
      },
      {
        id: "t1",
        name: "read_file",
        status: "running",
      },
    )

    expect(process).toHaveLength(2)
    expect(process[0]).toMatchObject({
      kind: "reasoning",
      streaming: false,
      durationSeconds: expect.any(Number),
    })
    expect(process[1]).toMatchObject({ kind: "tool", tool: { id: "t1" } })
  })

  it("opens a new reasoning phase after tools", () => {
    let process = applyReasoningDelta([], "first", () => "r1")
    process = applyToolUpdateToProcess(
      process,
      {
        type: "chat/tool_update",
        stream_id: "s1",
        tool_id: "t1",
        name: "read_file",
        status: "running",
      },
      { id: "t1", name: "read_file", status: "running" },
    )
    process = applyReasoningDelta(process, "second", () => "r2")

    expect(process).toHaveLength(3)
    expect(process[0]).toMatchObject({ kind: "reasoning", text: "first", streaming: false })
    expect(process[1]).toMatchObject({ kind: "tool" })
    expect(process[2]).toMatchObject({ kind: "reasoning", text: "second", streaming: true })
  })

  it("completes active reasoning on message phase boundary", () => {
    const process = completeActiveReasoning(
      applyReasoningDelta([], "still thinking", () => "r1"),
    )
    expect(process[0]).toMatchObject({
      kind: "reasoning",
      streaming: false,
      durationSeconds: expect.any(Number),
    })
  })

  it("starts implicit reasoning after a tool completes", () => {
    const process = startImplicitReasoningAfterTool(
      [
        { kind: "reasoning", id: "r1", text: "a", streaming: false },
        {
          kind: "tool",
          tool: { id: "t1", name: "read_file", status: "completed" },
        },
      ],
      () => "r2",
    )

    expect(process).toHaveLength(3)
    expect(process[2]).toMatchObject({
      kind: "reasoning",
      id: "r2",
      streaming: true,
      text: "",
    })
  })

  it("drops empty completed reasoning gaps", () => {
    const process = compactProcessTimeline([
      { kind: "reasoning", id: "r1", text: "", streaming: false, durationSeconds: 5 },
      {
        kind: "tool",
        tool: { id: "t1", name: "propose_edits", status: "completed" },
      },
    ])
    expect(process).toHaveLength(1)
    expect(process[0]).toMatchObject({ kind: "tool" })
  })

  it("summarizes grouped propose_edits", () => {
    const summary = summarizeProcessTimeline([
      { kind: "tool", tool: { id: "t1", name: "read_document", status: "completed" } },
      { kind: "tool", tool: { id: "t2", name: "propose_edits", status: "completed" } },
      { kind: "tool", tool: { id: "t3", name: "propose_edits", status: "completed" } },
    ])
    expect(summary).toBe("Read file · Proposed 2 edit groups")
  })

  it("summarizes grouped read_skill_resource", () => {
    const summary = summarizeProcessTimeline(
      Array.from({ length: 4 }, (_, i) => ({
        kind: "tool" as const,
        tool: {
          id: `t${i}`,
          name: "read_skill_resource",
          status: "completed" as const,
        },
      })),
    )
    expect(summary).toBe("Read 4 references")
  })

  it("drops reasoning from completed summary only", () => {
    const process = [
      {
        kind: "reasoning" as const,
        id: "r1",
        text: "plan",
        streaming: false,
        durationSeconds: 3,
      },
      {
        kind: "tool" as const,
        tool: { id: "t1", name: "read_file", status: "completed" as const },
      },
      {
        kind: "reasoning" as const,
        id: "r2",
        text: "wrap up",
        streaming: false,
        durationSeconds: 3,
      },
    ]

    expect(processForDisplay(process, false)).toHaveLength(1)
    expect(compactProcessTimeline(process)).toHaveLength(3)
    expect(processForDisplay(process, true)).toHaveLength(3)
    expect(summarizeProcessTimeline(process, false)).toBe("Read file")
  })
})

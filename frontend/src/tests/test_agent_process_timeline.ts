import { describe, expect, it } from "vitest"

import {
  applyReasoningDelta,
  applyToolUpdateToProcess,
  completeActiveReasoning,
  startImplicitReasoningAfterTool,
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
})

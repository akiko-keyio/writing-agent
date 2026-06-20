import { describe, expect, it } from "vitest"

import {
  acceptEditGroupEvent,
  acceptEditGroupStateEvent,
  filterEditGroupsForSession,
} from "@/lib/agent/edit-group-session"
import type { EditGroup } from "@/lib/agent/protocol"

function group(sessionId: string, id = "g1"): EditGroup {
  return {
    id,
    session_id: sessionId,
    path: "demo.md",
    title: "",
    summary: "",
    rationale: "",
    source_agent: "",
    confidence: 0,
    status: "proposed",
    created_at: 0,
    updated_at: 0,
    edits: [],
  }
}

describe("edit-group-session", () => {
  it("filters groups to the active session", () => {
    const groups = [group("sess-a"), group("sess-b", "g2")]
    expect(filterEditGroupsForSession(groups, "sess-a")).toEqual([group("sess-a")])
    expect(filterEditGroupsForSession(groups, null)).toEqual([])
  })

  it("accepts group events only for the active session", () => {
    expect(acceptEditGroupEvent(group("sess-a"), "sess-a")).toBe(true)
    expect(acceptEditGroupEvent(group("sess-a"), "sess-b")).toBe(false)
    expect(acceptEditGroupEvent(group("sess-a"), null)).toBe(false)
  })

  it("accepts group state only when session ids match", () => {
    expect(acceptEditGroupStateEvent("sess-a", "sess-a")).toBe(true)
    expect(acceptEditGroupStateEvent("sess-a", "sess-b")).toBe(false)
    expect(acceptEditGroupStateEvent(null, null)).toBe(true)
  })
})

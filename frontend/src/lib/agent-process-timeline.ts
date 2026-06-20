import type { AgentToolCall } from "@/hooks/use-agent-session"
import type { ChatToolUpdateMessage } from "@/lib/agent-protocol"

export type AgentReasoningPhase = {
  kind: "reasoning"
  id: string
  text: string
  streaming: boolean
  startedAt?: number
  durationSeconds?: number
}

export type AgentProcessToolItem = {
  kind: "tool"
  tool: AgentToolCall
}

export type AgentProcessItem = AgentReasoningPhase | AgentProcessToolItem

export type AgentProcessToolGroup = {
  kind: "tool-group"
  name: string
  tools: AgentToolCall[]
}

export type GroupedProcessItem =
  | AgentReasoningPhase
  | AgentProcessToolItem
  | AgentProcessToolGroup

function reasoningDurationSeconds(startedAt: number): number {
  return Math.max(1, Math.round((Date.now() - startedAt) / 1000))
}

function closeReasoningPhase(phase: AgentReasoningPhase): AgentReasoningPhase {
  if (!phase.streaming) return phase
  const startedAt = phase.startedAt ?? Date.now()
  return {
    ...phase,
    streaming: false,
    durationSeconds: reasoningDurationSeconds(startedAt),
  }
}

export function completeActiveReasoning(
  process: AgentProcessItem[],
): AgentProcessItem[] {
  for (let i = process.length - 1; i >= 0; i -= 1) {
    const item = process[i]
    if (item.kind === "reasoning" && item.streaming) {
      const next = [...process]
      next[i] = closeReasoningPhase(item)
      return next
    }
  }
  return process
}

export function applyReasoningDelta(
  process: AgentProcessItem[],
  delta: string,
  nextId: () => string,
): AgentProcessItem[] {
  const last = process[process.length - 1]
  if (last?.kind === "reasoning" && last.streaming) {
    const next = [...process]
    next[process.length - 1] = { ...last, text: last.text + delta }
    return next
  }
  return [
    ...process,
    {
      kind: "reasoning",
      id: nextId(),
      text: delta,
      streaming: true,
      startedAt: Date.now(),
    },
  ]
}

export function applyToolUpdateToProcess(
  process: AgentProcessItem[],
  update: ChatToolUpdateMessage,
  tool: AgentToolCall,
): AgentProcessItem[] {
  const existingIdx = process.findIndex(
    (item) => item.kind === "tool" && item.tool.id === update.tool_id,
  )
  if (existingIdx >= 0) {
    return process.map((item, index) =>
      index === existingIdx && item.kind === "tool"
        ? { kind: "tool", tool }
        : item,
    )
  }
  return [
    ...completeActiveReasoning(process),
    { kind: "tool", tool },
  ]
}

/** Model may think between tools without `reasoning_delta` — show a Thought step. */
export function startImplicitReasoningAfterTool(
  process: AgentProcessItem[],
  nextId: () => string,
): AgentProcessItem[] {
  const last = process[process.length - 1]
  if (last?.kind === "reasoning" && last.streaming) {
    return process
  }
  if (last?.kind !== "tool") {
    return process
  }
  if (last.tool.status !== "completed" && last.tool.status !== "error") {
    return process
  }
  return [
    ...process,
    {
      kind: "reasoning",
      id: nextId(),
      text: "",
      streaming: true,
      startedAt: Date.now(),
    },
  ]
}

export function finalizeRunningTools(
  process: AgentProcessItem[],
): AgentProcessItem[] {
  return process.map((item) => {
    if (item.kind === "tool" && item.tool.status === "running") {
      return {
        kind: "tool",
        tool: { ...item.tool, status: "completed" as const },
      }
    }
    return item
  })
}

export function finalizeProcess(process: AgentProcessItem[]): AgentProcessItem[] {
  return completeActiveReasoning(finalizeRunningTools(process))
}

/**
 * Merge consecutive completed/error tool calls with the same `name`
 * into a single `tool-group` item. Running tools stay ungrouped
 * so they remain individually visible during streaming.
 */
export function groupConsecutiveTools(
  process: AgentProcessItem[],
): GroupedProcessItem[] {
  const result: GroupedProcessItem[] = []
  let pending: AgentToolCall[] = []
  let pendingName = ""

  function flush() {
    if (pending.length === 0) return
    if (pending.length === 1) {
      result.push({ kind: "tool", tool: pending[0]! })
    } else {
      result.push({ kind: "tool-group", name: pendingName, tools: pending })
    }
    pending = []
    pendingName = ""
  }

  for (const item of process) {
    if (item.kind === "reasoning") {
      flush()
      result.push(item)
      continue
    }

    const { tool } = item
    if (tool.status === "running") {
      flush()
      result.push(item)
      continue
    }

    if (pending.length === 0) {
      pending = [tool]
      pendingName = tool.name
    } else if (tool.name === pendingName) {
      pending = [...pending, tool]
    } else {
      flush()
      pending = [tool]
      pendingName = tool.name
    }
  }

  flush()
  return result
}

/** Rebuild a timeline for restored / legacy messages without `process`. */
export function legacyProcessFromMessage(message: {
  reasoning?: string
  tools?: AgentToolCall[]
}): AgentProcessItem[] {
  const items: AgentProcessItem[] = []
  if (message.reasoning?.trim()) {
    items.push({
      kind: "reasoning",
      id: "legacy-reasoning",
      text: message.reasoning,
      streaming: false,
    })
  }
  for (const tool of message.tools ?? []) {
    items.push({ kind: "tool", tool })
  }
  return items
}

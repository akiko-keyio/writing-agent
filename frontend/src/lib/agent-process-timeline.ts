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

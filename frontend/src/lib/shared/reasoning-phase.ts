"use client"

import * as React from "react"

import type { AgentReasoningPhase } from "@/lib/agent/process-timeline"
import { useOnChange } from "@/hooks/use-on-change"

export function formatReasoningPhaseLabel(phase: AgentReasoningPhase): string {
  if (phase.streaming) return "Thinking…"
  if (phase.durationSeconds != null) {
    return `Thought for ${phase.durationSeconds}s`
  }
  return "Thought briefly"
}

/** Live label for standalone `Reasoning` (streams in one mount). */
export function useReasoningPhaseLabel(isStreaming: boolean) {
  const [durationLabel, setDurationLabel] = React.useState<string | null>(null)
  const startedAtRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    if (isStreaming) {
      startedAtRef.current = Date.now()
      setDurationLabel(null)
    }
  }, [isStreaming])

  useOnChange(isStreaming, (current, previous) => {
    if (previous && !current) {
      const startedAt = startedAtRef.current
      const elapsedSeconds =
        startedAt != null
          ? Math.max(1, Math.round((Date.now() - startedAt) / 1000))
          : null
      setDurationLabel(
        elapsedSeconds != null ? String(elapsedSeconds) : null,
      )
      startedAtRef.current = null
    }
  })

  const label = React.useMemo(() => {
    if (isStreaming) return "Thinking…"
    if (durationLabel != null) return `Thought for ${durationLabel}s`
    return "Thought briefly"
  }, [durationLabel, isStreaming])

  return { label, isStreaming }
}

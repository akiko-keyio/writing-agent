import {
  AlertCircleIcon,
  InformationCircleIcon,
  Loading02Icon,
} from "@hugeicons/core-free-icons"
import type { IconSvgElement } from "@hugeicons/react"
import type { ReactNode } from "react"

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@/lib/shared/icons"
import { cn } from "@/lib/shared/utils"

export type ChatAgentStatusProps = {
  connectionState: "connecting" | "open" | "closed"
  agentError?: string | null
  onDismissError?: () => void
  modelsKnown?: boolean
  modelsCount?: number
  onOpenModelsSettings?: () => void
}

type StatusVariant = "error" | "warning" | "info"

type ResolvedStatus = {
  variant: StatusVariant
  icon: IconSvgElement
  spinIcon?: boolean
  title: string
  description?: string
  action?: ReactNode
}

const GENERIC_AGENT_ERROR_PREFIX =
  "The writing agent could not complete your request"

function agentErrorCopy(message: string): Pick<ResolvedStatus, "title" | "description"> {
  if (
    message.startsWith(GENERIC_AGENT_ERROR_PREFIX) ||
    message === "The writing agent could not complete your request."
  ) {
    return {
      title: "Could not complete request",
      description:
        "Check that your model is configured and the API is reachable, then try again.",
    }
  }

  if (message.length <= 72 && !message.includes("\n")) {
    return { title: message }
  }

  return {
    title: "Request failed",
    description: message,
  }
}

function resolveTurnError(
  agentError: string | null | undefined,
  onDismissError?: () => void,
): ResolvedStatus | null {
  if (!agentError) return null

  const copy = agentErrorCopy(agentError)
  return {
    variant: "error",
    icon: AlertCircleIcon,
    ...copy,
    action: onDismissError ? (
      <Button size="xs" variant="ghost" onClick={onDismissError}>
        Dismiss
      </Button>
    ) : undefined,
  }
}

function resolveThreadStatus({
  connectionState,
  modelsKnown,
  modelsCount,
  onOpenModelsSettings,
}: ChatAgentStatusProps): ResolvedStatus | null {
  if (connectionState === "connecting") {
    return {
      variant: "info",
      icon: Loading02Icon,
      spinIcon: true,
      title: "Connecting to agent",
      description: "Waiting for the writing agent backend…",
    }
  }

  if (connectionState === "closed") {
    return {
      variant: "warning",
      icon: AlertCircleIcon,
      title: "Agent offline",
      description: "Cannot reach the writing agent. Reconnecting automatically…",
    }
  }

  if (modelsKnown && modelsCount === 0 && onOpenModelsSettings) {
    return {
      variant: "warning",
      icon: InformationCircleIcon,
      title: "No model configured",
      description: "Add a model in Settings before sending messages.",
      action: (
        <Button size="xs" onClick={onOpenModelsSettings}>
          Open Settings
        </Button>
      ),
    }
  }

  return null
}

export function hasChatThreadStatus(props: ChatAgentStatusProps): boolean {
  return resolveThreadStatus(props) !== null
}

function ChatStatusAlert({ status }: { status: ResolvedStatus }) {
  return (
    <Alert variant={status.variant}>
      <HugeiconsIcon
        icon={status.icon}
        className={cn(status.spinIcon && "animate-spin")}
      />
      <AlertTitle>{status.title}</AlertTitle>
      {status.description ? (
        <AlertDescription>{status.description}</AlertDescription>
      ) : null}
      {status.action ? <AlertAction>{status.action}</AlertAction> : null}
    </Alert>
  )
}

/** Alert under the user bubble when that turn failed. */
export function ChatTurnAlert({
  agentError,
  onDismissError,
}: {
  agentError: string
  onDismissError?: () => void
}) {
  const status = resolveTurnError(agentError, onDismissError)
  if (!status) return null
  return <ChatStatusAlert status={status} />
}

/** Thread-level alert (connect / offline / no model) — not on the composer. */
export function ChatThreadStatus(props: ChatAgentStatusProps) {
  const status = resolveThreadStatus(props)
  if (!status) return null
  return <ChatStatusAlert status={status} />
}

export function failedTurnMessageId(
  messages: ReadonlyArray<{ id: string; role: string }>,
  agentError: string | null | undefined,
): string | null {
  if (!agentError) return null
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === "user") return messages[i].id
  }
  return null
}

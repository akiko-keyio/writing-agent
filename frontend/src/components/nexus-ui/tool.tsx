"use client"

import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlertCircleIcon,
  ArrowDown01Icon,
  CheckmarkCircle01Icon,
  Clock01Icon,
  Loading02Icon,
  Wrench01Icon,
} from "@hugeicons/core-free-icons"
import type { IconSvgElement } from "@hugeicons/react"
import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ComponentProps,
  type CSSProperties,
} from "react"

import { ChromeInlineScroll } from "@/components/chrome-scroll-area"
import { useOnChange } from "@/hooks/use-on-change"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { gap, p, stack } from "@/lib/spacing"
import { cn } from "@/lib/utils"

type ToolStatus = "pending" | "ready" | "running" | "completed" | "error"

type ToolMeta = {
  label: string
  icon: IconSvgElement
  iconClassName?: string
}

const TOOL_META: Record<ToolStatus, ToolMeta> = {
  pending: { label: "Pending", icon: Wrench01Icon },
  ready: { label: "Ready", icon: Clock01Icon },
  running: { label: "Running", icon: Loading02Icon, iconClassName: "animate-spin" },
  completed: { label: "Completed", icon: CheckmarkCircle01Icon },
  error: { label: "Error", icon: AlertCircleIcon },
}

type ToolContextValue = {
  status: ToolStatus
  meta: ToolMeta
}

const ToolContext = createContext<ToolContextValue | null>(null)

function isToolStatus(value: unknown): value is ToolStatus {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(TOOL_META, value)
  )
}

function useToolContext(component: string): ToolContextValue {
  const context = useContext(ToolContext)
  if (!context) {
    throw new Error(`${component} must be used within <Tool>`)
  }
  return context
}

import { formatToolPayloadForDisplay } from "@/lib/tool-payload-display"

type ToolProps = Omit<
  ComponentProps<typeof Collapsible>,
  "open" | "defaultOpen" | "onOpenChange"
> & {
  status: ToolStatus
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

function Tool({
  status,
  className,
  style,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  ...props
}: ToolProps) {
  const resolvedStatus = isToolStatus(status) ? status : "pending"
  const meta = TOOL_META[resolvedStatus]
  const isControlled = openProp !== undefined
  const [internalOpen, setInternalOpen] = useState(
    () => defaultOpen || resolvedStatus === "running",
  )
  const open = isControlled ? openProp : internalOpen

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        setInternalOpen(nextOpen)
      }
      onOpenChange?.(nextOpen)
    },
    [isControlled, onOpenChange],
  )

  useOnChange(resolvedStatus, (current, previous) => {
    if (current === "running" && previous !== "running") {
      handleOpenChange(true)
      return
    }

    if (
      previous === "running" &&
      (current === "completed" || current === "error")
    ) {
      handleOpenChange(false)
    }
  })

  return (
    <ToolContext.Provider value={{ status: resolvedStatus, meta }}>
      <Collapsible
        data-slot="tool"
        className={cn(
          "not-prose w-full max-w-full border border-border bg-card dark:border-border/50",
          "data-panel-open:rounded-lg rounded-lg",
          className,
        )}
        style={style as CSSProperties}
        open={open}
        onOpenChange={handleOpenChange}
        {...props}
      />
    </ToolContext.Provider>
  )
}

type ToolTriggerProps = Omit<
  ComponentProps<typeof CollapsibleTrigger>,
  "children"
> & {
  name: string
}

function ToolTrigger({ name, className, ...props }: ToolTriggerProps) {
  const { meta, status } = useToolContext("ToolTrigger")

  return (
    <CollapsibleTrigger
      data-slot="tool-trigger"
      className={cn(
        cn(
          "group flex h-9 w-full cursor-pointer items-center justify-between",
          p[2.5].x,
          p[1.5].y
        ),
        className,
      )}
      {...props}
    >
      <div className={cn("flex min-w-0 items-center", gap.sm)}>
        <HugeiconsIcon
          icon={meta.icon}
          aria-hidden="true"
          className={cn(
            "size-4 shrink-0",
            status === "completed" && "text-success-foreground",
            status === "error" && "text-destructive",
            status === "running" && "text-primary",
            meta.iconClassName,
          )}
        />
        <span
          data-slot="tool-trigger-name"
          className="truncate text-sm leading-5 font-medium text-foreground"
        >
          {name}
        </span>
        <Badge variant="secondary" className="h-6 shrink-0 font-normal">
          {meta.label}
        </Badge>
      </div>
      <HugeiconsIcon icon={ArrowDown01Icon} aria-hidden="true" className="size-4 shrink-0 transition-transform duration-200 group-data-panel-open:rotate-180" />
    </CollapsibleTrigger>
  )
}

type ToolContentProps = ComponentProps<typeof CollapsibleContent>

function ToolContent({ className, ...props }: ToolContentProps) {
  return (
    <CollapsibleContent
      data-slot="tool-content"
      className={cn(stack.sm, p[2].all, p[1].top, className)}
      {...props}
    />
  )
}

type ToolPartProps = {
  kind: "input" | "output"
  payload: unknown
  errorText?: string
  toolName?: string
}

function ToolPart({ kind, payload, errorText, toolName = "tool" }: ToolPartProps) {
  const { status } = useToolContext("ToolPart")
  const code = formatToolPayloadForDisplay(toolName, kind, payload)
  const isOutputError = kind === "output" && status === "error"
  const title = kind === "input" ? "Input" : isOutputError ? "Error" : "Output"

  return (
    <div data-slot={`tool-${kind}`} className={stack.sm}>
      <span className="text-xs font-medium text-muted-foreground uppercase">
        {title}
      </span>
      {isOutputError ? (
        <p
          className={cn(
            "rounded-lg border border-destructive/20 bg-destructive/5 text-sm text-destructive",
            p[3].x,
            p[2].y
          )}
        >
          {errorText ?? "Tool execution failed"}
        </p>
      ) : null}
      {code && !isOutputError ? (
        <ChromeInlineScroll
          maxHeight="12rem"
          className="rounded-lg border border-border bg-muted/50 font-mono text-xs text-foreground"
        >
          <pre className={cn(p[3].all, "leading-relaxed")}>{code}</pre>
        </ChromeInlineScroll>
      ) : null}
    </div>
  )
}

function ToolInput({ payload, toolName }: { payload: unknown; toolName?: string }) {
  return <ToolPart kind="input" payload={payload} toolName={toolName} />
}

function ToolOutput({
  payload,
  showWhen = ["completed", "error"],
  errorText,
  toolName,
}: {
  payload: unknown
  showWhen?: ToolStatus[]
  errorText?: string
  toolName?: string
}) {
  const { status } = useToolContext("ToolOutput")
  if (!showWhen.includes(status)) return null
  return (
    <ToolPart
      kind="output"
      payload={payload}
      errorText={errorText}
      toolName={toolName}
    />
  )
}

export type { ToolStatus }
export { Tool, ToolTrigger, ToolContent, ToolInput, ToolOutput }

"use client"

import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import * as React from "react"
import { ChromeInlineScroll } from "@/components/chrome-scroll-area"
import { ChatReasoningMarkdown } from "@/components/chat-streamdown"
import { chatReasoningScrollMaxHeight } from "@/lib/chat-streamdown"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { TextShimmer } from "@/components/nexus-ui/text-shimmer"
import { useOnChange } from "@/hooks/use-on-change"
import {
  chatProcessLineClass,
  chatReasoningBodyShellClass,
} from "@/lib/chat-typography"
import { useReasoningPhaseLabel } from "@/lib/reasoning-phase"
import { gap } from "@/lib/spacing"
import { cn } from "@/lib/utils"

type ReasoningContextValue = {
  isStreaming: boolean
  label: string
}

const ReasoningContext = React.createContext<ReasoningContextValue | null>(null)

function useReasoningContext(component: string): ReasoningContextValue {
  const ctx = React.useContext(ReasoningContext)
  if (!ctx) {
    throw new Error(`${component} must be used within <Reasoning>`)
  }
  return ctx
}

type ReasoningProps = Omit<
  React.ComponentProps<typeof Collapsible>,
  "open" | "defaultOpen" | "onOpenChange"
> & {
  isStreaming?: boolean
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

function Reasoning({
  className,
  isStreaming = false,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  children,
  ...props
}: ReasoningProps) {
  const isControlled = openProp !== undefined
  const [internalOpen, setInternalOpen] = React.useState(
    defaultOpen || isStreaming,
  )
  const open = isControlled ? openProp : internalOpen
  const { label } = useReasoningPhaseLabel(isStreaming)

  React.useEffect(() => {
    if (isStreaming) {
      onOpenChange?.(true)
    }
  }, [isStreaming, onOpenChange])

  useOnChange(isStreaming, (current, previous) => {
    if (!previous && current) {
      if (!isControlled) {
        setInternalOpen(true)
      }
      onOpenChange?.(true)
    }

    if (previous && !current) {
      if (!isControlled) {
        setInternalOpen(false)
      }
      onOpenChange?.(false)
    }
  })

  const contextValue = React.useMemo(
    () => ({ isStreaming, label }),
    [isStreaming, label],
  )

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      const resolvedOpen = isStreaming ? true : nextOpen
      if (!isControlled) {
        setInternalOpen(resolvedOpen)
      }
      onOpenChange?.(resolvedOpen)
    },
    [isControlled, isStreaming, onOpenChange],
  )

  return (
    <ReasoningContext.Provider value={contextValue}>
      <Collapsible
        data-slot="reasoning"
        className={cn("not-prose w-full", className)}
        open={open}
        onOpenChange={handleOpenChange}
        {...props}
      >
        {children}
      </Collapsible>
    </ReasoningContext.Provider>
  )
}

type ReasoningTriggerProps = React.ComponentProps<typeof CollapsibleTrigger>

function ReasoningTrigger({
  className,
  children,
  ...props
}: ReasoningTriggerProps) {
  const { isStreaming, label } = useReasoningContext("ReasoningTrigger")

  return (
    <CollapsibleTrigger
      data-slot="reasoning-trigger"
      className={cn(
        cn(
          "group flex cursor-pointer items-center text-muted-foreground transition-colors hover:text-foreground",
          gap.xs
        ),
        chatProcessLineClass,
        className,
      )}
      {...props}
    >
      <TextShimmer
        className={chatProcessLineClass}
        spread={10}
        disableShimmer={!isStreaming}
      >
        {children ?? label}
      </TextShimmer>
      <HugeiconsIcon
        icon={ArrowDown01Icon}
        aria-hidden="true"
        className="size-4 shrink-0 opacity-0 transition-all group-hover:opacity-100 group-data-panel-open:rotate-180 group-data-panel-open:opacity-100"
      />
    </CollapsibleTrigger>
  )
}

type ReasoningContentProps = Omit<
  React.ComponentProps<typeof CollapsibleContent>,
  "children"
> & {
  children: string
}

function ReasoningContent({
  className,
  children,
  ...props
}: ReasoningContentProps) {
  const { isStreaming } = useReasoningContext("ReasoningContent")

  return (
    <CollapsibleContent
      data-slot="reasoning-content"
      className={cn(
        "ms-2 overflow-hidden",
        chatReasoningBodyShellClass,
        className,
      )}
      {...props}
    >
      <ChromeInlineScroll
        maxHeight={chatReasoningScrollMaxHeight}
        scrollFade
        horizontalScroll={false}
        autoScrollBottom={isStreaming}
        className="min-w-0"
      >
        <ChatReasoningMarkdown scroll={false} streaming={isStreaming}>
          {children}
        </ChatReasoningMarkdown>
      </ChromeInlineScroll>
    </CollapsibleContent>
  )
}

export { Reasoning, ReasoningTrigger, ReasoningContent }

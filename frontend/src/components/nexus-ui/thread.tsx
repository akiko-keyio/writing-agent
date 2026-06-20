"use client"

import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import * as React from "react"
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom"

import { Button } from "@/components/ui/button"
import { ScrollBar, ScrollAreaPrimitive } from "@/components/ui/scroll-area"
import { p, stack } from "@/lib/spacing"
import { cn } from "@/lib/utils"

/** Spring follow while streaming; higher damping = less bounce. */
export const THREAD_SCROLL_SPRING = {
  damping: 0.82,
  stiffness: 0.07,
  mass: 0.95,
} as const

type ThreadProps = React.ComponentProps<typeof StickToBottom>

function Thread({
  className,
  resize = THREAD_SCROLL_SPRING,
  initial = THREAD_SCROLL_SPRING,
  ...props
}: ThreadProps) {
  return (
    <StickToBottom
      data-slot="thread"
      className={cn("relative h-full min-h-0 w-full", className)}
      resize={resize}
      initial={initial}
      {...props}
    />
  )
}

type ThreadContentProps = React.ComponentProps<"div"> & {
  /** Top/bottom viewport fade while scrolling (disable when a dock sits flush below). */
  edgeFade?: boolean
}

function ThreadContent({
  className,
  style,
  edgeFade = true,
  ...props
}: ThreadContentProps) {
  const { scrollRef, contentRef } = useStickToBottomContext()

  return (
    <ScrollAreaPrimitive.Root
      data-slot="thread-scroll-area"
      className="size-full min-h-0 min-w-0 w-full max-w-full"
    >
      <ScrollAreaPrimitive.Viewport
        ref={scrollRef}
        className={cn(
          "h-full overflow-x-hidden rounded-[inherit] outline-none transition-shadows focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background data-has-overflow-y:overscroll-y-contain",
          edgeFade &&
            "mask-t-from-[calc(100%-min(var(--fade-size),var(--scroll-area-overflow-y-start)))] mask-b-from-[calc(100%-min(var(--fade-size),var(--scroll-area-overflow-y-end)))] [--fade-size:1.5rem]",
        )}
        data-slot="scroll-area-viewport"
      >
        <ScrollAreaPrimitive.Content
          ref={contentRef}
          data-slot="thread-content"
          className={cn(
            cn("min-w-0 max-w-full w-full", stack.lg, p[4].all),
            className,
          )}
          style={{ minWidth: 0, width: "100%", ...style }}
          {...props}
        />
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar orientation="vertical" />
      <ScrollAreaPrimitive.Corner data-slot="scroll-area-corner" />
    </ScrollAreaPrimitive.Root>
  )
}

type ThreadScrollToBottomProps = React.ComponentProps<typeof Button>

function ThreadScrollToBottom({
  className,
  children,
  onClick,
  ...props
}: ThreadScrollToBottomProps) {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext()

  if (isAtBottom) {
    return null
  }

  return (
    <Button
      type="button"
      data-slot="thread-scroll-to-bottom"
      variant="default"
      size="icon-sm"
      className={cn(
        "absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full shadow-md",
        className,
      )}
      aria-label="Scroll to latest messages"
      onClick={(event) => {
        scrollToBottom({ animation: THREAD_SCROLL_SPRING })
        onClick?.(event)
      }}
      {...props}
    >
      {children ?? <HugeiconsIcon icon={ArrowDown01Icon} aria-hidden="true" />}
    </Button>
  )
}

export { Thread, ThreadContent, ThreadScrollToBottom }

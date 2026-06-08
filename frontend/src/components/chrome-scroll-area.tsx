"use client"

import {
  useLayoutEffect,
  useRef,
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
} from "react"

import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

type ChromeInlineScrollProps = {
  className?: string
  children: ReactNode
  style?: CSSProperties
  /** Cap height; vertical thumb appears when content exceeds (e.g. tool output). */
  maxHeight?: string | number
  /** Keep vertical scroll pinned to bottom while content grows (e.g. streaming trace). */
  autoScrollBottom?: boolean
} & Omit<ComponentProps<typeof ScrollArea>, "children" | "className" | "style">

/**
 * Block-level horizontal (and optional vertical) scroll with coss ScrollArea thumbs.
 * Use for Streamdown tables/code, tool pre, and any inline overflow region.
 */
export function ChromeInlineScroll({
  className,
  children,
  maxHeight,
  style,
  horizontalScroll = true,
  scrollbarGutter = true,
  autoScrollBottom = false,
  ...props
}: ChromeInlineScrollProps) {
  const rootRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!autoScrollBottom) return
    const viewport = rootRef.current?.querySelector(
      '[data-slot="scroll-area-viewport"]',
    )
    if (viewport instanceof HTMLElement) {
      viewport.scrollTop = viewport.scrollHeight
    }
  }, [autoScrollBottom, children])

  const capped = maxHeight != null

  return (
    <div
      ref={rootRef}
      className={cn(
        "min-w-0 max-w-full",
        capped && "overflow-hidden",
        className,
      )}
      style={capped ? { maxHeight, ...style } : style}
    >
      <ScrollArea
        data-slot="chrome-inline-scroll"
        className={cn(
          "max-w-full min-h-0",
          capped ? "h-full max-h-full" : "size-full",
        )}
        horizontalScroll={horizontalScroll}
        scrollbarGutter={scrollbarGutter}
        {...props}
      >
        {children}
      </ScrollArea>
    </div>
  )
}

type ChromePanelScrollProps = ComponentProps<typeof ScrollArea>

/**
 * Panel vertical scroll (Thread / Document / Explorer / PromptInput).
 * Thumb styling lives in `@/components/ui/scroll-area`.
 */
export function ChromePanelScroll({
  className,
  scrollFade = true,
  children,
  ...props
}: ChromePanelScrollProps) {
  return (
    <ScrollArea
      className={cn("min-h-0 size-full", className)}
      scrollFade={scrollFade}
      {...props}
    >
      {children}
    </ScrollArea>
  )
}

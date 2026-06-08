import type { ComponentProps } from "react"
import { Streamdown } from "streamdown"

import "@/chat-markdown-overflow.css"
import { ChromeInlineScroll } from "@/components/chrome-scroll-area"
import { chatStreamdownComponents } from "@/components/chat-streamdown-components"
import {
  chatReasoningScrollMaxHeight,
  chatReasoningStreamdownRootClass,
  chatStreamdownLayoutClass,
  chatStreamdownPlugins,
  chatStreamdownRootClass,
} from "@/lib/chat-streamdown"
import { cn } from "@/lib/utils"

export type ChatStreamdownSlot = "message-markdown" | "reasoning-markdown"

/** Chat: code copy only; no table toolbar / code download. */
export const chatStreamdownControls = {
  code: { copy: true, download: false },
  table: false,
} as const

type ChatStreamdownProps = ComponentProps<typeof Streamdown> & {
  markdownSlot: ChatStreamdownSlot
}

/**
 * Streamdown does not forward `data-slot` to the DOM — wrap so chat CSS can scope.
 */
export function ChatStreamdown({
  markdownSlot,
  className,
  plugins = chatStreamdownPlugins,
  controls = chatStreamdownControls,
  lineNumbers = false,
  components,
  ...props
}: ChatStreamdownProps) {
  const rootClass =
    markdownSlot === "reasoning-markdown"
      ? chatReasoningStreamdownRootClass
      : chatStreamdownRootClass

  return (
    <div data-slot={markdownSlot} className={chatStreamdownLayoutClass}>
      <Streamdown
        className={cn(rootClass, className)}
        plugins={plugins}
        controls={controls}
        lineNumbers={lineNumbers}
        components={{ ...chatStreamdownComponents, ...components }}
        {...props}
      />
    </div>
  )
}

type ChatReasoningMarkdownProps = {
  children: string
  streaming?: boolean
  /** When false, parent (e.g. ChainOfThoughtStepContent) owns the scroll box. */
  scroll?: boolean
}

/** Thinking trace — scroll inside a capped box so the thread does not grow with long traces. */
export function ChatReasoningMarkdown({
  children,
  streaming = false,
  scroll = true,
}: ChatReasoningMarkdownProps) {
  const body = (
    <ChatStreamdown markdownSlot="reasoning-markdown">{children}</ChatStreamdown>
  )

  if (!scroll) {
    return body
  }

  return (
    <ChromeInlineScroll
      maxHeight={chatReasoningScrollMaxHeight}
      scrollFade={false}
      horizontalScroll={false}
      autoScrollBottom={streaming}
      className="min-w-0"
    >
      {body}
    </ChromeInlineScroll>
  )
}

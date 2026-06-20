"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { ChatStreamdown } from "@/components/chat-streamdown"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Kbd } from "@/components/ui/kbd"
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip"
import { chatMarkdownBodyClass } from "@/lib/chat/typography"
import { gap } from "@/lib/shell/spacing"
import { cn } from "@/lib/shared/utils"

export { chatStreamdownPlugins } from "@/lib/chat/streamdown"

type MessageFrom = "user" | "assistant"

type MessageContextValue = {
  from: MessageFrom
}

const MessageContext = React.createContext<MessageContextValue | null>(null)

function useMessageContext() {
  return React.useContext(MessageContext)
}

type MessageProps = React.HTMLAttributes<HTMLDivElement> & {
  from: MessageFrom
}

const Message = React.forwardRef<HTMLDivElement, MessageProps>(function Message(
  {
    className,
    from,
    children,
    "aria-label": ariaLabelProp,
    "aria-labelledby": ariaLabelledBy,
    ...props
  },
  ref
) {
  const ariaLabel =
    ariaLabelProp ??
    (ariaLabelledBy == null
      ? from === "user"
        ? "User message"
        : "Assistant message"
      : undefined)

  return (
    <MessageContext.Provider value={{ from }}>
      <div
        ref={ref}
        data-slot="message"
        role="article"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        className={cn(
          cn("group/message flex w-full min-w-0 max-w-full items-start", gap.sm),
          from === "user" ? "justify-end" : "justify-start",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </MessageContext.Provider>
  )
})

type MessageContentProps = React.HTMLAttributes<HTMLDivElement>

function MessageContent({ className, ...props }: MessageContentProps) {
  const ctx = useMessageContext()
  const from = ctx?.from ?? "assistant"

  return (
    <div
      data-slot="message-content"
      className={cn(
        chatMarkdownBodyClass,
        from === "user"
          ? "w-full max-w-full min-w-0"
          : "mb-0 w-full max-w-full min-w-0",
        className
      )}
      {...props}
    />
  )
}

type MessageMarkdownProps = Omit<
  React.ComponentProps<typeof ChatStreamdown>,
  "markdownSlot"
>

function MessageMarkdown({ className, ...props }: MessageMarkdownProps) {
  return (
    <ChatStreamdown
      markdownSlot="message-markdown"
      className={className}
      {...props}
    />
  )
}

type MessageActionProps = React.HTMLAttributes<HTMLDivElement> & {
  asChild?: boolean
  tooltip?:
    | string
    | {
        content?: string
        side?: "top" | "right" | "bottom" | "left"
        shortcut?: string
      }
}

function MessageAction({
  asChild = false,
  tooltip,
  className,
  children,
  ...props
}: MessageActionProps) {
  const Comp = asChild ? Slot : "div"
  const { content, side, shortcut } =
    typeof tooltip === "string" ? { content: tooltip } : (tooltip ?? {})

  const node = (
    <Comp className={className} data-slot="message-action" {...props}>
      {children}
    </Comp>
  )

  if (!content) {
    return node
  }

  return (
    <Tooltip>
      <TooltipTrigger render={node} />
      <TooltipPopup side={side} className={cn("flex items-center", gap.sm)}>
        {content}
        {shortcut ? <Kbd>{shortcut}</Kbd> : null}
      </TooltipPopup>
    </Tooltip>
  )
}

export type MessageAvatarProps = {
  src: string
  alt?: string
  fallback?: React.ReactNode
  className?: string
}

function MessageAvatar({
  src,
  alt = "",
  fallback,
  className,
}: MessageAvatarProps) {
  return (
    <Avatar
      data-slot="message-avatar"
      className={cn("size-7 shrink-0", className)}
    >
      <AvatarImage src={src} alt={alt} />
      <AvatarFallback className="text-xs">{fallback}</AvatarFallback>
    </Avatar>
  )
}

export {
  Message,
  MessageContent,
  MessageMarkdown,
  MessageAction,
  MessageAvatar,
}

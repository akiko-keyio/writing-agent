"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"

import { ChromePanelScroll } from "@/components/chrome-scroll-area"
import { Kbd } from "@/components/ui/kbd"
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip"
import { mergeRefs } from "@/lib/merge-refs"
import { shell } from "@/lib/shell-chrome"
import { gap, p } from "@/lib/spacing"
import { cn } from "@/lib/utils"

import { Textarea } from "@/components/nexus-ui/textarea"

type PromptInputContextValue = {
  setTextareaNode: (node: HTMLTextAreaElement | null) => void
  onSubmit?: (value: string) => void
}

const PromptInputContext = React.createContext<PromptInputContextValue | null>(
  null
)

type PromptInputProps = Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "onSubmit"
> & {
  onSubmit?: (value: string) => void
}

function PromptInput({
  className,
  role: _role,
  "aria-label": _ariaLabel,
  onClick,
  onSubmit,
  children,
  ...props
}: PromptInputProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null)

  const handleClick = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement
      if (
        !target.closest(
          'button, a, input, textarea, [role="button"], [role="tab"]'
        )
      ) {
        textareaRef.current?.focus()
      }
      onClick?.(e)
    },
    [onClick]
  )

  const contextValue = React.useMemo<PromptInputContextValue>(
    () => ({
      setTextareaNode: (node) => {
        textareaRef.current = node
      },
      onSubmit,
    }),
    [onSubmit]
  )

  return (
    <PromptInputContext.Provider value={contextValue}>
      <div
        role="group"
        aria-label="Chat input"
        className={cn(
          "relative flex h-auto cursor-text flex-col overflow-hidden",
          gap.none,
          shell.chatComposerChrome,
          className
        )}
        onClick={handleClick}
        {...props}
      >
        {children}
      </div>
    </PromptInputContext.Provider>
  )
}

type PromptInputTextareaProps = React.ComponentProps<typeof Textarea>

const PromptInputTextarea = React.forwardRef<
  HTMLTextAreaElement,
  PromptInputTextareaProps
>(function PromptInputTextarea(
  { className, "aria-label": ariaLabel = "Message input", onKeyDown, ...props },
  ref
) {
  const context = React.useContext(PromptInputContext)
  const setTextareaNode = context?.setTextareaNode
  const onSubmit = context?.onSubmit

  const handleTextareaRef = React.useCallback(
    (node: HTMLTextAreaElement | null) => {
      mergeRefs<HTMLTextAreaElement>(setTextareaNode, ref)(node)
    },
    [setTextareaNode, ref]
  )

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey && onSubmit) {
        e.preventDefault()
        onSubmit(e.currentTarget.value)
      }
      onKeyDown?.(e)
    },
    [onSubmit, onKeyDown]
  )

  return (
    <ChromePanelScroll
      className="relative max-h-40 w-full shrink-0"
      scrollFade={false}
    >
      <Textarea
        ref={handleTextareaRef}
        aria-label={ariaLabel}
        placeholder="How can I help you today?"
        className={cn(
          cn(
            "min-h-14 w-full resize-none border-0 bg-transparent text-sm leading-5 font-normal text-foreground shadow-none outline-none placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-transparent",
            p[4].y
          ),
          shell.chatPromptInsetX,
          className
        )}
        onKeyDown={handleKeyDown}
        {...props}
      />
    </ChromePanelScroll>
  )
})

type PromptInputActionsProps = React.HTMLAttributes<HTMLDivElement>

function PromptInputActions({
  className,
  role: _role,
  "aria-label": _ariaLabel,
  ...props
}: PromptInputActionsProps) {
  return (
    <div
      role="group"
      aria-label="Input actions"
      className={cn(
        "flex w-full shrink-0 items-center justify-between",
        shell.chatPromptActionsInset,
        className
      )}
      {...props}
    />
  )
}

type PromptInputActionGroupProps = React.HTMLAttributes<HTMLDivElement>

function PromptInputActionGroup({
  className,
  ...props
}: PromptInputActionGroupProps) {
  return <div className={cn("flex", gap.sm, className)} {...props} />
}

type PromptInputActionProps = React.HTMLAttributes<HTMLDivElement> & {
  asChild?: boolean
  tooltip?:
    | string
    | {
        content?: string
        side?: "top" | "right" | "bottom" | "left"
        shortcut?: string
      }
}

function PromptInputAction({
  asChild = false,
  tooltip,
  className,
  children,
  ...props
}: PromptInputActionProps) {
  const Comp = asChild ? Slot : "div"
  const { content, side, shortcut } =
    typeof tooltip === "string" ? { content: tooltip } : (tooltip ?? {})

  const node = (
    <Comp className={className} {...props}>
      {children}
    </Comp>
  )

  if (!content) {
    return node
  }

  return (
    <Tooltip>
      <TooltipTrigger render={node} />
      <TooltipPopup
        side={side}
        className={cn("flex items-center rounded-full", gap.sm)}
      >
        {content}
        {shortcut ? <Kbd>{shortcut}</Kbd> : null}
      </TooltipPopup>
    </Tooltip>
  )
}

export {
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
  PromptInputActionGroup,
  PromptInputAction,
}

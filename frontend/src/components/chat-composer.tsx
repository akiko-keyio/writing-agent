import {
  forwardRef,
  useCallback,
  useRef,
  type KeyboardEvent,
} from "react"

import { ArrowUp02Icon, StopIcon } from "@hugeicons/core-free-icons"

import { ChromePanelScroll } from "@/components/chrome-scroll-area"
import { ModelSwitcherTrigger } from "@/components/model-switcher-trigger"
import { Textarea } from "@/components/nexus-ui/textarea"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import {
  Tooltip,
  TooltipPopup,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { ModelEntryData } from "@/lib/agent-protocol"
import { HugeiconsIcon } from "@/lib/icons"
import { shell } from "@/lib/shell-chrome"
import { gap, p, row } from "@/lib/spacing"
import { cn } from "@/lib/utils"

/** 与用户气泡同一外壳：rounded-3xl + border-input + bg-card */
const COMPOSER_SHELL_CLASS = cn(
  "relative flex cursor-text flex-col overflow-hidden",
  shell.chatComposerChrome,
)

type ComposerFooterVariant = "full" | "send-only"

/** Single Agent mode: a static status label, not a selector. */
function ComposerAgentStatus() {
  return (
    <span
      className={cn(shell.composerMenuTrigger, "cursor-default text-muted-foreground")}
      aria-label="Agent mode"
    >
      Agent
    </span>
  )
}

function ComposerSendButton({
  canSend,
  disabled,
  isStreaming,
  onSend,
  onStop,
}: {
  canSend: boolean
  disabled?: boolean
  isStreaming?: boolean
  onSend: () => void
  onStop?: () => void
}) {
  if (isStreaming) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              size="icon-sm"
              variant="default"
              className={shell.chatChipRadius}
              aria-label="Stop generating"
              onClick={() => onStop?.()}
            >
              <HugeiconsIcon icon={StopIcon} aria-hidden="true" />
            </Button>
          }
        />
        <TooltipPopup side="top">Stop</TooltipPopup>
      </Tooltip>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            size="icon-sm"
            variant="default"
            disabled={disabled || !canSend}
            className={shell.chatSendButton}
            aria-label="Send message"
            onClick={onSend}
          >
            <HugeiconsIcon icon={ArrowUp02Icon} aria-hidden="true" />
          </Button>
        }
      />
      <TooltipPopup side="top" className={cn("flex items-center rounded-full", gap.xs)}>
        Send
        <Kbd>Enter</Kbd>
      </TooltipPopup>
    </Tooltip>
  )
}

export type ChatComposerProps = {
  value: string
  onChange: (value: string) => void
  onSubmit: (value: string) => void
  placeholder?: string
  disabled?: boolean
  canSend?: boolean
  isStreaming?: boolean
  onStop?: () => void
  footerVariant?: ComposerFooterVariant
  models: ModelEntryData[]
  activeModelId: string | null
  onSelectModel: (modelId: string) => void
  onOpenModelsSettings?: () => void
  autoFocus?: boolean
  className?: string
}

export const ChatComposer = forwardRef<HTMLDivElement, ChatComposerProps>(
  function ChatComposer(
    {
      value,
      onChange,
      onSubmit,
      placeholder = "Ask about your writing...",
      disabled = false,
      canSend = false,
      isStreaming = false,
      onStop,
      footerVariant = "full",
      models,
      activeModelId,
      onSelectModel,
      onOpenModelsSettings,
      autoFocus = false,
      className,
    },
    ref,
  ) {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null)

    const handleKeyDown = useCallback(
      (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey && !isStreaming) {
          e.preventDefault()
          onSubmit(value)
        }
      },
      [onSubmit, value, isStreaming],
    )

    const inputDisabled = disabled || isStreaming

    return (
      <div
        ref={ref}
        role="group"
        aria-label="Chat input"
        className={cn("w-full min-w-0", COMPOSER_SHELL_CLASS, className)}
        onClick={(e) => {
          const target = e.target as HTMLElement
          if (
            !target.closest(
              'button, a, input, textarea, [role="button"], [role="tab"]',
            )
          ) {
            textareaRef.current?.focus()
          }
        }}
      >
        <ChromePanelScroll
          className="relative max-h-40 w-full shrink-0"
          scrollFade={false}
        >
          <Textarea
            ref={textareaRef}
            aria-label="Message input"
            placeholder={placeholder}
            value={value}
            disabled={inputDisabled}
            autoFocus={autoFocus}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className={cn(
              "block min-h-11 w-full resize-none border-0 bg-transparent text-sm leading-5 font-normal text-foreground shadow-none outline-none placeholder:text-muted-foreground focus-visible:border-0 focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-transparent",
              p[0].all,
              shell.chatBoxTextInset,
            )}
          />
        </ChromePanelScroll>
        <div
          role="group"
          aria-label="Composer actions"
          className={cn(
            row.sm,
            "w-full shrink-0",
            footerVariant === "full" ? "justify-between" : "justify-end",
            p[1].top,
            p[2].x,
            p[2].bottom,
          )}
        >
          {footerVariant === "full" ? (
            <>
              <ComposerAgentStatus />
              <div className={cn(row.sm, "shrink-0")}>
                <ModelSwitcherTrigger
                  models={models}
                  activeModelId={activeModelId}
                  onSelectModel={onSelectModel}
                  onOpenModelsSettings={onOpenModelsSettings}
                  disabled={inputDisabled}
                  variant="composer"
                />
                <ComposerSendButton
                  canSend={canSend}
                  disabled={inputDisabled}
                  isStreaming={isStreaming}
                  onSend={() => onSubmit(value)}
                  onStop={onStop}
                />
              </div>
            </>
          ) : (
            <ComposerSendButton
              canSend={canSend}
              disabled={inputDisabled}
              isStreaming={isStreaming}
              onSend={() => onSubmit(value)}
              onStop={onStop}
            />
          )}
        </div>
      </div>
    )
  },
)

import {
  forwardRef,
  useCallback,
  useRef,
  type KeyboardEvent,
} from "react"

import { ArrowUp02Icon, BookOpenCheckIcon, Cancel01Icon, StopIcon } from "@hugeicons/core-free-icons"

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
import type { ModelEntryData } from "@/lib/agent/protocol"
import type { ChatAttachment } from "@/lib/chat/attachments"
import { attachmentMentionLabel } from "@/lib/chat/attachments"
import { HugeiconsIcon } from "@/lib/shared/icons"
import { shell } from "@/lib/shell/chrome"
import { gap, p, row } from "@/lib/shell/spacing"
import { cn } from "@/lib/shared/utils"

/** 与用户气泡同一外壳：rounded-3xl + border-input + bg-card */
const COMPOSER_SHELL_CLASS = cn(
  "relative flex cursor-text flex-col overflow-hidden",
  shell.chatComposerChrome,
)

type ComposerFooterVariant = "full" | "send-only"

function ComposerAutoReviewToggle({
  pressed,
  onPressedChange,
  disabled,
}: {
  pressed: boolean
  onPressedChange: (pressed: boolean) => void
  disabled?: boolean
}) {
  const label = pressed ? "Auto Review on" : "Auto Review"

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-pressed={pressed}
            aria-label={label}
            disabled={disabled}
            data-pressed={pressed ? "" : undefined}
            onClick={() => onPressedChange(!pressed)}
          >
            <HugeiconsIcon icon={BookOpenCheckIcon} aria-hidden="true" />
          </Button>
        }
      />
      <TooltipPopup side="top">{label}</TooltipPopup>
    </Tooltip>
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
              className={shell.chatSendButton}
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
  autoReview?: boolean
  onAutoReviewChange?: (enabled: boolean) => void
  autoFocus?: boolean
  attachments?: ChatAttachment[]
  onRemoveAttachment?: (id: string) => void
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
      autoReview = false,
      onAutoReviewChange,
      autoFocus = false,
      attachments = [],
      onRemoveAttachment,
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
        {attachments.length > 0 ? (
          <div
            className={cn("flex flex-wrap", gap.sm, shell.composerAttachmentInset)}
          >
            {attachments.map((att) => (
              <Button
                key={att.id}
                type="button"
                variant="ghost"
                size="sm"
                className={cn(shell.composerMenuTrigger, shell.composerAttachmentChip)}
                onClick={(e) => e.stopPropagation()}
              >
                <span className="min-w-0 truncate">{attachmentMentionLabel(att)}</span>
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={`Remove ${attachmentMentionLabel(att)}`}
                  className="inline-flex shrink-0 opacity-70 hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemoveAttachment?.(att.id)
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter" && e.key !== " ") return
                    e.stopPropagation()
                    e.preventDefault()
                    onRemoveAttachment?.(att.id)
                  }}
                >
                  <HugeiconsIcon icon={Cancel01Icon} aria-hidden="true" className="size-3.5" />
                </span>
              </Button>
            ))}
          </div>
        ) : null}
        <ChromePanelScroll
          className={cn(
            "relative max-h-40 w-full shrink-0",
            shell.chatComposerInsetX,
          )}
          scrollFade={false}
        >
          <Textarea
            ref={textareaRef}
            aria-label="Message input"
            placeholder={placeholder}
            value={value}
            disabled={disabled}
            autoFocus={autoFocus}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className={cn(
              "block min-h-11 w-full resize-none border-0 bg-transparent text-sm leading-5 font-normal text-foreground shadow-none outline-none placeholder:text-muted-foreground focus-visible:border-0 focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-transparent",
              p[0].x,
              attachments.length > 0 ? cn(p[2].top, p[3].bottom) : p[3].y,
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
            shell.chatPromptActionsInset,
          )}
        >
          {footerVariant === "full" ? (
            <>
              <ComposerAutoReviewToggle
                pressed={autoReview}
                onPressedChange={(next) => onAutoReviewChange?.(next)}
                disabled={disabled}
              />
              <div className={cn(row.sm, "shrink-0")}>
                <ModelSwitcherTrigger
                  models={models}
                  activeModelId={activeModelId}
                  onSelectModel={onSelectModel}
                  onOpenModelsSettings={onOpenModelsSettings}
                  disabled={disabled}
                  variant="composer"
                />
                <ComposerSendButton
                  canSend={canSend}
                  disabled={disabled}
                  isStreaming={isStreaming}
                  onSend={() => onSubmit(value)}
                  onStop={onStop}
                />
              </div>
            </>
          ) : (
            <ComposerSendButton
              canSend={canSend}
              disabled={disabled}
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

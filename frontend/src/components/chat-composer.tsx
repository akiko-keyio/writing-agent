import {
  forwardRef,
  useCallback,
  useRef,
  useState,
  type KeyboardEvent,
} from "react"

import {
  ArrowDown01Icon,
  ArrowUp02Icon,
  StopIcon,
} from "@hugeicons/core-free-icons"

import { ChromePanelScroll } from "@/components/chrome-scroll-area"
import { ModelSwitcherTrigger } from "@/components/model-switcher-trigger"
import { Textarea } from "@/components/nexus-ui/textarea"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import {
  Menu,
  MenuGroup,
  MenuItem,
  MenuPopup,
  MenuTrigger,
} from "@/components/ui/menu"
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

type ComposerModeId = "ask" | "agent" | "edit"

type ComposerFooterVariant = "full" | "send-only"

const COMPOSER_MODES: {
  id: ComposerModeId
  label: string
  hint: string
}[] = [
  { id: "ask", label: "Ask", hint: "Answer only, no file edits" },
  { id: "agent", label: "Agent", hint: "Use tools to read and write the project" },
  { id: "edit", label: "Edit", hint: "Focus on editing the open draft" },
]

function ComposerMenuTwoLineEntry({
  title,
  subtitle,
}: {
  title: string
  subtitle: string
}) {
  return (
    <span className={cn(shell.projectMenuEntry, "w-full")}>
      <span className={shell.projectMenuLine}>{title}</span>
      <span className={shell.projectMenuLineMuted}>{subtitle}</span>
    </span>
  )
}

function ComposerModeMenu({
  mode,
  onMode,
  disabled,
}: {
  mode: ComposerModeId
  onMode: (mode: ComposerModeId) => void
  disabled?: boolean
}) {
  const active = COMPOSER_MODES.find((m) => m.id === mode) ?? COMPOSER_MODES[0]
  return (
    <Menu>
      <MenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            className={shell.composerMenuTrigger}
          />
        }
      >
        <span className="min-w-0 truncate">{active.label}</span>
        <HugeiconsIcon icon={ArrowDown01Icon} aria-hidden="true" className="size-3.5 shrink-0 opacity-70" />
      </MenuTrigger>
      <MenuPopup align="start" className={shell.projectMenuPopup}>
        <MenuGroup>
          {COMPOSER_MODES.map((m) => {
            const isActive = m.id === active.id
            return (
              <MenuItem
                key={m.id}
                className={cn(
                  shell.projectMenuItem,
                  isActive && "bg-accent text-accent-foreground",
                )}
                onClick={() => onMode(m.id)}
              >
                <ComposerMenuTwoLineEntry title={m.label} subtitle={m.hint} />
              </MenuItem>
            )
          })}
        </MenuGroup>
      </MenuPopup>
    </Menu>
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
    const [mode, setMode] = useState<ComposerModeId>("ask")
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
              <ComposerModeMenu mode={mode} onMode={setMode} disabled={inputDisabled} />
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

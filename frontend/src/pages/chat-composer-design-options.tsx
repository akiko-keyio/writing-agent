import { useState } from "react"

import {
  Add01Icon,
  ArrowDown01Icon,
  ArrowUp02Icon,
  Route03Icon,
} from "@hugeicons/core-free-icons"

import { Textarea } from "@/components/nexus-ui/textarea"
import {
  Card,
  CardFrame,
  CardFrameFooter,
  CardPanel,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import {
  Menu,
  MenuGroup,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/menu"
import {
  Tooltip,
  TooltipPopup,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { chatBoxLaneClass } from "@/lib/chat-typography"
import { HugeiconsIcon } from "@/lib/icons"
import { shell } from "@/lib/shell-chrome"
import { gap, p, row, stack } from "@/lib/spacing"
import { cn } from "@/lib/utils"

type ModelItem = { id: string; label: string; meta: string }
type ModeId = "ask" | "agent" | "edit"

/** theme `--radius-*`；仅列出可与 rounded-lg 控件的同心组合 */
type ShellRadius = "xl" | "2xl" | "3xl"

const MODELS: ModelItem[] = [
  { id: "mimo", label: "mimo-v2.5", meta: "token-plan-cn.xiaomimimo.com" },
  { id: "unnamed", label: "Unnamed model", meta: "No base URL" },
]

const MODES: { id: ModeId; label: string; hint: string }[] = [
  { id: "ask", label: "Ask", hint: "只问答，不改文件" },
  { id: "agent", label: "Agent", hint: "可调用工具读写项目" },
  { id: "edit", label: "Edit", hint: "聚焦当前文稿修改" },
]

/**
 * 同心条件（贴角控件 = Button rounded-lg / 10px）：
 *   padding = R_shell − 10px
 * 且外壳 / 内层 Card / prompt inset 同一 radius token。
 */
const FRAME_RADIUS_CLASS: Record<ShellRadius, string> = {
  xl: cn(
    "rounded-xl before:rounded-[calc(var(--radius-xl)-1px)]",
    "*:data-[slot=card]:[clip-path:inset(var(--clip-top)_1px_var(--clip-bottom)_1px_round_calc(var(--radius-xl)-1px))]",
    "*:not-first:data-[slot=card]:rounded-t-xl *:not-last:data-[slot=card]:rounded-b-xl",
    "*:not-first:data-[slot=card]:before:rounded-t-[calc(var(--radius-xl)-1px)]",
    "*:not-last:data-[slot=card]:before:rounded-b-[calc(var(--radius-xl)-1px)]",
  ),
  "2xl": "",
  "3xl": cn(
    "rounded-3xl before:rounded-[calc(var(--radius-3xl)-1px)]",
    "*:data-[slot=card]:[clip-path:inset(var(--clip-top)_1px_var(--clip-bottom)_1px_round_calc(var(--radius-3xl)-1px))]",
    "*:not-first:data-[slot=card]:rounded-t-3xl *:not-last:data-[slot=card]:rounded-b-3xl",
    "*:not-first:data-[slot=card]:before:rounded-t-[calc(var(--radius-3xl)-1px)]",
    "*:not-last:data-[slot=card]:before:rounded-b-[calc(var(--radius-3xl)-1px)]",
  ),
}

const CARD_RADIUS_CLASS: Record<ShellRadius, string> = {
  xl: "rounded-xl before:rounded-[calc(var(--radius-xl)-1px)]",
  "2xl": "",
  "3xl": "rounded-3xl before:rounded-[calc(var(--radius-3xl)-1px)]",
}

const PROMPT_INSET_X: Record<ShellRadius, string> = {
  xl: "px-[var(--radius-xl)]",
  "2xl": shell.chatPromptInsetX,
  "3xl": "px-[var(--radius-3xl)]",
}

type ConcentricVariant = {
  id: string
  label: string
  note: string
  shellRadius: ShellRadius
  footerPad: string
}

const VARIANTS: ConcentricVariant[] = [
  {
    id: "2xl-p2",
    label: "shell.chatRadius",
    note: "2xl + p[2] · 18−8=10 · 生产 Chat 默认",
    shellRadius: "2xl",
    footerPad: p[2].all,
  },
  {
    id: "xl-p1",
    label: "rounded-xl",
    note: "xl + p[1] · 14−4=10 · 同心",
    shellRadius: "xl",
    footerPad: p[1].all,
  },
  {
    id: "3xl-p3",
    label: "rounded-3xl",
    note: "3xl + p[3] · 22−12=10 · 同心",
    shellRadius: "3xl",
    footerPad: p[3].all,
  },
]

function composerMenuTriggerClass() {
  return cn("max-w-[min(100%,14rem)] min-w-0 shrink font-normal")
}

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

function ComposerInputPanel({ shellRadius }: { shellRadius: ShellRadius }) {
  return (
    <Card className={CARD_RADIUS_CLASS[shellRadius]}>
      <CardPanel
        className={cn(
          p[4].top,
          PROMPT_INSET_X[shellRadius],
          p[2].bottom,
        )}
      >
        <Textarea
          aria-label="Message input"
          placeholder="Ask about your writing..."
          defaultValue="Improve the hook in paragraph 1…"
          className={cn(
            "min-h-14 w-full resize-none border-0 bg-transparent text-sm leading-5 shadow-none outline-none focus-visible:ring-0",
            p[0].all,
          )}
        />
      </CardPanel>
    </Card>
  )
}

function ModelMenu({
  modelId,
  onModelId,
}: {
  modelId: string
  onModelId: (id: string) => void
}) {
  const active = MODELS.find((m) => m.id === modelId) ?? MODELS[0]
  return (
    <Menu>
      <MenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={composerMenuTriggerClass()}
          />
        }
      >
        <span className="min-w-0 truncate">{active.label}</span>
        <HugeiconsIcon icon={ArrowDown01Icon} aria-hidden="true" className="size-3.5 shrink-0 opacity-70" />
      </MenuTrigger>
      <MenuPopup align="start" className={shell.projectMenuPopup}>
        <MenuGroup>
          {MODELS.map((model) => {
            const isActive = model.id === active.id
            return (
              <MenuItem
                key={model.id}
                className={cn(
                  shell.projectMenuItem,
                  isActive && "bg-accent text-accent-foreground",
                )}
                onClick={() => onModelId(model.id)}
              >
                <ComposerMenuTwoLineEntry
                  title={model.label}
                  subtitle={model.meta}
                />
              </MenuItem>
            )
          })}
        </MenuGroup>
        <MenuSeparator />
        <MenuGroup>
          <MenuItem
            className={shell.menuItem}
            onClick={() => {
              window.location.href = "/settings-inspector-mockup"
            }}
          >
            <HugeiconsIcon icon={Add01Icon} aria-hidden="true" />
            Add Model
          </MenuItem>
        </MenuGroup>
      </MenuPopup>
    </Menu>
  )
}

function ModeMenu({
  mode,
  onMode,
}: {
  mode: ModeId
  onMode: (mode: ModeId) => void
}) {
  const active = MODES.find((m) => m.id === mode) ?? MODES[0]
  return (
    <Menu>
      <MenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={composerMenuTriggerClass()}
          />
        }
      >
        <HugeiconsIcon icon={Route03Icon} aria-hidden="true" className="size-3.5 shrink-0 opacity-70" />
        <span className="min-w-0 truncate">{active.label}</span>
        <HugeiconsIcon icon={ArrowDown01Icon} aria-hidden="true" className="size-3.5 shrink-0 opacity-70" />
      </MenuTrigger>
      <MenuPopup align="start" className={shell.projectMenuPopup}>
        <MenuGroup>
          {MODES.map((m) => {
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

function SendButton() {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            size="icon-sm"
            variant="default"
            className={cn(
              shell.chatChipRadius,
              "before:rounded-[calc(var(--radius-lg)-1px)]",
            )}
            aria-label="Send message"
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

function ComposerBlock({ variant }: { variant: ConcentricVariant }) {
  const [modelId, setModelId] = useState(MODELS[0].id)
  const [mode, setMode] = useState<ModeId>("ask")

  return (
    <CardFrame
      className={cn("w-full min-w-0", FRAME_RADIUS_CLASS[variant.shellRadius])}
    >
      <ComposerInputPanel shellRadius={variant.shellRadius} />
      <CardFrameFooter
        className={cn(row.sm, "justify-between", variant.footerPad)}
      >
        <ModeMenu mode={mode} onMode={setMode} />
        <div className={cn(row.sm, "shrink-0")}>
          <ModelMenu modelId={modelId} onModelId={setModelId} />
          <SendButton />
        </div>
      </CardFrameFooter>
    </CardFrame>
  )
}

export function ChatComposerDesignOptionsPage() {
  return (
    <div className={cn("min-h-svh bg-background", stack.xl, p[6].bottom)}>
      <header className={cn("border-b border-border", p[6].x, p[6].y, stack.sm)}>
        <h1 className="font-semibold text-xl">Chat Composer — 同心 + 规范</h1>
        <p className="max-w-3xl text-muted-foreground text-sm">
          布局固定：[模式] 左 · [模型][发送] 右。仅展示同时满足「项目 token」与「外壳/内层/贴角 Button
          同心圆角」的组合；控件为 coss Button ghost sm + icon-sm，发送{" "}
          <code className="font-mono text-xs">shell.chatChipRadius</code>。
        </p>
      </header>

      <div className={cn(p[6].x, stack.lg)}>
        <div className={chatBoxLaneClass}>
          <div className={cn("grid min-w-0 grid-cols-1", gap.lg, "lg:grid-cols-3")}>
            {VARIANTS.map((variant) => (
              <figure key={variant.id} className={cn("min-w-0", stack.sm)}>
                <figcaption className={stack.xs}>
                  <span className="font-medium text-sm">{variant.label}</span>
                  <span className="text-muted-foreground text-xs">{variant.note}</span>
                </figcaption>
                <ComposerBlock variant={variant} />
              </figure>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

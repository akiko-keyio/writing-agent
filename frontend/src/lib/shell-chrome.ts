import { cn } from "@/lib/utils"

/**
 * 应用壳层布局 token（Explorer / Chat / 文档浮动区）。
 *
 * - 间距：只用 `spacing` / `pad` / `shell.*`；禁止在组件里手写 `px-1.5` 等。
 * - 字体：壳层统一 `text-xs` + `--font-sans`；主/次用 `text` / `textMuted`，禁止 `font-mono`。
 * - `ui/*` primitive：禁止改 variant/size；壳层只用文档列出的 prop + `className`。
 * - Explorer 标签：coss `Tabs` + `TabsList variant="underline"`（见 p-tabs-2）。
 */

// ──────── Spacing ────────

export const spacing = {
  tight: "gap-px",
  xs: "gap-0.5",
  sm: "gap-1",
} as const

export const pad = {
  xs: { all: "p-1", x: "px-1", y: "py-1", top: "pt-1", bottom: "pb-1" },
  sm: { all: "p-1.5", x: "px-1.5", y: "py-1.5", top: "pt-1.5", bottom: "pb-1.5" },
  md: { all: "p-2", x: "px-2", y: "py-2", top: "pt-2", bottom: "pb-2" },
} as const

// ──────── Shell ────────

export const shell = {
  text: "text-xs leading-4 text-foreground",
  textMuted: "text-xs leading-4 text-muted-foreground",
  textTruncate: "min-w-0 truncate text-xs leading-4 text-muted-foreground",
  textActive: "text-xs leading-4 text-foreground",

  /** Explorer / Chat 共用：对称 py-1 + items-center，28px 控件顶边距一致 */
  panelHeader: cn(
    "flex min-h-9 shrink-0 items-center border-b border-border/50",
    pad.sm.x,
    pad.xs.y,
    spacing.xs,
  ),
  panelHeaderIcon: "shrink-0",

  /** 菜单项：统一 text-xs */
  menuItem: "text-xs sm:text-xs",

  /** 侧栏列表（Projects / Files / Outline）：行间距 */
  listMenu: "gap-1",

  /** Projects 双行列表行 */
  workspaceRow: cn(
    "h-auto min-h-10 items-start py-1.5 font-normal data-[active=true]:font-normal",
    spacing.xs,
  ),

  floatingBar: cn(
    "flex shrink-0 items-center",
    pad.xs.y,
    pad.sm.x,
    spacing.xs,
  ),

  panelBody: cn(pad.sm.x, pad.sm.y),
  panelBodyWithHeader: cn(pad.sm.x, pad.xs.top, pad.sm.bottom),

  /** coss Tabs（p-tabs-2）；与 Chat 同高同居中；indicator 下沉 pb-1 贴 border-b */
  explorerTabs: "min-w-0 flex-1 gap-0",
  explorerTabsList: cn(
    "flex h-auto w-full items-center justify-start gap-0.5 bg-transparent p-0 py-0 shadow-none",
    "data-[orientation=horizontal]:py-0",
    "[&_[data-slot=tab-indicator]]:bg-foreground",
    "[&_[data-slot=tab-indicator]]:!-bottom-1",
    "[&_[data-slot=tab-indicator]]:!translate-y-0",
    "[&_[data-slot=tab-indicator]]:data-[orientation=horizontal]:!translate-y-0",
    spacing.xs,
  ),
  /** 与 `Button` `icon-sm`（size-8 / sm:size-7）同高 */
  explorerTabsTab:
    "h-8 grow-0 shrink-0 px-[calc(--spacing(2)-1px)] text-xs sm:h-7 sm:text-xs",

  navIndentBase: 8,
  navIndentStep: 12,
} as const

export function shellNavIndent(level: number): number {
  return shell.navIndentBase + (level - 1) * shell.navIndentStep
}

export function shellSidebarRowClass({
  active,
  className,
}: {
  active?: boolean
  className?: string
}): string {
  return cn(
    active &&
      "data-[active=true]:bg-muted/60 data-[active=true]:font-normal data-[active=true]:text-foreground",
    className,
  )
}

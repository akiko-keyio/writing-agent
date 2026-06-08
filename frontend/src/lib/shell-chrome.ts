import type { CSSProperties } from "react"

import {
  CHROME_ROW_HOVER_FADE_EXTRA_PX,
  explorerTreeRowFolderHoverFadeOverlayWidthPx,
  explorerTreeRowHoverFadeOverlayWidthPx,
  explorerTreeRowPadEndPx,
} from "@/lib/explorer-tree-row-density"
import { gap, p, row, stack, treeIndent } from "@/lib/spacing"
import { cn } from "@/lib/utils"

/**
 * 应用壳层布局 token（App 顶栏 / Explorer / Chat / 文档浮动区）。
 *
 * - 间距：只用 `@/lib/spacing`。
 * - 颜色 / hover：只用 coss `ui/*` 的 variant、size、`data-pressed` / `data-active`；壳层禁止写 `hover:bg-*`。
 * - Explorer 表面：`bg-sidebar`；内容表面：`bg-background`。
 */

// ──────── Shell ────────

/** Explorer 列 / 面板头 — 用 bg-sidebar 让侧栏与内容区拉开色差 */
const explorerSurface = "bg-sidebar text-sidebar-foreground"

/** 文档标签关闭钮 icon-xs sm:size-6 */
const DOCUMENT_TAB_CLOSE_BUTTON_PX = 24
/** 关闭钮左缘距标签 chip 右缘：end-1 + 钮宽 */
const DOCUMENT_TAB_CLOSE_RESERVE_END_PX = 4 + DOCUMENT_TAB_CLOSE_BUTTON_PX
/** 文档标签 overlay = 关闭钮区(28) + 渐隐(20) = 48px */
const DOCUMENT_TAB_HOVER_FADE_OVERLAY_PX =
  DOCUMENT_TAB_CLOSE_RESERVE_END_PX + CHROME_ROW_HOVER_FADE_EXTRA_PX

function chromeRowHoverFadeOverlay(
  widthPx: number,
  visibleOnHover: string,
  extra?: string,
  bgClass = "chrome-row-hover-fade-overlay-bg"
): { className: string; style: CSSProperties } {
  return {
    className: cn(
      "pointer-events-none absolute inset-y-0 end-0 z-[1] opacity-0 transition-opacity",
      bgClass,
      visibleOnHover,
      extra
    ),
    style: { width: widthPx },
  }
}

const explorerTreeRowHoverFadeSidebarBg = cn(
  "chrome-row-hover-fade-overlay-bg",
  "chrome-row-hover-fade-overlay-bg--sidebar"
)
const explorerTreeRowHoverFadeProps = chromeRowHoverFadeOverlay(
  explorerTreeRowHoverFadeOverlayWidthPx(),
  "group-hover/menu-item:opacity-100",
  undefined,
  explorerTreeRowHoverFadeSidebarBg
)
const explorerTreeFolderRowHoverFadeProps = chromeRowHoverFadeOverlay(
  explorerTreeRowFolderHoverFadeOverlayWidthPx(),
  "group-hover/menu-item:opacity-100",
  undefined,
  explorerTreeRowHoverFadeSidebarBg
)
const explorerSectionHeaderHoverFadeProps = chromeRowHoverFadeOverlay(
  explorerTreeRowFolderHoverFadeOverlayWidthPx(),
  "group-hover/header:opacity-100",
  undefined,
  explorerTreeRowHoverFadeSidebarBg
)
const documentTabHoverFadeProps = chromeRowHoverFadeOverlay(
  DOCUMENT_TAB_HOVER_FADE_OVERLAY_PX,
  "group-hover/tab:opacity-100",
  "rounded-e-lg"
)

/** icon-sm 右缘 inset 4px：与顶栏 icon-lg 右内边距对齐时，两档图标中心共线 */
const explorerRowActionEnd = "end-1"

const sidebarMenuItemHoverActions = cn(
  "pointer-events-none absolute inset-y-0 z-[2] flex items-center opacity-0 transition-opacity",
  explorerRowActionEnd,
  gap.hairline,
  "group-hover/menu-item:pointer-events-auto group-hover/menu-item:opacity-100",
  "has-[[data-popup-open]]:pointer-events-auto has-[[data-popup-open]]:opacity-100"
)

const explorerSectionHeaderActions = cn(
  "pointer-events-none absolute inset-y-0 z-[2] flex items-center opacity-0 transition-opacity",
  explorerRowActionEnd,
  gap.hairline,
  "group-hover/header:pointer-events-auto group-hover/header:opacity-100"
)

const documentTabCloseWrap = cn(
  "pointer-events-none absolute end-1 top-1/2 z-[2] -translate-y-1/2 opacity-0 transition-opacity",
  "group-hover/tab:pointer-events-auto group-hover/tab:opacity-100"
)

/** 文档标签 / 文件树行 hover 底色（对齐 SidebarMenuButton sidebar-accent） */
const chromeRowHoverSurface = cn(
  "transition-colors",
  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
  "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-sidebar-ring"
)
const chromeRowHoverSurfaceActive =
  "bg-sidebar-accent text-sidebar-accent-foreground [&_svg]:text-sidebar-accent-foreground"

export const shell = {
  text: "text-sm leading-5 text-foreground",
  textMuted: "text-sm leading-5 text-muted-foreground",
  textTruncate: "min-w-0 truncate text-sm leading-5 text-muted-foreground",
  textActive: "text-sm leading-5 text-foreground",

  /** 顶栏/菜单内 Button：压过 primitive 的 font-medium + text-base */
  textButton: "font-normal text-sm sm:text-sm",

  /** 侧栏行：略增高以配合 text-sm */
  menuRow: "h-8 text-sm font-normal sm:text-sm",

  explorerSurface,

  /** 单行顶栏：grid 三列；底色由各列 `explorerSurface` / `bg-background` 承担 */
  workbenchTopBar: "grid h-13 min-w-0 w-full shrink-0 overflow-hidden",

  topBarColExplorer: cn(
    "flex h-13 min-w-0 items-center overflow-hidden",
    explorerSurface,
    p[2].x,
    gap.sm
  ),
  topBarColEditor: cn(
    "flex h-13 min-w-0 items-center overflow-hidden bg-background",
    p[2].x,
    gap.sm
  ),
  topBarColChat: cn(
    "flex h-13 min-w-0 items-center overflow-hidden bg-background",
    p[2].x,
    gap.sm
  ),

  topBarProjectButton: cn(
    "max-w-[min(100%,12rem)] min-w-0 shrink font-normal"
  ),
  topBarProjectButtonDivider: cn("me-1 border-e border-border", p[2].end),

  topBarExplorerIconRail: cn("flex min-w-0 flex-1 items-center", gap.sm),
  topBarExplorerEndRail: "ms-auto flex shrink-0 items-center",
  topBarEditorEndRail: "ms-auto flex shrink-0 items-center",
  topBarChatEndActions: cn("ms-auto flex shrink-0 items-center", gap.sm),

  tabStripScroll: cn(
    "chrome-tab-scroll flex h-13 min-h-0 min-w-0 flex-1 flex-nowrap items-center overflow-x-auto overflow-y-hidden",
    gap.sm
  ),

  workbenchGrid: "grid min-h-0 min-w-0 w-full flex-1 overflow-hidden",

  panelHeader: cn(
    "flex min-h-13 shrink-0 items-center border-b border-border",
    explorerSurface,
    p[2].x,
    gap.sm
  ),
  panelHeaderIcon: "shrink-0",

  explorerToggleRow: cn("flex min-w-0 shrink-0 items-center", gap.sm),
  explorerToggleGroup: cn("min-w-0 shrink-0", gap.sm),

  explorerIconRail: cn(
    "flex w-full min-w-0 shrink-0 items-center border-b border-border",
    explorerSurface,
    p[2].x,
    p[1.5].y,
    gap.sm
  ),

  /** 工作区名行 */
  explorerFileSectionHeader: cn(
    "group/header relative flex w-full min-w-0 shrink-0 items-center overflow-hidden rounded-lg",
    "text-xs font-medium leading-5 tracking-wide text-muted-foreground uppercase",
    "transition-colors",
    "group-hover/header:bg-sidebar-accent group-hover/header:text-sidebar-accent-foreground",
    "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-sidebar-ring"
  ),
  explorerFileSectionLabel: "relative min-w-0 flex-1 truncate",
  explorerSectionHeaderActions,
  sidebarMenuItemHoverActions,

  menuItem: "text-sm font-normal sm:text-sm",

  projectMenuItem: cn("h-auto min-h-0 sm:min-h-0", p[1].y, "sm:py-1"),
  /** 两行条目：图标与首行标题同一行；副标题缩进 = size-4 图标 + gap.sm */
  projectMenuEntry: cn(stack.hairline, "min-w-0 flex-1 text-left"),
  projectMenuTitleRow: cn(
    row.sm,
    "min-w-0",
    "[&_svg:not([class*='opacity-'])]:opacity-80 [&_svg]:pointer-events-none"
  ),
  projectMenuLine: "min-w-0 flex-1 truncate text-foreground",
  projectMenuLineMuted: "truncate text-muted-foreground text-xs",
  projectMenuSubtitle: cn(
    "truncate text-muted-foreground text-xs",
    p[6].start
  ),

  /** 静态行：布局对齐 MenuItem；交互色由 MenuItem / Button 默认承担 */
  projectMenuRow: cn(
    "flex min-h-8 w-full cursor-pointer select-none items-center rounded-sm text-sm text-foreground outline-none sm:min-h-7",
    gap.sm,
    p[2].x,
    p[1].y,
    "[&>svg:not([class*='opacity-'])]:opacity-80 [&>svg:not([class*='size-'])]:size-4 [&>svg]:pointer-events-none [&>svg]:shrink-0"
  ),
  projectPanelSectionLabel: cn(
    p[2].x,
    p[1.5].y,
    "text-xs font-medium text-muted-foreground"
  ),
  projectPanelList: cn("flex min-w-0 flex-col", p[1.5].all),

  listMenu: cn("min-w-0 max-w-full flex flex-col", gap.sm),

  explorerFileTreeMenu: cn("w-full max-w-full min-w-0", gap.none),
  explorerFileTreeCollapsible: "group/collapsible min-w-0 max-w-full",
  explorerFileTreeDepthGapPx: treeIndent.depthStepPx,
  explorerFileTreeRowPadXPx: treeIndent.rowPadPx,
  explorerFileTreeRow: cn(
    "h-7 w-full max-w-full min-w-0 items-center justify-start overflow-hidden text-left sm:h-7",
    gap.sm
  ),
  explorerFileTreeLabel:
    "min-w-0 flex-1 truncate text-start text-sm leading-5 font-normal",
  explorerFileTreeFolderLabel:
    "min-w-0 flex-1 truncate text-start text-sm leading-5 font-normal",
  explorerTreeRowHoverFadeProps,
  explorerTreeFolderRowHoverFadeProps,
  explorerSectionHeaderHoverFadeProps,
  documentTabHoverFadeProps,

  projectMenuPopup: "min-w-72 max-w-[min(100vw-2rem,20rem)]",

  floatingBar: cn("flex shrink-0 items-center", p[1.5].y, p[2].x, gap.sm),

  panelBody: cn(p[2].x, p[2].y),
  panelBodyWithHeader: cn(p[2].x, p[1.5].top, p[2].bottom),

  navIndentBase: 10,
  navIndentStep: 14,

  outlineTabs: cn("w-full min-w-0 flex-row", gap.none),
  outlineTabsRail: "w-full min-w-0 shrink-0 border-s border-border",
  outlineTabsList: cn("w-full min-w-0 py-0.5", gap.none),
  outlineTab: cn(
    "h-auto min-h-7 w-full min-w-0 max-w-full justify-start rounded-none pe-2 ps-0 font-normal leading-5 sm:h-auto sm:min-h-7 sm:text-sm text-muted-foreground data-active:font-normal data-active:text-foreground",
    p[1.5].y
  ),

  documentTabBar: cn(
    "h-10 min-h-10 items-center",
    gap.hairline,
    p[2].x,
    p[1].y
  ),
  /** 标签布局壳；hover 底色与 Explorer 行一致 */
  documentTab: cn(
    "group/tab relative isolate inline-flex h-8 min-w-0 max-w-[12rem] shrink items-center overflow-hidden rounded-lg",
    chromeRowHoverSurface,
    p[0].all
  ),
  documentTabActive: chromeRowHoverSurfaceActive,
  /** Tab 主内容区（flex-1），z-0 确保 overlay(z-1) 盖住文字 */
  documentTabMain:
    "relative z-0 flex min-w-0 flex-1 items-center overflow-hidden",
  documentTabButton: cn(
    "relative z-0 min-w-0 max-w-full flex-1 shrink overflow-hidden whitespace-nowrap",
    "justify-start font-normal text-sm sm:text-sm",
    "border-0 bg-transparent shadow-none",
    "hover:bg-transparent hover:text-inherit",
    "data-pressed:bg-transparent data-pressed:text-inherit",
    "focus-visible:ring-0 focus-visible:ring-offset-0"
  ),
  documentTabLabel: "min-w-0 flex-1",
  documentTabClose: documentTabCloseWrap,
  documentTabDirty:
    "absolute -end-0.5 -top-0.5 size-1.5 rounded-full bg-primary",

  chatTabBar: cn(
    "flex h-10 max-h-10 min-h-10 w-full min-w-0 shrink-0 flex-row items-center overflow-hidden"
  ),

  /** @deprecated 使用 tabStripScroll */
  chatTabScroll: cn(
    "chrome-tab-scroll flex h-10 min-h-0 min-w-0 flex-1 flex-nowrap items-center overflow-x-auto overflow-y-hidden",
    gap.hairline,
    p[2].x,
    p[1].y
  ),

  contentWindow:
    "chrome-editor-surface flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
  documentOutlineAside:
    "hidden min-h-0 w-60 shrink-0 border-e border-border bg-background 2xl:flex",

  chatRadius: "rounded-3xl",
  /** Card inner text — 16px horizontal; py-3 so leading-5 + 2×12 = 44 = 2×radius-3xl (matches user bubble). */
  chatBoxTextInset: cn("px-[var(--content-inset-box)]", p[3].y),
  chatPromptInsetX: "px-[var(--radius-2xl)]",
  /** Send row — 12px from bottom/right corner; 4px above actions. */
  chatPromptActionsInset: cn(p[1].top, p[3].bottom, p[3].end),
  /** Primary send — circle only (docs/ui.md 例外). */
  chatSendButton: "rounded-full",
  /** Composer footer — Ask / model switcher pill triggers */
  composerMenuTrigger: cn(
    "max-w-[min(100%,14rem)] min-w-0 shrink rounded-full font-normal before:rounded-full",
  ),
  chatChipRadius: "rounded-lg",
  /** User bubble + PromptInput — Card surface (bg-card + shadow-xs/5 + inner highlight) */
  chatComposerChrome: cn(
    "w-full max-w-full min-w-0 border border-input bg-card not-dark:bg-clip-padding",
    "rounded-3xl shadow-xs/5",
    "relative before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-3xl)-1px)] before:shadow-[0_1px_--theme(--color-black/4%)] dark:before:shadow-[0_-1px_--theme(--color-white/6%)]"
  ),
  /** leading-5 (20px) + 2×py-3 (24px) = 2×radius-3xl (44px) for single-line bubbles */
  chatUserBubble: cn(
    "w-full max-w-full min-w-0 border border-input bg-card not-dark:bg-clip-padding text-sm leading-5",
    "rounded-3xl shadow-xs/5",
    "relative before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-3xl)-1px)] before:shadow-[0_1px_--theme(--color-black/4%)] dark:before:shadow-[0_-1px_--theme(--color-white/6%)]",
    "px-[var(--content-inset-box)]",
    p[3].y,
  ),
  /** Assistant copy — right edge aligns with prose lane (`--content-inset-text`); show on message hover. */
  chatMessageCopyAction: cn(
    "self-end shrink-0 opacity-0 transition-opacity",
    "group-hover/message-content:opacity-100",
    "focus-visible:opacity-100",
  ),
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
    shell.menuRow,
    "max-w-full min-w-0",
    active && "data-[active=true]:font-normal",
    className
  )
}

export function shellExplorerTreeRowDepthStyle(
  depth: number,
  { reserveRowAction = false }: { reserveRowAction?: boolean } = {}
): CSSProperties {
  const padStart =
    shell.explorerFileTreeRowPadXPx +
    depth * shell.explorerFileTreeDepthGapPx
  return {
    paddingLeft: padStart,
    paddingRight: explorerTreeRowPadEndPx(reserveRowAction),
    paddingTop: 0,
    paddingBottom: 0,
  }
}

/**
 * 置于 `shell.sidebarMenuItemHoverActions` 内时，取消 SidebarMenuAction 默认 absolute，
 * 由容器负责 end-1 + 垂直居中。
 */
export function shellExplorerTreeRowMoreActionClass(
  className?: string
): string {
  return cn(
    "static top-auto right-auto shrink-0 translate-y-0",
    className
  )
}

export function shellExplorerTreeRowButtonClass({
  className,
  rowHeightClass,
}: {
  className?: string
  /** 由 explorerTreeRowHeightClass(density) 传入；默认 compact 28px */
  rowHeightClass?: string
} = {}): string {
  return cn(
    "relative z-0 w-full max-w-full min-w-0 items-center justify-start overflow-hidden text-left",
    gap.sm,
    rowHeightClass ?? "h-7 sm:h-7",
    "!py-0",
    "text-sm font-normal leading-5 sm:text-sm data-[active=true]:font-normal",
    "[&>span:last-child]:truncate",
    "group-hover/menu-item:bg-sidebar-item-hover group-hover/menu-item:text-sidebar-accent-foreground",
    "group-hover/menu-item:[&_svg]:text-sidebar-accent-foreground",
    className
  )
}

/** @deprecated 使用 shellExplorerTreeRowButtonClass */
export function shellExplorerTreeRowClass({
  active,
  className,
}: {
  active?: boolean
  className?: string
}): string {
  return shellExplorerTreeRowButtonClass({ className })
}

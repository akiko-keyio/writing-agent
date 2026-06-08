import type { CSSProperties } from "react"

import {
  EXPLORER_TREE_ROW_ACTION_INSET_END_PX,
  EXPLORER_TREE_ROW_ACTION_WIDTH_PX,
  EXPLORER_TREE_ROW_ICON_PX,
} from "@/lib/explorer-tree-row-density"
import { treeIndent } from "@/lib/spacing"

/** Pierre host：行 hover 底 — 与 shell Toggle / 侧栏行一致 */
const ROW_HOVER_BG =
  "color-mix(in srgb, var(--foreground) 4%, var(--sidebar))"

/** Pierre host：选中底 — 比 hover 更深（input 64%） */
const ROW_SELECTED_BG =
  "color-mix(in srgb, var(--input) 64%, var(--sidebar))"

const ROW_GAP_PX = 8

/**
 * Pierre 行尾 padding（action lane 20px 之外，仅 end-1 对齐 ⋯ trigger）。
 */
const PIERRE_ROW_PADDING_END_PX = EXPLORER_TREE_ROW_ACTION_INSET_END_PX

/**
 * Pierre FileTree host 样式 — 仅通过官方 theme CSS 变量对齐 shell。
 * 行 hover/选中/truncate 渐隐由 Pierre 原生机制 + 上述变量驱动。
 */
export function buildPierreTreeShellStyle(
  containerHeightPx: number,
  rowHeightPx: number,
): CSSProperties {
  return {
    display: "block",
    width: "100%",
    minWidth: 0,
    maxWidth: "100%",
    height: `${containerHeightPx}px`,
    boxSizing: "border-box",
    backgroundColor: "transparent",

    "--trees-item-height": `${rowHeightPx}px`,
    "--trees-item-row-gap-override": `${ROW_GAP_PX}px`,
    /** 缩进由 aria-level unsafeCss 承担；行尾 action lane 单独占位 */
    "--trees-item-padding-x-override": "0px",
    "--trees-item-margin-x-override": "0px",
    /** 默认 16px 会让行宽不满容器 */
    "--trees-padding-inline-override": "0px",
    "--trees-icon-width-override": `${EXPLORER_TREE_ROW_ICON_PX}px`,
    "--trees-action-lane-width-override": `${EXPLORER_TREE_ROW_ACTION_WIDTH_PX}px`,
    "--trees-context-menu-trigger-inline-offset": `${EXPLORER_TREE_ROW_ACTION_INSET_END_PX}px`,
    "--trees-font-size-override": "0.875rem",
    "--trees-font-family-override": "var(--font-sans)",
    "--trees-border-radius-override": "var(--radius-lg)",

    "--trees-theme-list-hover-bg": ROW_HOVER_BG,
    "--trees-theme-list-active-selection-bg": ROW_SELECTED_BG,
    "--trees-selected-bg-override": ROW_SELECTED_BG,
    "--trees-selected-fg-override": "var(--sidebar-accent-foreground)",

    "--trees-fg-override": "var(--foreground)",
    /** 默认图标段用 fg-muted；对齐 COSS 树，与标签同色 */
    "--trees-fg-muted-override": "var(--foreground)",
    /**
     * 不可为 transparent：Pierre 默认态 truncate marker 用 --trees-bg 遮 overflow；
     * transparent 时非 hover 会叠字，hover 才靠 overlay 恢复。
     */
    "--trees-bg-override": "var(--sidebar)",
    "--trees-border-color-override": "var(--sidebar-border)",
    "--trees-focus-ring-color-override": "var(--sidebar-ring)",
    "--trees-focus-ring-width-override": "2px",
    "--trees-focus-ring-offset-override": "0px",
    /** 选中态仅底色，不要 Pierre 默认 accent 描边 */
    "--trees-selected-focused-border-color-override": "transparent",
    /** Pierre JS 会测量并注入 gutter；inline 覆盖为 0，避免 scroll padding-inline-end 预留 */
    "--trees-scrollbar-gutter-override": "0px",
    "--trees-scrollbar-gutter-measured": "0px",
  } as CSSProperties
}

/** aria-level 缩进：隐藏 Pierre spacing 段，用 padding-inline-start 对齐 COSS 树 */
function buildLevelPaddingRules(): string {
  const { depthStepPx, rowPadPx } = treeIndent
  const rules: string[] = []

  for (let level = 1; level <= 12; level += 1) {
    const padPx = rowPadPx + (level - 1) * depthStepPx
    rules.push(
      `[data-type='item'][aria-level='${level}'] {
        padding-inline-start: ${padPx}px !important;
        padding-inline-end: ${PIERRE_ROW_PADDING_END_PX}px !important;
      }`,
    )
  }

  return rules.join("\n")
}

/**
 * 无法用 host CSS 变量表达的部分：layout、Hugeicons stroke、chevron、content 宽度。
 */
export function buildPierreTreeUnsafeCss(): string {
  return `
  [data-item-section='spacing'],
  [data-item-section='spacing-item'] {
    display: none !important;
  }

  ${buildLevelPaddingRules()}

  [data-type='item'] {
    width: 100% !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
    margin-inline: 0 !important;
    color: var(--foreground) !important;
  }

  [data-item-section='icon'],
  [data-item-section='content'] {
    color: inherit !important;
  }

  /**
   * 启用 context menu 时 Pierre 会渲染空的 decoration 段（flex: 1 1 0）吸收
   * content 与 action 之间的剩余宽度；隐藏它会导致 .md 与 ⋯ 之间出现空白。
   */

  [data-type='item']:hover:not([data-item-selected]),
  [data-type='item'][data-item-context-hover='true']:not([data-item-selected]) {
    color: var(--sidebar-accent-foreground) !important;
  }

  /* 选中 / 鼠标 focus：无描边（COSS 仅底色） */
  [data-type='item'][data-item-selected='true']:not(:focus-visible)::before,
  [data-type='item'][data-item-focused='true']:not(:focus-visible)::before,
  [data-type='item']:focus:not(:focus-visible)::before {
    outline: none !important;
    box-shadow: none !important;
    display: none !important;
  }

  /* 键盘 focus-visible：sidebar-ring inset，对齐 SidebarMenuButton */
  [data-type='item']:focus-visible::before {
    display: block !important;
    outline: none !important;
    box-shadow: inset 0 0 0 2px var(--sidebar-ring) !important;
  }

  [data-type='context-menu-trigger']:focus:not(:focus-visible) {
    outline: none !important;
    box-shadow: none !important;
  }

  [data-type='context-menu-trigger']:focus-visible {
    outline: none !important;
    box-shadow: 0 0 0 2px var(--sidebar-ring) !important;
  }

  :host,
  [data-file-tree-virtualized-scroll='true'],
  [data-file-tree-scrollbar-measure='true'] {
    scrollbar-gutter: auto !important;
  }

  [data-file-tree-virtualized-scroll='true'] {
    padding-inline: 0 !important;
    scrollbar-width: none !important;
    -ms-overflow-style: none !important;
  }

  [data-file-tree-virtualized-scroll='true']::-webkit-scrollbar {
    width: 0 !important;
    height: 0 !important;
    display: none !important;
  }

  [data-file-tree-virtualized-wrapper='true'],
  [data-file-tree-virtualized-root='true'],
  [data-file-tree-virtualized-scroll='true'],
  [data-file-tree-virtualized-list='true'] {
    width: 100% !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
    margin-inline: 0 !important;
    padding-inline: 0 !important;
  }

  [data-item-action-affordance='decorative'] {
    display: none !important;
  }

  [data-item-section='icon'] svg,
  [data-item-section='icon'] path,
  [data-type='context-menu-trigger'] svg,
  [data-type='context-menu-trigger'] path {
    fill: none !important;
    stroke: currentColor;
  }

  [data-item-section='icon'] svg,
  [data-type='context-menu-trigger'] svg {
    width: ${EXPLORER_TREE_ROW_ICON_PX}px;
    height: ${EXPLORER_TREE_ROW_ICON_PX}px;
  }

  [data-type='item'] [data-icon-name='file-tree-icon-chevron'] {
    transform: none !important;
    transition: none !important;
  }

  [data-type='item'][aria-expanded='true'][data-item-type='folder']
    [data-icon-name='file-tree-icon-chevron'] {
    transform: rotate(90deg) !important;
  }
`.trim()
}

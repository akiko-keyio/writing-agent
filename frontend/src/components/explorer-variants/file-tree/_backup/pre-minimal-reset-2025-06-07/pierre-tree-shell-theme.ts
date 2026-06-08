import type { CSSProperties } from "react"

import {
  EXPLORER_TREE_ROW_ACTION_WIDTH_PX,
  EXPLORER_TREE_ROW_ICON_PX,
  explorerTreeRowHeightPx,
  type ExplorerTreeRowDensity,
} from "@/lib/explorer-tree-row-density"
import { treeIndent } from "@/lib/spacing"

/** 与 shell.explorerRowActionEnd（end-1）一致 */
const PIERRE_TREE_ACTION_INSET_END_PX = 4

/** @deprecated 使用 EXPLORER_TREE_ROW_ICON_PX */
export const PIERRE_TREE_ICON_PX = EXPLORER_TREE_ROW_ICON_PX

/** 与 shell.explorerFileTreeRow gap.sm（8px）一致 */
export const PIERRE_TREE_ROW_GAP_PX = 8

/** 与 index.css `--sidebar-item-*` 同式的实色混底（Shadow DOM gradient 须直接引用） */
const PIERRE_TREE_ROW_HOVER_SOLID =
  "color-mix(in srgb, var(--foreground) 4%, var(--sidebar))"
const PIERRE_TREE_ROW_SELECTED_SOLID =
  "color-mix(in srgb, var(--input) 64%, var(--sidebar))"

/** hover：foreground 4%（≈ Toggle hover） */
const PIERRE_TREE_ROW_HOVER_BG = PIERRE_TREE_ROW_HOVER_SOLID
/** 选中：input 64%（≈ Toggle data-pressed） */
const PIERRE_TREE_ROW_SELECTED_BG = PIERRE_TREE_ROW_SELECTED_SOLID

const PIERRE_TREE_MAX_ARIA_LEVEL = 32

/**
 * 缩进契约（勿改乱）：
 * 1. 隐藏 Pierre spacing-item（含半 icon 偏移，≠ COSS）
 * 2. `--trees-item-padding-x-override: 0`，仅用下方 aria-level 规则
 * 3. padding = treeIndent：8 + (aria-level - 1) × 24，对齐 shellExplorerTreeRowDepthStyle
 * 勿恢复 Pierre 原生 spacing-item，勿单独设 item-padding-x 8 而不走 aria-level。
 */
function buildCossAlignedLevelPaddingRules(
  maxLevel = PIERRE_TREE_MAX_ARIA_LEVEL
): string {
  return Array.from({ length: maxLevel }, (_, index) => {
    const level = index + 1
    const depth = level - 1
    const padStart =
      treeIndent.rowPadPx + depth * treeIndent.depthStepPx
    return `[data-type='item'][aria-level='${level}'] {
    padding-inline-start: ${padStart}px !important;
    padding-inline-end: ${treeIndent.rowPadPx}px !important;
  }`
  }).join("\n\n")
}

export function buildPierreTreeUnsafeCss(rowHeightPx: number): string {
  const actionButtonPx = EXPLORER_TREE_ROW_ACTION_WIDTH_PX

  // 布局：wrapper/root/scroll/list 贴满 Sidebar 内容区；scrollbar-gutter 用 auto（见下方 @supports）
  return `
  :host,
  [data-file-tree-virtualized-root='true'] {
    --pierre-tree-row-hover-solid: ${PIERRE_TREE_ROW_HOVER_SOLID} !important;
    --pierre-tree-row-selected-solid: ${PIERRE_TREE_ROW_SELECTED_SOLID} !important;
    --pierre-tree-row-hover-bg: var(--pierre-tree-row-hover-solid) !important;
    --pierre-tree-row-selected-bg: var(--pierre-tree-row-selected-solid) !important;
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

  [data-file-tree-virtualized-scroll='true'],
  [data-file-tree-scrollbar-measure='true'] {
    scrollbar-gutter: auto !important;
  }

  @supports (-moz-appearance: none) {
    [data-file-tree-virtualized-scroll='true'] {
      padding-inline: 0 !important;
    }
  }

  [data-item-section='spacing'],
  [data-item-section='spacing-item'] {
    display: none !important;
  }

  ${buildCossAlignedLevelPaddingRules()}

  [data-type='item'] {
    flex: 0 0 ${rowHeightPx}px !important;
    height: ${rowHeightPx}px !important;
    min-height: ${rowHeightPx}px !important;
    max-height: ${rowHeightPx}px !important;
    line-height: ${rowHeightPx}px !important;
    margin: 0 !important;
    box-sizing: border-box !important;
    width: 100% !important;
    max-width: 100% !important;
    padding-block: 0 !important;
    border-radius: var(--radius-lg) !important;
    color: var(--foreground) !important;
    font-weight: 400 !important;
    position: relative !important;
    background-color: transparent !important;
    background-clip: border-box !important;
    --truncate-marker-background-color: var(--sidebar) !important;
    --truncate-marker-background-overlay-color: transparent !important;
  }

  [data-type='item']:hover:not([data-item-selected]),
  [data-type='item'][data-item-context-hover='true']:not([data-item-selected]) {
    color: var(--sidebar-accent-foreground) !important;
    background-color: var(--pierre-tree-row-hover-bg) !important;
    font-weight: 400 !important;
    --truncate-marker-background-color: var(--pierre-tree-row-hover-bg) !important;
    --truncate-marker-background-overlay-color: var(--pierre-tree-row-hover-bg) !important;
  }

  [data-type='item'][data-item-selected] {
    color: var(--sidebar-accent-foreground) !important;
    background-color: var(--pierre-tree-row-selected-bg) !important;
    font-weight: 500 !important;
    --truncate-marker-background-color: var(--pierre-tree-row-selected-bg) !important;
    --truncate-marker-background-overlay-color: var(--pierre-tree-row-selected-bg) !important;
  }

  [data-type='item'][data-item-selected]:hover,
  [data-type='item'][data-item-selected][data-item-context-hover='true'] {
    color: var(--sidebar-accent-foreground) !important;
    background-color: var(--pierre-tree-row-selected-bg) !important;
    font-weight: 500 !important;
    --truncate-marker-background-color: var(--pierre-tree-row-selected-bg) !important;
    --truncate-marker-background-overlay-color: var(--pierre-tree-row-selected-bg) !important;
  }

  [data-item-section='icon'],
  [data-item-section='content'] {
    color: inherit !important;
  }

  [data-item-section='content'] {
    position: relative !important;
    z-index: 0 !important;
    flex: 1 1 0% !important;
    min-width: 0 !important;
    max-width: 100% !important;
    overflow: hidden !important;
    text-overflow: clip !important;
  }

  [data-item-section='content'] > [data-truncate-group-container='middle'] {
    min-width: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
  }

  [data-item-section='decoration'] {
    display: none !important;
  }

  [data-item-section='icon'] {
    fill: none !important;
  }

  [data-item-section='icon'] svg {
    width: ${EXPLORER_TREE_ROW_ICON_PX}px;
    height: ${EXPLORER_TREE_ROW_ICON_PX}px;
    color: inherit;
    fill: none !important;
    stroke: currentColor;
  }

  [data-item-section='icon'] path {
    fill: none !important;
    stroke: currentColor;
  }

  [data-type='item'] [data-icon-name='file-tree-icon-chevron'] {
    transform: none !important;
    transition: none !important;
  }

  [data-type='item'][aria-expanded='true'][data-item-type='folder']
    [data-icon-name='file-tree-icon-chevron'] {
    transform: rotate(90deg) !important;
  }

  [data-type='item'][data-item-focused='true']::before,
  [data-type='item'][data-item-selected]::before {
    outline: none !important;
    box-shadow: none !important;
  }

  [data-type='item']:focus-visible::before {
    outline: none !important;
    box-shadow: inset 0 0 0 2px var(--sidebar-ring) !important;
  }

  [data-type='context-menu-anchor'][data-visible='true'] {
    inset-inline-end: ${PIERRE_TREE_ACTION_INSET_END_PX}px !important;
    inset-inline-start: auto !important;
    right: ${PIERRE_TREE_ACTION_INSET_END_PX}px !important;
    left: auto !important;
    z-index: 4 !important;
    display: flex !important;
    align-items: center !important;
    height: ${rowHeightPx}px !important;
    pointer-events: none !important;
  }

  [data-type='context-menu-trigger'] {
    width: ${actionButtonPx}px !important;
    height: ${actionButtonPx}px !important;
    min-width: ${actionButtonPx}px !important;
    min-height: ${actionButtonPx}px !important;
    margin: 0 !important;
    padding: 0 !important;
    border: 0 !important;
    border-radius: var(--radius-lg) !important;
    background-color: transparent !important;
    color: var(--sidebar-foreground) !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    cursor: pointer !important;
    box-sizing: border-box !important;
    pointer-events: auto !important;
    outline: none !important;
    transition:
      background-color 150ms ease,
      color 150ms ease,
      transform 150ms ease !important;
  }

  [data-type='context-menu-trigger']:hover,
  [data-type='context-menu-trigger'][data-popup-open],
  [data-type='context-menu-trigger'][aria-expanded='true'] {
    background-color: var(--pierre-tree-row-selected-bg) !important;
    color: var(--sidebar-accent-foreground) !important;
  }

  [data-type='context-menu-trigger']:focus-visible {
    box-shadow: 0 0 0 2px var(--sidebar-ring) !important;
  }

  [data-type='context-menu-trigger'][data-visible='false'] {
    visibility: hidden !important;
    pointer-events: none !important;
  }

  [data-type='context-menu-trigger'] svg {
    width: ${EXPLORER_TREE_ROW_ICON_PX}px !important;
    height: ${EXPLORER_TREE_ROW_ICON_PX}px !important;
    flex-shrink: 0 !important;
    fill: none !important;
    stroke: currentColor;
  }

  [data-type='context-menu-trigger'] path {
    fill: none !important;
    stroke: currentColor;
  }

  [data-item-section='action'],
  [data-item-action-affordance='decorative'] {
    display: none !important;
  }
`.trim()
}

export function buildPierreTreeShellStyle(
  containerHeightPx: number,
  rowHeightPx: number
): CSSProperties {
  return {
    display: "block",
    width: "100%",
    minWidth: 0,
    maxWidth: "100%",
    height: `${containerHeightPx}px`,
    boxSizing: "border-box",
    backgroundColor: "transparent",

    "--trees-accent-override": "var(--sidebar-ring)",
    "--trees-bg-override": "transparent",
    "--trees-bg-muted-override": PIERRE_TREE_ROW_HOVER_BG,
    "--pierre-tree-row-hover-solid": PIERRE_TREE_ROW_HOVER_SOLID,
    "--pierre-tree-row-selected-solid": PIERRE_TREE_ROW_SELECTED_SOLID,
    "--pierre-tree-row-hover-bg": PIERRE_TREE_ROW_HOVER_BG,
    "--pierre-tree-row-selected-bg": PIERRE_TREE_ROW_SELECTED_BG,
    "--trees-theme-sidebar-bg": "transparent",
    "--trees-theme-sidebar-border": "var(--sidebar-border)",

    "--trees-fg-override": "var(--foreground)",
    "--trees-fg-muted-override": "var(--foreground)",
    "--trees-theme-sidebar-fg": "var(--foreground)",

    "--trees-border-color-override": "var(--sidebar-border)",
    "--trees-border-radius-override": "var(--radius-lg)",

    "--trees-font-family-override": "var(--font-sans)",
    "--trees-font-size-override": "0.875rem",
    "--trees-font-weight-regular-override": "400",
    "--trees-font-weight-semibold-override": "500",

    "--trees-item-height": `${rowHeightPx}px`,
    "--trees-scrollbar-gutter-override": "0px",
    "--trees-scrollbar-gutter-measured": "0px",
    "--trees-item-row-gap-override": `${PIERRE_TREE_ROW_GAP_PX}px`,
    "--trees-item-padding-x-override": "0px",
    "--trees-item-margin-x-override": "0px",
    "--trees-padding-inline-override": "0px",
    "--trees-level-gap-override": `${treeIndent.depthStepPx}px`,
    "--trees-icon-width-override": `${EXPLORER_TREE_ROW_ICON_PX}px`,
    "--trees-icon-nudge-override": "0px",
    "--trees-action-lane-width-override": `${EXPLORER_TREE_ROW_ACTION_WIDTH_PX}px`,
    "--trees-context-menu-trigger-inline-offset": `${PIERRE_TREE_ACTION_INSET_END_PX}px`,

    "--trees-theme-list-hover-bg": PIERRE_TREE_ROW_HOVER_BG,
    "--trees-theme-list-active-selection-bg": PIERRE_TREE_ROW_SELECTED_BG,
    "--trees-theme-list-active-selection-fg":
      "var(--sidebar-accent-foreground)",
    "--trees-selected-bg-override": PIERRE_TREE_ROW_SELECTED_BG,
    "--trees-selected-fg-override": "var(--sidebar-accent-foreground)",
    "--trees-selected-focused-border-color-override": "transparent",

    "--trees-focus-ring-color-override": "var(--sidebar-ring)",
    "--trees-focus-ring-width-override": "2px",
    "--trees-focus-ring-offset-override": "0px",
    "--trees-theme-focus-ring": "var(--sidebar-ring)",

    "--trees-indent-guide-bg-override": "var(--sidebar-border)",
  } as CSSProperties
}

export function pierreTreeRowHeightPx(density: ExplorerTreeRowDensity): number {
  return explorerTreeRowHeightPx(density)
}

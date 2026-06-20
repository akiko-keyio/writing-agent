import { treeIndent } from "@/lib/spacing"
import { cn } from "@/lib/utils"

/** Explorer 文件树行高密度：28px（icon-sm）/ 低密度：32px（试验） */
export type ExplorerTreeRowDensity = "compact" | "relax"

export const EXPLORER_TREE_ROW_HEIGHT_PX = {
  compact: 28,
  relax: 32,
} as const

/** 行内 glyph（展开箭头、文件、⋯ 图标），对齐 Button icon-lg 内 `sm:size-4` */
export const EXPLORER_TREE_ROW_ICON_PX = 16

/**
 * 行尾悬浮 ⋯ 底纹边长：与 coss `SidebarMenuAction` 的 `w-5`（20px）一致。
 * compact 行 28px − 2×4px（top-1/right-1）= 20px，圆角 radius-lg 时为正圆。
 */
export const EXPLORER_TREE_ROW_ACTION_WIDTH_PX = 20

/** 与 shell.explorerRowActionEnd（end-1）一致 */
export const EXPLORER_TREE_ROW_ACTION_INSET_END_PX = 4

/** 文件夹行 hover 区 icon-sm（sm:size-7）边长 */
const EXPLORER_TREE_FOLDER_ACTION_BUTTON_PX = 28

/** 与 shell.sidebarMenuItemHoverActions gap.hairline 一致 */
const EXPLORER_TREE_FOLDER_ACTION_GAP_PX = 2

/** ⋯ 左缘距行右缘：end-1 + w-5 */
export function explorerTreeRowMoreActionReserveEndPx(): number {
  return EXPLORER_TREE_ROW_ACTION_INSET_END_PX + EXPLORER_TREE_ROW_ACTION_WIDTH_PX
}

/** 文件夹行双钮区左缘距行右缘 */
export function explorerTreeRowFolderActionGroupReserveEndPx(): number {
  return (
    EXPLORER_TREE_ROW_ACTION_INSET_END_PX +
    EXPLORER_TREE_FOLDER_ACTION_BUTTON_PX * 2 +
    EXPLORER_TREE_FOLDER_ACTION_GAP_PX
  )
}

/** 单行操作（⋯ / 关闭）向左渐隐区；与 document tab 共用 */
export const CHROME_ROW_HOVER_FADE_EXTRA_PX = 20

/** 文件夹行 / 区头渐隐区（双钮，更宽） */
export const EXPLORER_TREE_ROW_HOVER_FADE_EXTRA_PX = 32

/** 文件行 hover overlay = 钮区(24px) + 渐隐(20px) = 48px（同 document tab 总量） */
export function explorerTreeRowHoverFadeOverlayWidthPx(): number {
  return (
    explorerTreeRowMoreActionReserveEndPx() +
    CHROME_ROW_HOVER_FADE_EXTRA_PX
  )
}

/** 文件夹行 / 区头 hover overlay 总宽 */
export function explorerTreeRowFolderHoverFadeOverlayWidthPx(): number {
  return (
    explorerTreeRowFolderActionGroupReserveEndPx() +
    EXPLORER_TREE_ROW_HOVER_FADE_EXTRA_PX
  )
}

/** 行尾预留 ⋯（SidebarMenuAction）：8 + 20 + 4 = 32px，等同 pe-8 */
export function explorerTreeRowPadEndPx(
  reserveRowAction = false
): number {
  if (!reserveRowAction) {
    return treeIndent.rowPadPx
  }
  return treeIndent.rowPadPx + EXPLORER_TREE_ROW_ACTION_WIDTH_PX + 4
}

export function explorerTreeRowHeightPx(
  density: ExplorerTreeRowDensity
): number {
  return EXPLORER_TREE_ROW_HEIGHT_PX[density]
}

/** Pierre 虚拟列表 stride = 可视行高 + 行间 gap（须与 unsafeCss margin-bottom 一致） */
export function explorerTreeRowStridePx(
  density: ExplorerTreeRowDensity
): number {
  return EXPLORER_TREE_ROW_HEIGHT_PX[density] + treeIndent.rowGapPx
}

export function explorerTreeRowHeightClass(
  density: ExplorerTreeRowDensity
): string {
  return density === "relax" ? "h-8 sm:h-8" : "h-7 sm:h-7"
}

export function explorerTreeRowMinHeightClass(
  density: ExplorerTreeRowDensity
): string {
  return density === "relax" ? "min-h-8" : "min-h-7"
}

export function explorerFileSectionHeaderRowClass(
  density: ExplorerTreeRowDensity
): string {
  return cn(
    explorerTreeRowHeightClass(density),
    explorerTreeRowMinHeightClass(density)
  )
}

const EXPLORER_TREE_ROW_DENSITY_STORAGE_KEY = "explorer-tree-row-density"

export function readExplorerTreeRowDensity(): ExplorerTreeRowDensity {
  try {
    const saved = localStorage.getItem(EXPLORER_TREE_ROW_DENSITY_STORAGE_KEY)
    return saved === "relax" ? "relax" : "compact"
  } catch {
    return "compact"
  }
}

export function writeExplorerTreeRowDensity(
  density: ExplorerTreeRowDensity
): void {
  try {
    localStorage.setItem(EXPLORER_TREE_ROW_DENSITY_STORAGE_KEY, density)
  } catch {
    // ignore quota / private mode
  }
}

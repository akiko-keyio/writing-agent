import type { FileTreeIcons } from "@pierre/trees"

import {
  hugeiconSymbol,
  PIERRE_HUGEICON_SPRITE_ICONS,
} from "@/components/explorer-variants/file-tree/hugeicons-sprite"

/**
 * Pierre FileTree 图标 sprite：从 `@hugeicons/core-free-icons` 序列化路径，
 * 与 COSS explorer-file-tree / 顶栏 ProjectSwitcher `HugeiconsIcon` 同款。
 * Chevron 展开态由 unsafeCSS `rotate(90deg)` 处理。
 */
export const PIERRE_COSS_ICON_SPRITE = `<svg data-icon-sprite aria-hidden="true" width="0" height="0">
${hugeiconSymbol("coss-icon-chevron", PIERRE_HUGEICON_SPRITE_ICONS.chevron)}
${hugeiconSymbol("coss-icon-file", PIERRE_HUGEICON_SPRITE_ICONS.file)}
${hugeiconSymbol("coss-icon-markdown", PIERRE_HUGEICON_SPRITE_ICONS.markdown)}
${hugeiconSymbol("coss-icon-ellipsis", PIERRE_HUGEICON_SPRITE_ICONS.ellipsis)}
  <symbol id="coss-icon-dot" viewBox="0 0 6 6">
    <circle cx="3" cy="3" r="3" fill="currentColor" />
  </symbol>
  <symbol id="coss-icon-lock" viewBox="0 0 16 16">
    <path
      fill="currentColor"
      d="M4 5.336V4a4 4 0 1 1 8 0v1.336c1.586.54 2 1.843 2 4.664v1c0 4.118-.883 5-5 5H7c-4.117 0-5-.883-5-5v-1c0-2.821.414-4.124 2-4.664M5.5 4v1.054Q6.166 4.998 7 5h2q.834-.002 1.5.054V4a2.5 2.5 0 0 0-5 0m-2 6v1c0 .995.055 1.692.167 2.193.107.483.246.686.35.79s.307.243.79.35c.5.112 1.198.167 2.193.167h2c.995 0 1.692-.055 2.193-.166.483-.108.686-.247.79-.35.104-.105.243-.308.35-.791.112-.5.167-1.198.167-2.193v-1c0-.995-.055-1.692-.166-2.193-.108-.483-.247-.686-.35-.79-.105-.104-.308-.243-.791-.35C10.693 6.555 9.995 6.5 9 6.5H7c-.995 0-1.692.055-2.193.167-.483.107-.686.246-.79.35s-.243.307-.35.79C3.555 8.307 3.5 9.005 3.5 10"
    />
  </symbol>
</svg>`

const strokeIconViewBox = { viewBox: "0 0 24 24" as const }

const markdownFileIcon = {
  name: "coss-icon-markdown",
  ...strokeIconViewBox,
} as const

export const PIERRE_COSS_FILE_TREE_ICONS: FileTreeIcons = {
  set: "none",
  colored: false,
  spriteSheet: PIERRE_COSS_ICON_SPRITE,
  byFileExtension: {
    md: markdownFileIcon,
    mdx: markdownFileIcon,
  },
  remap: {
    "file-tree-icon-chevron": {
      name: "coss-icon-chevron",
      ...strokeIconViewBox,
    },
    "file-tree-icon-file": {
      name: "coss-icon-file",
      ...strokeIconViewBox,
    },
    "file-tree-icon-dot": {
      name: "coss-icon-dot",
      viewBox: "0 0 6 6",
    },
    "file-tree-icon-lock": {
      name: "coss-icon-lock",
      viewBox: "0 0 16 16",
    },
    "file-tree-icon-ellipsis": {
      name: "coss-icon-ellipsis",
      ...strokeIconViewBox,
    },
  },
}

/**
 * Explorer 组件 A/B 对比配置。
 *
 * 拆除说明：删除整个 `explorer-variants/` 目录，并在
 * `explorer-panel.tsx` / `document-panel.tsx` 恢复直接引用
 * `ExplorerFileTree` / `ExplorerOutline` 即可。
 */

export const FILE_TREE_VARIANTS = [
  "coss-sidebar",
  "pierre-trees",
] as const

export type FileTreeVariant = (typeof FILE_TREE_VARIANTS)[number]

export const OUTLINE_VARIANTS = ["tabs", "anchor-nav"] as const

export type OutlineVariant = (typeof OUTLINE_VARIANTS)[number]

const FILE_TREE_KEY = "writing-agent:file-tree-variant"
const OUTLINE_KEY = "writing-agent:outline-variant"

function readStored<T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: T
): T {
  if (typeof window === "undefined") return fallback
  const value = window.localStorage.getItem(key)
  return allowed.includes(value as T) ? (value as T) : fallback
}

export function getFileTreeVariant(): FileTreeVariant {
  return readStored(FILE_TREE_KEY, FILE_TREE_VARIANTS, "coss-sidebar")
}

export function setFileTreeVariant(variant: FileTreeVariant) {
  window.localStorage.setItem(FILE_TREE_KEY, variant)
}

export function getOutlineVariant(): OutlineVariant {
  return readStored(OUTLINE_KEY, OUTLINE_VARIANTS, "tabs")
}

export function setOutlineVariant(variant: OutlineVariant) {
  window.localStorage.setItem(OUTLINE_KEY, variant)
}

export const FILE_TREE_VARIANT_LABELS: Record<FileTreeVariant, string> = {
  "coss-sidebar": "COSS Sidebar（当前）",
  "pierre-trees": "Pierre Trees (@pierre/trees)",
}

export const OUTLINE_VARIANT_LABELS: Record<OutlineVariant, string> = {
  tabs: "Tabs（当前）",
  "anchor-nav": "Anchor Nav（shadcn TOC）",
}

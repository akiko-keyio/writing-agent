import {
  ArrowRight01Icon,
  File02Icon,
  FileAttachmentIcon,
  MoreHorizontalIcon,
} from "@hugeicons/core-free-icons"
import type { IconSvgElement } from "@hugeicons/react"

function camelToKebab(name: string): string {
  return name.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)
}

function serializeHugeiconElement([tag, attrs]: IconSvgElement[number]): string {
  const normalizedAttrs: Record<string, string> = { ...attrs }
  delete normalizedAttrs.key

  // Pierre `[data-item-section='icon'] { fill: currentColor }` 会填充实心块；
  // stroke 图标必须显式 fill="none"。
  if (tag === "path" && normalizedAttrs.stroke && !normalizedAttrs.fill) {
    normalizedAttrs.fill = "none"
  }

  const serializedAttrs = Object.entries(normalizedAttrs)
    .map(([key, value]) => `${camelToKebab(key)}="${String(value)}"`)
    .join(" ")

  return `    <${tag} ${serializedAttrs} />`
}

export function hugeiconSymbol(id: string, icon: IconSvgElement): string {
  const body = icon.map(serializeHugeiconElement).join("\n")
  return `  <symbol id="${id}" viewBox="0 0 24 24">\n${body}\n  </symbol>`
}

/** 与 COSS Files 树、顶栏 icon-lg 内 Hugeicons 同源 */
export const PIERRE_HUGEICON_SPRITE_ICONS = {
  chevron: ArrowRight01Icon,
  file: FileAttachmentIcon,
  markdown: File02Icon,
  ellipsis: MoreHorizontalIcon,
} as const

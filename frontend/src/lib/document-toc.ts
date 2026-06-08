/** Serializable TOC row for the outline panel */
export type DocumentTocEntry = {
  id: string
  /** 大纲树深度（用于缩进） */
  level: number
  /** 对应 h1–h6（用于字号/字重） */
  headingLevel: number
  title: string
  isActive?: boolean
}

/** TipTap TableOfContents `getId`：与 fallback 解析一致的可读 slug */
export function tocHeadingIdFromTitle(textContent: string): string {
  return slugifyHeading(textContent)
}

export function slugifyHeading(text: string): string {
  const base = text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
  return base || "section"
}

function uniqueSlug(text: string, seen: Map<string, number>): string {
  const base = slugifyHeading(text)
  const count = seen.get(base) ?? 0
  seen.set(base, count + 1)
  return count === 0 ? base : `${base}-${count + 1}`
}

/** 仅把短章节行（如 `1 Introduction`）提升为 ATX，避免正文句子误入大纲。 */
function parseNumberedSectionLine(
  trimmed: string,
): { level: number; title: string } | null {
  const match = /^(\d+(?:\.\d+)*)\s+(.+)$/.exec(trimmed)
  if (!match) return null
  const title = match[2].trim()
  if (title.length > 72) return null
  if (/[,.;:!?]/.test(title)) return null
  return {
    level: Math.min(match[1].split(".").length, 6),
    title,
  }
}

/** Promote lines like `1 Introduction` to ATX headings for TipTap / TOC. */
export function normalizeMarkdownHeadings(markdown: string): string {
  return markdown
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim()
      if (/^#{1,6}\s/.test(trimmed)) return line
      const section = parseNumberedSectionLine(trimmed)
      if (!section) return line
      return `${"#".repeat(section.level)} ${section.title}`
    })
    .join("\n")
}

/** Fallback when the editor has not produced heading anchors yet. */
export function parseMarkdownHeadings(markdown: string): DocumentTocEntry[] {
  const seen = new Map<string, number>()
  const entries: DocumentTocEntry[] = []

  for (const line of markdown.split(/\r?\n/)) {
    const trimmed = line.trim()
    const atx = /^(#{1,6})\s+(.+)$/.exec(trimmed)
    if (atx) {
      const title = atx[2].trim()
      entries.push({
        id: uniqueSlug(title, seen),
        level: atx[1].length,
        headingLevel: atx[1].length,
        title,
      })
      continue
    }
    const section = parseNumberedSectionLine(trimmed)
    if (section) {
      entries.push({
        id: uniqueSlug(section.title, seen),
        level: section.level,
        headingLevel: section.level,
        title: section.title,
      })
    }
  }

  return entries
}

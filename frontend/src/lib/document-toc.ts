/** Serializable TOC row for the outline panel */
export type DocumentTocEntry = {
  id: string
  level: number
  title: string
  isActive?: boolean
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

/** Promote lines like `1 Introduction` to ATX headings for TipTap / TOC. */
export function normalizeMarkdownHeadings(markdown: string): string {
  return markdown
    .split(/\r?\n/)
    .map((line) => {
      if (/^#{1,6}\s/.test(line.trim())) return line
      const match = /^(\d+(?:\.\d+)*)\s+(.+)$/.exec(line.trim())
      if (!match) return line
      const level = Math.min(match[1].split(".").length, 6)
      return `${"#".repeat(level)} ${match[2].trim()}`
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
        title,
      })
      continue
    }
    const numbered = /^(\d+(?:\.\d+)*)\s+(.+)$/.exec(trimmed)
    if (numbered) {
      const title = numbered[2].trim()
      entries.push({
        id: uniqueSlug(title, seen),
        level: Math.min(numbered[1].split(".").length, 6),
        title,
      })
    }
  }

  return entries
}

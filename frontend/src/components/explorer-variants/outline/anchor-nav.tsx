import { useMemo } from "react"

import { Button } from "@/components/ui/button"
import type { ExplorerOutlineProps } from "@/components/explorer-variants/shared/outline-props"
import type { DocumentTocEntry } from "@/lib/document-toc"
import { shell, shellNavIndent } from "@/lib/shell-chrome"
import { p, stack } from "@/lib/spacing"
import { cn } from "@/lib/utils"

function resolveActiveId(entries: DocumentTocEntry[]): string {
  const current = entries.find((entry) => entry.isActive)
  return current?.id ?? entries[0]?.id ?? ""
}

/**
 * shadcn/ui docs TOC 风格：锚点列表 + active 高亮。
 * @see https://github.com/shadcn-ui/ui/blob/main/apps/v4/components/docs-toc.tsx
 */
export function AnchorNavOutline({ entries, onNavigate }: ExplorerOutlineProps) {
  const activeId = useMemo(() => resolveActiveId(entries), [entries])

  if (entries.length === 0) {
    return (
      <p className={cn(shell.panelBody, shell.textMuted)}>
        No headings. Use markdown <span className="text-foreground">#</span> or
        lines like <span className="text-foreground">1 Introduction</span>.
      </p>
    )
  }

  return (
    <nav
      aria-label="Document outline"
      className={cn(shell.panelBody, stack.xs, p[3].bottom)}
    >
      <p
        className={cn(
          "sticky top-0 z-10 bg-background text-xs font-medium text-muted-foreground",
          p[1].bottom
        )}
      >
        On This Page
      </p>
      {entries.map((entry) => (
        <Button
          key={entry.id}
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "h-auto w-full min-w-0 justify-start rounded-lg text-start font-normal leading-5",
            p[1].y,
            p[2].end,
            entry.id === activeId
              ? "font-medium text-foreground"
              : "text-muted-foreground"
          )}
          style={{ paddingLeft: shellNavIndent(entry.level) }}
          onClick={() => onNavigate(entry.id)}
        >
          <span className="min-w-0 whitespace-normal break-words">{entry.title}</span>
        </Button>
      ))}
    </nav>
  )
}

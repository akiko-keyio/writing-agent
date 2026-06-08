import { useEffect, useMemo, useState } from "react"

import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs"
import type { DocumentTocEntry } from "@/lib/document-toc"
import { shell, shellNavIndent } from "@/lib/shell-chrome"
import { cn } from "@/lib/utils"

/**
 * 文档大纲：p-tabs-4 竖向 underline；点击跳转 + 层级缩进/字重。
 */
export function ExplorerOutline({
  entries,
  onNavigate,
}: {
  entries: DocumentTocEntry[]
  onNavigate: (id: string) => void
}) {
  const [pendingId, setPendingId] = useState<string | null>(null)

  const activeId = useMemo(() => {
    if (pendingId && entries.some((e) => e.id === pendingId)) {
      return pendingId
    }
    const current = entries.find((e) => e.isActive)
    const candidate = current?.id ?? entries[0]?.id ?? ""
    return entries.some((e) => e.id === candidate) ? candidate : (entries[0]?.id ?? "")
  }, [entries, pendingId])

  useEffect(() => {
    const current = entries.find((e) => e.isActive)
    if (current && current.id === pendingId) {
      setPendingId(null)
    }
  }, [entries, pendingId])

  const handleNavigate = (id: string) => {
    setPendingId(id)
    onNavigate(id)
  }

  if (entries.length === 0) {
    return (
      <p className={cn(shell.panelBody, shell.textMuted)}>
        No headings. Use markdown <span className="text-foreground">#</span> or
        lines like <span className="text-foreground">1 Introduction</span>.
      </p>
    )
  }

  if (!activeId) {
    return (
      <p className={cn(shell.panelBody, shell.textMuted)}>
        Outline is not ready yet. Open a markdown file with headings.
      </p>
    )
  }

  return (
    <div
      className={cn(
        shell.panelBody,
        "min-w-0 max-w-full overflow-hidden pb-3",
      )}
    >
      <Tabs
        orientation="vertical"
        className={shell.outlineTabs}
        value={activeId}
        onValueChange={(id) => {
          if (id) handleNavigate(id)
        }}
      >
        <div className={shell.outlineTabsRail}>
          <TabsList variant="underline" className={shell.outlineTabsList}>
            {entries.map((entry) => (
              <TabsTab
                key={entry.id}
                value={entry.id}
                className={shell.outlineTab}
                style={{ paddingLeft: shellNavIndent(entry.level) }}
                onClick={() => handleNavigate(entry.id)}
              >
                <span className="min-w-0 flex-1 whitespace-normal break-words text-start leading-5">
                  {entry.title}
                </span>
              </TabsTab>
            ))}
          </TabsList>
        </div>
        {entries.map((entry) => (
          <TabsPanel key={entry.id} value={entry.id} hidden>
            {entry.title}
          </TabsPanel>
        ))}
      </Tabs>
    </div>
  )
}

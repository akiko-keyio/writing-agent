/** Open document tabs state helpers. */

export type DocumentTabType = "file" | "settings"

export type DocumentTab = {
  path: string
  content: string
  dirty: boolean
  type?: DocumentTabType
}

/** Virtual path for the Settings tab. Never maps to a real file. */
export const SETTINGS_PATH = "settings:main"

export function isVirtualTab(tab: DocumentTab): boolean {
  return tab.type != null && tab.type !== "file"
}

export function upsertTab(
  tabs: DocumentTab[],
  path: string,
  content: string,
  type?: DocumentTabType,
): DocumentTab[] {
  const existing = tabs.find((t) => t.path === path)
  if (existing) {
    return tabs.map((t) =>
      t.path === path ? { ...t, content, dirty: t.dirty } : t,
    )
  }
  return [...tabs, { path, content, dirty: false, type }]
}

export function closeTab(tabs: DocumentTab[], path: string): DocumentTab[] {
  return tabs.filter((t) => t.path !== path)
}

export function markTabDirty(
  tabs: DocumentTab[],
  path: string,
  dirty: boolean,
): DocumentTab[] {
  return tabs.map((t) => (t.path === path ? { ...t, dirty } : t))
}

export function updateTabContent(
  tabs: DocumentTab[],
  path: string,
  content: string,
  dirty = true,
): DocumentTab[] {
  return tabs.map((t) =>
    t.path === path ? { ...t, content, dirty: dirty || t.dirty } : t,
  )
}

export function repathTabs(
  tabs: DocumentTab[],
  moves: ReadonlyArray<{ from: string; to: string }>
): DocumentTab[] {
  const pathMap = new Map(moves.map(({ from, to }) => [from, to]))
  return tabs.map((tab) => {
    const nextPath = pathMap.get(tab.path)
    return nextPath ? { ...tab, path: nextPath } : tab
  })
}

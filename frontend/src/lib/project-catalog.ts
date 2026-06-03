/** 工作区条目与最近列表持久化（localStorage）。 */

export type ProjectEntry = {
  id: string
  name: string
  path: string
}

/** 开发服务器默认工作区（`/api/workspace`） */
export const REPO_PROJECT: ProjectEntry = {
  id: "repo",
  name: "Writing Agent",
  path: "Server workspace · /api/workspace",
}

export function isFolderProject(entry: ProjectEntry): boolean {
  return entry.id.startsWith("folder:")
}

export function folderProjectEntry(
  handle: FileSystemDirectoryHandle,
): ProjectEntry {
  return {
    id: `folder:${handle.name}`,
    name: handle.name,
    path: "Local folder · this browser",
  }
}

const STORAGE_KEY = "writing-agent:recent-projects"
const MAX_RECENT = 12

type StoredRecent = ProjectEntry & { lastOpenedAt: number }

function readStored(): StoredRecent[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is StoredRecent =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as StoredRecent).id === "string" &&
        typeof (item as StoredRecent).name === "string" &&
        typeof (item as StoredRecent).path === "string",
    )
  } catch {
    return []
  }
}

function writeStored(items: StoredRecent[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export function loadRecentProjects(): ProjectEntry[] {
  return readStored()
    .sort((a, b) => b.lastOpenedAt - a.lastOpenedAt)
    .map(({ id, name, path }) => ({ id, name, path }))
}

export function rememberRecentProject(entry: ProjectEntry): ProjectEntry[] {
  const now = Date.now()
  const without = readStored().filter((item) => item.id !== entry.id)
  const next: StoredRecent[] = [
    { ...entry, lastOpenedAt: now },
    ...without,
  ].slice(0, MAX_RECENT)
  writeStored(next)
  return next.map(({ id, name, path }) => ({ id, name, path }))
}

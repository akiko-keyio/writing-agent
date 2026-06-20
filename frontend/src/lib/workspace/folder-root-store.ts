const STORAGE_KEY = "writing-agent:folder-absolute-roots"

function readAll(): Record<string, string> {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (typeof parsed !== "object" || parsed === null) return {}
    const out: Record<string, string> = {}
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof key === "string" && typeof value === "string" && value.trim()) {
        out[key] = value
      }
    }
    return out
  } catch {
    return {}
  }
}

function writeAll(roots: Record<string, string>): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(roots))
}

export function getFolderAbsoluteRoot(projectId: string): string | null {
  return readAll()[projectId] ?? null
}

export function setFolderAbsoluteRoot(projectId: string, rootPath: string): void {
  const roots = readAll()
  roots[projectId] = rootPath
  writeAll(roots)
}

export function clearFolderAbsoluteRoot(projectId: string): void {
  const roots = readAll()
  delete roots[projectId]
  writeAll(roots)
}

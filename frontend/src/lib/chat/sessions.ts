/** Persisted chat session id list (titles come from backend session/list). */

export type StoredChatTab = {
  id: string
  title: string
}

const STORAGE_KEY = "writing-agent:chat-session-ids"
const MAX_TABS = 20

function storageKey(workspaceId?: string | null): string {
  return workspaceId ? `${STORAGE_KEY}:${workspaceId}` : STORAGE_KEY
}

function readTabIds(workspaceId?: string | null): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(storageKey(workspaceId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((id): id is string => typeof id === "string")
  } catch {
    return []
  }
}

function writeTabIds(ids: string[], workspaceId?: string | null): void {
  window.localStorage.setItem(
    storageKey(workspaceId),
    JSON.stringify(ids.slice(0, MAX_TABS)),
  )
}

export function loadChatTabIds(workspaceId?: string | null): string[] {
  return readTabIds(workspaceId)
}

export function saveChatTabIds(ids: string[], workspaceId?: string | null): void {
  writeTabIds(ids, workspaceId)
}

export function prependChatTabId(id: string, workspaceId?: string | null): void {
  const rest = readTabIds(workspaceId).filter((x) => x !== id)
  writeTabIds([id, ...rest], workspaceId)
}

export function removeChatTabId(id: string, workspaceId?: string | null): void {
  writeTabIds(readTabIds(workspaceId).filter((x) => x !== id), workspaceId)
}

export function sessionTitleFromMessages(
  messages: { role: string; text: string }[],
): string {
  const firstUser = messages.find((m) => m.role === "user")
  if (!firstUser) return "New chat"
  const t = firstUser.text.trim()
  return t.length > 40 ? `${t.slice(0, 40)}…` : t || "New chat"
}

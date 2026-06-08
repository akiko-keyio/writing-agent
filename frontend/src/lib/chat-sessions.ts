/** Persisted chat session id list (titles come from backend session/list). */

export type StoredChatTab = {
  id: string
  title: string
}

const STORAGE_KEY = "writing-agent:chat-session-ids"
const MAX_TABS = 20

function readTabIds(): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((id): id is string => typeof id === "string")
  } catch {
    return []
  }
}

function writeTabIds(ids: string[]): void {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(ids.slice(0, MAX_TABS)),
  )
}

export function loadChatTabIds(): string[] {
  return readTabIds()
}

export function saveChatTabIds(ids: string[]): void {
  writeTabIds(ids)
}

export function prependChatTabId(id: string): void {
  const rest = readTabIds().filter((x) => x !== id)
  writeTabIds([id, ...rest])
}

export function removeChatTabId(id: string): void {
  writeTabIds(readTabIds().filter((x) => x !== id))
}

export function sessionTitleFromMessages(
  messages: { role: string; text: string }[],
): string {
  const firstUser = messages.find((m) => m.role === "user")
  if (!firstUser) return "New chat"
  const t = firstUser.text.trim()
  return t.length > 40 ? `${t.slice(0, 40)}…` : t || "New chat"
}

import type { EditGroup } from "@/lib/agent/protocol"

export function filterEditGroupsForSession(
  groups: EditGroup[],
  sessionId: string | null,
): EditGroup[] {
  if (!sessionId) return []
  return groups.filter((group) => group.session_id === sessionId)
}

export function acceptEditGroupEvent(
  group: EditGroup,
  activeSessionId: string | null,
): boolean {
  return Boolean(activeSessionId) && group.session_id === activeSessionId
}

export function acceptEditGroupStateEvent(
  sessionId: string | null,
  activeSessionId: string | null,
): boolean {
  return sessionId === activeSessionId
}

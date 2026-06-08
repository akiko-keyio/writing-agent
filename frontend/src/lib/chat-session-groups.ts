export type ChatSessionListItem = {
  id: string
  title: string
  updatedAt: number
}

function startOfLocalDay(ms: number): number {
  const d = new Date(ms)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/** 按 Today / Previous 7 days / Older 分组（用于顶栏会话菜单）。 */
export function groupChatSessionsByRecency(
  items: ChatSessionListItem[],
): {
  today: ChatSessionListItem[]
  previous7Days: ChatSessionListItem[]
  older: ChatSessionListItem[]
} {
  const todayStart = startOfLocalDay(Date.now())
  const sevenDaysStart = todayStart - 7 * 24 * 60 * 60 * 1000

  const today: ChatSessionListItem[] = []
  const previous7Days: ChatSessionListItem[] = []
  const older: ChatSessionListItem[] = []

  const sorted = [...items].sort((a, b) => b.updatedAt - a.updatedAt)
  for (const item of sorted) {
    if (item.updatedAt >= todayStart) today.push(item)
    else if (item.updatedAt >= sevenDaysStart) previous7Days.push(item)
    else older.push(item)
  }
  return { today, previous7Days, older }
}

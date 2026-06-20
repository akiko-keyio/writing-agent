/** Cursor 风格 @ 引用标签：`@path/to/file.md:12` 或 `@path:12-18` */
export function formatChatContextLabel(
  path: string,
  range?: { startLine: number; endLine: number },
): string {
  if (!range) {
    return `@${path}`
  }
  const { startLine, endLine } = range
  if (startLine === endLine) {
    return `@${path}:${startLine}`
  }
  return `@${path}:${startLine}-${endLine}`
}

export function selectionToLineRange(
  docTextBeforeStart: string,
  docTextBeforeEnd: string,
): { startLine: number; endLine: number } {
  const startLine = docTextBeforeStart.split("\n").length
  const endLine = docTextBeforeEnd.split("\n").length
  return { startLine, endLine }
}

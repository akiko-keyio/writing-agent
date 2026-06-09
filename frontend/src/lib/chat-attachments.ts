/** Context attachments shown as removable chips in the composer. */

import type { ChatMessageContext } from "@/lib/agent-protocol"
import { formatChatContextLabel } from "@/lib/chat-context-label"

export type SelectionAttachment = {
  id: string
  kind: "selection"
  path: string
  from: number
  to: number
  text: string
  startLine: number
  endLine: number
  label: string
}

export type FileAttachment = {
  id: string
  kind: "file"
  path: string
  label: string
}

export type ChatAttachment = SelectionAttachment | FileAttachment

export function makeSelectionAttachment(input: {
  path: string
  from: number
  to: number
  text: string
  startLine: number
  endLine: number
}): SelectionAttachment {
  return {
    id: `sel-${input.path}-${input.from}-${input.to}`,
    kind: "selection",
    path: input.path,
    from: input.from,
    to: input.to,
    text: input.text,
    startLine: input.startLine,
    endLine: input.endLine,
    label: formatChatContextLabel(input.path, {
      startLine: input.startLine,
      endLine: input.endLine,
    }),
  }
}

export function makeFileAttachment(path: string): FileAttachment {
  return {
    id: `file-${path}`,
    kind: "file",
    path,
    label: formatChatContextLabel(path),
  }
}

/**
 * Merge composer attachments into the outbound chat context, on top of the
 * active document base context. The most recent selection wins.
 */
export function attachmentsToContext(
  base: ChatMessageContext,
  attachments: ChatAttachment[],
): ChatMessageContext {
  const context: ChatMessageContext = { ...base }
  const mentions = new Set(base.mentions ?? [])
  let selection = base.selection

  for (const att of attachments) {
    if (att.kind === "file") {
      mentions.add(att.path)
    } else {
      mentions.add(att.path)
      selection = { from: att.from, to: att.to, text: att.text }
    }
  }

  if (mentions.size > 0) context.mentions = [...mentions]
  if (selection) context.selection = selection
  return context
}

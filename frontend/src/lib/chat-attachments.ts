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

export type EditReviewAttachment = {
  id: string
  kind: "edit_review"
  path: string
  group_id: string
  edit_id: string
  text: string
  label: string
}

export type ChatAttachment =
  | SelectionAttachment
  | FileAttachment
  | EditReviewAttachment

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

export function makeEditReviewAttachment(input: {
  path: string
  groupId: string
  editId: string
  summary: string
}): EditReviewAttachment {
  const label = formatChatContextLabel(input.path)
  return {
    id: `edit-${input.groupId}-${input.editId}`,
    kind: "edit_review",
    path: input.path,
    group_id: input.groupId,
    edit_id: input.editId,
    text: input.summary.slice(0, 2000),
    label,
  }
}

/** Cursor-style @ token shown inside the composer for this attachment. */
export function attachmentMentionLabel(att: ChatAttachment): string {
  return att.label
}

/**
 * Prepend composer attachment @ labels to outbound text so they survive in the
 * user bubble (and session history) after chips are cleared on send.
 */
export function composeMessageTextWithAttachments(
  text: string,
  attachments: ChatAttachment[],
): string {
  const trimmed = text.trim()
  if (attachments.length === 0) return trimmed

  const prefix = attachments
    .map(attachmentMentionLabel)
    .filter((label) => !trimmed.includes(label))
  if (prefix.length === 0) return trimmed

  return `${prefix.join("\n")}\n\n${trimmed}`
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
    } else if (att.kind === "edit_review") {
      mentions.add(att.path)
      context.edit_review = {
        group_id: att.group_id,
        edit_id: att.edit_id,
        path: att.path,
        summary: att.text,
      }
    } else {
      mentions.add(att.path)
      selection = { from: att.from, to: att.to, text: att.text }
    }
  }

  if (mentions.size > 0) context.mentions = [...mentions]
  if (selection) context.selection = selection
  return context
}

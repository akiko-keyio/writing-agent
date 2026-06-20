import { Fragment } from "react"
import type { TextDiffPart } from "@/lib/document/edit-text-diff"
import { computeEditTextDiff } from "@/lib/document/edit-text-diff"
import type { EditKind } from "@/lib/agent/protocol"
import { chatMarkdownBodyClass } from "@/lib/chat/typography"
import { cn } from "@/lib/shared/utils"

/** Review Queue inline diff — markdown body font at 14px (`text-sm`). */
export const reviewDiffBodyClass = cn(
  chatMarkdownBodyClass,
  "text-sm leading-[1.43]",
)

/** Short queue label for an edit operation. */
export function editKindLabel(kind: EditKind | undefined): string {
  if (kind === "insert") return "Add"
  if (kind === "delete") return "Remove"
  return "Change"
}

function diffPartsForEdit(
  kind: EditKind | undefined,
  oldText: string,
  newText: string,
): TextDiffPart[] {
  if (kind === "insert") {
    return newText ? [{ op: "insert", text: newText }] : []
  }
  if (kind === "delete") {
    return oldText ? [{ op: "delete", text: oldText }] : []
  }
  return computeEditTextDiff(oldText, newText)
}

/** Word-level diffs can drop inter-span whitespace; restore a gap at delete→insert. */
function needsDiffBoundarySpace(before: TextDiffPart, after: TextDiffPart): boolean {
  if (before.op !== "delete" || after.op !== "insert") return false
  return !/\s$/.test(before.text) && !/^\s/.test(after.text)
}

/** Inline old→new diff using document body typography. */
export function EditDiffPreview({
  kind,
  oldText,
  newText,
  className,
}: {
  kind?: EditKind
  oldText: string
  newText: string
  className?: string
}) {
  const parts = diffPartsForEdit(kind, oldText, newText)

  if (parts.length === 0) return null

  return (
    <p
      className={cn(
        reviewDiffBodyClass,
        "m-0 min-w-0 whitespace-pre-wrap break-words",
        className,
      )}
    >
      {parts.map((part, index) => (
        <Fragment key={`${part.op}-${index}`}>
          {index > 0 && needsDiffBoundarySpace(parts[index - 1]!, part) ? " " : null}
          <span
            className={cn(
              part.op === "delete" &&
                "bg-destructive/10 text-destructive line-through decoration-destructive/70",
              part.op === "insert" &&
                "bg-success/15 text-success-foreground",
            )}
          >
            {part.text}
          </span>
        </Fragment>
      ))}
    </p>
  )
}

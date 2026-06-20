import { forwardRef } from "react"

import { cn } from "@/lib/shared/utils"
import type { EditDefinition } from "@/lib/shared/writing-demo"

export interface EditAnchorProps {
  edit: EditDefinition
  applied: boolean
  focused?: boolean
  onSelect: (editId: string) => void
}

export const EditAnchor = forwardRef<HTMLSpanElement, EditAnchorProps>(
  function EditAnchor({ edit, applied, focused, onSelect }, ref) {
    if (edit.type === "delete" && applied) {
      return null
    }

    const display = edit.type === "delete" ? edit.old : applied ? edit.new : edit.old

    return (
      <span
        ref={ref}
        id={`anchor-${edit.id}`}
        role="button"
        tabIndex={0}
        data-edit={edit.id}
        onClick={(e) => {
          e.stopPropagation()
          onSelect(edit.id)
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            onSelect(edit.id)
          }
        }}
        className={cn(
          "cursor-pointer rounded-sm px-0.5 transition-[background,box-shadow] duration-200",
          applied
            ? "bg-success/10"
            : "bg-warning/10",
          focused && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        )}
      >
        {display}
      </span>
    )
  },
)

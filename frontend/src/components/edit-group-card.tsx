import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon, ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardFooter,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/components/ui/card"
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Separator } from "@/components/ui/separator"
import { cardBarPad, gap, p, row, rowPad, stack } from "@/lib/spacing"
import { cn } from "@/lib/utils"
import {
  isLongEdit,
  truncateText,
  type DemoEdit,
  type EditAppliedState,
} from "@/lib/writing-demo"

export interface EditGroupCardProps {
  issue: string
  edits: DemoEdit[]
  editState: EditAppliedState
  highlightedEditId?: string | null
  defaultOpen?: boolean
  onToggleEdit: (editId: string) => void
  onViewInDocument: (editId: string) => void
  onRevertAll: () => void
  onDone: () => void
}

function editBadgeLabel(edit: DemoEdit, applied: boolean): string {
  if (edit.type === "delete") {
    return applied ? "remove" : "keep"
  }
  return applied ? "applied" : "kept"
}

function EditRow({
  edit,
  applied,
  highlighted,
  onToggle,
  onViewInDocument,
}: {
  edit: DemoEdit
  applied: boolean
  highlighted: boolean
  onToggle: () => void
  onViewInDocument: () => void
}) {
  const isDelete = edit.type === "delete"
  const long = isLongEdit(edit)
  const badgeVariant = applied ? "success" : "warning"

  return (
    <Button
      type="button"
      variant="ghost"
      data-edit-id={edit.id}
      data-chat-edit-row={edit.id}
      data-slot="edit-row"
      onClick={onToggle}
      className={cn(
        cn(
          "h-auto w-full items-start justify-start rounded-none text-left font-normal",
          rowPad,
          gap.sm
        ),
        highlighted && "bg-info/10",
      )}
    >
      <div className="min-w-0 flex-1 break-words text-sm leading-snug">
        {isDelete ? (
          <div className={cn("flex flex-wrap items-baseline", gap.sm)}>
            <span
              className={cn(
                applied
                  ? "text-muted-foreground line-through"
                  : "font-medium text-foreground",
              )}
            >
              {edit.old.trim()}
            </span>
          </div>
        ) : long ? (
          <div className={stack.xs}>
            <span
              className={cn(
                "block",
                applied
                  ? "text-muted-foreground line-through"
                  : "font-medium text-foreground",
              )}
            >
              {truncateText(edit.old)}
            </span>
            <span className="block text-muted-foreground">→</span>
            <span
              className={cn(
                "block",
                applied
                  ? "font-medium text-foreground"
                  : "text-muted-foreground line-through",
              )}
            >
              {truncateText(edit.new)}
            </span>
          </div>
        ) : (
          <div className={cn("flex flex-wrap items-baseline", gap.sm)}>
            <span
              className={cn(
                applied
                  ? "text-muted-foreground line-through"
                  : "font-medium text-foreground",
              )}
            >
              {edit.old}
            </span>
            <span className="text-muted-foreground">→</span>
            <span
              className={cn(
                applied
                  ? "font-medium text-foreground"
                  : "text-muted-foreground line-through",
              )}
            >
              {edit.new}
            </span>
          </div>
        )}

        <Button
          type="button"
          variant="link"
          size="sm"
          className={cn(
            cn(
              "mt-1 h-auto text-xs opacity-0 transition-opacity in-[[data-slot=edit-row]:hover]:opacity-100 focus-visible:opacity-100",
              p[0].all
            ),
            gap.xs
          )}
          onClick={(e) => {
            e.stopPropagation()
            onViewInDocument()
          }}
        >
          <HugeiconsIcon icon={ArrowUpRight01Icon} aria-hidden="true" />
          {long ? "View in document" : "View"}
        </Button>
      </div>

      <Badge variant={badgeVariant} size="sm" className="mt-0.5 shrink-0 capitalize">
        {editBadgeLabel(edit, applied)}
      </Badge>
    </Button>
  )
}

export function EditGroupCard({
  issue,
  edits,
  editState,
  highlightedEditId,
  defaultOpen = true,
  onToggleEdit,
  onViewInDocument,
  onRevertAll,
  onDone,
}: EditGroupCardProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="w-full min-w-0 max-w-full"
    >
      <Card
        className={cn(
          "w-full min-w-0 overflow-hidden rounded-lg shadow-xs/5",
          p[0].y
        )}
      >
        <CardHeader
          className={cn("flex flex-row items-center border-b", cardBarPad, gap.sm)}
        >
          <CardTitle className="min-w-0 flex-1 text-sm font-medium leading-snug">
            {issue}
          </CardTitle>
          <CollapsibleTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn("shrink-0 text-muted-foreground", gap.xs, p[2].x)}
              />
            }
          >
            <span className="text-xs tabular-nums">
              {edits.length} edits
            </span>
            <HugeiconsIcon icon={ArrowDown01Icon} aria-hidden="true" className={cn("transition-transform", open && "rotate-180")} />
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsiblePanel>
          <CardPanel className={p[0].all}>
            {edits.map((edit, index) => (
              <div key={edit.id}>
                {index > 0 ? <Separator /> : null}
                <EditRow
                  edit={edit}
                  applied={editState[edit.id] ?? false}
                  highlighted={highlightedEditId === edit.id}
                  onToggle={() => onToggleEdit(edit.id)}
                  onViewInDocument={() => onViewInDocument(edit.id)}
                />
              </div>
            ))}
          </CardPanel>

          <CardFooter
            className={cn(
              "flex items-center justify-end border-t",
              cardBarPad,
              gap.sm
            )}
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={onRevertAll}
            >
              Revert all
            </Button>
            <Button type="button" size="sm" onClick={onDone}>
              Done
            </Button>
          </CardFooter>
        </CollapsiblePanel>
      </Card>
    </Collapsible>
  )
}

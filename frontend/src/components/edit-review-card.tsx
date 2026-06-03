import { useState } from "react"
import {
  IconArrowUp,
  IconArrowUpRight,
  IconCheck,
  IconChevronDown,
  IconRefresh,
} from "@tabler/icons-react"

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
import { Checkbox } from "@/components/ui/checkbox"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
} from "@/components/ui/input-group"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

/* ──────── Types ──────── */

export type EditType = "replace" | "delete"

export interface EditItem {
  id: string
  old: string
  new: string
  type: EditType
}

/** Each edit's current state */
export interface EditEntry {
  item: EditItem
  accepted: boolean
}

export interface EditReviewCardProps {
  /** Issue title shown in card header */
  issue: string
  /** Edit entries with current accepted state */
  edits: EditEntry[]
  /** Current input value */
  inputValue: string

  /* Actions */
  onToggleAccept: (editId: string) => void
  onAcceptAll: () => void
  onRevertAll: () => void
  onConfirm: () => void
  onViewInDocument: (editId: string) => void
  onInputChange: (value: string) => void
  onSend: () => void
}

/* ──────── Helpers ──────── */

function isLongEdit(item: EditItem): boolean {
  return item.old.length + (item.new?.length ?? 0) > 70
}

function truncateText(text: string, max = 80): string {
  return text.length > max ? `${text.slice(0, max)}…` : text
}

/* ──────── Edit Row ──────── */

function EditRow({
  edit,
  onToggleAccept,
  onViewInDocument,
  onRequestAlternative,
}: {
  edit: EditEntry
  onToggleAccept: () => void
  onViewInDocument: () => void
  onRequestAlternative: () => void
}) {
  const { item, accepted } = edit
  const isDelete = item.type === "delete"
  const long = isLongEdit(item)

  return (
    <div
      data-edit-id={item.id}
      data-slot="edit-row"
      className={cn(
        "group/row relative flex items-start gap-3 px-3.5 py-2.5 transition-colors hover:bg-accent/40",
      )}
    >
      {/* Checkbox */}
      <Checkbox
        checked={accepted}
        onCheckedChange={onToggleAccept}
        className="mt-0.5"
        aria-label={accepted ? "Accepting this edit" : "Not accepting this edit"}
      />

      {/* Content */}
      <div className="min-w-0 flex-1 break-words text-sm leading-snug">
        {isDelete ? (
          <span
            className={cn(
              accepted
                ? "text-muted-foreground line-through"
                : "font-medium text-foreground",
            )}
          >
            {item.old.trim()}
          </span>
        ) : long ? (
          <div className="flex flex-col gap-0.5">
            <span
              className={cn(
                "block",
                accepted
                  ? "text-muted-foreground line-through"
                  : "font-medium text-foreground",
              )}
            >
              {truncateText(item.old)}
            </span>
            <span className="block text-xs text-muted-foreground">&darr;</span>
            <span
              className={cn(
                "block",
                accepted
                  ? "font-medium text-foreground"
                  : "text-muted-foreground line-through",
              )}
            >
              {truncateText(item.new)}
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap items-baseline gap-1.5">
            <span
              className={cn(
                accepted
                  ? "text-muted-foreground line-through"
                  : "font-medium text-foreground",
              )}
            >
              {item.old}
            </span>
            <span className="text-muted-foreground">&rarr;</span>
            <span
              className={cn(
                accepted
                  ? "font-medium text-foreground"
                  : "text-muted-foreground line-through",
              )}
            >
              {item.new}
            </span>
          </div>
        )}

        {/* Hover actions */}
        <div className="mt-1 flex gap-2 opacity-0 transition-opacity group-hover/row:opacity-100">
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto gap-1 p-0 text-sm text-muted-foreground"
            onClick={(e) => {
              e.stopPropagation()
              onViewInDocument()
            }}
          >
            <IconArrowUpRight aria-hidden="true" />
            View
          </Button>
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto gap-1 p-0 text-sm text-muted-foreground"
            onClick={(e) => {
              e.stopPropagation()
              onRequestAlternative()
            }}
          >
            <IconRefresh aria-hidden="true" />
            Request alternative
          </Button>
        </div>
      </div>

      {/* Accepted count badge */}
      <Badge
        variant={accepted ? "success" : "secondary"}
        size="sm"
        className="mt-0.5 shrink-0"
      >
        {isDelete ? (accepted ? "remove" : "keep") : accepted ? "accept" : "skip"}
      </Badge>
    </div>
  )
}

/* ──────── Confirm Bar ──────── */

function ConfirmBar({
  acceptedCount,
  totalCount,
  onConfirm,
}: {
  acceptedCount: number
  totalCount: number
  onConfirm: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t bg-background px-3.5 py-2.5">
      <span className="text-sm text-muted-foreground">
        {acceptedCount} of {totalCount} accepted
      </span>
      <Button type="button" size="sm" onClick={onConfirm}>
        <IconCheck aria-hidden="true" />
        Confirm
      </Button>
    </div>
  )
}

/* ──────── Main Component ──────── */

export function EditReviewCard({
  issue,
  edits,
  inputValue,
  onToggleAccept,
  onAcceptAll,
  onRevertAll,
  onConfirm,
  onViewInDocument,
  onInputChange,
  onSend,
}: EditReviewCardProps) {
  const [open, setOpen] = useState(true)

  const acceptedCount = edits.filter((e) => e.accepted).length

  const handleRequestAlternative = (editId: string) => {
    onInputChange(`Try a different suggestion for @${editId} `)
  }

  const handleSendKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  return (
    <div className="flex flex-col">
      {/* Edit Group Card — sticky at bottom */}
      <Collapsible open={open} onOpenChange={setOpen}>
        <Card className="w-full min-w-0 overflow-hidden rounded-xl py-0 shadow-xs/5">
          <CardHeader className="flex flex-row items-center gap-2 border-b px-3.5 py-2.5">
            <CardTitle className="min-w-0 flex-1 text-sm font-medium leading-snug">
              {issue}
            </CardTitle>
            <CollapsibleTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 shrink-0 gap-1 px-1.5 text-muted-foreground"
                />
              }
            >
              <span className="text-sm tabular-nums">
                {edits.length} edits
              </span>
              <IconChevronDown
                aria-hidden="true"
                className={cn(
                  "size-3.5 transition-transform",
                  open && "rotate-180",
                )}
              />
            </CollapsibleTrigger>
          </CardHeader>

          <CollapsiblePanel>
            <CardPanel className="p-0">
              {edits.map((edit, index) => (
                <div key={edit.item.id}>
                  {index > 0 ? <Separator /> : null}
                  <EditRow
                    edit={edit}
                    onToggleAccept={() => onToggleAccept(edit.item.id)}
                    onViewInDocument={() => onViewInDocument(edit.item.id)}
                    onRequestAlternative={() =>
                      handleRequestAlternative(edit.item.id)
                    }
                  />
                </div>
              ))}
            </CardPanel>

            <CardFooter className="flex items-center justify-between border-t px-3.5 py-2">
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-sm text-muted-foreground"
                  onClick={onAcceptAll}
                >
                  Accept all
                </Button>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-sm text-muted-foreground"
                  onClick={onRevertAll}
                >
                  Revert all
                </Button>
              </div>
              <span className="text-sm text-muted-foreground">
                {acceptedCount}/{edits.length}
              </span>
            </CardFooter>
          </CollapsiblePanel>
        </Card>
      </Collapsible>

      {/* Confirm Bar — always visible when edits exist */}
      <ConfirmBar
        acceptedCount={acceptedCount}
        totalCount={edits.length}
        onConfirm={onConfirm}
      />

      {/* Input Area — always Send, never morphs */}
      <div className="border-t bg-background px-3 py-3">
        <InputGroup className="w-full min-w-0">
          <InputGroupTextarea
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleSendKeyDown}
            placeholder="Ask about these edits or send a message…"
            rows={3}
          />
          <InputGroupAddon align="block-end" className="justify-end">
            <Button
              type="button"
              size="icon-sm"
              variant={inputValue.trim() ? "default" : "ghost"}
              disabled={!inputValue.trim()}
              aria-label="Send message"
              onClick={onSend}
            >
              <IconArrowUp aria-hidden="true" />
            </Button>
          </InputGroupAddon>
        </InputGroup>
      </div>
    </div>
  )
}

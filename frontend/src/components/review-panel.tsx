import { useState } from "react"
import {
  ArrowDown01Icon,
  CheckmarkCircle02Icon,
  Delete02Icon,
  MultiplicationSignIcon,
} from "@hugeicons/core-free-icons"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardPanel, CardTitle } from "@/components/ui/card"
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { HugeiconsIcon } from "@/lib/icons"
import type { Edit, EditGroup } from "@/lib/agent-protocol"
import { cardBarPad, gap, p, rowPad, stack } from "@/lib/spacing"
import { cn } from "@/lib/utils"

/** Groups that still need user attention (action state, not chat history). */
const ACTIVE_STATUSES = new Set(["proposed", "partially_applied", "stale"])

export interface ReviewPanelProps {
  groups: EditGroup[]
  onApply: (groupId: string) => void
  onReject: (groupId: string) => void
  onDelete: (groupId: string) => void
  onSelectEdit?: (group: EditGroup, edit: Edit) => void
}

function EditPreview({
  edit,
  onClick,
}: {
  edit: Edit
  onClick?: () => void
}) {
  const stale = edit.status === "stale"
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left text-sm leading-snug",
        rowPad,
        stale && "opacity-60",
        onClick && "transition-colors hover:bg-accent/20",
      )}
    >
      {edit.kind === "delete" ? (
        <span className="text-muted-foreground line-through">{edit.old_text.trim()}</span>
      ) : edit.kind === "insert" ? (
        <span className="text-foreground">+ {edit.new_text.trim()}</span>
      ) : (
        <span className={cn("flex flex-wrap items-baseline", gap.sm)}>
          <span className="text-muted-foreground line-through">{edit.old_text}</span>
          <span className="text-muted-foreground">→</span>
          <span className="font-medium text-foreground">{edit.new_text}</span>
        </span>
      )}
      {edit.rationale ? (
        <span className="mt-0.5 block text-xs text-muted-foreground">{edit.rationale}</span>
      ) : null}
    </button>
  )
}

function statusBadge(group: EditGroup) {
  if (group.status === "stale") return { variant: "warning" as const, label: "Stale" }
  if (group.status === "partially_applied") {
    return { variant: "warning" as const, label: "Partial" }
  }
  return { variant: "info" as const, label: "Proposed" }
}

function GroupCard({
  group,
  onApply,
  onReject,
  onDelete,
  onSelectEdit,
}: {
  group: EditGroup
  onApply: (id: string) => void
  onReject: (id: string) => void
  onDelete: (id: string) => void
  onSelectEdit?: (group: EditGroup, edit: Edit) => void
}) {
  const [open, setOpen] = useState(true)
  const stale = group.status === "stale"
  const badge = statusBadge(group)
  const visibleEdits = group.edits.filter(
    (e) => e.status !== "deleted" && e.status !== "replaced",
  )

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="w-full min-w-0">
      <Card className={cn("w-full min-w-0 overflow-hidden rounded-lg", p[0].y)}>
        <CardHeader className={cn("flex flex-row items-start border-b", cardBarPad, gap.sm)}>
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-sm font-medium leading-snug">
              {group.title || "Suggested edits"}
            </CardTitle>
            <p className="truncate font-mono text-xs text-muted-foreground">{group.path}</p>
          </div>
          <Badge variant={badge.variant} size="sm" className="shrink-0">
            {badge.label}
          </Badge>
          <CollapsibleTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="shrink-0 text-muted-foreground"
                aria-label={open ? "Collapse" : "Expand"}
              />
            }
          >
            <HugeiconsIcon
              icon={ArrowDown01Icon}
              aria-hidden="true"
              className={cn("transition-transform", open && "rotate-180")}
            />
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsiblePanel>
          {group.summary ? (
            <p className={cn("text-xs text-muted-foreground", cardBarPad)}>{group.summary}</p>
          ) : null}
          <CardPanel className={p[0].all}>
            {visibleEdits.map((edit, index) => (
              <div key={edit.id}>
                {index > 0 ? <Separator /> : null}
                <EditPreview
                  edit={edit}
                  onClick={onSelectEdit ? () => onSelectEdit(group, edit) : undefined}
                />
              </div>
            ))}
          </CardPanel>

          <div className={cn("flex items-center justify-end border-t", cardBarPad, gap.sm)}>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => onDelete(group.id)}
            >
              <HugeiconsIcon icon={Delete02Icon} aria-hidden="true" />
              Delete
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onReject(group.id)}
            >
              <HugeiconsIcon icon={MultiplicationSignIcon} aria-hidden="true" />
              Reject
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={stale}
              onClick={() => onApply(group.id)}
            >
              <HugeiconsIcon icon={CheckmarkCircle02Icon} aria-hidden="true" />
              {stale ? "Stale" : "Apply"}
            </Button>
          </div>
        </CollapsiblePanel>
      </Card>
    </Collapsible>
  )
}

/**
 * Pinned, collapsible Review Queue. Lives above the chat message stream and
 * below the chat/model header; review cards are action state, not chat history.
 */
export function ReviewPanel({
  groups,
  onApply,
  onReject,
  onDelete,
  onSelectEdit,
}: ReviewPanelProps) {
  const [collapsed, setCollapsed] = useState(false)
  const active = groups.filter((g) => ACTIVE_STATUSES.has(g.status))
  const isEmpty = active.length === 0

  return (
    <div className="shrink-0 border-b border-border bg-muted/30">
      <div className={cn("flex items-center justify-between", p[3].x, p[2].y)}>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          disabled={isEmpty}
          className={cn(
            "flex items-center text-sm font-medium",
            gap.sm,
            isEmpty && "cursor-default text-muted-foreground",
          )}
        >
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            aria-hidden="true"
            className={cn(
              "transition-transform",
              (collapsed || isEmpty) && "-rotate-90",
            )}
          />
          Review Queue
          {isEmpty ? (
            <span className="font-normal text-muted-foreground">No suggestions</span>
          ) : (
            <Badge variant="info" size="sm">
              {active.length} {active.length === 1 ? "suggestion" : "suggestions"}
            </Badge>
          )}
        </button>
      </div>

      {!collapsed && !isEmpty ? (
        <ScrollArea className="max-h-72" scrollFade>
          <div className={cn(p[3].x, p[2].bottom, stack.sm)}>
            {active.map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                onApply={onApply}
                onReject={onReject}
                onDelete={onDelete}
                onSelectEdit={onSelectEdit}
              />
            ))}
          </div>
        </ScrollArea>
      ) : null}
    </div>
  )
}

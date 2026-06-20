import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons"
import { Fragment, useEffect, useMemo, useState } from "react"

import { EditDiffPreview } from "@/components/edit-diff-preview"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Frame,
  FrameDescription,
  FrameFooter,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/ui/frame"
import { Separator } from "@/components/ui/separator"
import type { Edit, EditGroup } from "@/lib/agent-protocol"
import { reviewDockLaneClass } from "@/lib/content-layout"
import { HugeiconsIcon } from "@/lib/icons"
import { shell } from "@/lib/shell-chrome"
import { gap, p, row } from "@/lib/spacing"
import { cn } from "@/lib/utils"

/**
 * Review queue Frame — 定稿 v1
 * （review-frame-design-mockups.html · 2025-06）
 *
 * Frame rounded-3xl bg-sidebar p-1 (chat lane — same family as Composer)
 * FramePanel rounded-lg (Settings browse parity) · px-4 py-3 rows + Separator
 * Header pt/px p-4 · pb-3 (Desc↔diff) · Badge secondary sm
 * Footer py-2 pe-2 ps-4 · pager ← 1/N → (multi) · Apply outline · Dismiss ghost
 * Diff: text-sm leading-[1.43] · no clamp
 */

/** Diff row — p-4 (matches Settings browse rows). */
const reviewDiffRowPad = p[4].all

/** FramePanel — rounded-lg (shell.reviewQueuePanel). */
const reviewPanelRadiusClass = shell.reviewQueuePanel

/** Header — section p-4, Desc↔diff pb-3. */
const reviewHeaderPb = p[3].bottom

/** Opaque shell — theme `--muted` is alpha-only; sidebar is solid. */
const reviewFrameShellClass = cn(
  reviewDockLaneClass,
  shell.reviewQueueFrame,
  "w-full min-w-0 overflow-hidden !bg-sidebar [overflow-anchor:none]",
)

const reviewFrameHeaderClass = cn(
  p[4].x,
  p[4].top,
  p[4].start,
  reviewHeaderPb,
  gap.none,
  "bg-sidebar",
)

/** Footer — 8px inset; overrides FrameFooter default px-5. */
const reviewFrameFooterPad = cn(
  p[0].x,
  p[2].y,
  p[2].end,
  p[2].start,
  "bg-sidebar",
)

/** Diff stack — COSS p-frame-4: FramePanel default chrome + p-0 only. */
const reviewFramePanelStackClass = cn(
  p[0].all,
  reviewPanelRadiusClass,
  "overflow-hidden",
)

/** Full-width diff row — click jumps to source in the document. */
const reviewDiffRowButtonClass = cn(
  reviewDiffRowPad,
  "block w-full min-w-0 cursor-pointer text-left transition-colors",
  "hover:bg-muted/50",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
)

/** Title row — flex keeps title/description left edges aligned. */
const reviewFrameTitleRow = cn(row.sm, "min-w-0 w-full items-start justify-between")

/** Header title stack. */
const reviewFrameInnerStack = cn("flex flex-col", gap.none)

/** Groups that still need user attention (action state, not chat history). */
const ACTIVE_STATUSES = new Set(["proposed", "partially_applied", "stale"])

export interface ReviewPanelProps {
  groups: EditGroup[]
  onApply: (groupId: string) => void
  onDismiss: (groupId: string) => void
  onRejectEdit?: (groupId: string, editId: string) => void
  onSelectEdit?: (group: EditGroup, edit: Edit) => void
  onAddEditToChat?: (group: EditGroup, edit: Edit) => void
  className?: string
}

function visibleEdits(group: EditGroup): Edit[] {
  return group.edits.filter((edit) => edit.status !== "dismissed")
}

function activeGroups(groups: EditGroup[]): EditGroup[] {
  return groups.filter(
    (group) =>
      ACTIVE_STATUSES.has(group.status) && visibleEdits(group).length > 0,
  )
}

export function hasActiveReviewGroups(groups: EditGroup[]): boolean {
  return activeGroups(groups).length > 0
}

function normalizeGroupTitle(raw: string): string {
  const trimmed = raw.trim()
  const stripped = trimmed.replace(/^Edit\s+\d+\s*:\s*/i, "").trim()
  return stripped || trimmed
}

function groupDescription(
  title: string,
  summary?: string,
  rationale?: string,
): string | undefined {
  if (summary && summary !== title) return summary
  if (rationale && rationale !== title && rationale !== summary) return rationale
  return undefined
}

function groupHeading(group: EditGroup): { title: string; description?: string } {
  const rawTitle = group.title?.trim()
  const summary = group.summary?.trim()
  const rationale = group.rationale?.trim()

  if (rawTitle) {
    const title = normalizeGroupTitle(rawTitle)
    return {
      title,
      description: groupDescription(title, summary, rationale),
    }
  }
  if (summary) {
    const title = normalizeGroupTitle(summary)
    return {
      title,
      description: groupDescription(title, undefined, rationale),
    }
  }
  if (rationale) return { title: rationale }
  return { title: "Suggested edits" }
}

function ReviewEditDiffRow({
  edit,
  group,
  onSelectEdit,
}: {
  edit: Edit
  group: EditGroup
  onSelectEdit?: (group: EditGroup, edit: Edit) => void
}) {
  const preview = (
    <EditDiffPreview
      kind={edit.kind}
      oldText={edit.old_text}
      newText={edit.new_text}
      className="min-w-0 w-full"
    />
  )

  if (!onSelectEdit) {
    return <div className={reviewDiffRowPad}>{preview}</div>
  }

  return (
    <button
      type="button"
      className={reviewDiffRowButtonClass}
      aria-label="Jump to source"
      onClick={() => onSelectEdit(group, edit)}
    >
      {preview}
    </button>
  )
}

function ReviewQueuePager({
  pageIndex,
  pageCount,
  onPrev,
  onNext,
}: {
  pageIndex: number
  pageCount: number
  onPrev: () => void
  onNext: () => void
}) {
  if (pageCount <= 1) return null

  return (
    <div className={cn(row.xs, "shrink-0 items-center")} aria-label="Edit groups">
      <Button
        type="button"
        size="icon-sm"
        variant="outline"
        aria-label="Previous edit group"
        onClick={onPrev}
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} aria-hidden="true" />
      </Button>
      <span
        className="min-w-[2.75rem] text-center text-sm font-semibold tabular-nums"
        aria-live="polite"
      >
        {pageIndex + 1}
        <span className="font-medium text-muted-foreground"> / {pageCount}</span>
      </span>
      <Button
        type="button"
        size="icon-sm"
        variant="outline"
        aria-label="Next edit group"
        onClick={onNext}
      >
        <HugeiconsIcon icon={ArrowRight01Icon} aria-hidden="true" />
      </Button>
    </div>
  )
}

/** One EditGroup — always-expanded Frame; title + summary in header with normal stack rhythm. */
function ReviewGroupFrame({
  group,
  pageIndex,
  pageCount,
  onPrevPage,
  onNextPage,
  onApply,
  onDismiss,
  onSelectEdit,
}: {
  group: EditGroup
  pageIndex: number
  pageCount: number
  onPrevPage: () => void
  onNextPage: () => void
  onApply: (groupId: string) => void
  onDismiss: (groupId: string) => void
  onSelectEdit?: (group: EditGroup, edit: Edit) => void
}) {
  const stale = group.status === "stale"
  const edits = visibleEdits(group)
  const { title, description } = groupHeading(group)

  return (
    <Frame className={reviewFrameShellClass}>
      <FrameHeader className={reviewFrameHeaderClass}>
        <div className={cn(reviewFrameInnerStack, "min-w-0 w-full")}>
          <div className={reviewFrameTitleRow}>
            <FrameTitle className="min-w-0 flex-1 text-left">{title}</FrameTitle>
            {/* Badge variant="secondary" size="sm" — 定稿 v1 */}
            <div className={cn(row.sm, "shrink-0 items-center")}>
              {stale ? (
                <Badge variant="secondary" size="sm">
                  Stale
                </Badge>
              ) : null}
              <Badge variant="secondary" size="sm" className="tabular-nums">
                {edits.length} edit{edits.length === 1 ? "" : "s"}
              </Badge>
            </div>
          </div>
          {description ? (
            <FrameDescription>{description}</FrameDescription>
          ) : null}
        </div>
      </FrameHeader>

      <FramePanel className={reviewFramePanelStackClass}>
        {edits.map((edit, index) => (
          <Fragment key={edit.id}>
            {index > 0 ? <Separator /> : null}
            <ReviewEditDiffRow
              edit={edit}
              group={group}
              onSelectEdit={onSelectEdit}
            />
          </Fragment>
        ))}
      </FramePanel>
      <FrameFooter
        className={cn(
          reviewFrameFooterPad,
          row.sm,
          "box-border w-full min-w-0",
          pageCount > 1 ? "justify-between" : "justify-end",
        )}
      >
        <ReviewQueuePager
          pageIndex={pageIndex}
          pageCount={pageCount}
          onPrev={onPrevPage}
          onNext={onNextPage}
        />
        <div className={cn(row.sm, "shrink-0 items-center")}>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onDismiss(group.id)}
          >
            Dismiss all
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={stale}
            onClick={() => onApply(group.id)}
          >
            Apply all
          </Button>
        </div>
      </FrameFooter>
    </Frame>
  )
}

/** Active queue — one Frame at a time; Footer pager when length > 1. */
export function ReviewPanel({
  groups,
  onApply,
  onDismiss,
  onSelectEdit,
  className,
}: ReviewPanelProps) {
  const queueGroups = useMemo(() => activeGroups(groups), [groups])
  const [pageIndex, setPageIndex] = useState(0)

  useEffect(() => {
    setPageIndex((prev) =>
      queueGroups.length === 0
        ? 0
        : Math.min(prev, queueGroups.length - 1),
    )
  }, [queueGroups.length])

  if (queueGroups.length === 0) return null

  const safeIndex = Math.min(pageIndex, queueGroups.length - 1)
  const group = queueGroups[safeIndex]!
  const pageCount = queueGroups.length

  const goPrev = () => {
    setPageIndex((prev) => (prev - 1 + pageCount) % pageCount)
  }
  const goNext = () => {
    setPageIndex((prev) => (prev + 1) % pageCount)
  }

  return (
    <div className={cn("min-w-0 [overflow-anchor:none]", className)}>
      <ReviewGroupFrame
        group={group}
        pageIndex={safeIndex}
        pageCount={pageCount}
        onPrevPage={goPrev}
        onNextPage={goNext}
        onApply={onApply}
        onDismiss={onDismiss}
        onSelectEdit={onSelectEdit}
      />
    </div>
  )
}

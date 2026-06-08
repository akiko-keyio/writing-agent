import { shell } from "@/lib/shell-chrome"
import { row } from "@/lib/spacing"
import { cn } from "@/lib/utils"

/**
 * Two-line menu/list label without a leading icon.
 * Matches `ModelMenuTwoLineEntry` — not `ProjectEntryLines` (that uses icon + `ps-6` subtitle).
 */
export function MenuTwoLineEntry({
  title,
  subtitle,
  meta,
  className,
}: {
  title: string
  subtitle?: string
  meta?: React.ReactNode
  className?: string
}) {
  return (
    <span className={cn(shell.projectMenuEntry, "w-full", className)}>
      {meta ? (
        <span className={cn(shell.projectMenuTitleRow, "min-w-0 flex-wrap")}>
          <span className={shell.projectMenuLine}>{title}</span>
          {meta}
        </span>
      ) : (
        <span className={shell.projectMenuLine}>{title}</span>
      )}
      {subtitle ? (
        <span className={shell.projectMenuLineMuted}>{subtitle}</span>
      ) : null}
    </span>
  )
}

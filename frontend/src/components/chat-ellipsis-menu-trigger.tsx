import { HugeiconsIcon } from "@hugeicons/react"
import { MoreHorizontalIcon } from "@hugeicons/core-free-icons"

import { ShellIconButton } from "@/components/chrome-toolbar-button"
import { shell } from "@/lib/shell/chrome"

type ChatEllipsisMenuTriggerProps = {
  label: string
}

/** Shared … trigger for chat panel header + assistant message menus. */
export function ChatEllipsisMenuTrigger({ label }: ChatEllipsisMenuTriggerProps) {
  return (
    <ShellIconButton label={label} className={shell.panelHeaderIcon}>
      <HugeiconsIcon icon={MoreHorizontalIcon} aria-hidden="true" />
    </ShellIconButton>
  )
}

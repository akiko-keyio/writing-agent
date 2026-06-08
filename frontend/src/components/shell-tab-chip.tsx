import { HugeiconsIcon } from "@hugeicons/react";
import {
  Cancel01Icon,
  File01Icon,
  FileAttachmentIcon,
  FileBracesIcon,
  FileScriptIcon,
  Settings01Icon,
} from "@hugeicons/core-free-icons"

import { MiddleTruncateLabel } from "@/components/middle-truncate-label"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip"
import { SETTINGS_PATH } from "@/lib/document-tabs"
import { shell } from "@/lib/shell-chrome"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

function documentTabIcon(path: string): ReactNode {
  if (path === SETTINGS_PATH) {
    return <HugeiconsIcon icon={Settings01Icon} aria-hidden="true" />
  }
  const ext = path.split(".").pop()?.toLowerCase()

  switch (ext) {
    case "md":
    case "mdx":
      return <HugeiconsIcon icon={FileAttachmentIcon} aria-hidden="true" />
    case "json":
      return <HugeiconsIcon icon={FileBracesIcon} aria-hidden="true" />
    case "ts":
    case "tsx":
    case "js":
    case "jsx":
      return <HugeiconsIcon icon={FileScriptIcon} aria-hidden="true" />
    default:
      return <HugeiconsIcon icon={File01Icon} aria-hidden="true" />
  }
}

export function ShellTabChip({
  label,
  active,
  onSelect,
  onClose,
  closeLabel,
  filePath,
  dirty = false,
  closeAlwaysVisible = false,
}: {
  label: string
  active: boolean
  onSelect: () => void
  onClose: () => void
  closeLabel: string
  filePath: string
  dirty?: boolean
  closeAlwaysVisible?: boolean
}) {
  return (
    <div
      className={cn(shell.documentTab, active && shell.documentTabActive)}
    >
      <div className={shell.documentTabMain}>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                role="tab"
                aria-selected={active}
                variant="ghost"
                size="default"
                data-pressed={active ? "" : undefined}
                className={shell.documentTabButton}
                onClick={onSelect}
              />
            }
          >
            <span className="relative shrink-0">
              {documentTabIcon(filePath)}
              {dirty ? (
                <span className={shell.documentTabDirty} aria-hidden="true" />
              ) : null}
            </span>
            <MiddleTruncateLabel className={shell.documentTabLabel} title={filePath}>
              {label}
            </MiddleTruncateLabel>
          </TooltipTrigger>
          <TooltipPopup side="bottom">{filePath}</TooltipPopup>
        </Tooltip>
      </div>
      <div
        aria-hidden="true"
        className={shell.documentTabHoverFadeProps.className}
        style={shell.documentTabHoverFadeProps.style}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className={cn(
          shell.documentTabClose,
          closeAlwaysVisible && "pointer-events-auto opacity-100"
        )}
        aria-label={closeLabel}
        onClick={(event) => {
          event.stopPropagation()
          onClose()
        }}
      >
        <HugeiconsIcon icon={Cancel01Icon} aria-hidden="true" />
      </Button>
    </div>
  )
}

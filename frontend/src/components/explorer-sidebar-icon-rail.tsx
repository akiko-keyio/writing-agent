import {
  LibraryIcon,
  ListIndentIncreaseIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import type { ExplorerView } from "@/components/canvas-chrome"
import { ShellTooltipIconButton } from "@/components/chrome-toolbar-button"
import { shell } from "@/lib/shell-chrome"
import { Tabs, TabsList, TabsTab } from "@/components/ui/tabs"
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip"
import { gap } from "@/lib/spacing"
import { cn } from "@/lib/utils"

/** Tabs 无匹配项时隐藏 Files/Outline 指示条 */
const EXPLORER_TAB_SENTINEL = "__explorer-none__"

export const EXPLORER_RAIL_ITEMS = [
  { value: "file" as const, label: "Files", icon: LibraryIcon },
  { value: "outline" as const, label: "Outline", icon: ListIndentIncreaseIcon },
] as const

export function ExplorerSidebarIconRail({
  value,
  onValueChange,
  placement = "top-bar",
  className,
}: {
  value: ExplorerView
  onValueChange: (view: ExplorerView) => void
  placement?: "top-bar" | "panel" | "inline"
  className?: string
}) {
  const tabValue =
    value === "file" || value === "outline" ? value : EXPLORER_TAB_SENTINEL

  return (
    <div
      className={cn(
        placement === "panel"
          ? shell.explorerIconRail
          : placement === "top-bar"
            ? shell.topBarExplorerIconRail
            : cn("flex items-center", gap.sm),
        className
      )}
    >
      <Tabs
        value={tabValue}
        onValueChange={(next) => {
          if (next === "file" || next === "outline") onValueChange(next)
        }}
        className={cn("flex items-center", gap.sm)}
      >
        <TabsList
          variant="default"
          className={cn(
            "h-9 rounded-lg bg-transparent p-0 text-sidebar-foreground",
            gap.sm,
            "[&>[data-slot=tab-indicator]]:bg-accent [&>[data-slot=tab-indicator]]:shadow-none"
          )}
          aria-label="Explorer views"
        >
          {EXPLORER_RAIL_ITEMS.map(({ value: itemValue, label, icon }) => (
            <Tooltip key={itemValue}>
              <TooltipTrigger
                render={
                  <TabsTab
                    value={itemValue}
                    aria-label={label}
                    title={label}
                    className="size-9 sm:size-9 rounded-md border-transparent px-0 hover:bg-transparent [&_svg:not([class*='opacity-'])]:opacity-80"
                  />
                }
              >
                <HugeiconsIcon icon={icon} aria-hidden="true" />
              </TooltipTrigger>
              <TooltipPopup side="bottom">{label}</TooltipPopup>
            </Tooltip>
          ))}
        </TabsList>
      </Tabs>
    </div>
  )
}

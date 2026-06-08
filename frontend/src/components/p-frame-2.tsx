/**
 * Adapted from coss particle p-frame-2:
 * https://coss.com/ui/r/p-frame-2.json
 */
import { ArrowDown01Icon, Delete01Icon } from "@hugeicons/core-free-icons"

import { MenuTwoLineEntry } from "@/components/menu-two-line-entry"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Frame, FrameHeader, FramePanel } from "@/components/ui/frame"
import { HugeiconsIcon } from "@/lib/icons"
import { gap, p } from "@/lib/spacing"
import { cn } from "@/lib/utils"

export type FrameCollapsibleItemProps = {
  className?: string
  panelClassName?: string
  title: string
  subtitle?: string
  deletable?: boolean
  onDelete?: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

export function FrameCollapsibleItem({
  className,
  panelClassName,
  title,
  subtitle,
  deletable = false,
  onDelete,
  open,
  onOpenChange,
  children,
}: FrameCollapsibleItemProps) {
  return (
    <Frame className={cn("w-full", className)}>
      <Collapsible open={open} onOpenChange={onOpenChange}>
        <FrameHeader
          className={cn("flex-row items-center justify-between", p[2].x, p[2].y)}
        >
          <CollapsibleTrigger
            className={cn(
              gap.sm,
              "data-panel-open:[&_svg]:rotate-180",
              "h-auto min-h-8 min-w-0 flex-1 justify-start py-2 font-normal text-sm sm:min-h-7",
            )}
            render={<Button type="button" variant="ghost" size="sm" />}
          >
            <HugeiconsIcon
              icon={ArrowDown01Icon}
              className="mt-0.5 size-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <MenuTwoLineEntry title={title} subtitle={subtitle} />
          </CollapsibleTrigger>
          {deletable ? (
            <Button
              type="button"
              aria-label="Delete"
              size="icon-sm"
              variant="ghost"
              onClick={onDelete}
            >
              <HugeiconsIcon icon={Delete01Icon} aria-hidden="true" />
            </Button>
          ) : null}
        </FrameHeader>
        <CollapsiblePanel className="min-w-0">
          <FramePanel className={panelClassName}>{children}</FramePanel>
        </CollapsiblePanel>
      </Collapsible>
    </Frame>
  )
}

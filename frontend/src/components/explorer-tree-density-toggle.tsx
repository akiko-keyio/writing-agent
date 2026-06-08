import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { ExplorerTreeRowDensity } from "@/lib/explorer-tree-row-density"
import { row, p } from "@/lib/spacing"
import { cn } from "@/lib/utils"

export function ExplorerTreeDensityToggle({
  value,
  onValueChange,
  className,
}: {
  value: ExplorerTreeRowDensity
  onValueChange: (value: ExplorerTreeRowDensity) => void
  className?: string
}) {
  return (
    <div
      className={cn(
        "shrink-0 border-t border-border",
        row.sm,
        p[2].x,
        p[1.5].y,
        className
      )}
    >
      <ToggleGroup
        multiple={false}
        value={[value]}
        onValueChange={(next) => {
          const picked = next[0]
          if (picked === "compact" || picked === "relax") {
            onValueChange(picked)
          }
        }}
        size="sm"
        variant="outline"
        className="w-full"
      >
        <ToggleGroupItem value="compact" className="min-w-0 flex-1">
          Compact 28
        </ToggleGroupItem>
        <ToggleGroupItem value="relax" className="min-w-0 flex-1">
          Relax 32
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  )
}

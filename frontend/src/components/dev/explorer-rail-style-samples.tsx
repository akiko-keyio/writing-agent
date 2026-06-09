import { HugeiconsIcon } from "@hugeicons/react"
import { useState, type ReactNode } from "react"

import { ShellTooltipIconButton } from "@/components/chrome-toolbar-button"
import type { ExplorerView } from "@/components/canvas-chrome"
import { EXPLORER_RAIL_ITEMS } from "@/components/explorer-sidebar-icon-rail"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTab } from "@/components/ui/tabs"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { gap, p, row, stack } from "@/lib/spacing"
import { cn } from "@/lib/utils"

const PREVIEW_CHROME = cn(
  "flex min-h-14 items-center rounded-lg border border-border bg-background",
  gap.md,
  p[4].x,
  p[3].y
)

function RailLegend() {
  return (
    <div className={cn("flex flex-wrap items-center", gap.lg)}>
      {EXPLORER_RAIL_ITEMS.map(({ label, icon }) => (
        <span
          key={label}
          className={cn("inline-flex items-center text-sm text-foreground", gap.sm)}
        >
          <span className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-background">
            <HugeiconsIcon icon={icon} aria-hidden="true" className="size-4" />
          </span>
          <span>{label}</span>
        </span>
      ))}
    </div>
  )
}

function IconRailButtons({
  value,
  onValueChange,
  buttonClassName,
  activeClassName,
  large = false,
}: {
  value: ExplorerView
  onValueChange: (view: ExplorerView) => void
  buttonClassName?: string
  activeClassName?: string
  large?: boolean
}) {
  return (
    <div className={row.xs}>
      {EXPLORER_RAIL_ITEMS.map(({ value: itemValue, label, icon }) => {
        const active = value === itemValue
        return (
          <ShellTooltipIconButton
            key={itemValue}
            label={label}
            tooltip={label}
            side="bottom"
            variant={active ? "secondary" : "outline"}
            className={cn(
              buttonClassName,
              large && "size-8 sm:size-8",
              active && activeClassName
            )}
            onClick={() => onValueChange(itemValue)}
          >
            <HugeiconsIcon icon={icon} aria-hidden="true" />
          </ShellTooltipIconButton>
        )
      })}
    </div>
  )
}

function StyleCard({
  title,
  note,
  selected,
  children,
}: {
  title: string
  note: string
  selected: ExplorerView
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card",
        stack.md,
        p[4].all
      )}
    >
      <div className={stack.xs}>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{note}</p>
        <p className="text-sm text-foreground">
          当前选中：
          <span className="font-medium">
            {selected === "file" ? "Files" : "Outline"}
          </span>
        </p>
      </div>
      <div className={PREVIEW_CHROME}>{children}</div>
    </div>
  )
}

export function ExplorerRailStyleSamples() {
  const referenceIcon = EXPLORER_RAIL_ITEMS[0].icon
  const [a, setA] = useState<ExplorerView>("file")
  const [b, setB] = useState<ExplorerView>("file")
  const [c, setC] = useState<ExplorerView>("file")
  const [d, setD] = useState<ExplorerView>("file")
  const [e, setE] = useState<ExplorerView>("file")
  const [f, setF] = useState<ExplorerView>("file")

  return (
    <div className={stack.lg}>
      <div
        className={cn(
          "rounded-lg border border-border bg-muted/40",
          p[4].x,
          p[3].y
        )}
      >
        <p className={cn("text-sm font-medium text-foreground", p[3].bottom)}>
          图例
        </p>
        <RailLegend />
      </div>

      <StyleCard
        title="A · 当前（outline / secondary）"
        note="生产环境：Library Menu + Files/Outline outline 钮，选中 secondary"
        selected={a}
      >
        <IconRailButtons value={a} onValueChange={setA} activeClassName="" />
      </StyleCard>

      <StyleCard
        title="B · 更大图标钮"
        note="Button ghost + icon（约 32×32px）"
        selected={b}
      >
        <IconRailButtons
          value={b}
          onValueChange={setB}
          large
          activeClassName=""
        />
      </StyleCard>

      <StyleCard
        title="C · 描边分段（Toggle outline）"
        note="ToggleGroup variant=outline；若仍空白说明 ToggleGroup 需继续修"
        selected={c}
      >
        <ToggleGroup
          multiple={false}
          value={[c]}
          onValueChange={(next) => {
            const tab = next[0]
            if (tab === "file" || tab === "outline") setC(tab)
          }}
          size="sm"
          variant="outline"
        >
          {EXPLORER_RAIL_ITEMS.map(({ value: itemValue, label, icon }) => (
            <ToggleGroupItem
              key={itemValue}
              value={itemValue}
              aria-label={label}
              title={label}
            >
              <HugeiconsIcon icon={icon} aria-hidden="true" />
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </StyleCard>

      <StyleCard
        title="D · Ghost + 边框强调"
        note="在 A 的基础上选中项加边框，对比更明显"
        selected={d}
      >
        <IconRailButtons
          value={d}
          onValueChange={setD}
          buttonClassName="border border-transparent"
          activeClassName=""
        />
      </StyleCard>

      <StyleCard
        title="E · Tabs 胶囊"
        note="TabsList muted 底 + 滑动指示器"
        selected={e}
      >
        <Tabs
          value={e}
          onValueChange={(next) => {
            if (next === "file" || next === "outline") setE(next)
          }}
        >
          <TabsList className={cn("h-8", p[0.5].all)}>
            {EXPLORER_RAIL_ITEMS.map(({ value: itemValue, label, icon }) => (
              <TabsTab
                key={itemValue}
                value={itemValue}
                aria-label={label}
                title={label}
                className={cn("size-7 sm:size-7", p[1.5].x)}
              >
                <HugeiconsIcon icon={icon} aria-hidden="true" />
              </TabsTab>
            ))}
          </TabsList>
        </Tabs>
      </StyleCard>

      <StyleCard
        title="F · 文字按钮"
        note="图标改文字标签"
        selected={f}
      >
        <div className={row.xs}>
          {EXPLORER_RAIL_ITEMS.map(({ value: itemValue, label }) => {
            const active = f === itemValue
            return (
              <Button
                key={itemValue}
                type="button"
                variant={active ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setF(itemValue)}
              >
                {label}
              </Button>
            )
          })}
        </div>
      </StyleCard>

      <div
        className={cn(
          "rounded-lg border border-dashed border-border bg-muted/30",
          p[3].all
        )}
      >
        <p className="text-sm text-muted-foreground">
          生产环境使用样式 A。若样式 C（ToggleGroup）仍空白，请忽略并选 A/B/D/E/F。
        </p>
        <div className={cn("mt-2 flex flex-wrap items-center", gap.sm)}>
          <Button type="button" variant="outline" size="sm">
            outline sm
          </Button>
          <Button type="button" variant="ghost" size="icon-sm">
            <HugeiconsIcon icon={referenceIcon} aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  )
}

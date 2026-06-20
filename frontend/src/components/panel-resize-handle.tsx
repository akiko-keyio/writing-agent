import type { CSSProperties } from "react"

import { cn } from "@/lib/shared/utils"

/** 面板边缘拖拽条（VS Code 式列宽调整） */
export function PanelResizeHandle({
  edge = "end",
  span = "panel",
  onPointerDown,
  className,
  style,
}: {
  /** 竖线贴齐拖拽条哪一侧（Explorer 右缘用 end，Chat 左缘用 start） */
  edge?: "start" | "end"
  /** `viewport`：相对整屏壳层定位，分割线贯穿顶栏与内容区 */
  span?: "panel" | "viewport"
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
  className?: string
  style?: CSSProperties
}) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize panel"
      onPointerDown={onPointerDown}
      style={style}
      className={cn(
        "absolute z-20 w-1 shrink-0 touch-none select-none",
        "cursor-col-resize bg-transparent hover:bg-border active:bg-border",
        "before:absolute before:inset-y-0 before:w-px before:bg-border",
        edge === "start"
          ? "before:left-0 before:translate-x-0"
          : "before:right-0 before:translate-x-0",
        "top-0 h-full",
        span === "panel" && (edge === "end" ? "right-0" : "left-0"),
        className,
      )}
    />
  )
}

import { useCallback, useRef, useState } from "react"

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * 拖拽调整面板宽度（pointer 捕获，松开结束）。
 */
export function usePanelResize({
  initial,
  min,
  max,
  direction,
}: {
  initial: number
  min: number
  max: number
  /** 左侧面板：拖右缘增宽；右侧面板：拖左缘增宽 */
  direction: "ltr-panel" | "rtl-panel"
}) {
  const [width, setWidth] = useState(initial)
  const [isResizing, setIsResizing] = useState(false)
  const widthRef = useRef(width)
  widthRef.current = width

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault()
      const handle = event.currentTarget
      const startX = event.clientX
      const startWidth = widthRef.current
      setIsResizing(true)
      handle.setPointerCapture(event.pointerId)

      const onPointerMove = (moveEvent: PointerEvent) => {
        const delta =
          direction === "ltr-panel"
            ? moveEvent.clientX - startX
            : startX - moveEvent.clientX
        setWidth(clamp(startWidth + delta, min, max))
      }

      const endResize = (endEvent: PointerEvent) => {
        setIsResizing(false)
        if (handle.hasPointerCapture(endEvent.pointerId)) {
          handle.releasePointerCapture(endEvent.pointerId)
        }
        window.removeEventListener("pointermove", onPointerMove)
        window.removeEventListener("pointerup", endResize)
        window.removeEventListener("pointercancel", endResize)
      }

      window.addEventListener("pointermove", onPointerMove)
      window.addEventListener("pointerup", endResize)
      window.addEventListener("pointercancel", endResize)
    },
    [direction, min, max],
  )

  const setWidthClamped = useCallback(
    (next: number) => {
      setWidth(clamp(next, min, max))
    },
    [min, max],
  )

  return { width, isResizing, onPointerDown, setWidth: setWidthClamped }
}

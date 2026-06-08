import type { ReactNode } from "react"
import type { IconSvgElement } from "@hugeicons/react"
import { HugeiconsIcon } from "@hugeicons/react"

import { ShellTooltipIconButton } from "@/components/chrome-toolbar-button"
import { shell } from "@/lib/shell-chrome"
import { cn } from "@/lib/utils"

/**
 * PanelHeader — 面板头模板
 *
 * 统一 Explorer / Chat / Document 面板头布局：
 * - 图标 + 标题（左侧）
 * - 操作按钮组（右侧，ms-auto）
 *
 * 间距 / 颜色 / 圆角全部由 shell.panelHeader 承担。
 *
 * @example
 * ```tsx
 * <PanelHeader icon={Files01Icon} title="Files">
 *   <ShellTooltipIconButton label="New file" size="icon-xs">
 *     <HugeiconsIcon icon={Add01Icon} aria-hidden="true" />
 *   </ShellTooltipIconButton>
 * </PanelHeader>
 * ```
 */

export interface PanelHeaderProps {
  /** 面板图标（Hugeicons IconSvgElement） */
  icon?: IconSvgElement
  /** 面板标题 */
  title?: string
  /** 右侧操作按钮组 */
  children?: ReactNode
  /** 自定义 className */
  className?: string
}

export function PanelHeader({
  icon,
  title,
  children,
  className,
}: PanelHeaderProps) {
  return (
    <header className={cn(shell.panelHeader, className)}>
      {icon ? (
        <HugeiconsIcon
          icon={icon}
          className={shell.panelHeaderIcon}
          aria-hidden="true"
        />
      ) : null}
      {title ? (
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
          {title}
        </span>
      ) : null}
      {children ? (
        <div className="ms-auto flex shrink-0 items-center">
          {children}
        </div>
      ) : null}
    </header>
  )
}

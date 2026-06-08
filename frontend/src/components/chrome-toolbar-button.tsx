import type { ReactNode } from "react"

import { Button, type ButtonProps } from "@/components/ui/button"
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip"

type ShellIconButtonProps = {
  label: string
  children?: ReactNode
  className?: string
  variant?: ButtonProps["variant"]
} & Omit<ButtonProps, "children">

/** 壳层图标钮：默认 ghost + icon-lg（36×36px）；面板头可用 variant="outline" */
export function ShellIconButton({
  label,
  onClick,
  children,
  className,
  render,
  variant = "ghost",
  size = "icon-lg",
  ...props
}: ShellIconButtonProps) {
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      aria-label={label}
      onClick={onClick}
      className={className}
      render={render}
      {...props}
    >
      {children}
    </Button>
  )
}

type ShellTooltipIconButtonProps = ShellIconButtonProps & {
  tooltip?: string
  side?: "top" | "bottom" | "left" | "right"
}

/** 壳层图标钮 + coss Tooltip（Usage：TooltipTrigger render={Button}） */
export function ShellTooltipIconButton({
  label,
  tooltip,
  side = "bottom",
  onClick,
  children,
  className,
  variant = "ghost",
  size = "icon-lg",
  ...props
}: ShellTooltipIconButtonProps) {
  const hint = tooltip ?? label

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant={variant}
            size={size}
            aria-label={label}
            onClick={onClick}
            className={className}
            {...props}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipPopup side={side}>{hint}</TooltipPopup>
    </Tooltip>
  )
}

/** @deprecated 使用 ShellIconButton */
export const ChromeIconButton = ShellIconButton

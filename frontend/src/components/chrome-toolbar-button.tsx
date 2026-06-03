import type { ReactNode } from "react"

import { Button, type ButtonProps } from "@/components/ui/button"

type ShellIconButtonProps = {
  label: string
  children?: ReactNode
  className?: string
} & Omit<ButtonProps, "variant" | "size" | "children">

/** 壳层图标钮：coss Button ghost + icon-sm */
export function ShellIconButton({
  label,
  onClick,
  children,
  className,
  render,
  ...props
}: ShellIconButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
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

/** @deprecated 使用 ShellIconButton */
export const ChromeIconButton = ShellIconButton

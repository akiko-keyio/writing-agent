import { Copy01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { ShellIconButton } from "@/components/chrome-toolbar-button"
import { toastManager } from "@/components/ui/toast"
import { shell } from "@/lib/shell/chrome"
import { cn } from "@/lib/shared/utils"

type ChatMessageActionsProps = {
  markdown: string
  className?: string
}

export function ChatMessageActions({
  markdown,
  className,
}: ChatMessageActionsProps) {
  const trimmed = markdown.trim()
  if (!trimmed) return null

  async function copyMarkdown() {
    if (!navigator.clipboard?.writeText) {
      toastManager.add({
        type: "error",
        title: "无法复制",
        description: "当前环境不支持剪贴板。",
      })
      return
    }

    try {
      await navigator.clipboard.writeText(trimmed)
      toastManager.add({
        type: "success",
        title: "已复制 Markdown",
      })
    } catch {
      toastManager.add({
        type: "error",
        title: "复制失败",
        description: "请检查浏览器剪贴板权限。",
      })
    }
  }

  return (
    <ShellIconButton
      label="复制 Markdown"
      size="icon-sm"
      className={cn(shell.panelHeaderIcon, shell.chatMessageCopyAction, className)}
      onClick={() => void copyMarkdown()}
    >
      <HugeiconsIcon icon={Copy01Icon} aria-hidden="true" />
    </ShellIconButton>
  )
}

import {
  IconDots,
  IconHistory,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconMessage,
  IconPlus,
  IconX,
} from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuTrigger,
} from "@/components/ui/menu"
import { Tabs, TabsList, TabsTab } from "@/components/ui/tabs"
import { toastManager } from "@/components/ui/toast"
import { shell, spacing } from "@/lib/shell-chrome"
import { cn } from "@/lib/utils"

/**
 * Chrome：面板头 `shell.panelHeader`；图标 `Button icon-sm`；Explorer 标签 coss Tabs underline。
 */

/* ──────── Explorer Panel Tabs ──────── */

export type ExplorerPanel = "projects" | "files" | "outline"

const EXPLORER_TABS: { id: ExplorerPanel; label: string }[] = [
  { id: "projects", label: "Projects" },
  { id: "files", label: "Files" },
  { id: "outline", label: "Outline" },
]

export function ExplorerPanelHeader({
  panel,
  onPanelChange,
  onClose,
}: {
  panel: ExplorerPanel
  onPanelChange: (panel: ExplorerPanel) => void
  onClose: () => void
}) {
  return (
    <header className={shell.panelHeader}>
      <Tabs
        value={panel}
        onValueChange={(value) => onPanelChange(value as ExplorerPanel)}
        className={shell.explorerTabs}
      >
        <TabsList variant="underline" className={shell.explorerTabsList}>
          {EXPLORER_TABS.map(({ id, label }) => (
            <TabsTab key={id} value={id} className={shell.explorerTabsTab}>
              {label}
            </TabsTab>
          ))}
        </TabsList>
      </Tabs>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        aria-label="Collapse sidebar"
        className={shell.panelHeaderIcon}
        onClick={onClose}
      >
        <IconLayoutSidebarLeftCollapse aria-hidden="true" />
      </Button>
    </header>
  )
}

/* ──────── Document Floating Chrome ──────── */

export function DocumentFloatingChrome({
  explorerOpen,
  onExplorerOpenChange,
  chatOpen,
  onChatOpenChange,
  pendingCount,
}: {
  explorerOpen: boolean
  onExplorerOpenChange: (open: boolean) => void
  chatOpen: boolean
  onChatOpenChange: (open: boolean) => void
  pendingCount: number
}) {
  return (
    <div
      className={cn(
        "pointer-events-none sticky top-0 z-10 flex items-center justify-between",
        shell.floatingBar,
      )}
    >
      <div
        className={cn(
          "pointer-events-auto flex min-w-0 flex-1 items-center",
          spacing.xs,
        )}
      >
        {!explorerOpen ? (
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="Open sidebar"
            onClick={() => onExplorerOpenChange(true)}
          >
            <IconLayoutSidebarLeftExpand aria-hidden="true" />
          </Button>
        ) : null}
      </div>
      <div
        className={cn(
          "pointer-events-auto flex items-center",
          spacing.xs,
        )}
      >
        {!chatOpen ? (
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            className="relative"
            aria-label="Open chat"
            onClick={() => onChatOpenChange(true)}
          >
            <IconMessage aria-hidden="true" />
            {pendingCount > 0 ? (
              <Badge
                variant="default"
                size="sm"
                className="absolute -right-0.5 -top-0.5 min-w-4"
              >
                {pendingCount}
              </Badge>
            ) : null}
          </Button>
        ) : null}
      </div>
    </div>
  )
}

/* ──────── Chat Panel Header ──────── */

export function ChatPanelHeader({
  onClose,
  onNewChat,
  onShowChatHistory,
}: {
  onClose: () => void
  onNewChat: () => void
  onShowChatHistory: () => void
}) {
  return (
    <header className={shell.panelHeader}>
      <div className={cn("flex min-w-0 flex-1 items-center", spacing.xs)}>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className={shell.panelHeaderIcon}
          aria-label="New chat"
          onClick={onNewChat}
        >
          <IconPlus aria-hidden="true" />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className={shell.panelHeaderIcon}
          aria-label="Chat history"
          onClick={onShowChatHistory}
        >
          <IconHistory aria-hidden="true" />
        </Button>
        <ChatMoreMenu />
      </div>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        className={shell.panelHeaderIcon}
        aria-label="Close chat"
        onClick={onClose}
      >
        <IconX aria-hidden="true" />
      </Button>
    </header>
  )
}

function ChatMoreMenu() {
  return (
    <Menu>
      <MenuTrigger
        render={
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            className={shell.panelHeaderIcon}
            aria-label="More chat options"
          />
        }
      >
        <IconDots aria-hidden="true" />
      </MenuTrigger>
      <MenuPopup align="end" className="min-w-44">
        <MenuGroup>
          <MenuGroupLabel>Chat</MenuGroupLabel>
          <MenuItem
            onClick={() => {
              toastManager.add({
                type: "info",
                title: "Export conversation",
                description: "Coming in a later phase.",
              })
            }}
          >
            Export conversation…
          </MenuItem>
          <MenuItem
            onClick={() => {
              toastManager.add({
                type: "info",
                title: "Chat settings",
                description: "Coming in a later phase.",
              })
            }}
          >
            Settings…
          </MenuItem>
        </MenuGroup>
      </MenuPopup>
    </Menu>
  )
}

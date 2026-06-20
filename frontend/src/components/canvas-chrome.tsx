import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, MoreHorizontalIcon, PanelLeftCloseIcon, PanelLeftOpenIcon, PanelRightCloseIcon, PanelRightOpenIcon, WorkHistoryIcon } from "@hugeicons/core-free-icons";
import {
  ShellIconButton,
  ShellTooltipIconButton,
} from "@/components/chrome-toolbar-button"
import { Badge } from "@/components/ui/badge"
import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuTrigger,
} from "@/components/ui/menu"
import { shell } from "@/lib/shell-chrome"
import { row } from "@/lib/spacing"
import { cn } from "@/lib/utils"

/**
 * Chrome锛欵xplorer / Chat 鏀剁撼閽€丒xplorer ToggleGroup銆侀仐鐣?ChatPanelHeader銆? */

/* 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€ Explorer view 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€ */

export type ExplorerView = "file" | "outline"

export function ExplorerPanelToggle({
  open,
  shown,
  onOpenChange,
}: {
  /** 用户开关状态（可 pinned 但极窄时未显示） */
  open: boolean
  /** 当前是否在屏幕上可见（inline 列或全屏） */
  shown?: boolean
  onOpenChange: (open: boolean) => void
}) {
  const isShown = shown ?? open
  const label = isShown ? "Collapse sidebar" : "Open sidebar"

  return (
    <ShellTooltipIconButton
      label={label}
      tooltip={label}
      side="bottom"
      className={shell.panelHeaderIcon}
      onClick={() => onOpenChange(!open)}
    >
      {isShown ? (
        <HugeiconsIcon icon={PanelLeftOpenIcon} aria-hidden="true" />
      ) : (
        <HugeiconsIcon icon={PanelLeftCloseIcon} aria-hidden="true" />
      )}
    </ShellTooltipIconButton>
  )
}
export function ChatPanelToggle({
  open,
  shown,
  onOpenChange,
  pendingCount = 0,
}: {
  open: boolean
  shown?: boolean
  onOpenChange: (open: boolean) => void
  pendingCount?: number
}) {
  const isShown = shown ?? open
  const label = isShown ? "Close chat" : "Open chat"

  return (
    <ShellIconButton
      label={label}
      className={cn(shell.panelHeaderIcon, "shrink-0", !open && "relative")}
      onClick={() => onOpenChange(!open)}
    >
      {isShown ? (
        <HugeiconsIcon icon={PanelRightCloseIcon} aria-hidden="true" />
      ) : (
        <HugeiconsIcon icon={PanelRightOpenIcon} aria-hidden="true" />
      )}
      {open && pendingCount > 0 ? (
        <Badge
          variant="default"
          size="sm"
          className="absolute -top-0.5 -right-0.5 min-w-4"
        >
          {pendingCount}
        </Badge>
      ) : null}
    </ShellIconButton>
  )
}

/* 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€ Explorer panel header 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€ */

/* 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€ Chat panel header 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€ */

export function ChatPanelHeader({
  onNewChat,
  chatSessions,
  onSelectChatSession,
  agentModelLabel,
}: {
  onNewChat: () => void
  chatSessions: { id: string; title: string }[]
  onSelectChatSession: (id: string) => void
  agentModelLabel?: string
}) {
  return (
    <header className={shell.panelHeader}>
      <div className={cn("flex min-w-0 flex-1 items-center", row.xs)}>
        <ShellIconButton
          label="New chat"
          className={shell.panelHeaderIcon}
          onClick={onNewChat}
        >
          <HugeiconsIcon icon={Add01Icon} aria-hidden="true" />
        </ShellIconButton>
        <Menu>
          <MenuTrigger
            render={
              <ShellIconButton
                label="Chat history"
                className={shell.panelHeaderIcon}
              />
            }
          >
            <HugeiconsIcon icon={WorkHistoryIcon} aria-hidden="true" />
          </MenuTrigger>
          <MenuPopup align="start" className="min-w-56">
            <MenuGroup>
              <MenuGroupLabel>Recent chats</MenuGroupLabel>
              {chatSessions.length === 0 ? (
                <MenuItem className={shell.menuItem} disabled>
                  No saved chats
                </MenuItem>
              ) : (
                chatSessions.map((s) => (
                  <MenuItem
                    key={s.id}
                    className={shell.menuItem}
                    onClick={() => onSelectChatSession(s.id)}
                  >
                    <span className="truncate">{s.title}</span>
                  </MenuItem>
                ))
              )}
            </MenuGroup>
          </MenuPopup>
        </Menu>
        <ChatMoreMenu agentModelLabel={agentModelLabel} />
      </div>
    </header>
  )
}

function ChatMoreMenu({ agentModelLabel }: { agentModelLabel?: string }) {
  return (
    <Menu>
      <MenuTrigger
        render={
          <ShellIconButton
            label="More chat options"
            className={shell.panelHeaderIcon}
          />
        }
      >
        <HugeiconsIcon icon={MoreHorizontalIcon} aria-hidden="true" />
      </MenuTrigger>
      <MenuPopup align="end" className="min-w-44">
        <MenuGroup>
          <MenuGroupLabel>Agent</MenuGroupLabel>
          <MenuItem className={shell.menuItem} disabled>
            Model: {agentModelLabel ?? "-"}
          </MenuItem>
        </MenuGroup>
      </MenuPopup>
    </Menu>
  )
}

import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { ChatSwitcherMenuContent } from "@/components/chat-switcher-menu"
import { Button } from "@/components/ui/button"
import { Menu, MenuPopup, MenuTrigger } from "@/components/ui/menu"
import type { ChatSessionListItem } from "@/lib/chat/session-groups"
import { shell } from "@/lib/shell/chrome"

export function ChatSwitcherTrigger({
  sessions,
  activeId,
  historySessions,
  onNewChat,
  onSelectSession,
  onSelectHistorySession,
}: {
  sessions: ChatSessionListItem[]
  activeId: string
  historySessions: ChatSessionListItem[]
  onNewChat: () => void
  onSelectSession: (id: string) => void
  onSelectHistorySession: (id: string) => void
}) {
  const active =
    sessions.find((s) => s.id === activeId) ??
    historySessions.find((s) => s.id === activeId)
  const label = active?.title || "New chat"

  return (
    <Menu>
      <MenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="default"
            className={shell.topBarProjectButton}
          />
        }
      >
        <span className="min-w-0 truncate">{label}</span>
        <HugeiconsIcon icon={ArrowDown01Icon} aria-hidden="true" className="size-3.5 shrink-0 opacity-70" />
      </MenuTrigger>
      <MenuPopup align="start" className={shell.projectMenuPopup}>
        <ChatSwitcherMenuContent
          sessions={sessions}
          activeId={activeId}
          historySessions={historySessions}
          onNewChat={onNewChat}
          onSelectSession={onSelectSession}
          onSelectHistorySession={onSelectHistorySession}
        />
      </MenuPopup>
    </Menu>
  )
}

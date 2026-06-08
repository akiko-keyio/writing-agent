import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, CircleIcon, Tick01Icon, WorkHistoryIcon } from "@hugeicons/core-free-icons";
import {
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuSeparator,
  MenuSub,
  MenuSubPopup,
  MenuSubTrigger,
} from "@/components/ui/menu"
import {
  groupChatSessionsByRecency,
  type ChatSessionListItem,
} from "@/lib/chat-session-groups"
import { shell } from "@/lib/shell-chrome"
import { cn } from "@/lib/utils"

function ChatSessionMenuItem({
  item,
  active,
  onSelect,
}: {
  item: ChatSessionListItem
  active: boolean
  onSelect: (id: string) => void
}) {
  const label = item.title || "New chat"
  return (
    <MenuItem
      className={cn(
        shell.menuItem,
        active && "bg-accent text-accent-foreground",
      )}
      onClick={() => onSelect(item.id)}
    >
      {active ? (
        <HugeiconsIcon icon={CircleIcon} aria-hidden="true" className="size-2 shrink-0 fill-primary text-primary" />
      ) : (
        <span aria-hidden="true" className="size-2 shrink-0" />
      )}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {active ? (
        <HugeiconsIcon icon={Tick01Icon} aria-hidden="true" className="size-4 shrink-0 text-primary" />
      ) : null}
    </MenuItem>
  )
}

function ChatSessionGroup({
  label,
  items,
  activeId,
  onSelect,
}: {
  label: string
  items: ChatSessionListItem[]
  activeId: string
  onSelect: (id: string) => void
}) {
  if (items.length === 0) return null
  return (
    <MenuGroup>
      <MenuGroupLabel>{label}</MenuGroupLabel>
      {items.map((item) => (
        <ChatSessionMenuItem
          key={item.id}
          item={item}
          active={item.id === activeId}
          onSelect={onSelect}
        />
      ))}
    </MenuGroup>
  )
}

export function ChatSwitcherMenuContent({
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
  const { today, previous7Days, older } = groupChatSessionsByRecency(sessions)

  return (
    <>
      <MenuGroup>
        <MenuItem className={shell.menuItem} onClick={onNewChat}>
          <HugeiconsIcon icon={Add01Icon} aria-hidden="true" />
          New chat
        </MenuItem>
      </MenuGroup>
      {sessions.length > 0 ? (
        <>
          <MenuSeparator />
          <ChatSessionGroup
            label="Today"
            items={today}
            activeId={activeId}
            onSelect={onSelectSession}
          />
          <ChatSessionGroup
            label="Previous 7 days"
            items={previous7Days}
            activeId={activeId}
            onSelect={onSelectSession}
          />
          <ChatSessionGroup
            label="Older"
            items={older}
            activeId={activeId}
            onSelect={onSelectSession}
          />
        </>
      ) : null}
      <MenuSeparator />
      <MenuGroup>
        <MenuSub>
          <MenuSubTrigger className={shell.menuItem}>
            <HugeiconsIcon icon={WorkHistoryIcon} aria-hidden="true" />
            History
          </MenuSubTrigger>
          <MenuSubPopup className="min-w-56">
            {historySessions.length === 0 ? (
              <MenuItem className={shell.menuItem} disabled>
                No saved chats
              </MenuItem>
            ) : (
              historySessions.map((item) => (
                <ChatSessionMenuItem
                  key={item.id}
                  item={item}
                  active={item.id === activeId}
                  onSelect={onSelectHistorySession}
                />
              ))
            )}
          </MenuSubPopup>
        </MenuSub>
      </MenuGroup>
    </>
  )
}

import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, WorkHistoryIcon } from "@hugeicons/core-free-icons";
import {
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuSub,
  MenuSubPopup,
  MenuSubTrigger,
} from "@/components/ui/menu"
import {
  groupChatSessionsByRecency,
  type ChatSessionListItem,
} from "@/lib/chat/session-groups"
import { shell } from "@/lib/shell/chrome"

const chatSessionRadioItemClass = shell.menuRadioItem

function ChatSessionRadioItem({ item }: { item: ChatSessionListItem }) {
  const label = item.title || "New chat"
  return (
    <MenuRadioItem value={item.id} className={chatSessionRadioItemClass}>
      {label}
    </MenuRadioItem>
  )
}

function ChatSessionGroup({
  label,
  items,
}: {
  label: string
  items: ChatSessionListItem[]
}) {
  if (items.length === 0) return null
  return (
    <MenuGroup>
      <MenuGroupLabel>{label}</MenuGroupLabel>
      {items.map((item) => (
        <ChatSessionRadioItem key={item.id} item={item} />
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
          <MenuRadioGroup
            className="min-w-0 w-full"
            value={activeId}
            onValueChange={onSelectSession}
          >
            <ChatSessionGroup label="Today" items={today} />
            <ChatSessionGroup label="Previous 7 days" items={previous7Days} />
            <ChatSessionGroup label="Older" items={older} />
          </MenuRadioGroup>
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
              <MenuRadioGroup
                className="min-w-0 w-full"
                value={activeId}
                onValueChange={onSelectHistorySession}
              >
                {historySessions.map((item) => (
                  <ChatSessionRadioItem key={item.id} item={item} />
                ))}
              </MenuRadioGroup>
            )}
          </MenuSubPopup>
        </MenuSub>
      </MenuGroup>
    </>
  )
}

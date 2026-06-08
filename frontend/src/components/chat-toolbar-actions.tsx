import { ChatEllipsisMenuTrigger } from "@/components/chat-ellipsis-menu-trigger"
import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuTrigger,
} from "@/components/ui/menu"
import { shell } from "@/lib/shell-chrome"

export function ChatToolbarActions({
  agentModelLabel,
}: {
  agentModelLabel?: string
}) {
  return (
    <Menu>
      <MenuTrigger
        render={<ChatEllipsisMenuTrigger label="More chat options" />}
      />
      <MenuPopup align="end" className="min-w-44">
        <MenuGroup>
          <MenuGroupLabel>Agent</MenuGroupLabel>
          <MenuItem className={shell.menuItem} disabled>
            Model: {agentModelLabel ?? "—"}
          </MenuItem>
        </MenuGroup>
      </MenuPopup>
    </Menu>
  )
}

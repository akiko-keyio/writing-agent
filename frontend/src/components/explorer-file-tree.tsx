import { useState } from "react"
import {
  IconChevronRight,
  IconFileText,
  IconFolder,
} from "@tabler/icons-react"

import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import type { WorkspaceFileNode } from "@/lib/workspace-api"
import { flattenWorkspaceTreeRoots } from "@/lib/workspace-client"
import { shell, shellSidebarRowClass, spacing } from "@/lib/shell-chrome"
import { cn } from "@/lib/utils"

function FileTreeFolder({
  item,
  depth,
  activePath,
  onOpenFile,
}: {
  item: WorkspaceFileNode
  depth: number
  activePath: string | null
  onOpenFile: (path: string) => void
}) {
  const [open, setOpen] = useState(depth < 2)
  const isRoot = depth === 0

  const trigger = (
    <>
      <IconChevronRight
        aria-hidden="true"
        className={cn("transition-transform", open && "rotate-90")}
      />
      <IconFolder aria-hidden="true" />
      <span className="min-w-0 truncate">{item.name}</span>
    </>
  )

  const children = (
    <SidebarMenuSub className={spacing.tight}>
      {item.children?.map((child) => (
        <ExplorerTreeNode
          key={child.path || child.name}
          item={child}
          depth={depth + 1}
          activePath={activePath}
          onOpenFile={onOpenFile}
        />
      ))}
    </SidebarMenuSub>
  )

  if (isRoot) {
    return (
      <Collapsible open={open} onOpenChange={setOpen} className="group/collapsible">
        <SidebarMenuItem>
          <CollapsibleTrigger
            render={<SidebarMenuButton size="sm" className="w-full" />}
          >
            {trigger}
          </CollapsibleTrigger>
          <CollapsiblePanel>{children}</CollapsiblePanel>
        </SidebarMenuItem>
      </Collapsible>
    )
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="group/collapsible">
      <SidebarMenuSubItem>
        <CollapsibleTrigger
          render={<SidebarMenuSubButton size="sm" className="w-full" />}
        >
          {trigger}
        </CollapsibleTrigger>
        <CollapsiblePanel>{children}</CollapsiblePanel>
      </SidebarMenuSubItem>
    </Collapsible>
  )
}

function ExplorerTreeNode({
  item,
  depth = 0,
  activePath,
  onOpenFile,
}: {
  item: WorkspaceFileNode
  depth?: number
  activePath: string | null
  onOpenFile: (path: string) => void
}) {
  const level = depth ?? 0

  if (item.type === "folder") {
    return (
      <FileTreeFolder
        item={item}
        depth={level}
        activePath={activePath}
        onOpenFile={onOpenFile}
      />
    )
  }

  const isActive = activePath === item.path
  if (level === 0) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          size="sm"
          isActive={isActive}
          className={shellSidebarRowClass({ active: isActive })}
          onClick={() => onOpenFile(item.path)}
        >
          <IconFileText aria-hidden="true" />
          <span className="min-w-0 truncate">{item.name}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton
        size="sm"
        isActive={isActive}
        className={shellSidebarRowClass({ active: isActive })}
        onClick={() => onOpenFile(item.path)}
      >
        <IconFileText aria-hidden="true" />
        <span className="min-w-0 truncate">{item.name}</span>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  )
}

export function ExplorerFileTree({
  tree,
  activePath,
  onOpenFile,
  loading,
  error,
}: {
  tree: WorkspaceFileNode[]
  activePath: string | null
  onOpenFile: (path: string) => void
  loading?: boolean
  error?: string | null
}) {
  if (loading) {
    return (
      <p className={cn(shell.panelBody, shell.textMuted)}>Loading files…</p>
    )
  }

  if (error) {
    return (
      <p className={cn(shell.panelBody, shell.textMuted, "text-destructive")}>
        {error}
      </p>
    )
  }

  if (tree.length === 0) {
    return (
      <p className={cn(shell.panelBody, shell.textMuted)}>
        No markdown files found.
      </p>
    )
  }

  const displayTree = flattenWorkspaceTreeRoots(tree)

  return (
    <SidebarMenu className={shell.listMenu}>
      {displayTree.map((item) => (
        <ExplorerTreeNode
          key={item.path || item.name}
          item={item}
          depth={0}
          activePath={activePath}
          onOpenFile={onOpenFile}
        />
      ))}
    </SidebarMenu>
  )
}

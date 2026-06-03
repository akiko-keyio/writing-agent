import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { shell, shellSidebarRowClass, spacing } from "@/lib/shell-chrome"
import type { DocumentTocEntry } from "@/lib/document-toc"
import { cn } from "@/lib/utils"

/* ──────── Tree types ──────── */

interface TocNode {
  entry: DocumentTocEntry
  children: TocNode[]
}

/* ──────── Build tree from flat entries ──────── */

function buildTocTree(entries: DocumentTocEntry[]): TocNode[] {
  const root: TocNode[] = []
  const stack: TocNode[] = []

  for (const entry of entries) {
    const node: TocNode = { entry, children: [] }

    while (stack.length > 0 && stack[stack.length - 1].entry.level >= entry.level) {
      stack.pop()
    }

    if (stack.length === 0) {
      root.push(node)
    } else {
      stack[stack.length - 1].children.push(node)
    }

    stack.push(node)
  }

  return root
}

/* ──────── Tree node renderer ──────── */

function OutlineNode({
  node,
  depth,
  onNavigate,
}: {
  node: TocNode
  depth: number
  onNavigate: (id: string) => void
}) {
  const isActive = node.entry.isActive ?? false
  const hasChildren = node.children.length > 0

  if (depth === 0) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          size="sm"
          isActive={isActive}
          className={shellSidebarRowClass({ active: isActive })}
          onClick={() => onNavigate(node.entry.id)}
        >
          <span className="min-w-0 truncate">{node.entry.title}</span>
        </SidebarMenuButton>
        {hasChildren ? (
          <SidebarMenuSub className={spacing.tight}>
            {node.children.map((child) => (
              <OutlineNode
                key={child.entry.id}
                node={child}
                depth={1}
                onNavigate={onNavigate}
              />
            ))}
          </SidebarMenuSub>
        ) : null}
      </SidebarMenuItem>
    )
  }

  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton
        size="sm"
        isActive={isActive}
        className={shellSidebarRowClass({ active: isActive })}
        onClick={() => onNavigate(node.entry.id)}
      >
        <span className="min-w-0 truncate">{node.entry.title}</span>
      </SidebarMenuSubButton>
      {hasChildren ? (
        <SidebarMenuSub className={spacing.tight}>
          {node.children.map((child) => (
            <OutlineNode
              key={child.entry.id}
              node={child}
              depth={depth + 1}
              onNavigate={onNavigate}
            />
          ))}
        </SidebarMenuSub>
      ) : null}
    </SidebarMenuSubItem>
  )
}

/* ──────── Main component ──────── */

export function ExplorerOutline({
  entries,
  onNavigate,
}: {
  entries: DocumentTocEntry[]
  onNavigate: (id: string) => void
}) {
  if (entries.length === 0) {
    return (
      <p className={cn(shell.panelBody, shell.textMuted)}>
        No headings. Use markdown <span className="text-foreground">#</span> or
        lines like <span className="text-foreground">1 Introduction</span>.
      </p>
    )
  }

  const tree = buildTocTree(entries)

  return (
    <ScrollArea className="min-h-0 flex-1" scrollFade scrollbarGutter>
      <SidebarMenu className={shell.listMenu}>
        {tree.map((node) => (
          <OutlineNode
            key={node.entry.id}
            node={node}
            depth={0}
            onNavigate={onNavigate}
          />
        ))}
      </SidebarMenu>
    </ScrollArea>
  )
}

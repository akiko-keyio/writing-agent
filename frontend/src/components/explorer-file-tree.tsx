import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon, ClipboardIcon, FileAttachmentIcon, FolderOpenIcon, MoreHorizontalIcon, PencilIcon } from "@hugeicons/core-free-icons";
import { memo, useState } from "react"
import { ExplorerFolderCreateActions } from "@/components/explorer-file-section-header"
import {
  Collapsible,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/menu"
import {
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import type { WorkspaceFileNode } from "@/lib/workspace-api"
import { flattenWorkspaceTreeRoots } from "@/lib/workspace-client"
import type { ExplorerTreeRowDensity } from "@/lib/explorer-tree-row-density"
import {
  explorerTreeRowHeightClass,
} from "@/lib/explorer-tree-row-density"
import {
  shell,
  shellExplorerTreeRowButtonClass,
  shellExplorerTreeRowDepthStyle,
  shellExplorerTreeRowMoreActionClass,
} from "@/lib/shell-chrome"
import { cn } from "@/lib/utils"

type ExplorerTreeNodeProps = {
  item: WorkspaceFileNode
  depth: number
  rowDensity: ExplorerTreeRowDensity
  activePath: string | null
  onOpenFile: (path: string) => void
  onPrefetchFile?: (path: string) => void
  onCreateFile: (parentDir: string) => void
  onCreateFolder: (parentDir: string) => void
  onRenameFile: (path: string) => void
  onCopyFileFolderPath: (path: string) => void
  onOpenFileFolder: (path: string) => void
}

function folderContainsActive(
  item: WorkspaceFileNode,
  activePath: string | null
): boolean {
  if (!activePath) return false
  if (item.path === "") return true
  return activePath === item.path || activePath.startsWith(`${item.path}/`)
}

function explorerTreeNodeEqual(
  prev: ExplorerTreeNodeProps,
  next: ExplorerTreeNodeProps
): boolean {
  if (
    prev.item.path !== next.item.path ||
    prev.item.type !== next.item.type ||
    prev.depth !== next.depth ||
    prev.rowDensity !== next.rowDensity
  ) {
    return false
  }
  if (
    prev.onOpenFile !== next.onOpenFile ||
    prev.onPrefetchFile !== next.onPrefetchFile ||
    prev.onCreateFile !== next.onCreateFile ||
    prev.onCreateFolder !== next.onCreateFolder ||
    prev.onRenameFile !== next.onRenameFile ||
    prev.onCopyFileFolderPath !== next.onCopyFileFolderPath ||
    prev.onOpenFileFolder !== next.onOpenFileFolder
  ) {
    return false
  }

  if (prev.item.type === "file") {
    const path = prev.item.path
    return (prev.activePath === path) === (next.activePath === path)
  }

  return (
    folderContainsActive(prev.item, prev.activePath) ===
    folderContainsActive(next.item, next.activePath)
  )
}

function FileContextMenuContent({
  path,
  onOpenFile,
  onRenameFile,
  onCopyFileFolderPath,
  onOpenFileFolder,
}: {
  path: string
  onOpenFile: (path: string) => void
  onRenameFile: (path: string) => void
  onCopyFileFolderPath: (path: string) => void
  onOpenFileFolder: (path: string) => void
}) {
  return (
    <ContextMenuContent className="min-w-48">
      <ContextMenuItem onSelect={() => onOpenFile(path)}>
        <HugeiconsIcon icon={FileAttachmentIcon} aria-hidden="true" />
        Open
      </ContextMenuItem>
      <ContextMenuItem onSelect={() => onRenameFile(path)}>
        <HugeiconsIcon icon={PencilIcon} aria-hidden="true" />
        Rename
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onSelect={() => onCopyFileFolderPath(path)}>
        <HugeiconsIcon icon={ClipboardIcon} aria-hidden="true" />
        Copy containing path
      </ContextMenuItem>
      <ContextMenuItem onSelect={() => onOpenFileFolder(path)}>
        <HugeiconsIcon icon={FolderOpenIcon} aria-hidden="true" />
        Open containing path
      </ContextMenuItem>
    </ContextMenuContent>
  )
}

function FileDropdownMenuContent({
  path,
  onOpenFile,
  onRenameFile,
  onCopyFileFolderPath,
  onOpenFileFolder,
}: {
  path: string
  onOpenFile: (path: string) => void
  onRenameFile: (path: string) => void
  onCopyFileFolderPath: (path: string) => void
  onOpenFileFolder: (path: string) => void
}) {
  return (
    <>
      <MenuItem onClick={() => onOpenFile(path)}>
        <HugeiconsIcon icon={FileAttachmentIcon} aria-hidden="true" />
        Open
      </MenuItem>
      <MenuItem onClick={() => onRenameFile(path)}>
        <HugeiconsIcon icon={PencilIcon} aria-hidden="true" />
        Rename
      </MenuItem>
      <MenuSeparator />
      <MenuItem onClick={() => onCopyFileFolderPath(path)}>
        <HugeiconsIcon icon={ClipboardIcon} aria-hidden="true" />
        Copy containing path
      </MenuItem>
      <MenuItem onClick={() => onOpenFileFolder(path)}>
        <HugeiconsIcon icon={FolderOpenIcon} aria-hidden="true" />
        Open containing path
      </MenuItem>
    </>
  )
}

function ExplorerFileRowMoreMenu({
  path,
  onOpenFile,
  onRenameFile,
  onCopyFileFolderPath,
  onOpenFileFolder,
}: {
  path: string
  onOpenFile: (path: string) => void
  onRenameFile: (path: string) => void
  onCopyFileFolderPath: (path: string) => void
  onOpenFileFolder: (path: string) => void
}) {
  return (
    <div className={shell.sidebarMenuItemHoverActions}>
      <Menu>
        <MenuTrigger
          render={
            <SidebarMenuAction
              className={shellExplorerTreeRowMoreActionClass()}
              aria-label="File actions"
              onClick={(event) => event.stopPropagation()}
            />
          }
        >
          <HugeiconsIcon icon={MoreHorizontalIcon} aria-hidden="true" />
        </MenuTrigger>
        <MenuPopup align="end" className="min-w-48">
          <FileDropdownMenuContent
            path={path}
            onOpenFile={onOpenFile}
            onRenameFile={onRenameFile}
            onCopyFileFolderPath={onCopyFileFolderPath}
            onOpenFileFolder={onOpenFileFolder}
          />
        </MenuPopup>
      </Menu>
    </div>
  )
}

const ExplorerTreeFolderBranch = memo(function ExplorerTreeFolderBranch({
  item,
  depth,
  rowDensity,
  activePath,
  onOpenFile,
  onPrefetchFile,
  onCreateFile,
  onCreateFolder,
  onRenameFile,
  onCopyFileFolderPath,
  onOpenFileFolder,
}: ExplorerTreeNodeProps) {
  const containsActivePath =
    activePath != null &&
    (item.path === "" || activePath.startsWith(`${item.path}/`))
  const [open, setOpen] = useState(depth === 0 || containsActivePath)

  const trigger = (
    <>
      <HugeiconsIcon icon={ArrowRight01Icon} aria-hidden="true" className={cn("transition-transform", open && "rotate-90")} />
      <span
        className={shell.explorerFileTreeFolderLabel}
        title={item.path}
      >
        {item.name}
      </span>
    </>
  )

  const childProps = {
    rowDensity,
    activePath,
    onOpenFile,
    onPrefetchFile,
    onCreateFile,
    onCreateFolder,
    onRenameFile,
    onCopyFileFolderPath,
    onOpenFileFolder,
  }

  return (
    <>
      <SidebarMenuItem>
        <div
          aria-hidden="true"
          className={shell.explorerTreeFolderRowHoverFadeProps.className}
          style={shell.explorerTreeFolderRowHoverFadeProps.style}
        />
        <Collapsible
          open={open}
          onOpenChange={setOpen}
          className={shell.explorerFileTreeCollapsible}
        >
          <CollapsibleTrigger
            render={
              <SidebarMenuButton
                size="sm"
                className={shellExplorerTreeRowButtonClass({
                  rowHeightClass: explorerTreeRowHeightClass(rowDensity),
                })}
                style={shellExplorerTreeRowDepthStyle(depth)}
              />
            }
          >
            {trigger}
          </CollapsibleTrigger>
        </Collapsible>
        <div className={shell.sidebarMenuItemHoverActions}>
          <ExplorerFolderCreateActions
            parentPath={item.path}
            onCreateFile={onCreateFile}
            onCreateFolder={onCreateFolder}
          />
        </div>
      </SidebarMenuItem>
      {open
        ? item.children?.map((child) => (
            <ExplorerTreeNode
              key={child.path || child.name}
              item={child}
              depth={depth + 1}
              {...childProps}
            />
          ))
        : null}
    </>
  )
}, explorerTreeNodeEqual)

const ExplorerTreeNode = memo(function ExplorerTreeNode(
  props: ExplorerTreeNodeProps
) {
  const {
    item,
    depth,
    rowDensity,
    activePath,
    onOpenFile,
    onPrefetchFile,
    onCreateFile,
    onCreateFolder,
    onRenameFile,
    onCopyFileFolderPath,
    onOpenFileFolder,
  } = props

  if (item.type === "folder") {
    return <ExplorerTreeFolderBranch {...props} />
  }

  const isActive = activePath === item.path
  const prefetchHandlers = onPrefetchFile
    ? {
        onMouseEnter: () => onPrefetchFile(item.path),
        onFocus: () => onPrefetchFile(item.path),
      }
    : undefined
  const rowContent = (
    <>
      <HugeiconsIcon icon={FileAttachmentIcon} aria-hidden="true" />
      <span
        className={shell.explorerFileTreeLabel}
        title={item.path}
      >
        {item.name}
      </span>
    </>
  )
  const contextMenu = (
    <FileContextMenuContent
      path={item.path}
      onOpenFile={onOpenFile}
      onRenameFile={onRenameFile}
      onCopyFileFolderPath={onCopyFileFolderPath}
      onOpenFileFolder={onOpenFileFolder}
    />
  )

  return (
    <SidebarMenuItem>
      <div
        aria-hidden="true"
        className={cn(
          shell.explorerTreeRowHoverFadeProps.className,
          isActive && "chrome-row-hover-fade-overlay-bg--sidebar-selected"
        )}
        style={shell.explorerTreeRowHoverFadeProps.style}
      />
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <SidebarMenuButton
            size="sm"
            isActive={isActive}
            aria-current={isActive ? "page" : undefined}
            className={shellExplorerTreeRowButtonClass({
              rowHeightClass: explorerTreeRowHeightClass(rowDensity),
            })}
            style={shellExplorerTreeRowDepthStyle(depth, {
              reserveRowAction: true,
            })}
            onClick={() => onOpenFile(item.path)}
            {...prefetchHandlers}
          >
            {rowContent}
          </SidebarMenuButton>
        </ContextMenuTrigger>
        {contextMenu}
      </ContextMenu>
      <ExplorerFileRowMoreMenu
        path={item.path}
        onOpenFile={onOpenFile}
        onRenameFile={onRenameFile}
        onCopyFileFolderPath={onCopyFileFolderPath}
        onOpenFileFolder={onOpenFileFolder}
      />
    </SidebarMenuItem>
  )
}, explorerTreeNodeEqual)

export function ExplorerFileTree({
  tree,
  activePath,
  rowDensity = "compact",
  onOpenFile,
  onPrefetchFile,
  onCreateFile,
  onCreateFolder,
  onRenameFile,
  onCopyFileFolderPath,
  onOpenFileFolder,
  loading,
  error,
}: {
  tree: WorkspaceFileNode[]
  activePath: string | null
  rowDensity?: ExplorerTreeRowDensity
  onOpenFile: (path: string) => void
  onPrefetchFile?: (path: string) => void
  onCreateFile: (parentDir: string) => void
  onCreateFolder: (parentDir: string) => void
  onRenameFile: (path: string) => void
  onCopyFileFolderPath: (path: string) => void
  onOpenFileFolder: (path: string) => void
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
    <SidebarMenu className={shell.explorerFileTreeMenu}>
      {displayTree.map((item) => (
        <ExplorerTreeNode
          key={item.path || item.name}
          item={item}
          depth={0}
          rowDensity={rowDensity}
          activePath={activePath}
          onOpenFile={onOpenFile}
          onPrefetchFile={onPrefetchFile}
          onCreateFile={onCreateFile}
          onCreateFolder={onCreateFolder}
          onRenameFile={onRenameFile}
          onCopyFileFolderPath={onCopyFileFolderPath}
          onOpenFileFolder={onOpenFileFolder}
        />
      ))}
    </SidebarMenu>
  )
}

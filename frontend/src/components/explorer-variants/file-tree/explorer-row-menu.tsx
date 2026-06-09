import {
  ClipboardIcon,
  Delete02Icon,
  FileAddIcon,
  FileAttachmentIcon,
  FolderAddIcon,
  FolderOpenIcon,
  PencilIcon,
} from "@hugeicons/core-free-icons"

import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuSeparator,
} from "@/components/ui/menu"
import { HugeiconsIcon } from "@/lib/icons"
import { pathDirname } from "@/lib/path"

export type ExplorerRowMenuTarget = {
  path: string
  kind: "directory" | "file"
}

export type ExplorerRowMenuActions = {
  onOpenFile: (path: string) => void
  onRenameFile: (path: string) => void
  onCopyFileFolderPath: (path: string) => void
  onOpenFileFolder: (path: string) => void
  onCreateFile: (parentDir: string) => void
  onCreateFolder: (parentDir: string) => void
  onDelete?: (path: string) => void
}

export function explorerRowParentDir(item: ExplorerRowMenuTarget): string {
  if (item.kind === "directory") {
    return item.path
  }
  return pathDirname(item.path)
}

export function ExplorerRowMenuContent({
  item,
  onOpenFile,
  onRenameFile,
  onCopyFileFolderPath,
  onOpenFileFolder,
  onCreateFile,
  onCreateFolder,
  onDelete,
  onClose,
}: ExplorerRowMenuActions & {
  item: ExplorerRowMenuTarget
  onClose: () => void
}) {
  const isFile = item.kind === "file"
  const parentDir = explorerRowParentDir(item)

  const run = (action: () => void) => {
    onClose()
    action()
  }

  return (
    <>
      <MenuItem
        closeOnClick
        onClick={() => run(() => onCreateFile(parentDir))}
      >
        <HugeiconsIcon icon={FileAddIcon} aria-hidden="true" />
        New file
      </MenuItem>
      <MenuItem
        closeOnClick
        onClick={() => run(() => onCreateFolder(parentDir))}
      >
        <HugeiconsIcon icon={FolderAddIcon} aria-hidden="true" />
        New folder
      </MenuItem>
      {isFile ? (
        <>
          <MenuSeparator />
          <MenuItem closeOnClick onClick={() => run(() => onOpenFile(item.path))}>
            <HugeiconsIcon icon={FileAttachmentIcon} aria-hidden="true" />
            Open
          </MenuItem>
          <MenuItem
            closeOnClick
            onClick={() => run(() => onRenameFile(item.path))}
          >
            <HugeiconsIcon icon={PencilIcon} aria-hidden="true" />
            Rename
          </MenuItem>
        </>
      ) : null}
      <MenuSeparator />
      <MenuItem
        closeOnClick
        onClick={() => run(() => onCopyFileFolderPath(item.path))}
      >
        <HugeiconsIcon icon={ClipboardIcon} aria-hidden="true" />
        Copy containing path
      </MenuItem>
      <MenuItem
        closeOnClick
        onClick={() => run(() => onOpenFileFolder(item.path))}
      >
        <HugeiconsIcon icon={FolderOpenIcon} aria-hidden="true" />
        Open containing path
      </MenuItem>
      {onDelete ? (
        <>
          <MenuSeparator />
          <MenuItem
            closeOnClick
            variant="destructive"
            onClick={() => run(() => onDelete(item.path))}
          >
            <HugeiconsIcon icon={Delete02Icon} aria-hidden="true" />
            Delete
          </MenuItem>
        </>
      ) : null}
    </>
  )
}

/** Pierre renderContextMenu：coss Menu + 锚定 Pierre 浮动 trigger */
export function PierreExplorerRowMenu({
  item,
  context,
  actions,
}: {
  item: ExplorerRowMenuTarget
  context: {
    anchorElement: HTMLElement
    close: (options?: { restoreFocus?: boolean }) => void
  }
  actions: ExplorerRowMenuActions
}) {
  return (
    <Menu
      open
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          context.close({ restoreFocus: true })
        }
      }}
    >
      <MenuPopup
        anchor={context.anchorElement}
        align="end"
        side="bottom"
        sideOffset={4}
        className="min-w-48"
        data-file-tree-context-menu-root="true"
      >
        <ExplorerRowMenuContent
          item={item}
          {...actions}
          onClose={() => context.close({ restoreFocus: true })}
        />
      </MenuPopup>
    </Menu>
  )
}

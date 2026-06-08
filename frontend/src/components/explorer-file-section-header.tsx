import { HugeiconsIcon } from "@hugeicons/react";
import { FileAddIcon, FolderAddIcon } from "@hugeicons/core-free-icons";
import { ShellTooltipIconButton } from "@/components/chrome-toolbar-button"
import { explorerFileSectionHeaderRowClass } from "@/lib/explorer-tree-row-density"
import { shell, shellExplorerTreeRowDepthStyle } from "@/lib/shell-chrome"
import { cn } from "@/lib/utils"

export function ExplorerFolderCreateActions({
  parentPath,
  onCreateFile,
  onCreateFolder,
}: {
  parentPath: string
  onCreateFile: (parentDir: string) => void
  onCreateFolder: (parentDir: string) => void
}) {
  return (
    <>
      <ShellTooltipIconButton
        label="New markdown file"
        tooltip="New file"
        side="bottom"
        variant="ghost"
        size="icon-sm"
        onClick={(event) => {
          event.stopPropagation()
          onCreateFile(parentPath)
        }}
      >
        <HugeiconsIcon icon={FileAddIcon} aria-hidden="true" />
      </ShellTooltipIconButton>
      <ShellTooltipIconButton
        label="New folder"
        tooltip="New folder"
        side="bottom"
        variant="ghost"
        size="icon-sm"
        onClick={(event) => {
          event.stopPropagation()
          onCreateFolder(parentPath)
        }}
      >
        <HugeiconsIcon icon={FolderAddIcon} aria-hidden="true" />
      </ShellTooltipIconButton>
    </>
  )
}

export function ExplorerFileSectionHeader({
  projectName,
  onCreateFile,
  onCreateFolder,
  className,
}: {
  projectName: string
  onCreateFile: (parentDir: string) => void
  onCreateFolder: (parentDir: string) => void
  className?: string
}) {
  return (
    <div
      className={cn(
        shell.explorerFileSectionHeader,
        explorerFileSectionHeaderRowClass("compact"),
        className
      )}
      style={shellExplorerTreeRowDepthStyle(0)}
    >
      <div
        aria-hidden="true"
        className={shell.explorerSectionHeaderHoverFadeProps.className}
        style={shell.explorerSectionHeaderHoverFadeProps.style}
      />
      <span className={shell.explorerFileSectionLabel}>
        {projectName}
      </span>
      <div className={shell.explorerSectionHeaderActions}>
        <ExplorerFolderCreateActions
          parentPath=""
          onCreateFile={onCreateFile}
          onCreateFolder={onCreateFolder}
        />
      </div>
    </div>
  )
}

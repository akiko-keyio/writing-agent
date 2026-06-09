import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type {
  FileTree as PierreFileTreeModel,
  FileTreeDirectoryHandle,
} from "@pierre/trees"
import { FileTree, useFileTree } from "@pierre/trees/react"

import {
  PierreExplorerRowMenu,
  type ExplorerRowMenuActions,
} from "@/components/explorer-variants/file-tree/explorer-row-menu"
import { PIERRE_COSS_FILE_TREE_ICONS } from "@/components/explorer-variants/file-tree/pierre-coss-icons"
import {
  buildPierreTreeShellStyle,
  buildPierreTreeUnsafeCss,
} from "@/components/explorer-variants/file-tree/pierre-tree-shell-theme"
import { EXPLORER_TREE_ROW_HEIGHT_PX } from "@/lib/explorer-tree-row-density"
import {
  collectAncestorDirectoryPaths,
  collectDirectoryPathsFromFilePaths,
  collectWorkspacePaths,
} from "@/components/explorer-variants/shared/workspace-tree-adapters"
import type { WorkspaceFileNode } from "@/lib/workspace-api"
import { pathBasename, pathJoin } from "@/lib/path"
import { shell } from "@/lib/shell-chrome"
import { cn } from "@/lib/utils"

const PIERRE_TREE_ROW_HEIGHT_PX = EXPLORER_TREE_ROW_HEIGHT_PX.compact

export type PierreExplorerFileTreeProps = ExplorerRowMenuActions & {
  tree: WorkspaceFileNode[]
  activePath: string | null
  onMoveFiles: (moves: ReadonlyArray<{ from: string; to: string }>) => void
  loading?: boolean
  error?: string | null
}

function useContainerHeight() {
  const ref = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(240)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new ResizeObserver(([entry]) => {
      setHeight(Math.max(120, Math.floor(entry.contentRect.height)))
    })

    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return { ref, height }
}

function asDirectoryHandle(
  item: ReturnType<PierreFileTreeModel["getItem"]>
): FileTreeDirectoryHandle | null {
  return item?.isDirectory() ? (item as FileTreeDirectoryHandle) : null
}

function snapshotExpandedDirectoryPaths(
  model: PierreFileTreeModel,
  filePaths: readonly string[]
): string[] {
  return collectDirectoryPathsFromFilePaths(filePaths).filter((dirPath) => {
    const dir = asDirectoryHandle(model.getItem(dirPath))
    return dir?.isExpanded() === true
  })
}

function expandAncestorDirectories(
  model: PierreFileTreeModel,
  activePath: string | null
) {
  for (const dirPath of collectAncestorDirectoryPaths(activePath)) {
    const dir = asDirectoryHandle(model.getItem(dirPath))
    if (dir && !dir.isExpanded()) {
      dir.expand()
    }
  }
}

function isMarkdownFilePath(path: string): boolean {
  return path.endsWith(".md")
}

function resolveDropTargetPath(
  target: {
    directoryPath: string | null
    kind: "directory" | "root"
  },
  sourcePath: string
): string {
  const fileName = pathBasename(sourcePath)
  if (target.kind === "root" || !target.directoryPath) {
    return fileName
  }
  return pathJoin(target.directoryPath, fileName)
}

function PierreExplorerTreeModel({
  tree,
  activePath,
  containerHeightPx,
  onOpenFile,
  onRenameFile,
  onCopyFileFolderPath,
  onOpenFileFolder,
  onCreateFile,
  onCreateFolder,
  onDelete,
  onMoveFiles,
}: Omit<PierreExplorerFileTreeProps, "loading" | "error"> & {
  containerHeightPx: number
}) {
  const paths = useMemo(() => collectWorkspacePaths(tree), [tree])

  const onMoveFilesRef = useRef(onMoveFiles)
  onMoveFilesRef.current = onMoveFiles

  const menuActions = useMemo(
    (): ExplorerRowMenuActions => ({
      onOpenFile,
      onRenameFile,
      onCopyFileFolderPath,
      onOpenFileFolder,
      onCreateFile,
      onCreateFolder,
      onDelete,
    }),
    [
      onOpenFile,
      onRenameFile,
      onCopyFileFolderPath,
      onOpenFileFolder,
      onCreateFile,
      onCreateFolder,
      onDelete,
    ]
  )

  const handleDropComplete = useCallback(
    (event: {
      draggedPaths: readonly string[]
      target: {
        directoryPath: string | null
        kind: "directory" | "root"
      }
    }) => {
      const moves = event.draggedPaths
        .filter(isMarkdownFilePath)
        .map((from) => ({
          from,
          to: resolveDropTargetPath(event.target, from),
        }))
        .filter(({ from, to }) => from !== to)

      if (moves.length === 0) return
      onMoveFilesRef.current(moves)
    },
    []
  )

  const pathsKey = paths.join("\n")
  const { model } = useFileTree({
    paths,
    search: false,
    flattenEmptyDirectories: false,
    initialExpansion: 1,
    itemHeight: PIERRE_TREE_ROW_HEIGHT_PX,
    icons: PIERRE_COSS_FILE_TREE_ICONS,
    unsafeCSS: buildPierreTreeUnsafeCss(),
    dragAndDrop: {
      canDrag: (draggedPaths) =>
        draggedPaths.every((path) => isMarkdownFilePath(path)),
      onDropComplete: handleDropComplete,
    },
    composition: {
      contextMenu: {
        enabled: true,
        triggerMode: "both",
        buttonVisibility: "when-needed",
      },
    },
  })

  const prevPathsKeyRef = useRef(pathsKey)
  const prevActivePathRef = useRef<string | null>(null)

  useEffect(() => {
    if (prevPathsKeyRef.current === pathsKey) return

    const expandedSnapshot = snapshotExpandedDirectoryPaths(model, paths)
    prevPathsKeyRef.current = pathsKey
    model.resetPaths(paths, {
      initialExpandedPaths: expandedSnapshot,
    })
    expandAncestorDirectories(model, activePath)
  }, [model, pathsKey, paths, activePath])

  useEffect(() => {
    if (activePath === prevActivePathRef.current) return
    prevActivePathRef.current = activePath
    expandAncestorDirectories(model, activePath)

    for (const path of model.getSelectedPaths()) {
      if (path !== activePath) model.getItem(path)?.deselect()
    }
    if (activePath) {
      model.getItem(activePath)?.select()
      model.focusPath(activePath)
    }
  }, [model, activePath])

  return (
    <div className="min-h-0 min-w-0 w-full max-w-full">
      <FileTree
        model={model}
        className="block min-h-0 min-w-0 w-full max-w-full border-0 bg-transparent shadow-none"
        style={buildPierreTreeShellStyle(containerHeightPx, PIERRE_TREE_ROW_HEIGHT_PX)}
        renderContextMenu={(item, context) => (
          <PierreExplorerRowMenu
            item={item}
            context={context}
            actions={menuActions}
          />
        )}
      />
    </div>
  )
}

function PierreExplorerBody(
  props: Omit<PierreExplorerFileTreeProps, "loading" | "error">
) {
  const { ref, height } = useContainerHeight()

  return (
    <div
      ref={ref}
      className={cn(
        shell.explorerFileTreeMenu,
        "min-h-0 min-w-0 w-full max-w-full flex-1"
      )}
    >
      <PierreExplorerTreeModel
        {...props}
        containerHeightPx={height}
      />
    </div>
  )
}

export function PierreExplorerFileTree({
  tree,
  activePath,
  onOpenFile,
  onRenameFile,
  onCopyFileFolderPath,
  onOpenFileFolder,
  onCreateFile,
  onCreateFolder,
  onDelete,
  onMoveFiles,
  loading,
  error,
}: PierreExplorerFileTreeProps) {
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

  return (
    <PierreExplorerBody
      tree={tree}
      activePath={activePath}
      onOpenFile={onOpenFile}
      onRenameFile={onRenameFile}
      onCopyFileFolderPath={onCopyFileFolderPath}
      onOpenFileFolder={onOpenFileFolder}
      onCreateFile={onCreateFile}
      onCreateFolder={onCreateFolder}
      onDelete={onDelete}
      onMoveFiles={onMoveFiles}
    />
  )
}

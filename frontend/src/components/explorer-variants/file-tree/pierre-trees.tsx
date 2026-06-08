import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { FileTree as PierreFileTreeModel } from "@pierre/trees"
import { FileTree, useFileTree } from "@pierre/trees/react"
import {
  PierreExplorerRowMenu,
  type ExplorerRowMenuActions,
} from "@/components/explorer-variants/file-tree/explorer-row-menu"
import { PIERRE_COSS_FILE_TREE_ICONS } from "@/components/explorer-variants/file-tree/pierre-coss-icons"
import type { ExplorerFileTreeProps } from "@/components/explorer-variants/shared/file-tree-props"
import {
  buildPierreTreeShellStyle,
  buildPierreTreeUnsafeCss,
} from "@/components/explorer-variants/file-tree/pierre-tree-shell-theme"
import { explorerTreeRowHeightPx } from "@/lib/explorer-tree-row-density"
import {
  collectAncestorDirectoryPaths,
  collectDirectoryPathsFromFilePaths,
  collectWorkspacePaths,
} from "@/components/explorer-variants/shared/workspace-tree-adapters"
import { shell } from "@/lib/shell-chrome"
import { cn } from "@/lib/utils"

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

function snapshotExpandedDirectoryPaths(
  model: PierreFileTreeModel,
  filePaths: readonly string[]
): string[] {
  return collectDirectoryPathsFromFilePaths(filePaths).filter((dirPath) => {
    const item = model.getItem(dirPath)
    return item?.isDirectory() === true && item.isExpanded()
  })
}

function expandAncestorDirectories(
  model: PierreFileTreeModel,
  activePath: string | null
) {
  for (const dirPath of collectAncestorDirectoryPaths(activePath)) {
    const item = model.getItem(dirPath)
    if (item?.isDirectory() && !item.isExpanded()) {
      item.expand()
    }
  }
}

function PierreTreesBody({
  tree,
  activePath,
  onOpenFile,
  onRenameFile,
  onCopyFileFolderPath,
  onOpenFileFolder,
  onCreateFile,
  onCreateFolder,
}: Pick<
  ExplorerFileTreeProps,
  | "tree"
  | "activePath"
  | "onOpenFile"
  | "onRenameFile"
  | "onCopyFileFolderPath"
  | "onOpenFileFolder"
  | "onCreateFile"
  | "onCreateFolder"
>) {
  const paths = useMemo(() => collectWorkspacePaths(tree), [tree])
  const filePathSet = useMemo(() => new Set(paths), [paths])
  const { ref, height } = useContainerHeight()

  const onOpenFileRef = useRef(onOpenFile)
  onOpenFileRef.current = onOpenFile

  const menuActions = useMemo(
    (): ExplorerRowMenuActions => ({
      onOpenFile,
      onRenameFile,
      onCopyFileFolderPath,
      onOpenFileFolder,
      onCreateFile,
      onCreateFolder,
    }),
    [
      onOpenFile,
      onRenameFile,
      onCopyFileFolderPath,
      onOpenFileFolder,
      onCreateFile,
      onCreateFolder,
    ]
  )

  const handleSelectionChange = useCallback((selectedPaths: readonly string[]) => {
    const last = selectedPaths[selectedPaths.length - 1]
    if (last && filePathSet.has(last)) {
      onOpenFileRef.current(last)
    }
  }, [filePathSet])

  const rowHeightPx = explorerTreeRowHeightPx("compact")
  const pathsKey = paths.join("\n")
  const { model } = useFileTree({
    paths,
    search: false,
    // Pierre 默认 true；此处为保留 archieve/archieve 等嵌套目录独立行
    flattenEmptyDirectories: false,
    initialExpansion: 1,
    itemHeight: rowHeightPx,
    icons: PIERRE_COSS_FILE_TREE_ICONS,
    onSelectionChange: handleSelectionChange,
    unsafeCSS: buildPierreTreeUnsafeCss(),
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

    if (activePath && filePathSet.has(activePath)) {
      model.focusPath(activePath)
    }
  }, [model, activePath, filePathSet])

  return (
    <div
      ref={ref}
      className={cn(
        shell.explorerFileTreeMenu,
        "min-h-0 min-w-0 w-full max-w-full flex-1"
      )}
    >
      <div className="min-h-0 min-w-0 w-full max-w-full flex-1">
        <FileTree
          model={model}
          className="block min-h-0 min-w-0 w-full max-w-full border-0 bg-transparent shadow-none"
          style={buildPierreTreeShellStyle(height, rowHeightPx)}
          renderContextMenu={(item, context) => (
            <PierreExplorerRowMenu
              item={item}
              context={context}
              actions={menuActions}
            />
          )}
        />
      </div>
    </div>
  )
}

export function PierreTreesFileTree({
  tree,
  activePath,
  onOpenFile,
  onRenameFile,
  onCopyFileFolderPath,
  onOpenFileFolder,
  onCreateFile,
  onCreateFolder,
  loading,
  error,
}: ExplorerFileTreeProps) {
  const pathsKey = useMemo(() => collectWorkspacePaths(tree).join("\n"), [tree])

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
    <PierreTreesBody
      key={pathsKey}
      tree={tree}
      activePath={activePath}
      onOpenFile={onOpenFile}
      onRenameFile={onRenameFile}
      onCopyFileFolderPath={onCopyFileFolderPath}
      onOpenFileFolder={onOpenFileFolder}
      onCreateFile={onCreateFile}
      onCreateFolder={onCreateFolder}
    />
  )
}

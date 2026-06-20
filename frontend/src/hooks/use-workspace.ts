import { useCallback, useEffect, useRef, useState } from "react"

import { toastManager } from "@/components/ui/toast"
import { flattenMarkdownPaths } from "@/lib/flatten-paths"
import { pickWorkspaceFolder } from "@/lib/local-workspace"
import {
  folderProjectEntry,
  isFolderProject,
  loadRecentProjects,
  rememberRecentProject,
  REPO_PROJECT,
  type ProjectEntry,
} from "@/lib/project-catalog"
import {
  ensureWorkspaceHandlePermission,
  loadAllWorkspaceHandles,
  loadWorkspaceHandle,
  saveWorkspaceHandle,
} from "@/lib/workspace-handle-store"
import {
  DEFAULT_WORKSPACE_FILE,
  type WorkspaceFileNode,
} from "@/lib/workspace-api"
import {
  createFolderWorkspaceClient,
  createProjectWorkspaceClient,
  findFirstMarkdownPath,
  flattenWorkspaceTreeRoots,
  type WorkspaceClient,
} from "@/lib/workspace-client"
import { bindLocalFolderRoot } from "@/lib/local-folder-actions"
import { clearFolderAbsoluteRoot } from "@/lib/folder-root-store"
import { collectMarkdownPaths } from "@/lib/local-folder-paths"

export function useWorkspace() {
  const [fileTree, setFileTree] = useState<WorkspaceFileNode[]>([])
  const [treeLoading, setTreeLoading] = useState(true)
  const [treeError, setTreeError] = useState<string | null>(null)
  const [workspaceEpoch, setWorkspaceEpoch] = useState(0)
  const [activeProject, setActiveProject] = useState<ProjectEntry | null>(
    REPO_PROJECT
  )
  const [agentProjectRoot, setAgentProjectRoot] = useState<string | null>(null)
  const [recentProjects, setRecentProjects] = useState<ProjectEntry[]>(() => {
    const loaded = loadRecentProjects()
    return loaded.length > 0 ? loaded : [REPO_PROJECT]
  })
  const [linkedFolderIds, setLinkedFolderIds] = useState<Set<string>>(
    () => new Set()
  )

  const workspaceRef = useRef<WorkspaceClient>(createProjectWorkspaceClient())
  const folderHandlesRef = useRef(new Map<string, FileSystemDirectoryHandle>())
  const folderSamplePathsRef = useRef<string[]>([])
  const handlesHydratedRef = useRef(false)
  const fileOpenCallbackRef = useRef<((path: string) => void) | null>(null)
  const fileChangedCallbackRef = useRef<((path: string) => void) | null>(null)

  const mentionablePaths = flattenMarkdownPaths(fileTree)

  const setFileOpenCallback = useCallback((callback: (path: string) => void) => {
    fileOpenCallbackRef.current = callback
  }, [])

  const setFileChangedCallback = useCallback((callback: (path: string) => void) => {
    fileChangedCallbackRef.current = callback
  }, [])

  const refreshFileTree = useCallback(async () => {
    setFileTree(await workspaceRef.current.listTree())
  }, [])

  const refreshLinkedFolderHandles = useCallback(async () => {
    const stored = await loadAllWorkspaceHandles()
    folderHandlesRef.current = stored
    setLinkedFolderIds(new Set(stored.keys()))
    handlesHydratedRef.current = true
  }, [])

  const rememberFolderHandle = useCallback((entryId: string) => {
    setLinkedFolderIds((prev) => new Set(prev).add(entryId))
  }, [])

  const applyFolderWorkspace = useCallback(
    (handle: FileSystemDirectoryHandle) => {
      const entry = folderProjectEntry(handle)
      clearFolderAbsoluteRoot(entry.id)
      folderHandlesRef.current.set(entry.id, handle)
      void saveWorkspaceHandle(entry.id, handle)
      rememberFolderHandle(entry.id)
      setAgentProjectRoot(null)
      workspaceRef.current = createFolderWorkspaceClient(
        handle,
        entry.id,
        () => folderSamplePathsRef.current,
      )
      setActiveProject(entry)
      setRecentProjects(rememberRecentProject(entry))
      setWorkspaceEpoch((epoch) => epoch + 1)
      return entry
    },
    [rememberFolderHandle]
  )

  const handleOpenFolder = useCallback(() => {
    void (async () => {
      try {
        const handle = await pickWorkspaceFolder()
        const entry = applyFolderWorkspace(handle)
        toastManager.add({
          type: "success",
          title: "Workspace opened",
          description: entry.name,
        })
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return

        const message =
          err instanceof Error ? err.message : "Could not open folder"

        toastManager.add({
          type: "error",
          title: "Open workspace failed",
          description: message,
        })
      }
    })()
  }, [applyFolderWorkspace])

  const handleSelectProject = useCallback(
    (entry: ProjectEntry) => {
      if (entry.id === activeProject?.id) {
        setRecentProjects(rememberRecentProject(entry))
        return
      }
      if (entry.id === REPO_PROJECT.id) {
        workspaceRef.current = createProjectWorkspaceClient()
        setAgentProjectRoot(null)
        setActiveProject(entry)
        setRecentProjects(rememberRecentProject(entry))
        setWorkspaceEpoch((epoch) => epoch + 1)
        return
      }

      void (async () => {
        if (!handlesHydratedRef.current) {
          await refreshLinkedFolderHandles()
        }

        let handle: FileSystemDirectoryHandle | undefined =
          folderHandlesRef.current.get(entry.id)
        if (!handle) {
          const stored = await loadWorkspaceHandle(entry.id)
          if (stored) {
            handle = stored
            folderHandlesRef.current.set(entry.id, stored)
            rememberFolderHandle(entry.id)
          }
        }

        if (handle) {
          const allowed = await ensureWorkspaceHandlePermission(handle)
          if (allowed) {
            applyFolderWorkspace(handle)
            return
          }
        }

        try {
          const picked = await pickWorkspaceFolder()
          applyFolderWorkspace(picked)
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") return
          toastManager.add({
            type: "error",
            title: "Open workspace failed",
            description:
              err instanceof Error ? err.message : "Could not open folder",
          })
        }
      })()
    },
    [
      activeProject?.id,
      applyFolderWorkspace,
      refreshLinkedFolderHandles,
      rememberFolderHandle,
    ]
  )

  useEffect(() => {
    void refreshLinkedFolderHandles()
  }, [refreshLinkedFolderHandles])

  useEffect(() => {
    if (!import.meta.hot) return

    const refreshProjectTree = () => {
      if (workspaceRef.current.id !== "project") return
      void refreshFileTree()
    }

    import.meta.hot.on("workspace:tree-changed", refreshProjectTree)
    import.meta.hot.on("workspace:file-changed", (data: { path: string }) => {
      fileChangedCallbackRef.current?.(data.path)
    })
    return () => {
      import.meta.hot?.off("workspace:tree-changed", refreshProjectTree)
    }
  }, [refreshFileTree])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      setTreeLoading(true)
      setTreeError(null)

      try {
        const workspace = workspaceRef.current
        const tree = await workspace.listTree()

        if (cancelled) return

        setFileTree(tree)
        folderSamplePathsRef.current = collectMarkdownPaths(
          flattenWorkspaceTreeRoots(tree),
        )

        const initialPath =
          workspace.id === "project"
            ? DEFAULT_WORKSPACE_FILE
            : findFirstMarkdownPath(tree)

        if (initialPath) {
          fileOpenCallbackRef.current?.(initialPath)
        }
      } catch (err) {
        if (cancelled) return

        const message =
          err instanceof Error ? err.message : "Could not load workspace"

        setTreeError(message)

        toastManager.add({
          type: "error",
          title: "Workspace unavailable",
          description:
            workspaceRef.current.id === "project"
              ? "Start the dev server (pnpm dev) to browse project files."
              : message,
        })
      } finally {
        if (!cancelled) setTreeLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [workspaceEpoch])

  useEffect(() => {
    if (workspaceRef.current.id !== "folder") return
    if (!activeProject || !isFolderProject(activeProject)) return

    folderSamplePathsRef.current = collectMarkdownPaths(
      flattenWorkspaceTreeRoots(fileTree),
    )
    const handle = folderHandlesRef.current.get(activeProject.id)
    if (!handle) return

    let cancelled = false
    void (async () => {
      const root = await bindLocalFolderRoot(
        activeProject.id,
        handle.name,
        folderSamplePathsRef.current,
      )
      if (!cancelled) setAgentProjectRoot(root)
    })()
    return () => {
      cancelled = true
    }
  }, [fileTree, activeProject])

  const getWorkspace = useCallback(() => workspaceRef.current, [])

  return {
    fileTree,
    treeLoading,
    treeError,
    activeProject,
    agentProjectRoot,
    recentProjects,
    linkedFolderIds,
    mentionablePaths,
    getWorkspace,
    handleOpenFolder,
    handleSelectProject,
    refreshFileTree,
    setFileOpenCallback,
    setFileChangedCallback,
  }
}

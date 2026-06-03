import { useCallback, useEffect, useRef, useState } from "react"



import {
  ChatPanelHeader,
  DocumentFloatingChrome,
  ExplorerPanelHeader,
  type ExplorerPanel,
} from "@/components/canvas-chrome"

import { ChatThread } from "@/components/chat-thread"

import {

  DocumentEditor,

  type DocumentEditorHandle,

} from "@/components/document-editor"

import { ExplorerFileTree } from "@/components/explorer-file-tree"
import { ExplorerProjects } from "@/components/explorer-projects"

import { ExplorerOutline } from "@/components/explorer-outline"

import { toastManager } from "@/components/ui/toast"

import {

  SidebarContent,

  SidebarGroup,

  SidebarGroupContent,

  SidebarProvider,

} from "@/components/ui/sidebar"

import type { DocumentTocEntry } from "@/lib/document-toc"

import { pickWorkspaceFolder } from "@/lib/local-workspace"
import {
  folderProjectEntry,
  loadRecentProjects,
  rememberRecentProject,
  REPO_PROJECT,
  type ProjectEntry,
} from "@/lib/project-catalog"
import {
  createFolderWorkspaceClient,
  createProjectWorkspaceClient,
  findFirstMarkdownPath,
  type WorkspaceClient,
} from "@/lib/workspace-client"
import { pathBasename } from "@/lib/path"
import {
  ensureWorkspaceHandlePermission,
  loadAllWorkspaceHandles,
  loadWorkspaceHandle,
  saveWorkspaceHandle,
} from "@/lib/workspace-handle-store"
import { DEFAULT_WORKSPACE_FILE, type WorkspaceFileNode } from "@/lib/workspace-api"
import { shell } from "@/lib/shell-chrome"
import { cn } from "@/lib/utils"



const EXPLORER_EXPANDED_WIDTH = "18rem"

const CHAT_EXPANDED_WIDTH = "min(380px, 36vw)"



export function Layout() {

  const [explorerPanel, setExplorerPanel] = useState<ExplorerPanel | null>(

    "files",

  )

  const [chatOpen, setChatOpen] = useState(false)

  const [chatSessionKey, setChatSessionKey] = useState(0)

  const [fileTree, setFileTree] = useState<WorkspaceFileNode[]>([])

  const [treeLoading, setTreeLoading] = useState(true)

  const [treeError, setTreeError] = useState<string | null>(null)

  const [activePath, setActivePath] = useState<string | null>(null)

  const [documentContent, setDocumentContent] = useState("")

  const [documentLoading, setDocumentLoading] = useState(true)

  const documentEditorRef = useRef<DocumentEditorHandle>(null)

  const documentScrollRef = useRef<HTMLElement>(null)

  const [tocEntries, setTocEntries] = useState<DocumentTocEntry[]>([])



  const workspaceRef = useRef<WorkspaceClient>(createProjectWorkspaceClient())
  /** 本地工作区句柄：内存 + IndexedDB，刷新后可恢复授权 */
  const folderHandlesRef = useRef(
    new Map<string, FileSystemDirectoryHandle>(),
  )
  const handlesHydratedRef = useRef(false)
  const [linkedFolderIds, setLinkedFolderIds] = useState<Set<string>>(
    () => new Set(),
  )
  const [workspaceEpoch, setWorkspaceEpoch] = useState(0)
  const [activeProject, setActiveProject] = useState<ProjectEntry | null>(
    REPO_PROJECT,
  )
  const [recentProjects, setRecentProjects] = useState<ProjectEntry[]>(() => {
    const loaded = loadRecentProjects()
    return loaded.length > 0 ? loaded : [REPO_PROJECT]
  })

  const openFile = useCallback(async (path: string) => {

    setDocumentLoading(true)

    setTocEntries([])

    try {

      const content = await workspaceRef.current.readFile(path)

      setActivePath(path)

      setDocumentContent(content)

      setExplorerPanel((panel) => panel ?? "files")

    } catch (err) {

      const message =

        err instanceof Error ? err.message : "Could not open file"

      toastManager.add({

        type: "error",

        title: "Open failed",

        description: message,

      })

    } finally {

      setDocumentLoading(false)

    }

  }, [])

  const refreshLinkedFolderHandles = useCallback(async () => {
    const stored = await loadAllWorkspaceHandles()
    folderHandlesRef.current = stored
    setLinkedFolderIds(new Set(stored.keys()))
    handlesHydratedRef.current = true
  }, [])

  useEffect(() => {
    void refreshLinkedFolderHandles()
  }, [refreshLinkedFolderHandles])

  const rememberFolderHandle = useCallback((entryId: string) => {
    setLinkedFolderIds((prev) => new Set(prev).add(entryId))
  }, [])

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

        const initialPath =

          workspace.id === "project"

            ? DEFAULT_WORKSPACE_FILE

            : findFirstMarkdownPath(tree)

        if (initialPath) {

          await openFile(initialPath)

        } else {

          setActivePath(null)

          setDocumentContent("")

          setDocumentLoading(false)

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

  }, [workspaceEpoch, openFile])

  const applyFolderWorkspace = useCallback(
    (handle: FileSystemDirectoryHandle) => {
      const entry = folderProjectEntry(handle)
      folderHandlesRef.current.set(entry.id, handle)
      void saveWorkspaceHandle(entry.id, handle)
      rememberFolderHandle(entry.id)
      workspaceRef.current = createFolderWorkspaceClient(handle)
      setActiveProject(entry)
      setRecentProjects(rememberRecentProject(entry))
      setActivePath(null)
      setDocumentContent("")
      setTocEntries([])
      setWorkspaceEpoch((epoch) => epoch + 1)
      return entry
    },
    [rememberFolderHandle],
  )

  const handleOpenFolder = useCallback(async () => {
    try {
      const handle = await pickWorkspaceFolder()
      const entry = applyFolderWorkspace(handle)
      setExplorerPanel("files")
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
  }, [applyFolderWorkspace])

  const handleSelectProject = useCallback(
    (entry: ProjectEntry) => {
      if (entry.id === activeProject?.id) {
        setRecentProjects(rememberRecentProject(entry))
        return
      }
      if (entry.id === REPO_PROJECT.id) {
        workspaceRef.current = createProjectWorkspaceClient()
        setActiveProject(entry)
        setRecentProjects(rememberRecentProject(entry))
        setWorkspaceEpoch((epoch) => epoch + 1)
        setExplorerPanel("files")
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
            setExplorerPanel("files")
            return
          }
        }

        try {
          const picked = await pickWorkspaceFolder()
          applyFolderWorkspace(picked)
          setExplorerPanel("files")
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
    ],
  )

  const focusAnchorInDocument = useCallback((_editId: string) => {

    toastManager.add({

      type: "info",

      title: "Edit anchors",

      description: "Anchors apply to the writing demo document only.",

    })

  }, [])






  const handleNewChat = useCallback(() => {
    setChatSessionKey((k) => k + 1)
  }, [])



  const handleShowChatHistory = useCallback(() => {

    toastManager.add({

      type: "info",

      title: "Chat history",

      description: "Conversation list will be available in a later phase.",

    })

  }, [])

  useEffect(() => {
    const file = activePath ? pathBasename(activePath) : null
    const project = activeProject?.name
    if (file && project) {
      document.title = `${file} · ${project}`
    } else if (file) {
      document.title = file
    } else if (project) {
      document.title = project
    } else {
      document.title = "Writing Agent"
    }
  }, [activePath, activeProject])

  return (

    <div className="flex h-screen overflow-hidden bg-background">

      <aside

        aria-label={

          explorerPanel === "projects"
            ? "Projects"
            : explorerPanel === "files"
              ? "Files"
              : "Document outline"

        }

        aria-expanded={explorerPanel != null}

        aria-hidden={explorerPanel == null}

        className={cn(

          "chrome-panel flex shrink-0 flex-col overflow-hidden border-r bg-background",

          "transition-[width] duration-200 ease-out",

          explorerPanel == null && "pointer-events-none border-r-0",

        )}

        style={{

          width: explorerPanel != null ? EXPLORER_EXPANDED_WIDTH : 0,

        }}

      >

        {explorerPanel != null ? (
          <ExplorerPanelHeader
            panel={explorerPanel}
            onPanelChange={setExplorerPanel}
            onClose={() => setExplorerPanel(null)}
          />
        ) : null}

        <SidebarProvider

          open

          onOpenChange={() => {}}

          className={cn(

            "flex min-h-0 flex-1 flex-col !min-h-0",

            explorerPanel != null ? shell.panelBodyWithHeader : shell.panelBody,

          )}

        >

          <SidebarGroup className="flex min-h-0 flex-1 flex-col p-0">

            <SidebarGroupContent className="flex min-h-0 flex-1 flex-col">

              <SidebarContent className="min-h-0 flex-1 overflow-y-auto px-0">

                {explorerPanel === "projects" ? (
                  <ExplorerProjects
                    activeProject={activeProject}
                    projects={recentProjects}
                    linkedFolderIds={linkedFolderIds}
                    onSelectProject={handleSelectProject}
                    onOpenFolder={() => void handleOpenFolder()}
                  />
                ) : explorerPanel === "files" ? (
                  <ExplorerFileTree
                    tree={fileTree}
                    activePath={activePath}
                    onOpenFile={(path) => void openFile(path)}
                    loading={treeLoading}
                    error={treeError}
                  />
                ) : explorerPanel === "outline" ? (

                  <ExplorerOutline

                    entries={tocEntries}

                    onNavigate={(id) =>

                      documentEditorRef.current?.scrollToHeading(id)

                    }

                  />

                ) : null}

              </SidebarContent>

            </SidebarGroupContent>

          </SidebarGroup>

        </SidebarProvider>

      </aside>



      <main

        ref={documentScrollRef}

        className="relative min-h-0 min-w-0 flex-1 overflow-y-auto"

      >

        <DocumentFloatingChrome
          explorerOpen={explorerPanel != null}
          onExplorerOpenChange={(open) => setExplorerPanel(open ? "files" : null)}
          chatOpen={chatOpen}
          onChatOpenChange={setChatOpen}
          pendingCount={0}
        />

        {documentLoading ? (

          <p className="px-12 pt-8 text-muted-foreground">Loading document…</p>

        ) : activePath ? (

          <DocumentEditor

            key={activePath}

            ref={documentEditorRef}

            filePath={activePath}

            content={documentContent}

            scrollParentRef={documentScrollRef}

            onTocUpdate={setTocEntries}

          />

        ) : (

          <p className="px-12 pt-8 text-muted-foreground">

            Select a file from the explorer.

          </p>

        )}

      </main>



      <aside

        aria-label="Chat"

        aria-expanded={chatOpen}

        aria-hidden={!chatOpen}

        className={cn(

          "chrome-panel flex shrink-0 flex-col overflow-hidden border-l bg-background",

          "transition-[width] duration-200 ease-out",

          !chatOpen && "pointer-events-none border-l-0",

        )}

        style={{

          width: chatOpen ? CHAT_EXPANDED_WIDTH : 0,

        }}

      >

        {chatOpen ? (

          <ChatPanelHeader

            onClose={() => setChatOpen(false)}

            onNewChat={handleNewChat}

            onShowChatHistory={handleShowChatHistory}

          />

        ) : null}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <ChatThread
            key={chatSessionKey}
            onViewInDocument={focusAnchorInDocument}
          />
        </div>

      </aside>

    </div>

  )

}



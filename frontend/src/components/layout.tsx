import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import type { ExplorerView } from "@/components/canvas-chrome"
import type { DocumentEditorHandle } from "@/components/document-editor"
import { WorkbenchTopBar } from "@/components/workbench-top-bar"
import { ExplorerPanel } from "@/components/explorer-panel"
import { DocumentPanel } from "@/components/document-panel"
import { ChatPanel } from "@/components/chat-panel"
import { modelDisplayName } from "@/components/model-switcher-trigger"
import { PanelResizeHandle } from "@/components/panel-resize-handle"
import type { SettingsSection } from "@/components/settings-editor"
import { useAgentSession } from "@/hooks/use-agent-session"
import { useDocumentTabs } from "@/hooks/use-document-tabs"
import { useChatSessions } from "@/hooks/use-chat-sessions"
import { useSettings } from "@/hooks/use-settings"
import { useWorkspace } from "@/hooks/use-workspace"
import { usePanelResize } from "@/hooks/use-panel-resize"
import type { DocumentPatchMessage } from "@/lib/agent-protocol"
import type { EditorSelection } from "@/components/document-editor"
import {
  makeSelectionAttachment,
  type ChatAttachment,
} from "@/lib/chat-attachments"
import { invalidateFileReadCache } from "@/lib/file-read-cache"
import { SETTINGS_PATH } from "@/lib/document-tabs"
import { pathBasename, pathDirname, pathJoin } from "@/lib/path"
import { suggestNewFilePath } from "@/lib/suggest-new-file-path"
import { suggestNewFolderPath } from "@/lib/suggest-new-folder-path"
import { toastManager } from "@/components/ui/toast"
import { shell } from "@/lib/shell-chrome"
import { useViewportWidth } from "@/hooks/use-media-query"
import {
  CHAT_PANEL_MIN_PX,
  EXPLORER_PANEL_MIN_PX,
  EXPLORER_PANEL_WIDTH_DEFAULT,
  computeInitialChatPanelWidth,
  computeMaxChatPanelWidth,
  resolveWorkbenchLayout,
  type WorkbenchFullscreenPane,
  workbenchGridTemplateColumns,
} from "@/lib/workbench-grid"
import { cn } from "@/lib/utils"

const EXPLORER_PANEL_WIDTH_MIN = EXPLORER_PANEL_MIN_PX
const EXPLORER_PANEL_WIDTH_MAX = 420

export function Layout() {
  const viewportWidth = useViewportWidth()
  const chatPanelMax = computeMaxChatPanelWidth(viewportWidth)
  const chatPanelInitial = Math.min(
    computeInitialChatPanelWidth(viewportWidth),
    chatPanelMax,
  )

  const [explorerView, setExplorerView] = useState<ExplorerView | null>("file")
  const lastExplorerTabRef = useRef<ExplorerView>("file")
  const documentEditorRef = useRef<DocumentEditorHandle>(null)
  const [editorSelection, setEditorSelection] =
    useState<EditorSelection | null>(null)
  const [chatAttachments, setChatAttachments] = useState<ChatAttachment[]>([])
  const welcomeShownRef = useRef(false)
  const [fullscreenPane, setFullscreenPane] =
    useState<WorkbenchFullscreenPane | null>(null)
  const [settingsSection, setSettingsSection] = useState<SettingsSection>("models")
  const [settingsStartAddModel, setSettingsStartAddModel] = useState(false)

  const explorerPanel = usePanelResize({
    initial: EXPLORER_PANEL_WIDTH_DEFAULT,
    min: EXPLORER_PANEL_WIDTH_MIN,
    max: EXPLORER_PANEL_WIDTH_MAX,
    direction: "ltr-panel",
  })
  const chatPanel = usePanelResize({
    initial: chatPanelInitial,
    min: CHAT_PANEL_MIN_PX,
    max: chatPanelMax,
    direction: "rtl-panel",
  })

  const {
    fileTree,
    treeLoading,
    treeError,
    activeProject,
    recentProjects,
    linkedFolderIds,
    mentionablePaths,
    workspace,
    handleOpenFolder,
    handleSelectProject,
    refreshFileTree,
    setFileOpenCallback,
  } = useWorkspace()

  const handleDocumentPatch = useCallback(
    (patch: DocumentPatchMessage) => {
      if (patch.document) {
        documentTabs.setDocumentContent(patch.document)
        if (documentTabs.activePath) {
          documentTabs.skipNextDocumentOpenRef.current = true
        }
      }
    },
    []
  )

  const settings = useSettings()

  const agent = useAgentSession({
    onDocumentPatch: handleDocumentPatch,
    onDocumentBuffer: (msg) => {
      // Buffer changed by the backend (applied edit group) — sync editor, tab,
      // and dirty state so switching tabs or saving uses the applied content.
      documentTabs.applyExternalContent(msg.path, msg.document)
    },
    onDocumentSaved: (msg) => {
      if (msg.ok) documentTabs.markSaved(msg.path)
      toastManager.add({
        type: msg.ok ? "success" : "error",
        title: msg.ok ? "Document saved" : "Save failed",
        description: msg.path,
      })
    },
    onError: (message) => {
      toastManager.add({
        type: "error",
        title: "Agent error",
        description: message,
      })
    },
    onAgentMessage: settings.handleMessage,
  })

  useEffect(() => {
    if (agent.connectionState !== "open" || welcomeShownRef.current) return
    welcomeShownRef.current = true
    agent.setWelcomeMessage("Ask me about your writing or any project file.")
  }, [agent.connectionState, agent.setWelcomeMessage])

  const syncDocumentToAgent = useCallback(
    (document: string, path: string, isOpen = false) => {
      if (isOpen) {
        agent.sendDocumentOpen(document, path)
      } else {
        agent.sendDocumentChange(document, path)
      }
    },
    [agent.sendDocumentOpen, agent.sendDocumentChange]
  )

  const documentTabs = useDocumentTabs({
    workspace,
    onDocumentOpen: (content, path) => {
      syncDocumentToAgent(content, path, true)
    },
    onDocumentChange: (content, path) => {
      syncDocumentToAgent(content, path)
    },
  })

  const handleSaveDocument = useCallback(() => {
    const path = documentTabs.activePath
    if (!path || path === SETTINGS_PATH) return
    // Flush the editor's latest content (bypassing TipTap change debounce) so we
    // never save stale text, then push it to the backend buffer and save to disk.
    const latest =
      documentEditorRef.current?.getMarkdown() ?? documentTabs.documentContent
    agent.sendDocumentChange(latest, path)
    agent.saveDocument(path)
  }, [
    agent.sendDocumentChange,
    agent.saveDocument,
    documentTabs.activePath,
    documentTabs.documentContent,
  ])

  const editHighlights = useMemo(() => {
    const path = documentTabs.activePath
    if (!path) return []
    const out: { id: string; text: string; stale?: boolean }[] = []
    for (const group of agent.editGroups) {
      if (group.path !== path) continue
      if (!["proposed", "partially_applied", "stale"].includes(group.status)) continue
      for (const edit of group.edits) {
        if (["applied", "deleted", "replaced", "rejected"].includes(edit.status)) continue
        const text =
          edit.kind === "insert"
            ? edit.anchor.prefix_context || edit.new_text
            : edit.old_text
        if (!text) continue
        out.push({
          id: edit.id,
          text,
          stale: edit.status === "stale" || group.status === "stale",
        })
      }
    }
    return out
  }, [agent.editGroups, documentTabs.activePath])

  const handleAddSelectionToChat = useCallback((selection: EditorSelection) => {
    if (!selection.text.trim()) return
    const attachment = makeSelectionAttachment({
      path: selection.filePath,
      from: selection.from,
      to: selection.to,
      text: selection.text,
      startLine: selection.startLine,
      endLine: selection.endLine,
    })
    setChatAttachments((prev) =>
      prev.some((a) => a.id === attachment.id) ? prev : [...prev, attachment],
    )
  }, [])

  const handleRemoveAttachment = useCallback((id: string) => {
    setChatAttachments((prev) => prev.filter((a) => a.id !== id))
  }, [])

  const handleClearAttachments = useCallback(() => {
    setChatAttachments([])
  }, [])

  const handleSelectEdit = useCallback(
    (group: { path: string }, edit: { old_text: string; new_text: string; anchor: { prefix_context: string } }) => {
      const target =
        edit.old_text || edit.anchor.prefix_context || edit.new_text
      const scroll = () => documentEditorRef.current?.scrollToText(target)
      if (group.path !== documentTabs.activePath) {
        void documentTabs.openFile(group.path)
        window.setTimeout(scroll, 250)
      } else {
        scroll()
      }
    },
    [documentTabs.openFile, documentTabs.activePath],
  )

  // Update workspace's file open callback after documentTabs is available
  useEffect(() => {
    setFileOpenCallback((path) => {
      void documentTabs.openFile(path)
    })
  }, [setFileOpenCallback, documentTabs.openFile])

  const isSettingsTab = documentTabs.activePath === SETTINGS_PATH

  useEffect(() => {
    if (agent.connectionState === "open" || isSettingsTab) {
      settings.load()
    }
  }, [agent.connectionState, isSettingsTab, settings.load])

  const handleSettingsBack = useCallback(() => {
    documentTabs.handleCloseTab(SETTINGS_PATH)
  }, [documentTabs.handleCloseTab])

  const handleOpenSettings = useCallback(() => {
    if (explorerView == null) {
      setExplorerView(lastExplorerTabRef.current)
    }
    void documentTabs.openSettings()
  }, [documentTabs.openSettings, explorerView])

  const handleOpenModelsSettings = useCallback(() => {
    setSettingsSection("models")
    setSettingsStartAddModel(true)
    if (explorerView == null) {
      setExplorerView(lastExplorerTabRef.current)
    }
    void documentTabs.openSettings()
  }, [documentTabs.openSettings, explorerView])

  const handleSettingsSectionChange = useCallback((section: SettingsSection) => {
    setSettingsSection(section)
  }, [])

  const handleSettingsStartAddModelHandled = useCallback(() => {
    setSettingsStartAddModel(false)
  }, [])

  const handleOpenFile = useCallback(
    (path: string) => {
      void documentTabs.openFile(path)
      setFullscreenPane(null)
    },
    [documentTabs.openFile]
  )

  const handleRenameFile = useCallback(
    async (path: string) => {
      const currentName = pathBasename(path)
      const nextName = window.prompt("Rename file", currentName)?.trim()
      if (!nextName || nextName === currentName) return

      if (nextName.includes("/") || nextName.includes("\\")) {
        toastManager.add({
          type: "error",
          title: "Rename failed",
          description: "Use a file name, not a path.",
        })
        return
      }

      if (!nextName.endsWith(".md")) {
        toastManager.add({
          type: "error",
          title: "Rename failed",
          description: "Markdown files must keep the .md extension.",
        })
        return
      }

      const nextPath = pathJoin(pathDirname(path), nextName)

      try {
        await workspace.renameFile(path, nextPath)
        invalidateFileReadCache(path)
        await refreshFileTree()
        documentTabs.repathOpenTabs([{ from: path, to: nextPath }])
        if (documentTabs.activePath === path) {
          documentTabs.setActivePath(nextPath)
          syncDocumentToAgent(documentTabs.documentContent, pathBasename(nextPath), true)
        }
        toastManager.add({
          type: "success",
          title: "File renamed",
          description: nextPath,
        })
      } catch (err) {
        toastManager.add({
          type: "error",
          title: "Rename failed",
          description:
            err instanceof Error ? err.message : "Could not rename file",
        })
      }
    },
    [documentTabs, workspace, refreshFileTree, syncDocumentToAgent]
  )

  const handleMoveFiles = useCallback(
    async (moves: ReadonlyArray<{ from: string; to: string }>) => {
      if (moves.length === 0) return

      try {
        for (const { from, to } of moves) {
          await workspace.renameFile(from, to)
          invalidateFileReadCache(from)
        }
        await refreshFileTree()

        documentTabs.repathOpenTabs(moves)

        const pathMap = new Map(moves.map(({ from, to }) => [from, to]))
        const active = documentTabs.activePath
        if (active && pathMap.has(active)) {
          const nextPath = pathMap.get(active)!
          documentTabs.setActivePath(nextPath)
          syncDocumentToAgent(
            documentTabs.documentContent,
            pathBasename(nextPath),
            true
          )
        }

        toastManager.add({
          type: "success",
          title:
            moves.length === 1 ? "File moved" : `${moves.length} files moved`,
          description: moves.map(({ to }) => to).join(", "),
        })
      } catch (err) {
        toastManager.add({
          type: "error",
          title: "Move failed",
          description:
            err instanceof Error ? err.message : "Could not move files",
        })
      }
    },
    [documentTabs, workspace, refreshFileTree, syncDocumentToAgent]
  )

  const handleCopyFileFolderPath = useCallback(async (path: string) => {
    try {
      const folderPath = await workspace.getFileFolderPath(path)
      await navigator.clipboard.writeText(folderPath)
      toastManager.add({
        type: "success",
        title: "Folder path copied",
        description: folderPath,
      })
    } catch (err) {
      toastManager.add({
        type: "error",
        title: "Copy failed",
        description: err instanceof Error ? err.message : "Could not copy path",
      })
    }
  }, [workspace])

  const handleExplorerTabChange = useCallback((view: ExplorerView) => {
    lastExplorerTabRef.current = view
    setExplorerView(view)
  }, [])

  const handleCreateFileIn = useCallback(async (parentDir: string) => {
    const filePath = suggestNewFilePath(fileTree, parentDir)
    const fileName = pathBasename(filePath)
    const chosenName = window.prompt("New file name", fileName)?.trim()
    if (!chosenName) return

    if (chosenName.includes("/") || chosenName.includes("\\")) {
      toastManager.add({
        type: "error",
        title: "Create failed",
        description: "Use a file name, not a path.",
      })
      return
    }

    const baseName = chosenName.endsWith(".md") ? chosenName : `${chosenName}.md`
    const nextPath = parentDir ? pathJoin(parentDir, baseName) : baseName

    try {
      await workspace.writeFile(nextPath, "# New document\n")
      invalidateFileReadCache(nextPath)
      await refreshFileTree()
      void documentTabs.openFile(nextPath)
      toastManager.add({
        type: "success",
        title: "File created",
        description: nextPath,
      })
    } catch (err) {
      toastManager.add({
        type: "error",
        title: "Create failed",
        description:
          err instanceof Error ? err.message : "Could not create file",
      })
    }
  }, [documentTabs, fileTree, workspace, refreshFileTree])

  const handleCreateFolderIn = useCallback(async (parentDir: string) => {
    const folderPath = suggestNewFolderPath(fileTree, parentDir)
    const folderName = pathBasename(folderPath)
    const chosenName = window.prompt("New folder name", folderName)?.trim()
    if (!chosenName) return

    if (chosenName.includes("/") || chosenName.includes("\\")) {
      toastManager.add({
        type: "error",
        title: "Create failed",
        description: "Use a folder name, not a path.",
      })
      return
    }

    const nextPath = parentDir ? pathJoin(parentDir, chosenName) : chosenName

    try {
      await workspace.createFolder(nextPath)
      await refreshFileTree()
      toastManager.add({
        type: "success",
        title: "Folder created",
        description: nextPath,
      })
    } catch (err) {
      toastManager.add({
        type: "error",
        title: "Create failed",
        description:
          err instanceof Error ? err.message : "Could not create folder",
      })
    }
  }, [fileTree, workspace, refreshFileTree])

  const handleOutlineNavigate = useCallback((id: string) => {
    documentEditorRef.current?.scrollToHeading(id)
  }, [])

  const handleOpenFileFolder = useCallback(async (path: string) => {
    try {
      await workspace.openFileFolder(path)
    } catch (err) {
      toastManager.add({
        type: "error",
        title: "Open path failed",
        description:
          err instanceof Error ? err.message : "Could not open folder path",
      })
    }
  }, [workspace])

  const chatSessions = useChatSessions({
    messages: agent.messages,
    connectionState: agent.connectionState,
    backendSessions: agent.backendSessions,
    activeSessionId: agent.activeSessionId,
    createSession: agent.createSession,
    switchSession: agent.switchSession,
    setWelcomeMessage: agent.setWelcomeMessage,
  })

  useEffect(() => {
    const file = documentTabs.activePath ? pathBasename(documentTabs.activePath) : null
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
  }, [documentTabs.activePath, activeProject])

  const explorerOpen = explorerView != null
  const chatPanelOpen = chatSessions.chatOpen
  const explorerWidth = explorerOpen ? explorerPanel.width : 0
  const chatWidth = chatPanelOpen ? chatPanel.width : 0
  const { gridExplorerWidth, gridChatWidth } = resolveWorkbenchLayout(
    viewportWidth,
    explorerOpen,
    chatPanelOpen,
    explorerWidth,
    chatWidth
  )

  useEffect(() => {
    if (fullscreenPane === "explorer" && gridExplorerWidth > 0) {
      setFullscreenPane(null)
    }
    if (fullscreenPane === "chat" && gridChatWidth > 0) {
      setFullscreenPane(null)
    }
  }, [fullscreenPane, gridExplorerWidth, gridChatWidth])

  const handleExplorerPanelOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        if (fullscreenPane === "explorer") {
          setFullscreenPane(null)
          return
        }
        if (explorerOpen && gridExplorerWidth === 0) {
          setFullscreenPane("explorer")
          return
        }
        if (explorerView) {
          lastExplorerTabRef.current = explorerView
        }
        setExplorerView(null)
        setFullscreenPane(null)
        return
      }
      setExplorerView(lastExplorerTabRef.current)
      if (gridExplorerWidth === 0) {
        setFullscreenPane("explorer")
      }
    },
    [explorerOpen, explorerView, fullscreenPane, gridExplorerWidth]
  )

  const handleChatPanelOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        if (fullscreenPane === "chat") {
          setFullscreenPane(null)
          return
        }
        if (chatPanelOpen && gridChatWidth === 0) {
          setFullscreenPane("chat")
          return
        }
        chatSessions.setChatOpen(false)
        setFullscreenPane(null)
        return
      }
      chatSessions.setChatOpen(true)
      if (gridChatWidth === 0) {
        setFullscreenPane("chat")
      }
    },
    [
      chatPanelOpen,
      chatSessions.setChatOpen,
      fullscreenPane,
      gridChatWidth,
    ]
  )

  const isFullscreen = fullscreenPane != null

  const explorerPanelProps = {
    explorerView,
    fileTree,
    activePath: documentTabs.activePath,
    treeLoading,
    treeError,
    tocEntries: documentTabs.tocEntries,
    activeProject,
    onOpenFile: handleOpenFile,
    onOpenSettings: handleOpenSettings,
    onCreateFile: (parentDir: string) => void handleCreateFileIn(parentDir),
    onCreateFolder: (parentDir: string) => void handleCreateFolderIn(parentDir),
    onRenameFile: (path: string) => void handleRenameFile(path),
    onCopyFileFolderPath: (path: string) => void handleCopyFileFolderPath(path),
    onOpenFileFolder: (path: string) => void handleOpenFileFolder(path),
    onMoveFiles: (moves: ReadonlyArray<{ from: string; to: string }>) =>
      void handleMoveFiles(moves),
    onOutlineNavigate: handleOutlineNavigate,
    settingsActive: isSettingsTab,
    settingsSection,
    onSettingsSectionChange: handleSettingsSectionChange,
  } as const

  const activeModelEntry =
    settings.config?.models.find((m) => m.id === settings.config?.active) ??
    settings.config?.models[0]
  const activeModelLabel = activeModelEntry
    ? modelDisplayName(activeModelEntry)
    : "No model"

  const chatPanelProps = {
    chatOpen: chatPanelOpen,
    messages: agent.messages,
    agentThinking: agent.agentThinking,
    isStreaming: agent.isStreaming,
    connectionState: agent.connectionState,
    activeFilename: documentTabs.activePath
      ? pathBasename(documentTabs.activePath)
      : null,
    activePath: documentTabs.activePath,
    documentContent: documentTabs.documentContent,
    mentionablePaths,
    editorSelection,
    onSend: agent.sendChat,
    onResendFromMessage: agent.sendChatFromMessage,
    onStopStreaming: agent.stopStreaming,
    models: settings.config?.models ?? [],
    activeModelId: settings.config?.active ?? null,
    onSelectModel: settings.setActiveModel,
    onOpenModelsSettings: handleOpenModelsSettings,
    editGroups: agent.editGroups,
    onApplyGroup: agent.applyGroup,
    onRejectGroup: agent.rejectGroup,
    onDeleteGroup: agent.deleteGroup,
    onSelectEdit: handleSelectEdit,
    attachments: chatAttachments,
    onRemoveAttachment: handleRemoveAttachment,
    onClearAttachments: handleClearAttachments,
  } as const

  return (
    <div className="relative flex h-screen min-w-0 flex-col overflow-hidden bg-background">
      <WorkbenchTopBar
        explorerPanelWidth={gridExplorerWidth}
        explorerView={explorerView}
        onExplorerPanelOpenChange={handleExplorerPanelOpenChange}
        onExplorerTabChange={handleExplorerTabChange}
        chatPanelOpen={chatPanelOpen}
        chatPanelWidth={gridChatWidth}
        fullscreenPane={fullscreenPane}
        onChatPanelOpenChange={handleChatPanelOpenChange}
        documentTabs={documentTabs.tabs}
        activeDocumentPath={documentTabs.activePath}
        onSelectDocument={(path) => void documentTabs.openFile(path)}
        onCloseDocument={documentTabs.handleCloseTab}
        chatSessions={chatSessions.chatSessionsForSwitcher}
        activeChatId={chatSessions.chatSessionId ?? ""}
        onSelectChat={chatSessions.handleSelectChatTab}
        onNewChat={chatSessions.handleNewChat}
        chatHistorySessions={chatSessions.chatHistoryForSwitcher}
        onSelectChatHistorySession={chatSessions.handleSelectHistorySession}
        agentModelLabel={activeModelLabel}
        activeProject={activeProject}
        recentProjects={recentProjects}
        linkedFolderIds={linkedFolderIds}
        onSelectProject={handleSelectProject}
        onOpenFolder={() => void handleOpenFolder()}
        settingsActive={isSettingsTab}
        onSettingsBack={handleSettingsBack}
      />

      <div
        className={cn(shell.workbenchGrid, isFullscreen && "grid-cols-1")}
        style={{
          gridTemplateColumns: isFullscreen
            ? "1fr"
            : workbenchGridTemplateColumns(
                gridExplorerWidth,
                gridChatWidth
              ),
        }}
      >
        {isFullscreen ? (
          <>
            {fullscreenPane === "explorer" ? (
              <ExplorerPanel {...explorerPanelProps} />
            ) : null}
            {fullscreenPane === "chat" ? (
              <ChatPanel {...chatPanelProps} />
            ) : null}
          </>
        ) : (
          <>
            {gridExplorerWidth > 0 ? (
              <ExplorerPanel {...explorerPanelProps} />
            ) : (
              <div className="min-h-0 min-w-0" aria-hidden />
            )}

            <DocumentPanel
              ref={documentEditorRef}
              activePath={documentTabs.activePath}
              documentContent={documentTabs.documentContent}
              documentLoading={documentTabs.documentLoading}
              settingsSection={settingsSection}
              settingsStartAddModel={settingsStartAddModel}
              onSettingsStartAddModelHandled={handleSettingsStartAddModelHandled}
              settingsConfig={settings.config}
              settingsTools={settings.tools}
              settingsPlugins={settings.plugins}
              onMarkdownChange={documentTabs.handleMarkdownChange}
              onSelectionChange={setEditorSelection}
              onTocUpdate={documentTabs.setTocEntries}
              onOpenFile={handleOpenFile}
              onAddModel={settings.addModel}
              onUpdateModel={settings.updateModel}
              onRemoveModel={settings.removeModel}
              onSetActiveModel={settings.setActiveModel}
              onSetToolEnabled={settings.setToolEnabled}
              onSetSubagentEnabled={settings.setSubagentEnabled}
              settingsMemory={settings.memory}
              settingsMemoryEnabled={settings.memoryEnabled}
              onSetMemoryEnabled={settings.setMemoryEnabled}
              onDeleteMemory={settings.deleteMemoryEntry}
              onClearMemory={settings.clearMemory}
              onSave={handleSaveDocument}
              editHighlights={editHighlights}
              onAddSelectionToChat={handleAddSelectionToChat}
            />

            {gridChatWidth > 0 ? (
              <ChatPanel {...chatPanelProps} />
            ) : (
              <div className="min-h-0 min-w-0" aria-hidden />
            )}
          </>
        )}
      </div>

      {!isFullscreen && gridExplorerWidth > 0 ? (
        <PanelResizeHandle
          edge="end"
          span="viewport"
          style={{ left: Math.max(0, gridExplorerWidth - 4) }}
          onPointerDown={explorerPanel.onPointerDown}
        />
      ) : null}
      {!isFullscreen && gridChatWidth > 0 ? (
        <PanelResizeHandle
          edge="start"
          span="viewport"
          style={{ left: `calc(100% - ${gridChatWidth}px)` }}
          onPointerDown={chatPanel.onPointerDown}
        />
      ) : null}
    </div>
  )
}

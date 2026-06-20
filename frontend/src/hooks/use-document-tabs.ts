import { startTransition, useCallback, useEffect, useRef, useState } from "react"

import {
  closeTab,
  type DocumentTab,
  isVirtualTab,
  markTabDirty,
  repathTabs,
  SETTINGS_PATH,
  updateTabContent,
  upsertTab,
} from "@/lib/document/tabs"
import type { DocumentTocEntry } from "@/lib/document/toc"
import {
  prefetchFileRead,
  readFileCached,
  invalidateFileReadCache,
} from "@/lib/workspace/file-read-cache"
import { toastManager } from "@/components/ui/toast"

const DOCUMENT_CHANGE_DEBOUNCE_MS = 1000

export function useDocumentTabs({
  workspace,
  onDocumentOpen,
  onDocumentChange,
}: {
  workspace: { readFile: (path: string) => Promise<string> }
  onDocumentOpen?: (content: string, path: string) => void
  onDocumentChange?: (content: string, path: string) => void
}) {
  const [tabs, setTabs] = useState<DocumentTab[]>([])
  const [activePath, setActivePath] = useState<string | null>(null)
  const [documentContent, setDocumentContent] = useState("")
  const [documentLoading, setDocumentLoading] = useState(true)
  const [tocEntries, setTocEntries] = useState<DocumentTocEntry[]>([])
  const changeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const skipNextDocumentOpenRef = useRef(false)
  const openRequestIdRef = useRef(0)
  const tabsRef = useRef(tabs)
  tabsRef.current = tabs

  const prefetchFile = useCallback(
    (path: string) => {
      prefetchFileRead(path, workspace.readFile, {
        skip: (filePath) =>
          tabsRef.current.some((tab) => tab.path === filePath),
      })
    },
    [workspace]
  )

  const openFile = useCallback(
    async (path: string) => {
      if (changeDebounceRef.current) {
        clearTimeout(changeDebounceRef.current)
        changeDebounceRef.current = null
      }

      const existing = tabs.find((t) => t.path === path)
      if (existing) {
        // Commit activePath + content together so the editor never renders the
        // new path with the previous document's content (which autosave would
        // then persist to the wrong file).
        setActivePath(path)
        setDocumentContent(existing.content)
        setDocumentLoading(false)
        // Non-file tabs (settings, etc.) must not trigger document/open
        if (!isVirtualTab(existing) && !skipNextDocumentOpenRef.current) {
          onDocumentOpen?.(existing.content, path)
        }
        skipNextDocumentOpenRef.current = false
        return
      }

      // Virtual tabs are not backed by files
      const isVirtual = path === SETTINGS_PATH
      if (isVirtual) {
        setActivePath(path)
        startTransition(() => {
          setDocumentContent("")
          setTabs((prev) => upsertTab(prev, path, "", "settings"))
        })
        setDocumentLoading(false)
        return
      }

      const requestId = ++openRequestIdRef.current
      let revertPath: string | null = null
      setActivePath((prev) => {
        revertPath = prev
        return path
      })
      setDocumentLoading(true)
      setTocEntries([])

      try {
        const content = await readFileCached(path, workspace.readFile)
        if (requestId !== openRequestIdRef.current) return

        // Content must be committed urgently (not in a transition) so it lands
        // in the same commit as setDocumentLoading(false); otherwise the editor
        // can mount for the new path while documentContent still holds the
        // previous document, and autosave would persist that to the wrong file.
        setDocumentContent(content)
        startTransition(() => {
          setTabs((prev) => upsertTab(prev, path, content))
        })
        onDocumentOpen?.(content, path)
      } catch (err) {
        if (requestId !== openRequestIdRef.current) return

        setActivePath(revertPath)
        const message =
          err instanceof Error ? err.message : "Could not open file"
        toastManager.add({
          type: "error",
          title: "Open failed",
          description: message,
        })
      } finally {
        if (requestId === openRequestIdRef.current) {
          setDocumentLoading(false)
        }
      }
    },
    [tabs, workspace, onDocumentOpen]
  )

  const handleMarkdownChange = useCallback(
    (markdown: string) => {
      if (!activePath) return
      // Non-file tabs don't produce document/change messages
      const currentTab = tabs.find((t) => t.path === activePath)
      if (currentTab && isVirtualTab(currentTab)) return

      if (changeDebounceRef.current) {
        clearTimeout(changeDebounceRef.current)
      }
      changeDebounceRef.current = setTimeout(() => {
        const activeTab = tabsRef.current.find((tab) => tab.path === activePath)
        if (!activeTab) return
        // Only propagate changes the user actually made. TipTap may re-serialize
        // markdown on mount with harmless formatting differences; comparing
        // against the tab baseline avoids spurious dirty state and autosaves.
        if (markdown === activeTab.content) return

        setDocumentContent(markdown)
        setTabs((prev) => updateTabContent(prev, activePath, markdown, true))
        onDocumentChange?.(markdown, activePath)
      }, DOCUMENT_CHANGE_DEBOUNCE_MS)
    },
    [activePath, tabs, onDocumentChange]
  )

  /**
   * Replace a document's content from a backend source (e.g. an applied edit
   * group). Updates the editor surface (if active), the tab content, and marks
   * the tab dirty (unsaved). Cancels any pending debounced change so it cannot
   * overwrite the applied content with stale editor text.
   */
  const applyExternalContent = useCallback(
    (path: string, content: string) => {
      if (changeDebounceRef.current) {
        clearTimeout(changeDebounceRef.current)
        changeDebounceRef.current = null
      }
      if (path === activePath) {
        skipNextDocumentOpenRef.current = true
        setDocumentContent(content)
      }
      setTabs((prev) => updateTabContent(prev, path, content, true))
    },
    [activePath],
  )

  /** Mark a tab clean after a successful disk save. */
  const markSaved = useCallback((path: string, content?: string) => {
    setTabs((prev) =>
      content != null
        ? prev.map((t) =>
            t.path === path ? { ...t, content, dirty: false } : t,
          )
        : markTabDirty(prev, path, false),
    )
  }, [])

  /** Cancel any pending debounced change (e.g. before an immediate save). */
  const cancelPendingChange = useCallback(() => {
    if (changeDebounceRef.current) {
      clearTimeout(changeDebounceRef.current)
      changeDebounceRef.current = null
    }
  }, [])

  /**
   * Reload a file from disk if its tab is clean (not dirty).
   * Called when the Vite file watcher detects an external change.
   * Follows VS Code convention: clean buffer → silent reload; dirty → no-op.
   */
  const refreshFromDisk = useCallback(
    (filePath: string) => {
      const tab = tabsRef.current.find((t) => t.path === filePath)
      if (!tab || isVirtualTab(tab) || tab.dirty) return

      invalidateFileReadCache(filePath)
      void workspace.readFile(filePath).then((content) => {
        if (content === tab.content) return
        setTabs((prev) => updateTabContent(prev, filePath, content, false))
        if (filePath === activePath) {
          skipNextDocumentOpenRef.current = true
          setDocumentContent(content)
          onDocumentOpen?.(content, filePath)
        }
      })
    },
    [activePath, workspace, onDocumentOpen],
  )

  const handleCloseTab = useCallback(
    (path: string) => {
      const nextTabs = closeTab(tabs, path)
      setTabs(nextTabs)
      if (activePath !== path) return
      const fallback = nextTabs[nextTabs.length - 1]
      if (fallback) {
        void openFile(fallback.path)
      } else {
        setActivePath(null)
        setDocumentContent("")
      }
    },
    [tabs, activePath, openFile]
  )

  const repathOpenTabs = useCallback(
    (moves: ReadonlyArray<{ from: string; to: string }>) => {
      setTabs((prev) => repathTabs(prev, moves))
    },
    []
  )

  const openSettings = useCallback(() => {
    void openFile(SETTINGS_PATH)
  }, [openFile])

  useEffect(() => {
    return () => {
      if (changeDebounceRef.current) clearTimeout(changeDebounceRef.current)
    }
  }, [])

  const activeTab = tabs.find((t) => t.path === activePath) ?? null

  return {
    tabs,
    activePath,
    activeTab,
    documentContent,
    documentLoading,
    tocEntries,
    setActivePath,
    setDocumentContent,
    setTocEntries,
    openFile,
    openSettings,
    prefetchFile,
    handleMarkdownChange,
    handleCloseTab,
    repathOpenTabs,
    applyExternalContent,
    markSaved,
    cancelPendingChange,
    refreshFromDisk,
    skipNextDocumentOpenRef,
  }
}

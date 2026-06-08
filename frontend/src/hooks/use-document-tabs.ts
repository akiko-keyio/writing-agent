import { startTransition, useCallback, useEffect, useRef, useState } from "react"

import type { DocumentPatchMessage } from "@/lib/agent-protocol"
import {
  closeTab,
  type DocumentTab,
  isVirtualTab,
  repathTabs,
  SETTINGS_PATH,
  updateTabContent,
  upsertTab,
} from "@/lib/document-tabs"
import {
  prefetchFileRead,
  readFileCached,
} from "@/lib/file-read-cache"
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
        setActivePath(path)
        startTransition(() => {
          setDocumentContent(existing.content)
        })
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

        startTransition(() => {
          setDocumentContent(content)
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
        setDocumentContent(markdown)
        setTabs((prev) => {
          const activeTab = prev.find((tab) => tab.path === activePath)
          const dirty = activeTab ? markdown !== activeTab.content : true
          return updateTabContent(prev, activePath, markdown, dirty)
        })
        onDocumentChange?.(markdown, activePath)
      }, DOCUMENT_CHANGE_DEBOUNCE_MS)
    },
    [activePath, tabs, onDocumentChange]
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
    skipNextDocumentOpenRef,
  }
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import type { ChatTab } from "@/lib/chat/tab"
import {
  loadChatTabIds,
  prependChatTabId,
  saveChatTabIds,
  sessionTitleFromMessages,
} from "@/lib/chat/sessions"
import type { AgentChatMessage } from "@/hooks/use-agent-session"
import type { SessionSummary } from "@/lib/agent/protocol"

function tabsFromBackend(
  tabIds: string[],
  backendSessions: SessionSummary[],
): ChatTab[] {
  const byId = new Map(backendSessions.map((s) => [s.session_id, s]))
  return tabIds.map((id) => {
    const meta = byId.get(id)
    return {
      id,
      title: meta?.title ?? "New chat",
    }
  })
}

export function useChatSessions({
  messages,
  connectionState,
  backendSessions,
  sessionListLoaded,
  activeSessionId,
  workspaceId,
  createSession,
  switchSession,
  setWelcomeMessage,
}: {
  messages: AgentChatMessage[]
  connectionState: string
  backendSessions: SessionSummary[]
  sessionListLoaded: boolean
  activeSessionId: string | null
  workspaceId: string | null
  createSession: () => void
  switchSession: (sessionId: string) => void
  setWelcomeMessage: (text: string) => void
}) {
  const [openChatTabs, setOpenChatTabs] = useState<ChatTab[]>(() => {
    const ids = loadChatTabIds(workspaceId)
    return ids.length > 0
      ? ids.map((id) => ({ id, title: "New chat" }))
      : []
  })
  const [chatSessionId, setChatSessionId] = useState<string | null>(
    () => loadChatTabIds(workspaceId)[0] ?? null,
  )
  const [chatOpen, setChatOpen] = useState(true)
  const bootstrappedRef = useRef(false)

  useEffect(() => {
    if (connectionState !== "open") {
      bootstrappedRef.current = false
    }
  }, [connectionState])

  useEffect(() => {
    const ids = loadChatTabIds(workspaceId)
    setOpenChatTabs(ids.map((id) => ({ id, title: "New chat" })))
    setChatSessionId(ids[0] ?? null)
    bootstrappedRef.current = false
  }, [workspaceId])

  useEffect(() => {
    if (
      connectionState !== "open" ||
      !sessionListLoaded ||
      bootstrappedRef.current
    ) {
      return
    }

    const backendIds = new Set(backendSessions.map((s) => s.session_id))
    const storedIds = loadChatTabIds(workspaceId)
    const validTabIds = storedIds.filter((id) => backendIds.has(id))

    if (validTabIds.length === 0) {
      bootstrappedRef.current = true
      if (backendSessions.length > 0) {
        const first = backendSessions[0].session_id
        setOpenChatTabs(tabsFromBackend([first], backendSessions))
        setChatSessionId(first)
        saveChatTabIds([first], workspaceId)
        if (activeSessionId !== first) switchSession(first)
      } else {
        createSession()
      }
      return
    }

    if (validTabIds.length !== storedIds.length) {
      setOpenChatTabs(tabsFromBackend(validTabIds, backendSessions))
      saveChatTabIds(validTabIds, workspaceId)
    }

    const preferredId = chatSessionId ?? storedIds[0] ?? null
    const targetId =
      preferredId && backendIds.has(preferredId)
        ? preferredId
        : validTabIds[0]

    setChatSessionId(targetId)
    if (activeSessionId !== targetId) {
      switchSession(targetId)
    }
    bootstrappedRef.current = true
  }, [
    connectionState,
    sessionListLoaded,
    backendSessions,
    chatSessionId,
    activeSessionId,
    createSession,
    switchSession,
    workspaceId,
  ])

  useEffect(() => {
    if (!sessionListLoaded || backendSessions.length === 0) return
    setOpenChatTabs((prev) => {
      const ids = prev.map((t) => t.id)
      return tabsFromBackend(ids, backendSessions)
    })
  }, [backendSessions, sessionListLoaded])

  useEffect(() => {
    if (!activeSessionId) return
    setChatSessionId(activeSessionId)
    prependChatTabId(activeSessionId, workspaceId)
    setOpenChatTabs((prev) => {
      const exists = prev.some((t) => t.id === activeSessionId)
      const meta = backendSessions.find((s) => s.session_id === activeSessionId)
      const title =
        meta?.title ??
        sessionTitleFromMessages(
          messages.filter((m) => m.id !== "welcome"),
        )
      if (exists) {
        return prev.map((t) =>
          t.id === activeSessionId ? { ...t, title } : t,
        )
      }
      return [{ id: activeSessionId, title }, ...prev]
    })
  }, [activeSessionId, backendSessions, messages, workspaceId])

  useEffect(() => {
    const ids = openChatTabs.map((t) => t.id)
    if (ids.length > 0) saveChatTabIds(ids, workspaceId)
  }, [openChatTabs, workspaceId])

  const handleNewChat = useCallback(() => {
    createSession()
    setChatOpen(true)
    if (connectionState === "open") {
      setWelcomeMessage(
        "Started a new conversation. Ask about your writing.",
      )
    }
  }, [createSession, connectionState, setWelcomeMessage])

  const handleSelectChatTab = useCallback(
    (id: string) => {
      if (!chatOpen) setChatOpen(true)
      if (id === chatSessionId) return
      const existsOnBackend = backendSessions.some((s) => s.session_id === id)
      if (!existsOnBackend) {
        setOpenChatTabs((prev) => prev.filter((t) => t.id !== id))
        return
      }
      setChatSessionId(id)
      switchSession(id)
    },
    [chatOpen, chatSessionId, backendSessions, switchSession],
  )

  const handleSelectHistorySession = useCallback(
    (id: string) => {
      if (!chatOpen) setChatOpen(true)
      if (id === chatSessionId) return
      const inTabs = openChatTabs.some((t) => t.id === id)
      if (!inTabs) {
        const meta = backendSessions.find((s) => s.session_id === id)
        setOpenChatTabs((prev) => [
          ...prev,
          { id, title: meta?.title ?? "Chat" },
        ])
      }
      setChatSessionId(id)
      switchSession(id)
    },
    [chatOpen, chatSessionId, openChatTabs, backendSessions, switchSession],
  )

  const chatSessionsForSwitcher = useMemo(
    () =>
      openChatTabs.map((tab) => {
        const meta = backendSessions.find((s) => s.session_id === tab.id)
        return {
          id: tab.id,
          title: tab.title,
          updatedAt: (meta?.created_at ?? Date.now() / 1000) * 1000,
        }
      }),
    [openChatTabs, backendSessions],
  )

  const chatHistoryForSwitcher = useMemo(
    () =>
      backendSessions.map((s) => ({
        id: s.session_id,
        title: s.title,
        updatedAt: s.created_at * 1000,
      })),
    [backendSessions],
  )

  return {
    chatSessionId: chatSessionId ?? activeSessionId,
    chatOpen,
    setChatOpen,
    openChatTabs,
    chatSessionsForSwitcher,
    chatHistoryForSwitcher,
    handleNewChat,
    handleSelectChatTab,
    handleSelectHistorySession,
  }
}

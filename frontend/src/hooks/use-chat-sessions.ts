import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import type { ChatTab } from "@/lib/chat-tab"
import {
  loadChatTabIds,
  prependChatTabId,
  saveChatTabIds,
  sessionTitleFromMessages,
} from "@/lib/chat-sessions"
import type { AgentChatMessage } from "@/hooks/use-agent-session"
import type { SessionSummary } from "@/lib/agent-protocol"

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
  activeSessionId,
  createSession,
  switchSession,
  setWelcomeMessage,
}: {
  messages: AgentChatMessage[]
  connectionState: string
  backendSessions: SessionSummary[]
  activeSessionId: string | null
  createSession: () => void
  switchSession: (sessionId: string) => void
  setWelcomeMessage: (text: string) => void
}) {
  const [openChatTabs, setOpenChatTabs] = useState<ChatTab[]>(() => {
    const ids = loadChatTabIds()
    return ids.length > 0
      ? ids.map((id) => ({ id, title: "New chat" }))
      : []
  })
  const [chatSessionId, setChatSessionId] = useState<string | null>(
    () => loadChatTabIds()[0] ?? null,
  )
  const [chatOpen, setChatOpen] = useState(true)
  const bootstrappedRef = useRef(false)

  useEffect(() => {
    if (connectionState !== "open" || bootstrappedRef.current) return
    if (backendSessions.length === 0 && openChatTabs.length === 0) {
      bootstrappedRef.current = true
      createSession()
      return
    }
    if (openChatTabs.length === 0 && backendSessions.length > 0) {
      bootstrappedRef.current = true
      const ids = backendSessions.map((s) => s.session_id)
      saveChatTabIds(ids)
      setOpenChatTabs(tabsFromBackend(ids, backendSessions))
      const first = ids[0]
      setChatSessionId(first)
      switchSession(first)
      return
    }
    if (chatSessionId && activeSessionId !== chatSessionId) {
      switchSession(chatSessionId)
    }
    bootstrappedRef.current = true
  }, [
    connectionState,
    backendSessions,
    openChatTabs.length,
    chatSessionId,
    activeSessionId,
    createSession,
    switchSession,
  ])

  useEffect(() => {
    if (backendSessions.length === 0) return
    setOpenChatTabs((prev) => {
      const ids = prev.map((t) => t.id)
      return tabsFromBackend(ids.length > 0 ? ids : loadChatTabIds(), backendSessions)
    })
  }, [backendSessions])

  useEffect(() => {
    if (!activeSessionId) return
    setChatSessionId(activeSessionId)
    prependChatTabId(activeSessionId)
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
  }, [activeSessionId, backendSessions, messages])

  useEffect(() => {
    const ids = openChatTabs.map((t) => t.id)
    if (ids.length > 0) saveChatTabIds(ids)
  }, [openChatTabs])

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
      setChatSessionId(id)
      switchSession(id)
    },
    [chatOpen, chatSessionId, switchSession],
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

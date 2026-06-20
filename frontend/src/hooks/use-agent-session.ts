import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import {
  getAgentClient,
  resetAgentClient,
  type AgentClient,
} from "@/lib/agent/client"
import {
  acceptEditGroupEvent,
  acceptEditGroupStateEvent,
  filterEditGroupsForSession,
} from "@/lib/agent/edit-group-session"
import type {
  AgentConnectionState,
  AgentOutboundMessage,
  AgentToolStatus,
  ChatMessageContext,
  ChatToolUpdateMessage,
  DocumentBufferMessage,
  DocumentPatchMessage,
  DocumentSavedMessage,
  EditGroup,
  SessionSummary,
  SessionUiMessage,
} from "@/lib/agent/protocol"
import {
  applyReasoningDelta,
  applyToolUpdateToProcess,
  completeActiveReasoning,
  finalizeProcess,
  finalizeRunningTools,
  startImplicitReasoningAfterTool,
  type AgentProcessItem,
} from "@/lib/agent/process-timeline"

export type AgentToolCall = {
  id: string
  name: string
  status: AgentToolStatus
  input?: unknown
  output?: unknown
  errorText?: string
}

export type AgentChatMessage = {
  id: string
  role: "user" | "agent"
  text: string
  reasoning?: string
  tools?: AgentToolCall[]
  /** Ordered reasoning phases + tool calls as they arrived on the wire. */
  process?: AgentProcessItem[]
  streaming?: boolean
}

export type UseAgentSessionOptions = {
  onDocumentPatch?: (patch: DocumentPatchMessage) => void
  /** Buffer updated by the backend (e.g. after applying an edit group). */
  onDocumentBuffer?: (msg: DocumentBufferMessage) => void
  /** Disk save result for a document. */
  onDocumentSaved?: (msg: DocumentSavedMessage) => void
  onError?: (message: string) => void
  /** Called for every outbound message — used by useSettings to intercept settings/data. */
  onAgentMessage?: (msg: AgentOutboundMessage) => void
}

function upsertGroup(groups: EditGroup[], group: EditGroup): EditGroup[] {
  const index = groups.findIndex((g) => g.id === group.id)
  if (index >= 0) {
    const next = [...groups]
    next[index] = group
    return next
  }
  return [...groups, group]
}

function updateStreamingMessage(
  prev: AgentChatMessage[],
  streamId: string,
  updater: (msg: AgentChatMessage) => AgentChatMessage,
): AgentChatMessage[] {
  return prev.map((m) => (m.id === streamId ? updater(m) : m))
}

function upsertTool(
  tools: AgentToolCall[] | undefined,
  update: ChatToolUpdateMessage,
): AgentToolCall[] {
  const list = [...(tools ?? [])]
  const index = list.findIndex((t) => t.id === update.tool_id)
  const resolvedName =
    update.name?.trim() && update.name !== "tool"
      ? update.name
      : (list[index]?.name ?? update.name)
  const next: AgentToolCall = {
    id: update.tool_id,
    name: resolvedName,
    status: update.status,
    input: update.input !== undefined ? update.input : list[index]?.input,
    output:
      update.output !== undefined ? update.output : list[index]?.output,
    errorText: update.error ?? list[index]?.errorText,
  }
  if (index >= 0) {
    list[index] = next
  } else {
    list.push(next)
  }
  return list
}

function uiMessagesToChat(messages: SessionUiMessage[]): AgentChatMessage[] {
  return messages.map((m, i) => ({
    id: `restored-${i}`,
    role: m.role,
    text: m.text,
  }))
}

export function useAgentSession(options: UseAgentSessionOptions = {}) {
  const [connectionState, setConnectionState] =
    useState<AgentConnectionState>("closed")
  const [agentError, setAgentError] = useState<string | null>(null)
  const [messages, setMessages] = useState<AgentChatMessage[]>([])
  const [agentThinking, setAgentThinking] = useState(false)
  const [backendSessions, setBackendSessions] = useState<SessionSummary[]>([])
  const [sessionListLoaded, setSessionListLoaded] = useState(false)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null)
  const [editGroups, setEditGroups] = useState<EditGroup[]>([])
  const [autoReview, setAutoReview] = useState(false)
  const autoReviewRef = useRef(false)
  const clientRef = useRef<AgentClient | null>(null)
  const optionsRef = useRef(options)
  optionsRef.current = options
  const listedOnConnectRef = useRef(false)
  const stoppedStreamsRef = useRef<Set<string>>(new Set())
  const currentRequestIdRef = useRef<string | null>(null)
  const activeSessionIdRef = useRef<string | null>(null)

  const syncActiveSessionId = (sessionId: string | null) => {
    activeSessionIdRef.current = sessionId
    setActiveSessionId(sessionId)
  }

  useEffect(() => {
    autoReviewRef.current = autoReview
  }, [autoReview])

  useEffect(() => {
    const client = getAgentClient({
      onStateChange: (state) => {
        setConnectionState(state)
        if (state !== "open") {
          listedOnConnectRef.current = false
          setSessionListLoaded(false)
        }
      },
      onMessage: (msg: AgentOutboundMessage) => {
        if (msg.type === "session/list") {
          setBackendSessions(msg.sessions)
          setSessionListLoaded(true)
          return
        }

        if (msg.type === "workspace/switched") {
          setActiveWorkspaceId(msg.workspace_id)
          setBackendSessions(msg.sessions)
          setSessionListLoaded(true)
          syncActiveSessionId(msg.active_session_id ?? null)
          setMessages([])
          setEditGroups([])
          setAgentThinking(false)
          if (typeof msg.auto_review === "boolean") {
            setAutoReview(msg.auto_review)
          }
          return
        }

        if (msg.type === "session/title_updated") {
          setBackendSessions((prev) =>
            prev.map((s) =>
              s.session_id === msg.session_id ? { ...s, title: msg.title } : s,
            ),
          )
          return
        }

        if (msg.type === "session/cleared") {
          if (msg.session_id) syncActiveSessionId(msg.session_id)
          setMessages(uiMessagesToChat(msg.messages))
          setEditGroups([])
          setAgentThinking(false)
          if (typeof msg.auto_review === "boolean") {
            setAutoReview(msg.auto_review)
          }
          return
        }

        if (msg.type === "session/created") {
          syncActiveSessionId(msg.session_id)
          if (msg.messages.length > 0) {
            setMessages(uiMessagesToChat(msg.messages))
          }
          setEditGroups([])
          setAgentThinking(false)
          if (typeof msg.auto_review === "boolean") {
            setAutoReview(msg.auto_review)
          }
          setBackendSessions((prev) => {
            const exists = prev.some((s) => s.session_id === msg.session_id)
            if (exists) return prev
            return [
              {
                session_id: msg.session_id,
                title: "New chat",
                created_at: Date.now() / 1000,
              },
              ...prev,
            ]
          })
          return
        }

        if (msg.type === "session/restored") {
          syncActiveSessionId(msg.session_id)
          setMessages(uiMessagesToChat(msg.messages))
          setEditGroups([])
          setAgentThinking(false)
          if (typeof msg.auto_review === "boolean") {
            setAutoReview(msg.auto_review)
          }
          return
        }

        if (msg.type === "session/auto_review") {
          setAutoReview(msg.auto_review)
          return
        }

        if (msg.type === "chat/stream_start") {
          setAgentThinking(false)
          setMessages((prev) => [
            ...prev,
            {
              id: msg.stream_id,
              role: "agent",
              text: "",
              reasoning: "",
              tools: [],
              process: [],
              streaming: true,
            },
          ])
          return
        }

        if (msg.type === "chat/tool_update") {
          if (stoppedStreamsRef.current.has(msg.stream_id)) return
          setMessages((prev) =>
            updateStreamingMessage(prev, msg.stream_id, (m) => {
              const prevTool = m.tools?.find((toolCall) => toolCall.id === msg.tool_id)
              const tools = upsertTool(m.tools, msg)
              const tool = tools.find((toolCall) => toolCall.id === msg.tool_id)!
              const nextId = () =>
                `reasoning-${m.process?.length ?? 0}-${Date.now()}`
              let process = applyToolUpdateToProcess(m.process ?? [], msg, tool)
              const toolJustFinished =
                m.streaming &&
                prevTool?.status === "running" &&
                (msg.status === "completed" || msg.status === "error")
              if (toolJustFinished) {
                process = startImplicitReasoningAfterTool(process, nextId)
              }
              return {
                ...m,
                tools,
                process,
              }
            }),
          )
          return
        }

        if (msg.type === "chat/reasoning_delta") {
          if (stoppedStreamsRef.current.has(msg.stream_id)) return
          setMessages((prev) =>
            updateStreamingMessage(prev, msg.stream_id, (m) => ({
              ...m,
              reasoning: (m.reasoning ?? "") + msg.text,
              process: applyReasoningDelta(
                m.process ?? [],
                msg.text,
                () => `reasoning-${m.process?.length ?? 0}-${Date.now()}`,
              ),
            })),
          )
          return
        }

        if (msg.type === "chat/message_delta") {
          if (stoppedStreamsRef.current.has(msg.stream_id)) return
          setMessages((prev) =>
            updateStreamingMessage(prev, msg.stream_id, (m) => ({
              ...m,
              text: m.text + msg.text,
              process: completeActiveReasoning(m.process ?? []),
            })),
          )
          return
        }

        if (msg.type === "chat/stream_end") {
          if (stoppedStreamsRef.current.has(msg.stream_id)) {
            stoppedStreamsRef.current.delete(msg.stream_id)
            return
          }
          setAgentThinking(false)
          setMessages((prev) =>
            updateStreamingMessage(prev, msg.stream_id, (m) => ({
              ...m,
              text: msg.text || m.text,
              reasoning:
                msg.reasoning !== undefined
                  ? msg.reasoning
                  : m.reasoning || undefined,
              tools: (m.tools ?? []).map((tool) =>
                tool.status === "running"
                  ? { ...tool, status: "completed" as const }
                  : tool,
              ),
              process: finalizeProcess(m.process ?? []),
              streaming: false,
            })),
          )
          return
        }

        if (msg.type === "chat/message") {
          setAgentThinking(false)
          setMessages((prev) => {
            const last = prev[prev.length - 1]
            if (
              last?.role === "agent" &&
              last.text === msg.text &&
              !last.streaming
            ) {
              return prev
            }
            return [
              ...prev,
              {
                id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                role: "agent",
                text: msg.text,
              },
            ]
          })
          return
        }

        if (msg.type === "group/propose") {
          if (!acceptEditGroupEvent(msg.group, activeSessionIdRef.current)) return
          setEditGroups((prev) => upsertGroup(prev, msg.group))
          return
        }

        if (msg.type === "group/update") {
          if (!acceptEditGroupEvent(msg.group, activeSessionIdRef.current)) return
          setEditGroups((prev) => upsertGroup(prev, msg.group))
          return
        }

        if (msg.type === "group/state") {
          if (
            !acceptEditGroupStateEvent(
              msg.session_id,
              activeSessionIdRef.current,
            )
          ) {
            return
          }
          setEditGroups(msg.groups)
          return
        }

        if (msg.type === "document/buffer") {
          optionsRef.current.onDocumentBuffer?.(msg)
          return
        }

        if (msg.type === "document/saved") {
          optionsRef.current.onDocumentSaved?.(msg)
          return
        }

        if (msg.type === "document/patch") {
          optionsRef.current.onDocumentPatch?.(msg)
        }

        // Forward all messages to external listeners (e.g., useSettings)
        optionsRef.current.onAgentMessage?.(msg)
      },
      onError: (message) => {
        setAgentThinking(false)
        setMessages((prev) => prev.filter((m) => !m.streaming))
        if (message === "Session not found") {
          clientRef.current?.send({ type: "session/create" })
          return
        }
        setAgentError(message)
        optionsRef.current.onError?.(message)
      },
    })
    clientRef.current = client
    client.connect()

    return () => {
      resetAgentClient()
      clientRef.current = null
      listedOnConnectRef.current = false
    }
  }, [])

  useEffect(() => {
    if (connectionState !== "open" || listedOnConnectRef.current) return
    listedOnConnectRef.current = true
    clientRef.current?.send({ type: "session/list" })
  }, [connectionState])

  const sendDocumentOpen = useCallback((document: string, path: string) => {
    clientRef.current?.send({
      type: "document/open",
      document,
      path,
    })
  }, [])

  const sendDocumentChange = useCallback((document: string, path: string) => {
    clientRef.current?.send({ type: "document/change", document, path })
  }, [])

  const sendChat = useCallback(
    (text: string, context?: ChatMessageContext) => {
      const trimmed = text.trim()
      if (!trimmed) return

      setMessages((prev) => [
        ...prev,
        {
          id: `u-${Date.now()}`,
          role: "user",
          text: trimmed,
        },
      ])
      const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      currentRequestIdRef.current = requestId
      setAgentError(null)
      setAgentThinking(true)
      clientRef.current?.send({
        type: "chat/message",
        text: trimmed,
        context,
        request_id: requestId,
        auto_review: autoReviewRef.current,
      })
    },
    [],
  )

  /** Truncate at user message, then send — frontend branch; backend history unchanged. */
  const sendChatFromMessage = useCallback(
    (messageId: string, text: string, context?: ChatMessageContext) => {
      const trimmed = text.trim()
      if (!trimmed) return

      setMessages((prev) => {
        const index = prev.findIndex((m) => m.id === messageId)
        const base = index >= 0 ? prev.slice(0, index) : prev
        return [
          ...base,
          {
            id: `u-${Date.now()}`,
            role: "user" as const,
            text: trimmed,
          },
        ]
      })
      setAgentError(null)
      setAgentThinking(true)
      clientRef.current?.send({
        type: "chat/message",
        text: trimmed,
        context,
        auto_review: autoReviewRef.current,
      })
    },
    [],
  )

  const clearSession = useCallback(() => {
    clientRef.current?.send({ type: "session/clear" })
  }, [])

  const createSession = useCallback(() => {
    setMessages([])
    setAgentThinking(false)
    clientRef.current?.send({ type: "session/create" })
  }, [])

  const switchSession = useCallback((sessionId: string) => {
    setAgentThinking(false)
    clientRef.current?.send({
      type: "session/switch",
      session_id: sessionId,
    })
  }, [])

  const requestSessionList = useCallback(() => {
    clientRef.current?.send({ type: "session/list" })
  }, [])

  const switchWorkspace = useCallback(
    (workspace: { projectRoot?: string | null; displayName?: string }) => {
      setAgentThinking(false)
      setSessionListLoaded(false)
      clientRef.current?.send({
        type: "workspace/switch",
        project_root: workspace.projectRoot || undefined,
        display_name: workspace.displayName,
      })
    },
    [],
  )

  const setWelcomeMessage = useCallback((text: string) => {
    if (!text) {
      setMessages([])
      return
    }
    setMessages([
      {
        id: "welcome",
        role: "agent",
        text,
      },
    ])
  }, [])

  const stopStreaming = useCallback(() => {
    setAgentThinking(false)
    setMessages((prev) =>
      prev.map((m) => {
        if (!m.streaming) return m
        stoppedStreamsRef.current.add(m.id)
        const process = finalizeProcess(
          finalizeRunningTools(m.process ?? []),
        )
        return {
          ...m,
          streaming: false,
          process,
          tools: m.tools?.map((t) =>
            t.status === "running" || t.status === "pending"
              ? { ...t, status: "error" as const, errorText: "Stopped" }
              : t,
          ),
        }
      }),
    )
    clientRef.current?.send({
      type: "chat/cancel",
      request_id: currentRequestIdRef.current ?? undefined,
    })
  }, [])

  const applyGroup = useCallback((groupId: string) => {
    clientRef.current?.send({ type: "group/apply", group_id: groupId })
  }, [])

  const dismissGroup = useCallback((groupId: string) => {
    clientRef.current?.send({ type: "group/dismiss", group_id: groupId })
  }, [])

  const rejectEdit = useCallback((groupId: string, editId: string) => {
    clientRef.current?.send({
      type: "group/reject",
      group_id: groupId,
      edit_id: editId,
    })
  }, [])

  const saveDocument = useCallback((path: string, content?: string) => {
    clientRef.current?.send(
      content === undefined
        ? { type: "document/save", path }
        : { type: "document/save", path, content },
    )
  }, [])

  const requestGroupState = useCallback(() => {
    clientRef.current?.send({ type: "group/state" })
  }, [])

  const setAutoReviewEnabled = useCallback((enabled: boolean) => {
    setAutoReview(enabled)
    autoReviewRef.current = enabled
    clientRef.current?.send({
      type: "session/auto_review",
      enabled,
    })
  }, [])

  const clearAgentError = useCallback(() => {
    setAgentError(null)
  }, [])

  const isStreaming = messages.some((m) => m.streaming)
  const visibleEditGroups = useMemo(
    () => filterEditGroupsForSession(editGroups, activeSessionId),
    [editGroups, activeSessionId],
  )

  return useMemo(
    () => ({
      connectionState,
      agentError,
      clearAgentError,
      messages,
      agentThinking,
      isStreaming,
      backendSessions,
      sessionListLoaded,
      activeSessionId,
      activeWorkspaceId,
      editGroups: visibleEditGroups,
      autoReview,
      setAutoReviewEnabled,
      sendDocumentOpen,
      sendDocumentChange,
      sendChat,
      sendChatFromMessage,
      stopStreaming,
      clearSession,
      createSession,
      switchSession,
      switchWorkspace,
      requestSessionList,
      setWelcomeMessage,
      applyGroup,
      dismissGroup,
      rejectEdit,
      saveDocument,
      requestGroupState,
    }),
    [
      connectionState,
      agentError,
      clearAgentError,
      messages,
      agentThinking,
      isStreaming,
      backendSessions,
      sessionListLoaded,
      activeSessionId,
      activeWorkspaceId,
      visibleEditGroups,
      autoReview,
      setAutoReviewEnabled,
      sendDocumentOpen,
      sendDocumentChange,
      sendChat,
      sendChatFromMessage,
      stopStreaming,
      clearSession,
      createSession,
      switchSession,
      switchWorkspace,
      requestSessionList,
      setWelcomeMessage,
      applyGroup,
      dismissGroup,
      rejectEdit,
      saveDocument,
      requestGroupState,
    ],
  )
}
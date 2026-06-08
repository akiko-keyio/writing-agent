/**
 * Chat-first WebSocket protocol (see docs/protocol.md).
 * Mirrors agent/protocol.py and agent/handler.py.
 */

export type AgentConnectionState = "connecting" | "open" | "closed"

export type SelectionContext = {
  from: number
  to: number
  text: string
}

export type ChatMessageContext = {
  active_path?: string
  buffer_snapshot?: string
  /** @deprecated use active_path */
  filename?: string
  selection?: SelectionContext
  mentions?: string[]
}

export type TextReplacement = {
  old: string
  new: string
}

export type SessionUiMessage = {
  role: "user" | "agent"
  text: string
}

export type SessionSummary = {
  session_id: string
  title: string
  created_at: number
}

/** Frontend → Agent */
export type DocumentOpenMessage = {
  type: "document/open"
  path: string
  document: string
}

export type DocumentChangeMessage = {
  type: "document/change"
  path: string
  document: string
}

export type ChatMessageOut = {
  type: "chat/message"
  text: string
  context?: ChatMessageContext
}

export type ChatCancelMessage = {
  type: "chat/cancel"
}

export type SessionClearMessage = {
  type: "session/clear"
}

export type SessionCreateMessage = {
  type: "session/create"
}

export type SessionSwitchMessage = {
  type: "session/switch"
  session_id: string
}

export type SessionListMessage = {
  type: "session/list"
}

export type PingMessage = {
  type: "ping"
}

export type SettingsReadMessage = {
  type: "settings/read"
}

export type SettingsUpdateMessage = {
  type: "settings/update"
  action:
    | "add_model"
    | "update_model"
    | "remove_model"
    | "set_active_model"
    | "set_tool_enabled"
  model?: {
    id?: string
    provider?: string
    model?: string
    api_key?: string
    api_base?: string
    temperature?: number
  }
  model_id?: string
  tool_id?: string
  enabled?: boolean
}

export type PluginsListMessage = {
  type: "plugins/list"
}

export type AgentInboundMessage =
  | DocumentOpenMessage
  | DocumentChangeMessage
  | ChatMessageOut
  | ChatCancelMessage
  | SessionClearMessage
  | SessionCreateMessage
  | SessionSwitchMessage
  | SessionListMessage
  | PingMessage
  | SettingsReadMessage
  | SettingsUpdateMessage
  | PluginsListMessage

/** Agent → Frontend */
export type ChatStreamStartMessage = {
  type: "chat/stream_start"
  stream_id: string
}

export type ChatMessageDeltaMessage = {
  type: "chat/message_delta"
  stream_id: string
  text: string
}

export type ChatReasoningDeltaMessage = {
  type: "chat/reasoning_delta"
  stream_id: string
  text: string
}

export type ChatStreamEndMessage = {
  type: "chat/stream_end"
  stream_id: string
  text: string
  reasoning?: string
}

export type AgentToolStatus =
  | "pending"
  | "ready"
  | "running"
  | "completed"
  | "error"

export type ChatToolUpdateMessage = {
  type: "chat/tool_update"
  stream_id: string
  tool_id: string
  name: string
  status: AgentToolStatus
  input?: unknown
  output?: unknown
  error?: string
}

/** Legacy single-shot reply (agent may still send for compatibility). */
export type ChatMessageIn = {
  type: "chat/message"
  text: string
}

export type DocumentPatchMessage = {
  type: "document/patch"
  path?: string | null
  document?: string
  replacements?: TextReplacement[]
}

export type SessionCreatedMessage = {
  type: "session/created"
  session_id: string
  messages: SessionUiMessage[]
}

export type SessionRestoredMessage = {
  type: "session/restored"
  session_id: string
  messages: SessionUiMessage[]
}

export type SessionListResponseMessage = {
  type: "session/list"
  sessions: SessionSummary[]
}

export type AgentErrorMessage = {
  type: "error"
  message: string
}

export type SessionClearedMessage = {
  type: "session/cleared"
  session_id?: string
  messages: SessionUiMessage[]
}

export type ModelEntryData = {
  id: string
  provider: string
  model: string
  api_key_masked: string
  api_base: string
  temperature: number
}

export type SettingsConfigData = {
  active: string
  models: ModelEntryData[]
}

export type ToolEntryData = {
  id: string
  name: string
  description: string
  enabled: boolean
}

export type PluginItem = {
  id: string
  name: string
  type: "skill" | "subagent" | "reference" | "rule"
  description: string
  path: string
  preview?: string
  readonly?: boolean
  is_background?: boolean
  references?: { name: string; path: string }[]
}

export type PluginsData = {
  skills: PluginItem[]
  subagents: PluginItem[]
  references: PluginItem[]
  rules: PluginItem[]
}

export type SettingsDataMessage = {
  type: "settings/data"
  config: SettingsConfigData
  tools: ToolEntryData[]
  plugins: PluginsData
}

export type PluginsDataMessage = {
  type: "plugins/data"
  plugins: PluginsData
}

export type SettingsUpdatedMessage = {
  type: "settings/updated"
  config?: SettingsConfigData
  tools?: ToolEntryData[]
}

export type PongMessage = {
  type: "pong"
}

export type AgentOutboundMessage =
  | ChatStreamStartMessage
  | ChatMessageDeltaMessage
  | ChatReasoningDeltaMessage
  | ChatToolUpdateMessage
  | ChatStreamEndMessage
  | ChatMessageIn
  | DocumentPatchMessage
  | SessionCreatedMessage
  | SessionRestoredMessage
  | SessionClearedMessage
  | SessionListResponseMessage
  | SettingsDataMessage
  | SettingsUpdatedMessage
  | PluginsDataMessage
  | AgentErrorMessage
  | PongMessage

const OUTBOUND_TYPES = new Set([
  "chat/stream_start",
  "chat/message_delta",
  "chat/reasoning_delta",
  "chat/tool_update",
  "chat/stream_end",
  "chat/message",
  "document/patch",
  "session/created",
  "session/restored",
  "session/cleared",
  "session/list",
  "settings/data",
  "settings/updated",
  "plugins/data",
  "error",
  "pong",
])

export function isAgentOutboundMessage(
  value: unknown,
): value is AgentOutboundMessage {
  if (!value || typeof value !== "object") return false
  const t = (value as { type?: unknown }).type
  return typeof t === "string" && OUTBOUND_TYPES.has(t)
}

export function applyReplacements(
  document: string,
  replacements: TextReplacement[],
): { document: string; errors: string[] } {
  let result = document
  const errors: string[] = []
  for (const { old, new: newText } of replacements) {
    if (!old) {
      errors.push("Empty old text in replacement")
      continue
    }
    const count = result.split(old).length - 1
    if (count === 0) {
      errors.push(`Text not found: ${old.slice(0, 40)}…`)
    } else if (count > 1) {
      errors.push(`Text not unique (${count} matches): ${old.slice(0, 40)}…`)
    } else {
      result = result.replace(old, newText)
    }
  }
  return { document: result, errors }
}

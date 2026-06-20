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

export type EditReviewContext = {
  group_id: string
  edit_id: string
  path: string
  summary: string
}

export type ChatMessageContext = {
  active_path?: string
  buffer_snapshot?: string
  /** @deprecated use active_path */
  filename?: string
  selection?: SelectionContext
  mentions?: string[]
  /** User is adjusting a specific proposed edit from the review queue. */
  edit_review?: EditReviewContext
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
  request_id?: string
  auto_review?: boolean
}

export type SessionAutoReviewMessage = {
  type: "session/auto_review"
  enabled: boolean
}

export type ChatCancelMessage = {
  type: "chat/cancel"
  request_id?: string
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

export type WorkspaceSwitchMessage = {
  type: "workspace/switch"
  project_root?: string
  display_name?: string
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
    | "set_subagent_enabled"
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
  subagent_id?: string
  enabled?: boolean
}

export type PluginsListMessage = {
  type: "plugins/list"
}

/** Edit anchor — shared content-match assumptions with the backend. */
export type EditAnchor = {
  prefix_context: string
  suffix_context: string
  heading_path: string[]
  paragraph_hint: string
  content_hash: string
}

export type EditKind = "replace" | "delete" | "insert"

export type EditStatus =
  | "proposed"
  | "applied"
  | "stale"
  | "dismissed"

export type Edit = {
  id: string
  kind: EditKind
  old_text: string
  new_text: string
  anchor: EditAnchor
  replaces: string | null
  replaced_by: string | null
  rationale: string
  risk: string
  status: EditStatus
}

export type EditGroupStatus =
  | "proposed"
  | "partially_applied"
  | "applied"
  | "dismissed"
  | "stale"

export type EditGroup = {
  id: string
  session_id: string
  path: string
  title: string
  summary: string
  rationale: string
  source_agent: string
  confidence: number
  status: EditGroupStatus
  created_at: number
  updated_at: number
  edits: Edit[]
}

export type MemoryEntry = {
  id: string
  kind: "principle" | "knowledge" | "example"
  scope: "global" | "document"
  content: string
  path: string | null
  polarity: "positive" | "negative" | "preference" | "neutral"
  source: string
  links: string[]
  metadata: Record<string, unknown>
  created_at: number
}

export type MemoryData = {
  principle: MemoryEntry[]
  knowledge: MemoryEntry[]
  example: MemoryEntry[]
}

/** Frontend → Agent (review / document-save / memory) */
export type GroupApplyMessage = { type: "group/apply"; group_id: string }
export type GroupDismissMessage = { type: "group/dismiss"; group_id: string }
export type GroupRejectMessage = {
  type: "group/reject"
  group_id: string
  edit_id: string
}
export type GroupStateRequestMessage = { type: "group/state" }
export type GroupReplaceEditMessage = {
  type: "group/replace_edit"
  group_id: string
  edit_id: string
  edit: Partial<Edit> & { kind: EditKind; old_text?: string; new_text?: string }
}
export type DocumentSaveMessage = {
  type: "document/save"
  path: string
  /** Exact content to persist for ``path``; the backend writes this verbatim. */
  content?: string
}
export type MemoryReadMessage = { type: "memory/read" }
export type MemoryUpdateMessage = {
  type: "memory/update"
  action:
    | "add"
    | "delete"
    | "set_enabled"
    | "clear_all"
    | "accept_candidate"
    | "reject_candidate"
  entry?: Partial<MemoryEntry>
  id?: string
  enabled?: boolean
  content?: string
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
  | WorkspaceSwitchMessage
  | PingMessage
  | SettingsReadMessage
  | SettingsUpdateMessage
  | PluginsListMessage
  | GroupApplyMessage
  | GroupDismissMessage
  | GroupRejectMessage
  | GroupStateRequestMessage
  | GroupReplaceEditMessage
  | DocumentSaveMessage
  | MemoryReadMessage
  | MemoryUpdateMessage
  | SessionAutoReviewMessage

/** Agent → Frontend */
export type ChatStreamStartMessage = {
  type: "chat/stream_start"
  stream_id: string
  request_id?: string
}

export type ChatMessageDeltaMessage = {
  type: "chat/message_delta"
  stream_id: string
  text: string
  request_id?: string
}

export type ChatReasoningDeltaMessage = {
  type: "chat/reasoning_delta"
  stream_id: string
  text: string
  request_id?: string
}

export type ChatStreamEndMessage = {
  type: "chat/stream_end"
  stream_id: string
  text: string
  reasoning?: string
  cancelled?: boolean
  request_id?: string
}

export type ChatCancelledMessage = {
  type: "chat/cancelled"
  request_id?: string | null
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
  request_id?: string
}

/** Agent → Frontend: review / document-save / memory */
export type GroupProposeMessage = {
  type: "group/propose"
  group: EditGroup
  request_id?: string
}

export type GroupUpdateMessage = {
  type: "group/update"
  group: EditGroup
}

export type GroupStateMessage = {
  type: "group/state"
  session_id: string | null
  groups: EditGroup[]
}

export type DocumentBufferMessage = {
  type: "document/buffer"
  path: string
  document: string
  reason: string
}

export type DocumentSavedMessage = {
  type: "document/saved"
  path: string
  ok: boolean
}

export type MemoryDataMessage = {
  type: "memory/data"
  enabled: boolean
  memory: MemoryData
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
  auto_review?: boolean
}

export type SessionRestoredMessage = {
  type: "session/restored"
  session_id: string
  messages: SessionUiMessage[]
  auto_review?: boolean
}

export type SessionListResponseMessage = {
  type: "session/list"
  sessions: SessionSummary[]
}

export type WorkspaceSwitchedMessage = {
  type: "workspace/switched"
  workspace_id: string
  project_root: string
  display_name: string
  active_session_id?: string | null
  sessions: SessionSummary[]
  auto_review?: boolean
}

export type SessionTitleUpdatedMessage = {
  type: "session/title_updated"
  session_id: string
  title: string
}

export type AgentErrorMessage = {
  type: "error"
  message: string
  code?: string
  request_id?: string
}

export type SessionClearedMessage = {
  type: "session/cleared"
  session_id?: string
  messages: SessionUiMessage[]
  auto_review?: boolean
}

export type SessionAutoReviewOutMessage = {
  type: "session/auto_review"
  auto_review: boolean
}

export type ModelEntryData = {
  id: string
  provider: string
  model: string
  api_key_masked: string
  api_base: string
  temperature: number
  /** In-memory .env fallback — not persisted; cannot edit/delete in Settings. */
  readonly?: boolean
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
  enabled?: boolean
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
  plugins?: PluginsData
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
  | ChatCancelledMessage
  | ChatMessageIn
  | DocumentPatchMessage
  | GroupProposeMessage
  | GroupUpdateMessage
  | GroupStateMessage
  | DocumentBufferMessage
  | DocumentSavedMessage
  | MemoryDataMessage
  | SessionCreatedMessage
  | SessionRestoredMessage
  | SessionClearedMessage
  | SessionListResponseMessage
  | WorkspaceSwitchedMessage
  | SessionTitleUpdatedMessage
  | SessionAutoReviewOutMessage
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
  "chat/cancelled",
  "chat/message",
  "document/patch",
  "group/propose",
  "group/update",
  "group/state",
  "document/buffer",
  "document/saved",
  "memory/data",
  "session/created",
  "session/restored",
  "session/cleared",
  "session/list",
  "workspace/switched",
  "session/title_updated",
  "session/auto_review",
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

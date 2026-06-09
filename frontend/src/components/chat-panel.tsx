import { ChatThread } from "@/components/chat-thread"
import type { AgentChatMessage } from "@/hooks/use-agent-session"
import type { EditorSelection } from "@/components/document-editor"
import type { Edit, EditGroup, ModelEntryData } from "@/lib/agent-protocol"
import type { ChatAttachment } from "@/lib/chat-attachments"
import { shell } from "@/lib/shell-chrome"
import { cn } from "@/lib/utils"

interface ChatPanelProps {
  chatOpen: boolean
  messages: AgentChatMessage[]
  agentThinking: boolean
  isStreaming: boolean
  connectionState: "connecting" | "open" | "closed"
  activeFilename: string | null
  activePath: string | null
  documentContent: string
  mentionablePaths: string[]
  editorSelection: EditorSelection | null
  onSend: (text: string, context?: any) => void
  onResendFromMessage?: (
    messageId: string,
    text: string,
    context?: any,
  ) => void
  onStopStreaming?: () => void
  models?: ModelEntryData[]
  activeModelId?: string | null
  onSelectModel?: (modelId: string) => void
  onOpenModelsSettings?: () => void
  editGroups?: EditGroup[]
  onApplyGroup?: (groupId: string) => void
  onRejectGroup?: (groupId: string) => void
  onDeleteGroup?: (groupId: string) => void
  onSelectEdit?: (group: EditGroup, edit: Edit) => void
  attachments?: ChatAttachment[]
  onRemoveAttachment?: (id: string) => void
  onClearAttachments?: () => void
}

export function ChatPanel({
  chatOpen,
  messages,
  agentThinking,
  isStreaming,
  connectionState,
  activeFilename,
  activePath,
  documentContent,
  mentionablePaths,
  editorSelection,
  onSend,
  onResendFromMessage,
  onStopStreaming,
  models = [],
  activeModelId = null,
  onSelectModel,
  onOpenModelsSettings,
  editGroups = [],
  onApplyGroup,
  onRejectGroup,
  onDeleteGroup,
  onSelectEdit,
  attachments = [],
  onRemoveAttachment,
  onClearAttachments,
}: ChatPanelProps) {
  return (
    <div
      aria-label="Chat"
      aria-expanded={chatOpen}
      aria-hidden={!chatOpen}
      className={cn(
        "relative flex min-h-0 min-w-0 flex-col overflow-hidden",
        !chatOpen && "pointer-events-none"
      )}
    >
      {chatOpen ? (
        <>
          <div
            className={cn(
              shell.contentWindow,
              "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
            )}
          >
            <ChatThread
              messages={messages}
              agentThinking={agentThinking}
              isStreaming={isStreaming}
              connectionState={connectionState}
              activeFilename={activeFilename}
              activePath={activePath}
              documentContent={documentContent}
              mentionablePaths={mentionablePaths}
              editorSelection={editorSelection}
              onSend={onSend}
              onResendFromMessage={onResendFromMessage}
              onStopStreaming={onStopStreaming}
              models={models}
              activeModelId={activeModelId}
              onSelectModel={onSelectModel}
              onOpenModelsSettings={onOpenModelsSettings}
              editGroups={editGroups}
              onApplyGroup={onApplyGroup}
              onRejectGroup={onRejectGroup}
              onDeleteGroup={onDeleteGroup}
              onSelectEdit={onSelectEdit}
              attachments={attachments}
              onRemoveAttachment={onRemoveAttachment}
              onClearAttachments={onClearAttachments}
            />
          </div>
        </>
      ) : null}
    </div>
  )
}

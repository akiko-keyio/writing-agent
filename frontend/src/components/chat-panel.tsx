import { ChatThread } from "@/components/chat-thread"
import type { AgentChatMessage } from "@/hooks/use-agent-session"
import type { EditorSelection } from "@/components/document-editor"
import type { ModelEntryData } from "@/lib/agent-protocol"
import { shell } from "@/lib/shell-chrome"
import { cn } from "@/lib/utils"

interface ChatPanelProps {
  chatOpen: boolean
  messages: AgentChatMessage[]
  agentThinking: boolean
  isStreaming: boolean
  connectionState: string
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
            />
          </div>
        </>
      ) : null}
    </div>
  )
}

import { AtIcon } from "@hugeicons/core-free-icons";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react"
import {
  ChatThreadStatus,
  ChatTurnAlert,
  failedTurnMessageId,
  hasChatThreadStatus,
} from "@/components/chat-agent-status"
import { ChatComposer } from "@/components/chat-composer"
import { ChatMessageActions } from "@/components/chat-message-actions"
import { Message, MessageContent } from "@/components/nexus-ui/message"
import {
  THREAD_SCROLL_SPRING,
  Thread,
  ThreadContent,
} from "@/components/nexus-ui/thread"
import { TextShimmer } from "@/components/nexus-ui/text-shimmer"
import { ChatAssistantBody } from "@/components/chat-assistant-body"
import {
  Suggestion,
  SuggestionList,
  Suggestions,
} from "@/components/nexus-ui/suggestions"
import { hasActiveReviewGroups, ReviewPanel } from "@/components/review-panel"
import type { AgentChatMessage } from "@/hooks/use-agent-session"
import type {
  ChatMessageContext,
  Edit,
  EditGroup,
  ModelEntryData,
} from "@/lib/agent-protocol"
import {
  attachmentsToContext,
  composeMessageTextWithAttachments,
  type ChatAttachment,
} from "@/lib/chat-attachments"
import { formatChatContextLabel } from "@/lib/chat-context-label"
import {
  chatThreadColumnClass,
  contentReadingColumnClass,
} from "@/lib/content-layout"
import {
  chatBoxLaneClass,
  chatMarkdownBodyClass,
  chatProcessLineClass,
  chatProseLaneClass,
  chatThreadContentClass,
} from "@/lib/chat-typography"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { HugeiconsIcon } from "@/lib/icons"
import { shell } from "@/lib/shell-chrome"
import { gap, p, stack } from "@/lib/spacing"
import { cn } from "@/lib/utils"
import type { EditorSelection } from "@/components/document-editor"

export interface ChatThreadProps {
  messages: AgentChatMessage[]
  agentThinking: boolean
  isStreaming: boolean
  connectionState: "connecting" | "open" | "closed"
  agentError?: string | null
  onDismissAgentError?: () => void
  modelsKnown?: boolean
  activeFilename: string | null
  activePath: string | null
  documentContent: string
  mentionablePaths: string[]
  editorSelection: EditorSelection | null
  onSend: (text: string, context?: ChatMessageContext) => void
  onResendFromMessage?: (
    messageId: string,
    text: string,
    context?: ChatMessageContext,
  ) => void
  onStopStreaming?: () => void
  models?: ModelEntryData[]
  activeModelId?: string | null
  onSelectModel?: (modelId: string) => void
  onOpenModelsSettings?: () => void
  autoReview?: boolean
  onAutoReviewChange?: (enabled: boolean) => void
  editGroups?: EditGroup[]
  onApplyGroup?: (groupId: string) => void
  onDismissGroup?: (groupId: string) => void
  onRejectEdit?: (groupId: string, editId: string) => void
  onSelectEdit?: (group: EditGroup, edit: Edit) => void
  onAddEditToChat?: (group: EditGroup, edit: Edit) => void
  attachments?: ChatAttachment[]
  onRemoveAttachment?: (id: string) => void
  onClearAttachments?: () => void
}

function extractMentions(text: string, paths: string[]): string[] {
  const found = new Set<string>()
  for (const path of paths) {
    const base = path.split("/").pop() ?? path
    const label = formatChatContextLabel(path)
    if (
      text.includes(label) ||
      text.includes(`@${base}`) ||
      text.includes(`@${path}`)
    ) {
      found.add(path)
    }
  }
  return [...found]
}

function mentionAlreadyInInput(input: string, insert: string): boolean {
  return input.includes(insert)
}

function appendMentionToInput(prev: string, insert: string): string {
  if (mentionAlreadyInInput(prev, insert)) return prev
  const atMatch = prev.match(/@[\w./:-]*$/)
  if (atMatch && atMatch.index !== undefined) {
    return `${prev.slice(0, atMatch.index)}${insert} `
  }
  const needsSpace = prev.length > 0 && !/\s$/.test(prev)
  return `${prev}${needsSpace ? " " : ""}${insert} `
}

type MentionOption = {
  key: string
  insert: string
  display: string
}

export function ChatThread({
  messages,
  agentThinking,
  isStreaming,
  connectionState,
  agentError = null,
  onDismissAgentError,
  modelsKnown = false,
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
  autoReview = false,
  onAutoReviewChange,
  editGroups = [],
  onApplyGroup,
  onDismissGroup,
  onRejectEdit,
  onSelectEdit,
  onAddEditToChat,
  attachments = [],
  onRemoveAttachment,
  onClearAttachments,
}: ChatThreadProps) {
  const [input, setInput] = useState("")
  const [branchAnchorId, setBranchAnchorId] = useState<string | null>(null)
  const [branchInput, setBranchInput] = useState("")
  const [showMentionList, setShowMentionList] = useState(false)
  const submittingRef = useRef(false)
  const branchComposerRef = useRef<HTMLDivElement>(null)
  const composerDisabled = connectionState !== "open"
  const composerLocked = composerDisabled || agentThinking || isStreaming
  const composerPlaceholder =
    connectionState === "open"
      ? "Ask about your writing..."
      : connectionState === "connecting"
        ? "Connecting to the writing agent..."
        : "Waiting for the writing agent to reconnect..."

  const activeInput = branchAnchorId ? branchInput : input

  const buildMessageContext = useCallback(
    (text: string): ChatMessageContext => {
      const base: ChatMessageContext = {
        active_path: activePath ?? undefined,
        buffer_snapshot: activePath ? documentContent : undefined,
        filename: activeFilename ?? undefined,
        mentions: extractMentions(text, mentionablePaths),
        selection:
          editorSelection?.text?.trim() &&
          editorSelection.filePath &&
          text.includes(
            formatChatContextLabel(editorSelection.filePath, {
              startLine: editorSelection.startLine,
              endLine: editorSelection.endLine,
            }),
          )
            ? {
                from: editorSelection.from,
                to: editorSelection.to,
                text: editorSelection.text,
              }
            : undefined,
      }
      // Merge composer context chips (selection / file attachments).
      return attachmentsToContext(base, attachments)
    },
    [
      activeFilename,
      activePath,
      documentContent,
      mentionablePaths,
      editorSelection,
      attachments,
    ],
  )

  const submitMessage = useCallback(
    (raw: string) => {
      const text = raw.trim()
      if (!text || composerLocked || submittingRef.current) return

      const outbound = composeMessageTextWithAttachments(text, attachments)

      submittingRef.current = true
      onSend(outbound, buildMessageContext(outbound))
      setInput("")
      setShowMentionList(false)
      onClearAttachments?.()
      queueMicrotask(() => {
        submittingRef.current = false
      })
    },
    [
      composerLocked,
      buildMessageContext,
      onSend,
      onClearAttachments,
      attachments,
    ],
  )

  const submitBranchMessage = useCallback(
    (raw: string) => {
      const text = raw.trim()
      if (
        !text ||
        !branchAnchorId ||
        !onResendFromMessage ||
        composerLocked ||
        submittingRef.current
      ) {
        return
      }

      const outbound = composeMessageTextWithAttachments(text, attachments)

      submittingRef.current = true
      onResendFromMessage(branchAnchorId, outbound, buildMessageContext(outbound))
      setBranchAnchorId(null)
      setBranchInput("")
      setShowMentionList(false)
      onClearAttachments?.()
      queueMicrotask(() => {
        submittingRef.current = false
      })
    },
    [
      branchAnchorId,
      onResendFromMessage,
      composerLocked,
      buildMessageContext,
      onClearAttachments,
      attachments,
    ],
  )

  const openBranchComposer = useCallback(
    (messageId: string, text: string) => {
      if (composerLocked) return
      setBranchAnchorId(messageId)
      setBranchInput(text)
      setShowMentionList(false)
    },
    [composerLocked],
  )

  const closeBranchComposer = useCallback(() => {
    setBranchAnchorId(null)
    setBranchInput("")
  }, [])

  useEffect(() => {
    if (!branchAnchorId) return
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") closeBranchComposer()
    }
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target
      if (!(target instanceof Element)) return
      if (branchComposerRef.current?.contains(target)) return
      if (
        target.closest(
          "[data-slot=menu-popup], [data-slot=menu-positioner], [data-slot=tooltip-popup]",
        )
      ) {
        return
      }
      closeBranchComposer()
    }
    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("pointerdown", onPointerDown)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("pointerdown", onPointerDown)
    }
  }, [branchAnchorId, closeBranchComposer])

  const branchAnchorIndex = useMemo(() => {
    if (!branchAnchorId) return -1
    return messages.findIndex((m) => m.id === branchAnchorId)
  }, [branchAnchorId, messages])

  const mentionOptions = useMemo((): MentionOption[] => {
    const options: MentionOption[] = []
    const seen = new Set<string>()

    if (editorSelection?.filePath && editorSelection.text?.trim()) {
      const insert = formatChatContextLabel(editorSelection.filePath, {
        startLine: editorSelection.startLine,
        endLine: editorSelection.endLine,
      })
      if (!mentionAlreadyInInput(activeInput, insert)) {
        options.push({
          key: `selection:${insert}`,
          insert,
          display: insert,
        })
        seen.add(editorSelection.filePath)
      }
    }

    for (const path of mentionablePaths) {
      const insert = formatChatContextLabel(path)
      if (seen.has(path) || mentionAlreadyInInput(activeInput, insert)) continue
      options.push({
        key: path,
        insert,
        display: insert,
      })
    }

    return options
  }, [editorSelection, mentionablePaths, activeInput])

  const insertMention = useCallback(
    (insert: string) => {
      const apply = (prev: string) => appendMentionToInput(prev, insert)
      if (branchAnchorId) {
        setBranchInput(apply)
      } else {
        setInput(apply)
      }
      setShowMentionList(false)
    },
    [branchAnchorId],
  )

  const handleBottomInputChange = (value: string) => {
    setInput(value)
    if (!branchAnchorId) {
      setShowMentionList(/@[\w./:-]*$/.test(value))
    }
  }

  const handleBranchInputChange = (value: string) => {
    setBranchInput(value)
    setShowMentionList(/@[\w./:-]*$/.test(value))
  }

  const canSend = Boolean(input.trim()) && !composerLocked
  const canSendBranch = Boolean(branchInput.trim()) && !composerLocked

  const showThinkingPlaceholder =
    agentThinking && !isStreaming && messages.at(-1)?.role !== "agent"
  const showSuggestions =
    !showThinkingPlaceholder &&
    messages.every((message) => message.id === "welcome")

  const failedMessageId = failedTurnMessageId(messages, agentError)

  const showReviewDock = Boolean(
    onApplyGroup && onDismissGroup && hasActiveReviewGroups(editGroups),
  )

  const chatAgentStatusProps = {
    connectionState,
    agentError: null,
    onDismissError: onDismissAgentError,
    modelsKnown,
    modelsCount: models.length,
    onOpenModelsSettings,
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <Thread
        className="min-h-0 flex-1 overflow-hidden"
        resize={isStreaming ? "instant" : THREAD_SCROLL_SPRING}
      >
        <ThreadContent
          className={chatThreadContentClass}
          edgeFade={!showReviewDock}
        >
          <div className={chatThreadColumnClass}>
          {messages.map((msg, index) => {
            if (msg.id === "welcome") return null

            const isBranchAnchor =
              msg.role === "user" && branchAnchorId === msg.id
            const isBelowBranchEdit =
              branchAnchorIndex >= 0 && index > branchAnchorIndex

            if (isBranchAnchor) {
              return (
                <ChatComposer
                  key={msg.id}
                  ref={branchComposerRef}
                  className={chatBoxLaneClass}
                  value={branchInput}
                    onChange={handleBranchInputChange}
                    onSubmit={submitBranchMessage}
                    placeholder="Edit and resend…"
                    disabled={composerLocked}
                    canSend={canSendBranch}
                    isStreaming={isStreaming}
                    onStop={onStopStreaming}
                    footerVariant="full"
                    models={models}
                    activeModelId={activeModelId}
                    onSelectModel={onSelectModel ?? (() => {})}
                    onOpenModelsSettings={onOpenModelsSettings}
                    autoReview={autoReview}
                    onAutoReviewChange={onAutoReviewChange}
                    attachments={attachments}
                    onRemoveAttachment={onRemoveAttachment}
                    autoFocus
                />
              )
            }

            return (
              <Message
                key={msg.id}
                from={msg.role === "user" ? "user" : "assistant"}
                className={cn(
                  isBelowBranchEdit &&
                    "opacity-45 transition-opacity",
                )}
              >
                {msg.role === "user" ? (
                  <div className={cn(chatBoxLaneClass, stack.sm, "min-w-0")}>
                    <MessageContent
                      className={cn(
                        shell.chatUserBubble,
                        !composerLocked && shell.chatUserBubbleInteractive,
                      )}
                      {...(!composerLocked
                        ? {
                            role: "button" as const,
                            tabIndex: 0,
                            "aria-label": "Edit and resend this message",
                            onClick: () => openBranchComposer(msg.id, msg.text),
                            onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault()
                                openBranchComposer(msg.id, msg.text)
                              }
                            },
                          }
                        : {})}
                    >
                      <p className={cn("whitespace-pre-wrap", chatMarkdownBodyClass)}>
                        {msg.text}
                      </p>
                    </MessageContent>
                    {agentError && msg.id === failedMessageId ? (
                      <ChatTurnAlert
                        agentError={agentError}
                        onDismissError={onDismissAgentError}
                      />
                    ) : null}
                  </div>
                ) : (
                  <MessageContent
                    className={cn("group/message-content min-w-0", stack.md)}
                  >
                    <>
                      <ChatAssistantBody msg={msg} />
                      {!msg.streaming && msg.text.trim() ? (
                        <div className={cn(chatProseLaneClass, "flex justify-end")}>
                          <ChatMessageActions markdown={msg.text} />
                        </div>
                      ) : null}
                    </>
                  </MessageContent>
                )}
              </Message>
            )
          })}
          {showSuggestions ? (
            <div className={cn(chatProseLaneClass, "flex flex-1 flex-col items-center justify-center")}>
              <p className="text-sm text-muted-foreground mb-4">
                Ask about your writing, or try one of these:
              </p>
              <Suggestions
                className="items-center"
                onSelect={(value) => submitMessage(value)}
              >
                <SuggestionList orientation="vertical">
                  <Suggestion
                    variant="outline"
                    disabled={composerLocked}
                    value="What markdown files are in this project?"
                  >
                    What files are in this project?
                  </Suggestion>
                  <Suggestion
                    variant="outline"
                    disabled={composerLocked}
                    value={
                      activeFilename
                        ? `Read ${activeFilename} and summarize the introduction.`
                        : "Read test-text.md and summarize the introduction."
                    }
                  >
                    Summarize the open draft
                  </Suggestion>
                  <Suggestion
                    variant="outline"
                    disabled={composerLocked}
                    value="How can I improve clarity in my introduction?"
                  >
                    Improve introduction clarity
                  </Suggestion>
                </SuggestionList>
              </Suggestions>
            </div>
          ) : null}
          {hasChatThreadStatus(chatAgentStatusProps) ? (
            <div className={chatBoxLaneClass}>
              <ChatThreadStatus {...chatAgentStatusProps} />
            </div>
          ) : null}
          {showThinkingPlaceholder ? (
            <Message from="assistant">
              <MessageContent>
                <div className={chatProseLaneClass}>
                  <TextShimmer className={chatProcessLineClass}>
                    Thinking…
                  </TextShimmer>
                </div>
              </MessageContent>
            </Message>
          ) : null}
          </div>
        </ThreadContent>
      </Thread>

      <div className={cn("shrink-0", p[3].bottom)}>
        <div className={contentReadingColumnClass}>
        {showMentionList && mentionOptions.length > 0 ? (
          <ScrollArea
            className={cn(
              chatBoxLaneClass,
              "mb-2 max-h-32 border border-border bg-popover text-sm shadow-sm",
              shell.chatChipRadius,
            )}
            scrollFade
          >
            <ul className={p[1].all} role="listbox">
              {mentionOptions.slice(0, 12).map((option) => (
                <li key={option.key}>
                  <Button
                    type="button"
                    variant="ghost"
                    className={cn(
                      "h-auto w-full justify-start font-normal",
                      gap.sm,
                      p[2].x,
                      p[1].y
                    )}
                    onClick={() => insertMention(option.insert)}
                  >
                    <HugeiconsIcon icon={AtIcon} aria-hidden="true" className="size-3.5 shrink-0 opacity-70" />
                    <span className="truncate font-mono text-xs">
                      {option.display}
                    </span>
                  </Button>
                </li>
              ))}
            </ul>
          </ScrollArea>
        ) : null}

        <div className={cn("flex min-w-0 flex-col", gap.lg)}>
          {showReviewDock ? (
            <div className={cn(p[1].y, "[overflow-anchor:none]")}>
              <ReviewPanel
                groups={editGroups}
                onApply={onApplyGroup!}
                onDismiss={onDismissGroup!}
                onRejectEdit={onRejectEdit}
                onSelectEdit={onSelectEdit}
                onAddEditToChat={onAddEditToChat}
              />
            </div>
          ) : null}

          <ChatComposer
          className={chatBoxLaneClass}
          value={input}
          onChange={handleBottomInputChange}
          onSubmit={submitMessage}
          placeholder={composerPlaceholder}
          disabled={composerDisabled || agentThinking}
          canSend={canSend}
          isStreaming={isStreaming}
          onStop={onStopStreaming}
          footerVariant="full"
          models={models}
          activeModelId={activeModelId}
          onSelectModel={onSelectModel ?? (() => {})}
          onOpenModelsSettings={onOpenModelsSettings}
          autoReview={autoReview}
          onAutoReviewChange={onAutoReviewChange}
          attachments={attachments}
          onRemoveAttachment={onRemoveAttachment}
        />
        </div>
        </div>
      </div>
    </div>
  )
}

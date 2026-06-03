import { useCallback, useEffect, useRef, useState } from "react"
import { IconArrowUp, IconCircleCheck } from "@tabler/icons-react"

import {
  EditReviewCard,
  type EditEntry,
  type EditItem,
} from "@/components/edit-review-card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
} from "@/components/ui/input-group"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DEMO_EDIT_GROUP } from "@/lib/writing-demo"

/* ──────── Types ──────── */

interface ChatMessage {
  id: string
  role: "user" | "agent"
  text: string
}

export interface ChatThreadProps {
  onViewInDocument: (editId: string) => void
}

/* ──────── Component ──────── */

export function ChatThread({ onViewInDocument }: ChatThreadProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "m0",
      role: "agent",
      text: "I've loaded your document. What would you like to work on?",
    },
  ])
  const [input, setInput] = useState("")

  // Edit state
  const [pendingEdits, setPendingEdits] = useState<EditEntry[] | null>(null)
  const [resolvedSummary, setResolvedSummary] = useState<string | null>(null)

  const editCardRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, pendingEdits, resolvedSummary])

  /* ── Edit handlers ── */

  const handleToggleAccept = useCallback((editId: string) => {
    setPendingEdits((prev) =>
      prev
        ? prev.map((e) =>
            e.item.id === editId ? { ...e, accepted: !e.accepted } : e,
          )
        : prev,
    )
  }, [])

  const handleAcceptAll = useCallback(() => {
    setPendingEdits((prev) =>
      prev ? prev.map((e) => ({ ...e, accepted: true })) : prev,
    )
  }, [])

  const handleRevertAll = useCallback(() => {
    setPendingEdits((prev) =>
      prev ? prev.map((e) => ({ ...e, accepted: false })) : prev,
    )
  }, [])

  const handleConfirm = useCallback(() => {
    if (!pendingEdits) return
    const acceptedCount = pendingEdits.filter((e) => e.accepted).length
    const summary = `${acceptedCount} of ${pendingEdits.length} edits accepted`
    setResolvedSummary(summary)
    setPendingEdits(null)
    setMessages((prev) => [
      ...prev,
      { id: `a-${Date.now()}`, role: "agent", text: summary },
      {
        id: `a-follow-${Date.now()}`,
        role: "agent",
        text: "Done. Want me to look at another section?",
      },
    ])
  }, [pendingEdits])

  /* ── Send message ── */

  const handleSend = useCallback(() => {
    const text = input.trim()
    if (!text) return

    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", text }])
    setInput("")

    // If edits are pending, agent responds to the discussion
    if (pendingEdits) {
      setTimeout(() => {
        const lower = text.toLowerCase()
        let reply: string

        if (lower.includes("why") || lower.includes("explain")) {
          reply =
            '"Utilize" technically means repurposing something for an unintended function. Here you simply mean "use" — more precise and half the syllables.'
        } else if (
          lower.includes("different") ||
          lower.includes("change") ||
          lower.includes("try") ||
          lower.includes("adjust")
        ) {
          reply = "I've noted your preference. Toggle the edits above to reflect your choice, then confirm."
        } else {
          reply =
            "Toggle any edit to accept or skip it, then confirm when you're ready."
        }

        setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: "agent", text: reply }])
      }, 500)
      return
    }

    // No pending edits → agent proposes edits
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "agent",
          text: "The introduction has some unnecessarily complex phrasing. I found four changes that would improve clarity:",
        },
      ])

      const edits: EditEntry[] = DEMO_EDIT_GROUP.edits.map((edit) => ({
        item: edit as EditItem,
        accepted: true,
      }))
      setPendingEdits(edits)
      setResolvedSummary(null)
    }, 600)
  }, [input, pendingEdits])

  /* ── Render ── */

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      {/* Messages + Edit Card (scrollable) */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-4 px-3 py-3">
          {messages.map((msg) =>
            msg.role === "user" ? (
              <div
                key={msg.id}
                className="ml-auto max-w-[85%] rounded-xl rounded-br-sm border bg-background px-3 py-2.5 text-sm leading-relaxed shadow-xs/5"
              >
                {msg.text}
              </div>
            ) : (
              <div
                key={msg.id}
                className="w-full min-w-0 rounded-xl rounded-bl-sm bg-muted/50 px-3 py-2.5 text-sm leading-relaxed"
              >
                {msg.text}
              </div>
            ),
          )}

          {resolvedSummary && !pendingEdits ? (
            <Alert variant="success" className="max-w-full">
              <IconCircleCheck aria-hidden="true" />
              <AlertDescription>{resolvedSummary}</AlertDescription>
            </Alert>
          ) : null}

          {/* Edit card — sticky at bottom of scroll */}
          {pendingEdits ? (
            <div ref={editCardRef} className="sticky bottom-0 z-2">
              <EditReviewCard
                issue={DEMO_EDIT_GROUP.issue}
                edits={pendingEdits}
                inputValue={input}
                onToggleAccept={handleToggleAccept}
                onAcceptAll={handleAcceptAll}
                onRevertAll={handleRevertAll}
                onConfirm={handleConfirm}
                onViewInDocument={onViewInDocument}
                onInputChange={setInput}
                onSend={handleSend}
              />
            </div>
          ) : null}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input area — always visible, always Send */}
      {!pendingEdits ? (
        <div className="shrink-0 border-t bg-background px-3 py-3">
          <InputGroup className="w-full min-w-0">
            <InputGroupTextarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder="Ask about your writing…"
              rows={3}
            />
            <InputGroupAddon align="block-end" className="justify-end">
              <Button
                type="button"
                size="icon-sm"
                variant={input.trim() ? "default" : "ghost"}
                disabled={!input.trim()}
                aria-label="Send message"
                onClick={handleSend}
              >
                <IconArrowUp aria-hidden="true" />
              </Button>
            </InputGroupAddon>
          </InputGroup>
        </div>
      ) : null}
    </div>
  )
}

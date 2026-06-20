import { ChromeInlineScroll } from "@/components/chrome-scroll-area"

import { ChatReasoningMarkdown } from "@/components/chat-streamdown"



import {

  ChainOfThought,

  ChainOfThoughtContent,

  ChainOfThoughtStep,

  ChainOfThoughtStepContent,

  ChainOfThoughtStepTitle,

  type ChainOfThoughtStepStatus,

} from "@/components/nexus-ui/chain-of-thought"

import { MessageMarkdown } from "@/components/nexus-ui/message"

import {

  Reasoning,

  ReasoningContent,

  ReasoningTrigger,

} from "@/components/nexus-ui/reasoning"

import { TextShimmer } from "@/components/nexus-ui/text-shimmer"

import {

  Tool,

  ToolContent,

  ToolInput,

  ToolOutput,

  ToolTrigger,

  type ToolStatus,

} from "@/components/nexus-ui/tool"

import type { AgentChatMessage, AgentToolCall } from "@/hooks/use-agent-session"

import {

  groupConsecutiveTools,

  legacyProcessFromMessage,

  type AgentProcessItem,

  type AgentProcessToolGroup,

  type AgentReasoningPhase,

} from "@/lib/agent-process-timeline"

import {

  CHAT_REASONING_DISPLAY_DEFAULT,

  CHAT_TOOL_DISPLAY_DEFAULT,

  type ChatToolDisplayMode,

} from "@/lib/chat-display-prefs"

import {

  chatProcessLineClass,

  chatMetaLineClass,

  chatBoxLaneClass,
  chatProseLaneClass,

} from "@/lib/chat-typography"

import { formatAgentToolLabel } from "@/lib/agent-tool-labels"
import { formatToolPayloadForDisplay } from "@/lib/tool-payload-display"

import { formatReasoningPhaseLabel } from "@/lib/reasoning-phase"

import { p, stack } from "@/lib/spacing"

import { cn } from "@/lib/utils"



function toolStatusToStep(status: AgentToolCall["status"]): ChainOfThoughtStepStatus {

  if (status === "running") return "active"

  if (status === "error") return "error"

  if (status === "completed") return "completed"

  return "pending"

}



function formatToolPayload(
  toolName: string,
  kind: "input" | "output",
  payload: unknown,
): string {
  return formatToolPayloadForDisplay(toolName, kind, payload)
}



function ToolCallCard({

  tool,

  defaultOpen,

}: {

  tool: AgentToolCall

  defaultOpen: boolean

}) {

  const toolLabel = formatAgentToolLabel(tool.name)



  return (

    <Tool

      status={tool.status as ToolStatus}

      defaultOpen={defaultOpen}

    >

      <ToolTrigger name={toolLabel} />

      <ToolContent>

        {tool.input !== undefined ? (
          <ToolInput payload={tool.input} toolName={tool.name} />
        ) : null}

        <ToolOutput

          payload={tool.output ?? {}}

          showWhen={["completed", "error"]}

          errorText={tool.errorText}

          toolName={tool.name}

        />

      </ToolContent>

    </Tool>

  )

}



function InlineToolPayload({

  toolName,

  title,

  payload,

  error,

}: {

  toolName: string

  title: string

  payload: unknown

  error?: string

}) {

  const kind = title.toLowerCase() === "input" ? "input" : "output"

  const code = formatToolPayload(toolName, kind, payload)

  return (

    <div className={stack.xs}>

      <span className="text-xs font-medium text-muted-foreground uppercase">

        {title}

      </span>

      {error ? (

        <p

          className={cn(

            "rounded-lg border border-destructive/20 bg-destructive/5 text-sm text-destructive",

            p[2].x,

            p[1.5].y

          )}

        >

          {error}

        </p>

      ) : null}

      {code && !error ? (

        <ChromeInlineScroll

          maxHeight="10rem"

          className="rounded-lg border border-border bg-muted/50 font-mono text-xs text-foreground"

        >

          <pre className={cn(p[2].all, "leading-5")}>{code}</pre>

        </ChromeInlineScroll>

      ) : null}

    </div>

  )

}



function renderToolInChain(

  tool: AgentToolCall,

  index: number,

  total: number,

  toolDisplay: ChatToolDisplayMode,

) {

  const toolLabel = formatAgentToolLabel(tool.name)

  const stepKey = `${tool.id}-${tool.status}`



  if (toolDisplay === "chain-inline") {

    return (

      <ChainOfThoughtStep

        key={stepKey}

        status={toolStatusToStep(tool.status)}

        hasContent

        defaultOpen={false}

        showConnector={index < total - 1}

      >

        <ChainOfThoughtStepTitle collapsible>

          {toolLabel}

        </ChainOfThoughtStepTitle>

        <ChainOfThoughtStepContent>

          <div className={stack.sm}>

            {tool.input !== undefined ? (

              <InlineToolPayload toolName={tool.name} title="Input" payload={tool.input} />

            ) : null}

            {(tool.status === "completed" || tool.status === "error") && (

              <InlineToolPayload

                toolName={tool.name}

                title={tool.status === "error" ? "Error" : "Output"}

                payload={tool.status === "error" ? (tool.output ?? {}) : (tool.output ?? {})}

                error={tool.errorText}

              />

            )}

          </div>

        </ChainOfThoughtStepContent>

      </ChainOfThoughtStep>

    )

  }



  return (

    <ChainOfThoughtStep

      key={stepKey}

      status={toolStatusToStep(tool.status)}

      hasContent

      defaultOpen={false}

      showConnector={index < total - 1}

    >

      <ChainOfThoughtStepTitle collapsible>

        {toolLabel}

      </ChainOfThoughtStepTitle>

      <ChainOfThoughtStepContent>

        <ToolCallCard tool={tool} defaultOpen={tool.status === "running"} />

      </ChainOfThoughtStepContent>

    </ChainOfThoughtStep>

  )

}



function ReasoningAsChainStep({

  phase,

  showConnector,

}: {

  phase: AgentReasoningPhase

  showConnector: boolean

}) {

  const label = formatReasoningPhaseLabel(phase)



  const stepKey = `${phase.id}-${phase.streaming ? "streaming" : "done"}`



  return (

    <ChainOfThoughtStep

      key={stepKey}

      status={phase.streaming ? "active" : "completed"}

      hasContent

      defaultOpen={false}

      showConnector={showConnector}

    >

      <ChainOfThoughtStepTitle collapsible>

        {label}

      </ChainOfThoughtStepTitle>

      <ChainOfThoughtStepContent autoScrollBottom={phase.streaming}>

        {phase.text.trim() ? (

          <ChatReasoningMarkdown scroll={false} streaming={phase.streaming}>

            {phase.text}

          </ChatReasoningMarkdown>

        ) : null}

      </ChainOfThoughtStepContent>

    </ChainOfThoughtStep>

  )

}



function briefToolInputSummary(tool: AgentToolCall): string {
  if (tool.input == null || typeof tool.input !== "object") return ""
  const inp = tool.input as Record<string, unknown>
  for (const key of ["path", "name", "file", "resource", "query", "url"]) {
    const val = inp[key]
    if (typeof val === "string" && val.trim()) {
      const text = val.trim()
      return text.length > 80 ? `${text.slice(0, 77)}…` : text
    }
  }
  for (const val of Object.values(inp)) {
    if (typeof val === "string" && val.trim() && val.length < 80) {
      return val.trim()
    }
  }
  return ""
}

function GroupedToolStep({
  group,
  showConnector,
}: {
  group: AgentProcessToolGroup
  showConnector: boolean
}) {
  const toolLabel = formatAgentToolLabel(group.name)
  const hasError = group.tools.some((t) => t.status === "error")
  const stepStatus = hasError ? "error" : "completed"

  return (
    <ChainOfThoughtStep
      status={toolStatusToStep(stepStatus)}
      hasContent
      defaultOpen={false}
      showConnector={showConnector}
    >
      <ChainOfThoughtStepTitle collapsible>
        {`${toolLabel} (${group.tools.length})`}
      </ChainOfThoughtStepTitle>
      <ChainOfThoughtStepContent>
        <ul className={cn(stack.xs, "list-none")}>
          {group.tools.map((tool) => {
            const summary = briefToolInputSummary(tool)
            return (
              <li
                key={tool.id}
                className={cn(
                  "truncate",
                  tool.status === "error"
                    ? "text-sm leading-5 text-destructive"
                    : chatMetaLineClass,
                )}
              >
                {summary || formatAgentToolLabel(tool.name)}
              </li>
            )
          })}
        </ul>
      </ChainOfThoughtStepContent>
    </ChainOfThoughtStep>
  )
}

function ProcessChainBlock({

  process,

  toolDisplay,

}: {

  process: AgentProcessItem[]

  toolDisplay: ChatToolDisplayMode

}) {

  const grouped = groupConsecutiveTools(process)

  return (

    <ChainOfThought defaultOpen>

      <ChainOfThoughtContent className={cn(stack.xs, "!mt-0")}>

        {grouped.map((item, index) => {

          const showConnector = index < grouped.length - 1

          if (item.kind === "reasoning") {

            return (

              <ReasoningAsChainStep

                key={item.id}

                phase={item}

                showConnector={showConnector}

              />

            )

          }

          if (item.kind === "tool-group") {

            return (

              <GroupedToolStep

                key={`group-${item.tools[0]!.id}`}

                group={item}

                showConnector={showConnector}

              />

            )

          }

          return renderToolInChain(

            item.tool,

            index,

            grouped.length,

            toolDisplay,

          )

        })}

      </ChainOfThoughtContent>

    </ChainOfThought>

  )

}



export function ChatAssistantBody({ msg }: { msg: AgentChatMessage }) {

  const toolDisplay = CHAT_TOOL_DISPLAY_DEFAULT

  const reasoningDisplay = CHAT_REASONING_DISPLAY_DEFAULT

  const process =

    msg.process && msg.process.length > 0

      ? msg.process

      : legacyProcessFromMessage(msg)

  const reasoningPhases = process.filter(

    (item): item is AgentReasoningPhase => item.kind === "reasoning",

  )

  const hasToolsInProcess = process.some((item) => item.kind === "tool")

  const hasAnswer = Boolean(msg.text?.trim())

  const showShimmer =

    Boolean(msg.streaming) && process.length === 0 && !hasAnswer



  const useToolChain =

    hasToolsInProcess &&

    (toolDisplay === "chain" || toolDisplay === "chain-inline")



  const useStandaloneReasoning =

    reasoningPhases.length === 1 &&

    !hasToolsInProcess &&

    reasoningDisplay === "reasoning"



  const flatToolDefaultOpen = (tool: AgentToolCall) => tool.status === "running"



  const metaProcess = (

    <>

      {useStandaloneReasoning ? (

        <Reasoning

          isStreaming={reasoningPhases[0]!.streaming}

          defaultOpen={reasoningPhases[0]!.streaming}

        >

          <ReasoningTrigger />

          <ReasoningContent>{reasoningPhases[0]!.text}</ReasoningContent>

        </Reasoning>

      ) : process.length > 0 && (reasoningPhases.length > 0 || hasToolsInProcess) ? (

        useToolChain || reasoningPhases.length > 0 ? (

          <ProcessChainBlock process={process} toolDisplay={toolDisplay} />

        ) : (

          <div className={stack.xs}>

            {process

              .filter((item) => item.kind === "tool")

              .map((item) =>

                item.kind === "tool" ? (

                  <ToolCallCard

                    key={item.tool.id}

                    tool={item.tool}

                    defaultOpen={flatToolDefaultOpen(item.tool)}

                  />

                ) : null,

              )}

          </div>

        )

      ) : null}



      {showShimmer ? (

        <TextShimmer className={chatProcessLineClass}>Thinking…</TextShimmer>

      ) : null}

    </>

  )



  const hasMetaProcess =

    useStandaloneReasoning ||

    (process.length > 0 && (reasoningPhases.length > 0 || hasToolsInProcess)) ||

    showShimmer



  return (

    <div className={cn("min-w-0", stack.lg)}>

      {hasMetaProcess ? (

        <div className={cn(stack.sm, chatProseLaneClass)}>{metaProcess}</div>

      ) : null}

      {hasAnswer ? (

        <div className={chatBoxLaneClass}>

          <MessageMarkdown

            mode={msg.streaming ? "streaming" : "static"}

            isAnimating={Boolean(msg.streaming)}

            parseIncompleteMarkdown={Boolean(msg.streaming)}

          >

            {msg.text}

          </MessageMarkdown>

        </div>

      ) : null}

    </div>

  )

}



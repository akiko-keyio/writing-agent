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

  legacyProcessFromMessage,

  type AgentProcessItem,

  type AgentReasoningPhase,

} from "@/lib/agent-process-timeline"

import {

  CHAT_REASONING_DISPLAY_DEFAULT,

  CHAT_TOOL_DISPLAY_DEFAULT,

  type ChatToolDisplayMode,

} from "@/lib/chat-display-prefs"

import {

  chatProcessLineClass,

  chatBoxLaneClass,
  chatProseLaneClass,

} from "@/lib/chat-typography"

import { formatAgentToolLabel } from "@/lib/agent-tool-labels"

import { formatReasoningPhaseLabel } from "@/lib/reasoning-phase"

import { p, stack } from "@/lib/spacing"

import { cn } from "@/lib/utils"



function toolStatusToStep(status: AgentToolCall["status"]): ChainOfThoughtStepStatus {

  if (status === "running") return "active"

  if (status === "error") return "error"

  if (status === "completed") return "completed"

  return "pending"

}



function formatToolPayload(payload: unknown): string {

  if (typeof payload === "string") return payload

  if (payload === undefined) return ""

  try {

    return JSON.stringify(payload, null, 2)

  } catch {

    return String(payload)

  }

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

        {tool.input !== undefined ? <ToolInput payload={tool.input} /> : null}

        <ToolOutput

          payload={tool.output ?? {}}

          showWhen={["completed", "error"]}

          errorText={tool.errorText}

        />

      </ToolContent>

    </Tool>

  )

}



function InlineToolPayload({

  title,

  payload,

  error,

}: {

  title: string

  payload: unknown

  error?: string

}) {

  const code = formatToolPayload(payload)

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

      {code ? (

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

              <InlineToolPayload title="Input" payload={tool.input} />

            ) : null}

            {(tool.status === "completed" || tool.status === "error") && (

              <InlineToolPayload

                title={tool.status === "error" ? "Error" : "Output"}

                payload={tool.output ?? {}}

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



function ProcessChainBlock({

  process,

  toolDisplay,

}: {

  process: AgentProcessItem[]

  toolDisplay: ChatToolDisplayMode

}) {

  return (

    <ChainOfThought defaultOpen>

      <ChainOfThoughtContent className={cn(stack.xs, "!mt-0")}>

        {process.map((item, index) => {

          const showConnector = index < process.length - 1

          if (item.kind === "reasoning") {

            return (

              <ReasoningAsChainStep

                key={item.id}

                phase={item}

                showConnector={showConnector}

              />

            )

          }

          return renderToolInChain(

            item.tool,

            index,

            process.length,

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



/** How tool calls are laid out in assistant messages. */
export type ChatToolDisplayMode =
  | "flat"
  | "chain"
  | "chain-inline"
  | "collapsed"

/** How model reasoning / thinking is shown. */
export type ChatReasoningDisplayMode =
  | "reasoning"
  | "chain-step"
  | "collapsed"

/** 思维链（轻量、默认折叠）+ Reasoning 块（默认折叠） */
export const CHAT_TOOL_DISPLAY_DEFAULT: ChatToolDisplayMode = "chain-inline"
export const CHAT_REASONING_DISPLAY_DEFAULT: ChatReasoningDisplayMode =
  "reasoning"

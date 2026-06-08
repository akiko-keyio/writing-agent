import { cjk } from "@streamdown/cjk"
import { code } from "@streamdown/code"
import { math } from "@streamdown/math"
import { mermaid } from "@streamdown/mermaid"

import { chatReasoningBodyClass } from "@/lib/chat-typography"
import { gap } from "@/lib/spacing"

/** README example: plugins only, default plugin options. */
export const chatStreamdownPlugins = {
  cjk,
  code,
  math,
  mermaid,
} as const

/** Outer wrapper (data-slot); width only — spacing lives on `<Streamdown className>`. */
export const chatStreamdownLayoutClass =
  "w-full min-w-0 max-w-full" as const

/**
 * Chat column rhythm on `<Streamdown>` — block gap, heading size ladder (medium), list overrides.
 * Body is text-sm (14px) at `--chat-font-weight-body` (400); headings H1–H3 use
 * text-xl / lg / base (chat-compact leading); H4–H6 text-sm; strong / th use
 * `--chat-font-weight-emphasis` (560) via `chat-markdown-overflow.css`.
 *
 * Streamdown ships `space-y-4` by default — `[&>*]:!mt-0 [&>*]:!mb-0` neutralizes it;
 * `gap.lg` (16px) is the sole block rhythm.
 *
 * Tables use the same block rhythm as paragraphs (no extra table margins).
 */
export const chatStreamdownRootClass = [
  `flex flex-col ${gap.lg} whitespace-normal`,
  /* Prose horizontal inset: chat-markdown-overflow.css (not root px-4 — boxes stay 16px) */
  /* Beat Streamdown defaults: space-y-4, heading mt-6/mb-2, hr my-6, blockquote my-4 */
  "[&>*]:!mt-0 [&>*]:!mb-0",
].join(" ") as const

/**
 * Thinking trace — compact process rhythm (`gap.sm` = 8px), muted body color,
 * no extra text inset (parent `chatBoxLaneClass` already applied).
 */
export const chatReasoningStreamdownRootClass = [
  `flex flex-col ${gap.sm} whitespace-normal`,
  chatReasoningBodyClass,
  "[&>*]:!mt-0 [&>*]:!mb-0",
].join(" ") as const

/** Thinking expanded body — scroll inside this cap instead of growing the thread. */
export const chatReasoningScrollMaxHeight = "14rem" as const

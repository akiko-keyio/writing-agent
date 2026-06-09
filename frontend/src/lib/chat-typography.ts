/**
 * Chat typography + layout rhythm (spacing from `@/lib/spacing`).
 */

import { contentBoxLaneClass, contentTextLaneClass } from "@/lib/content-layout"
import { p } from "@/lib/spacing"
import { cn } from "@/lib/utils"

export const chatMarkdownBodyClass =
  "text-sm leading-5 text-foreground" as const

/**
 * Markdown emphasis weight lives in `index.css` (`--chat-font-weight-emphasis`, default 560)
 * and `chat-markdown-overflow.css` — Streamdown inline classes need attribute-selector overrides.
 */

export const chatMetaLineClass =
  "text-sm leading-5 text-muted-foreground" as const

/** Chain step titles — Thinking, Thought for …, tool names (same track). */
export const chatProcessStepTitleClass = chatMetaLineClass

/** Thinking / process labels — prose lane, lighter than body and tool meta. */
export const chatProcessLineClass =
  "text-sm leading-5 text-muted-foreground/55" as const

/** Thinking expanded markdown body — same size as meta, lighter than answer. */
export const chatReasoningBodyClass = chatProcessLineClass

/** Standalone `ReasoningContent` shell (border + inset). */
export const chatReasoningBodyShellClass = cn(
  "border-s border-border",
  p[2].top,
  p[3].start,
)

/** 16px box lane — user bubble, composer card, mermaid. */
export const chatBoxLaneClass = contentBoxLaneClass

/** 32px text lane — process chain, suggestions; answer prose = box + Streamdown nested 16px. */
export const chatProseLaneClass = contentTextLaneClass

/** Thread viewport — vertical pad only; message gap lives on `chatThreadColumnClass`. */
export const chatThreadContentClass = cn("!px-0", p[4].y, p[6].bottom)


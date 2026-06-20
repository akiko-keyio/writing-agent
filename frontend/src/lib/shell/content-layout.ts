/**
 * Shared content width — document editor, chat thread, settings pages.
 *
 * Two horizontal tiers (see `docs/ui.md`):
 * - **Box** (`--content-inset-box`, 16px): bubbles, mermaid, composer chrome
 * - **Text** (`--content-inset-text`, 32px): prose lane = box + nested 16px in Streamdown
 *
 * **Reading measure** (`--content-reading-max`, 48rem): caps line length when the shell is wider.
 */

import { p, stack } from "@/lib/shell/spacing"
import { cn } from "@/lib/shared/utils"

/** Matches `--content-reading-max` in `index.css` (48 × 16px). */
export const CONTENT_READING_MAX_REM = 48 as const

export const CHAT_PANEL_READING_WIDTH_PX = CONTENT_READING_MAX_REM * 16

/** Centered column — same outer width as the document editor shell. */
export const contentReadingColumnClass =
  "mx-auto w-full min-w-0 max-w-[min(100%,var(--content-reading-max))] box-border" as const

/**
 * Box lane inside the reading column (16px inset).
 * Chat process titles, user bubble, composer, mermaid (no Streamdown text nested inset).
 */
export const contentBoxLaneClass =
  "mx-[var(--content-inset-box)] box-border w-[calc(100%-2*var(--content-inset-box))] max-w-[calc(100%-2*var(--content-inset-box))]" as const

/** Review dock — slightly wider than box lane (12px inset vs 16px). */
export const reviewDockLaneClass =
  "mx-3 box-border w-[calc(100%-1.5rem)] max-w-[calc(100%-1.5rem)]" as const

/** Text lane width inside a box-lane shell (+16px inset each side). */
export const contentTextLaneInBoxClass =
  "mx-[var(--content-inset-box)] box-border w-[calc(100%-2*var(--content-inset-box))] max-w-[calc(100%-2*var(--content-inset-box))]" as const

/** Text lane inside reading column (32px) — process chain, matches answer prose after Streamdown inset. */
export const contentTextLaneClass =
  "mx-[var(--content-inset-text)] box-border w-[calc(100%-2*var(--content-inset-text))] max-w-[calc(100%-2*var(--content-inset-text))]" as const

/** Chat thread / composer — reading column + message stack rhythm. */
export const chatThreadColumnClass = cn(contentReadingColumnClass, stack.lg)

/** Document editor — reading column + 32px text inset from column edge. */
export const documentEditorShellClass = cn(
  contentReadingColumnClass,
  p[8].x,
  "overflow-x-hidden pb-24 pt-14",
)

/** Single-column pages (settings, etc.) — reading measure + 32px inset from shell edges. */
export const contentReadingPageClass = cn(
  contentReadingColumnClass,
  stack.lg,
  p[8].all,
)

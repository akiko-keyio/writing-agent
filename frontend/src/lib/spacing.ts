import { cn } from "@/lib/utils"

/**
 * Unified spacing — Tailwind v4 / coss scale only.
 *
 * - Use `gap.*` on flex/grid; never `space-x-*` / `space-y-*`.
 * - Use `p.*` for padding; standard steps only (matches coss particles).
 * - `ui/*` primitives keep their built-in spacing — do not override.
 * - App shell, chat, edit cards, nexus adapters import from here.
 *
 * | gap   | class   | px | coss usage                 |
 * |-------|---------|----|----------------------------|
 * | none  | gap-0   | 0  | flush tabs / outline rail  |
 * | hairline | 0.5 | 2  | document tab chips         |
 * | xs    | gap-1   | 4  | toolbar inner groups       |
 * | sm    | gap-2   | 8  | button groups, footers     |
 * | md    | gap-3   | 12 | content stacks             |
 * | lg    | gap-4   | 16 | panels, markdown blocks    |
 */

export const gap = {
  none: "gap-0",
  hairline: "gap-0.5",
  xs: "gap-1",
  sm: "gap-2",
  md: "gap-3",
  lg: "gap-4",
  /** 32px — page sections (dev gallery, empty states) */
  xl: "gap-8",
} as const

export const p = {
  0: {
    all: "p-0",
    x: "px-0",
    y: "py-0",
    top: "pt-0",
    bottom: "pb-0",
    start: "ps-0",
    end: "pe-0",
  },
  0.5: {
    all: "p-0.5",
    x: "px-0.5",
    y: "py-0.5",
    top: "pt-0.5",
    bottom: "pb-0.5",
    start: "ps-0.5",
    end: "pe-0.5",
  },
  1: {
    all: "p-1",
    x: "px-1",
    y: "py-1",
    top: "pt-1",
    bottom: "pb-1",
    start: "ps-1",
    end: "pe-1",
  },
  1.5: {
    all: "p-1.5",
    x: "px-1.5",
    y: "py-1.5",
    top: "pt-1.5",
    bottom: "pb-1.5",
    start: "ps-1.5",
    end: "pe-1.5",
  },
  2: {
    all: "p-2",
    x: "px-2",
    y: "py-2",
    top: "pt-2",
    bottom: "pb-2",
    start: "ps-2",
    end: "pe-2",
  },
  2.5: {
    all: "p-2.5",
    x: "px-2.5",
    y: "py-2.5",
    top: "pt-2.5",
    bottom: "pb-2.5",
    start: "ps-2.5",
    end: "pe-2.5",
  },
  3: {
    all: "p-3",
    x: "px-3",
    y: "py-3",
    top: "pt-3",
    bottom: "pb-3",
    start: "ps-3",
    end: "pe-3",
  },
  4: {
    all: "p-4",
    x: "px-4",
    y: "py-4",
    top: "pt-4",
    bottom: "pb-4",
    start: "ps-4",
    end: "pe-4",
  },
  6: {
    all: "p-6",
    x: "px-6",
    y: "py-6",
    top: "pt-6",
    bottom: "pb-6",
    start: "ps-6",
    end: "pe-6",
  },
  8: {
    all: "p-8",
    x: "px-8",
    y: "py-8",
    top: "pt-8",
    bottom: "pb-8",
    start: "ps-8",
    end: "pe-8",
  },
  12: {
    all: "p-12",
    x: "px-12",
    y: "py-12",
    top: "pt-12",
    bottom: "pb-12",
    start: "ps-12",
    end: "pe-12",
  },
} as const

/** Vertical stacks — replaces `space-y-*` (coss styling.md). */
export const stack = {
  hairline: cn("flex flex-col", gap.hairline),
  xs: cn("flex flex-col", gap.xs),
  sm: cn("flex flex-col", gap.sm),
  md: cn("flex flex-col", gap.md),
  lg: cn("flex flex-col", gap.lg),
  xl: cn("flex flex-col", gap.xl),
} as const

/** Horizontal rows with standard child gap. */
export const row = {
  xs: cn("flex items-center", gap.xs),
  sm: cn("flex items-center", gap.sm),
  md: cn("flex items-center", gap.md),
} as const

/** Markdown / Streamdown block rhythm (= gap.lg = --spacing(4)). */
export const blockGapLg = "var(--spacing(4))" as const

/**
 * Content horizontal rhythm — box 16px, body text 32px from reading column edge.
 * See `@/lib/content-layout` and `--content-inset-*` in `index.css`.
 */
export const contentInset = {
  box: p[4].x,
  text: p[8].x,
  textNested: p[4].x,
} as const

/** @deprecated Use `contentInset` — kept for chat call sites. */
export const chatInset = contentInset

/** Explorer file tree indent — --spacing(2) row pad, --spacing(6) per depth. */
export const treeIndent = {
  rowPadPx: 8,
  depthStepPx: 24,
} as const

/** Compact card / list row padding (edit review, confirm bar). */
export const rowPad = cn(p[3].x, p[2].y)

/** Compact card header / footer bar. */
export const cardBarPad = cn(p[3].x, p[2].y)

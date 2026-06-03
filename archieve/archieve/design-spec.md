# Writing Agent — App Style Guide

Extends [`design-basic.md`](design-basic.md) for the writing-agent frontend. Defines **how to apply tokens** — colors, surfaces, states, interaction.

**Not a layout spec.** Structure and behavior: `docs/writing-agent-spec.md`.

---

## Scope

| Document | Role |
|----------|------|
| `design-basic.md` | Colors, spacing, radii |
| **This file** | Font, sizes, states, diff/chat styling |
| `writing-agent-spec.md` | Layout, behavior |

Use `{colors.*}`, `{spacing.*}`, `{rounded.*}` from `design-basic.md`. **Font and sizes follow this file only** — ignore multi-font rules in `design-basic.md`.

---

## Typography

**One font everywhere** — document, panels, chat, buttons, diff lines:

```css
font-family: "Microsoft YaHei UI", "Microsoft YaHei", sans-serif;
font-weight: 400;
line-height: 1.6;
```

| Use | Size only |
|-----|-----------|
| Document body | 16px |
| Everything else (cards, chat, buttons, diff, labels) | 14px |
| Optional fine print (frozen hint, timestamps) | 12px |

**Not required by `design-basic.md`.** That file’s `typography.*` tokens (display-xl, body-md, many line-heights, 400 vs 500 rules) describe the **Claude marketing** analysis. The app **ignores** them per [App overrides](design-basic.md#app-overrides-phase-1). Hierarchy here is **size + color** (`{colors.muted}` for secondary), not extra weights or line-heights.

No serif, no monospace. Diff old/new: same 14px / 400 / 1.6 — strikethrough and color only.

---

## Colors (app usage)

Keep cream/coral palette from `design-basic.md`. Semantic use:

| Meaning | Token |
|---------|-------|
| Page background | `{colors.canvas}` |
| Panel / card | `{colors.surface-card}` or `{colors.canvas}` |
| Inset block (diff, composer, frozen) | `{colors.surface-soft}` |
| Primary text | `{colors.ink}` |
| Secondary text | `{colors.muted}` |
| Link / active | `{colors.primary}` |
| Border / divider | `{colors.hairline}` |
| Removed text (diff) | `{colors.error}` + strikethrough |
| Replacement text (diff) | `{colors.body-strong}` only (no green) |
| User chat bubble | `{colors.ink}` bg, `{colors.on-primary}` text |
| Agent chat bubble | `{colors.surface-soft}` bg, `{colors.ink}` text |

No category/tag hue colors.

Diff markup (strikethrough, old/new) **only in the review panel** — never in the document column.

---

## Surfaces and depth

- Flat panels, `{colors.hairline}` borders. **No shadows** in Phase 1.
- Selected card: border `{colors.muted-soft}` only (no shadow, no coral border).
- No dark-mode surfaces in Phase 1.

---

## States

| State | Look |
|-------|------|
| Default | Full opacity, `{colors.hairline}` border |
| Hover | `{colors.hairline-soft}` button background |
| Active / selected | `{colors.primary}` tint on anchor; stronger card border |
| Archived | Opacity ~0.55, `{colors.muted}` label |
| Frozen | `{colors.surface-soft}` bg, opacity ~0.7, controls disabled styling; text still readable |
| Disabled | `{colors.muted}`, reduced opacity, `cursor: default` |

Behavior (when frozen applies): `writing-agent-spec.md`.

---

## Diff block

Inside review panel only:

- Container: `{colors.surface-soft}`, `{rounded.sm}`, padding `{spacing.xs}`.
- Same font as UI body (14px).
- `old`: strikethrough + `{colors.error}`.
- `new`: `{colors.body-strong}` or `{colors.success}`.
- Arrow: plain `→` character, `{colors.muted}`.

---

## Links and anchors

- Link text: `{colors.primary}`, 12–14px.
- Hover: underline.
- Disabled: `{colors.muted}`, no pointer.
- Document quote highlight: `{colors.primary}` underline or light background — not diff colors.

---

## Buttons

- Primary: `{colors.primary}` bg, `{colors.on-primary}` text, `{rounded.md}`, 14px.
- Secondary: `{colors.canvas}` bg, `{colors.ink}` text, 1px `{colors.hairline}` border.
- Ghost: transparent, hover `{colors.hairline-soft}`.

Toggle (old/new): selected `{colors.surface-card}` + `{colors.ink}`; unselected `{colors.muted}`.

---

## Interaction

- Transition: `0.15s ease` on color and border only.
- Focus: `:focus-visible`, `outline: 2px solid {colors.primary}`.
- No animation beyond color transitions and optional streaming text caret.
- Cursor: `pointer` on clickable, `default` on disabled.

---

## Chat

- User bubble: `{colors.ink}` bg, white text, `{rounded.md}`.
- Agent bubble: `{colors.surface-soft}` bg, `{rounded.md}`.
- Body: 14px. Composer: `{colors.surface-soft}` fill, `{colors.hairline}` border, `{rounded.md}`.

No asymmetric corners or special bubble shapes.

---

## Icons

Use **[Lucide](https://lucide.dev)** via `lucide-react`.

| Rule | Value |
|------|-------|
| Package | `lucide-react` |
| Default size | 16px |
| Color | `currentColor` (inherits text color) |
| Stroke | default Lucide stroke (~2); do not mix other icon libraries |

Phase 1 icons (minimum): menu, send, check (resolve), optional external-link/jump for quote jump. Diff arrow stays the `→` character, not an icon.

Do not use Unicode symbols (✓ ×) as button glyphs.

---

## Spacing

4px base — use `{spacing.xxs}` through `{spacing.xl}` from `design-basic.md`. Typical: `{spacing.md}` panel padding, `{spacing.sm}` card padding, `{spacing.xs}` gaps.

---

## Phase 1 exclusions

Dark mode, tag colors, inline document diff, motion effects, settings/memory UI chrome.

---

## References

| Doc | Role |
|-----|------|
| `design-basic.md` | Color and spacing tokens |
| `writing-agent-spec.md` | Layout, behavior |
| `writing-agent-design.md` | Product principles |

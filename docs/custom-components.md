# Custom shell components

App-specific UI built on coss primitives + `shell-chrome.ts`. Not generic library components.

## Shared pattern: hover fade overlay

Long labels keep **layout stable** (extension split: `leading` + trailing suffix). On hover, a **gradient overlay** covers text near the action button — no text `mask-image`.

```
[ icon  filename leading .md ][ fade overlay ][ ⋯ or × ]
                               ↑ transparent → opaque hover bg
```

| Layer | z-index | Role |
|-------|---------|------|
| Label / row content | `z-0` | Text unchanged |
| Overlay | `z-1` | `opacity-0` → `group-hover:*:opacity-100` |
| Action button | `z-2` | `end-1`, shown on hover |

**Gradient** — `index.css` → `.chrome-row-hover-fade-overlay-bg`  
`transparent 0%` → opaque `color-mix(foreground 4%, background) 35%` → solid 100%

**Hover row bg** — same opaque mix (not semi-transparent `sidebar-accent` stacked twice).

**Width** — must be **`style={{ width: N }}`**, not Tailwind `` `w-[${N}px]` `` (JIT will not emit dynamic arbitrary classes).

**Tuning**

| Constant | File | Default | Overlay width |
|----------|------|---------|---------------|
| `CHROME_ROW_HOVER_FADE_EXTRA_PX` | `explorer-tree-row-density.ts` | 20 | file row / tab fade: **48px** total (24+20 or 28+20) |
| `EXPLORER_TREE_ROW_HOVER_FADE_EXTRA_PX` | `explorer-tree-row-density.ts` | 32 | folder / header: **94px** (62+32) |

Button reserve: file `end-1` + `w-5` (24px); tab close `end-1` + `icon-xs` 24px (28px).

---

## ShellTabChip

**File:** `frontend/src/components/shell-tab-chip.tsx`  
**Tokens:** `shell.documentTab*`, `shell.documentTabHoverFadeProps`

```
group/tab (chip, isolate)
├── documentTabMain (z-0, flex-1)
│   └── Button sm → icon + MiddleTruncateLabel
├── overlay (z-1, 48px, group-hover/tab)
└── close Button icon-xs (z-2, end-1)
```

- Label: `MiddleTruncateLabel` — suffix (`.md`) never `display:none`.
- Overlay sits **after** tab button in DOM so it paints over text.

---

## COSS file tree

**Files:** `explorer-file-tree.tsx`, `explorer-file-section-header.tsx`  
**Tokens:** `shell.explorerTreeRowHoverFadeProps`, `explorerTreeFolderRowHoverFadeProps`, `explorerSectionHeaderHoverFadeProps`

Each `SidebarMenuItem` / section header gets:

```tsx
<div {...shell.explorerTreeRowHoverFadeProps} aria-hidden />
```

- File row: single `SidebarMenuAction` (⋯), overlay **48px** (same as document tab).
- Folder row / workspace header: two icon-sm actions, overlay **94px**.
- Row button: `shellExplorerTreeRowButtonClass` + `relative z-0`.

---

## Explorer Files tab

**Files tab** uses **Pierre file tree only** (`PierreExplorerFileTree` in `explorer-panel.tsx`). Row height is fixed **28px compact** — no density toggle in the main shell. COSS `explorer-file-tree.tsx` remains for dev/variants only.

---

## Pierre file tree

**Files:** `pierre-explorer-file-tree.tsx`, `pierre-tree-shell-theme.ts`, `pierre-tree-row-label-sync.ts`

Pierre runs in **Shadow DOM**. Styling via `unsafeCSS` + CSS variables, not React overlay divs.

| Concern | Approach |
|---------|----------|
| Hover fade | `[data-type='item']::after` — hover 用 `--pierre-tree-row-hover-solid`，选中行用 `--pierre-tree-row-selected-solid`（须与行底色同色） |
| Extension split | JS sync replaces Pierre `MiddleTruncate`; hide native truncate container |
| Hover bg | `--sidebar-item-hover`（foreground 4%，≈ Toggle hover） |
| Selected bg | `--sidebar-item-selected`（input 64%，≈ Toggle `data-pressed`）；overlay 渐隐终点同步 |
| Indent | Hide Pierre spacing-item; padding via `aria-level` rules |

Do **not** edit `explorer-file-tree.tsx` for Pierre-only fixes unless explicitly requested.

---

## File map

```
shell-chrome.ts              overlay helper + document tab tokens
explorer-tree-row-density.ts row heights, action widths, overlay width helpers
index.css                    .chrome-row-hover-fade-overlay-bg
middle-truncate-label.tsx    extension split label (tabs + Pierre sync)
shell-tab-chip.tsx           document tab chip
explorer-file-tree.tsx       COSS tree (dev/variants only)
pierre-explorer-file-tree.tsx + file-tree/pierre-*   Pierre tree
```

See also: [`ui.md`](./ui.md) (spacing, buttons), [`frontend.md`](./frontend.md) (app structure).

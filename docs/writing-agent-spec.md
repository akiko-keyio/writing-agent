# Writing Agent: Implementation Spec

This document specifies the implementation decisions for the writing agent described in `writing-agent-design.md`. An agent reading both documents should know what to build, what tech to use, and why.

---

## Architecture

Agent and frontend are two separate processes connected by WebSocket. Agent handles all LLM interaction, edit proposal, and memory. Frontend handles document display, review interface, and chat UI.

Why separated: the two have different responsibilities and change at different rates. Frontend is a display and interaction layer; agent is the intelligence layer. Decoupling allows replacing the frontend (e.g., from web to desktop) without touching the agent.

Why not LSP/ACP/MCP: these protocols solve the M×N interoperability problem (M editors × N language servers). We have one agent and one frontend. Designing a protocol for a problem we don't have adds complexity without benefit. We adopt their infrastructure patterns (JSON messages, WebSocket transport) without adopting their message semantics.

Why WebSocket: simplest bidirectional communication between a Python process and a web frontend. JSON messages, no binary framing needed.

---

## Phase 1 Decisions

| Decision | Choice |
|----------|--------|
| Edit proposals | User initiates via chat. Opening or switching a document does not invoke the LLM. Agent responds with `group/propose` (and may reply in chat). |
| Agent | Real LLM via OpenAI-compatible API (`.env`). No mock agent. |
| Default edit choice | **Configurable** (all old, all new, or subagent recommendation). Phase 1 default: **new**. Settings panel deferred. |
| Memory | Append resolved groups to `agent/data/resolved-edits.md` only. No retrieval, no principles content. |
| Document source | Frontend owns display. Dev default: `examples/test-text.md`. **File → Open** for local `.md`. `document/open` syncs text to agent; does not trigger analysis. |
| Revised edit (agent proposes revised edit with same `old`) | Edit **closes** (reason: replaced): reverts to old in document, cannot be toggled. Counts as **chose old** for learning. |
| Unlocatable edit (`old` not unique or absent) | Edit **closes** (reason: stale): issue and edit text remain visible; toggles disabled. Not learned from. |
| Dev ports | Agent WebSocket **8765**, frontend **5173**. Python via **uv**. |

---

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Frontend framework | React + Vite | TipTap has first-class React support. Vite is the fastest dev server with zero config. React has the largest ecosystem for solving unexpected problems. |
| Editor component | TipTap (markdown mode) | Already decided as the final editor. Starting with it avoids a rewrite. Supports markdown input rules (type markdown, renders rich text) and markdown serialization (store as .md, display as rich text). Fully editable: old/new choices sync immediately, free-form editing supported. |
| App form | Web app | Fastest to prototype. No desktop packaging overhead. Can be wrapped in Tauri later if desktop experience is needed. |
| Agent runtime | Python + OpenAI SDK | OpenAI-compatible API (see LLM Configuration). Python package management via **uv**. |
| Communication | WebSocket + JSON messages | See architecture section. |
| UI component library | [coss ui](https://coss.com/ui) | Installed via shadcn CLI (`npx shadcn@latest add @coss/style` / `@coss/<primitive>`). Source in `frontend/src/components/ui/`. Config: `frontend/components.json` (`@coss` registry). Agent skill: `npx skills add cosscom/coss`. Do not reinvent primitives. |

---

## LLM Configuration

Real agent only — no mock. Credentials in root `.env` (`OPENAI_API_BASE`, `OPENAI_API_KEY`, `OPENAI_MODEL`). Agent uses OpenAI Python SDK with compatible `base_url`.

---

## Development Setup

Run agent (`cd agent && uv sync && uv run python main.py`) and frontend (`cd frontend && npm install && npm run dev`) as separate processes. Config in root `.env`. Vite should proxy WebSocket to the agent in dev.

---

## Message Interface

Eight core message types. Each maps to an action in the Review Model.

**Edit ID rule:** edit IDs are globally unique within a session. Agent assigns sequential IDs across all groups (e1, e2, e3...), not per-group.

### Agent → Frontend

**`group/propose`**
```json
{
  "type": "group/propose",
  "group_id": "g1",
  "issue": "Verbose phrasing in introduction",
  "edits": [
    {"id": "e1", "old": "utilize", "new": "use", "default": "new"},
    {"id": "e2", "old": "in order to", "new": "to", "default": "new"}
  ]
}
```
Proposes a group of edits. Each edit's `old` is a unique document substring used to locate and anchor the edit (see Document Anchoring). `default` field is optional — supports the configurable default display (all old, all new, or subagent recommendation per edit).

**`edit/add`**
```json
{
  "type": "edit/add",
  "group_id": "g1",
  "edit": {"id": "e3", "old": "utilize", "new": "apply", "default": "new"}
}
```
Adds a new edit to an existing group. Used after user requests adjustment — agent proposes a replacement with the same `old` text.

**`chat/message`**
```json
{
  "type": "chat/message",
  "text": "I changed 'utilize' to 'apply' because..."
}
```
Agent's chat response. Covers: explanation of edits, response to adjustment requests, memory learning notifications, general conversation.

### Frontend → Agent

**`edit/choose`**
```json
{
  "type": "edit/choose",
  "edit_id": "e1",
  "choice": "new"
}
```
User chose old or new for an edit. Frontend performs the text replacement locally and updates the document display. User can change their choice before group resolution — latest choice wins.

**Purpose:** real-time sync — agent uses this to maintain its document model and conversation context. This is not a learning signal — the definitive outcomes are sent in `group/resolve`.

**`group/resolve`**
```json
{
  "type": "group/resolve",
  "group_id": "g1",
  "outcomes": [
    {"edit_id": "e1", "choice": "new"},
    {"edit_id": "e2", "choice": "old"},
    {"edit_id": "e3", "status": "closed", "reason": "replaced"},
    {"edit_id": "e4", "status": "closed", "reason": "stale"}
  ]
}
```
User resolves a group. Frontend archives the group from the review interface and sends the final state of each edit. Active edits have `choice` (old/new). Closed edits have `reason`: replaced (counts as chose old for learning), stale (not learned from). Agent learns from this single message — no need to reconstruct from `edit/choose` history.

**`chat/message`**
```json
{
  "type": "chat/message",
  "text": "try a different word for @e1",
  "group_id": "g1",
  "edit_id": "e1"
}
```
User message. Both `group_id` and `edit_id` are optional. When `edit_id` is present, the message is about a specific edit (adjustment request or explanation request). When `group_id` is present without `edit_id`, the message is about the group as a whole. When both are absent, it's general conversation. Edit references in message text use inline `@eN` syntax (e.g., "try a different word for @e1").

**`document/open`**
```json
{
  "type": "document/open",
  "document": "full markdown text",
  "filename": "my-draft.md"
}
```
User opened or switched a document (**File → Open**, or dev default on load). Frontend sends full text. Agent clears pending groups and updates session context. Does **not** trigger edit proposals — user must ask via chat. `filename` is optional display metadata.

**`document/change`**
```json
{
  "type": "document/change",
  "document": "full markdown text"
}
```
User directly edited the document (free-form, outside of old/new choices). Frontend sends the full updated text. Agent updates its document context for subsequent proposals.

Frontend independently detects stale edits: after each `document/change`, frontend checks pending edits' position marks — if any `old` text no longer matches its tracked position, the edit closes (stale).

**Debounce:** frontend sends `document/change` after user stops typing for **1 second**. Consecutive edits within the debounce window are batched into a single message.

### Testing Messages

**`session/init`** (agent → frontend, standalone testing only)
```json
{
  "type": "session/init",
  "document": "full markdown text"
}
```
Agent pushes initial document content to frontend. Not used in browser flow — frontend uses `document/open` instead. Exists for standalone agent testing without a browser.

### Coverage Verification

| Review Model design point | Message(s) | Covered |
|---------------------------|------------|---------|
| User initiates edit review via chat | `chat/message` → `group/propose` | ✓ |
| Agent proposes edits grouped by issue | `group/propose` | ✓ |
| Default choice configurable | `default` field in edits | ✓ |
| User chooses old or new | `edit/choose` | ✓ |
| Choice syncs to document immediately | Frontend local replacement | ✓ |
| User requests adjustment | `chat/message` + `edit_id` (or `group_id`) | ✓ |
| Agent proposes replacement in same group | `edit/add` | ✓ |
| User requests explanation | `chat/message` + `edit_id` (or `group_id`) | ✓ |
| Agent explains in chat | `chat/message` | ✓ |
| User resolves group | `group/resolve` | ✓ |
| Resolved groups archive | Frontend handles on `group/resolve` | ✓ |
| Agent learns from outcomes | Agent reads `group/resolve` outcomes | ✓ |
| Open local document | `document/open` | ✓ |
| Save document | File → Save (frontend-only export) | ✓ |
| Edit anchored to document location | Each edit's `old` as anchor + frontend highlight/scroll | ✓ |
| Replaced edit (same `old`) | Closed (replaced): revert to old, chose old for learning | ✓ |
| Unlocatable edit | Closed (stale): frontend-only, silent | ✓ |
| User discusses group | `chat/message` + `group_id` | ✓ |
| Stale detection on free-form edit | Frontend checks position marks after `document/change` | ✓ |
| Stale detection on toggle | Frontend validates position text before applying replacement | ✓ |

---

## Document Anchoring

Each edit's `old` text is its document anchor. The document shows decoration-based highlights on pending edits — no inline cards or diff markup in the editor body.

- Agent: each `old` must be a unique substring in the document at propose time. Agent must not propose edits whose `old` range overlaps with any pending edit across all groups — if overlap is detected, agent prompts user to resolve the relevant group first. Frontend locates `old` via text search on receipt, then tracks position via ProseMirror position marks. On toggle or after `document/change`, frontend checks whether the text at the tracked position is still `old` or `new`. If it is neither, the edit closes (stale).
- Group document position is the union of its edits' positions.
- Bidirectional highlighting on hover: hovering an edit row highlights the corresponding document span; hovering a document span highlights the corresponding edit row. Clicking either scrolls the other into view.
- If any `edit.old` becomes unlocatable (0 or >1 match on initial receipt or after `document/change`), the edit **closes** (stale) — visible but not interactive, not learned from.
- If an agent-proposed revised edit has the same `old` as an existing edit, the original edit **closes** (replaced) — reverts to old, counts as chose old.

---

## Document Sync

Frontend owns document display. Agent does not push updated document text after each user choice.

1. Frontend loads document → connects WebSocket → sends `document/open`.
2. User requests edits in **chat** → agent sends `group/propose`.
3. User chooses old/new → frontend validates position text still matches `old` or `new` before applying replacement. If mismatch, edit closes (stale). If valid, frontend replaces `old` locally → TipTap re-renders immediately.
4. User directly edits document → frontend sends `document/change` with full text → agent updates context. Frontend detects stale edits independently.

`old` must be a unique substring at apply time. On failure, edit closes (stale). If agent later proposes a revised edit with the same `old`, original edit closes (replaced, reverts to old). Frontend detects stale edits after `document/change` by checking position marks. `session/init` is for standalone agent testing only; browser flow uses `document/open`.

**Agent document model:** agent receives `edit/choose` messages and uses them to maintain its own copy of the current document text (replaying old/new substitutions). This ensures subsequent proposals target the actual document state, not the original text.

**Stale context:** agent processing takes seconds during which the user may continue editing. When agent sends `group/propose`, frontend validates each `old` against the current document. Edits whose `old` is not uniquely locatable are immediately closed (stale).

---

## Frontend Layout

Two-column layout with collapsible sidebar:

- **Sidebar (collapsible, ~180px):** Document outline. Headings from the document displayed as a tree. Click to scroll. Toggle via topbar button.
- **Left column (~60%):** Document. TipTap rendering markdown, fully editable. Always visible, always clean. Decoration-based highlights on pending edit positions (no inline cards or diff markup).
- **Right column (~40%):** Chat panel with integrated edit review.

### Chat panel structure (top to bottom):

1. **Header:** session picker icon + agent settings icon. No title text.
2. **Message area (scrollable):** agent and user messages. Resolved edit summaries appear inline.
3. **Edit card (fixed, between messages and input):** appears when agent proposes edits. Not in the scroll flow — always visible and accessible. Contains: issue title, edit rows (each toggleable), "Apply all" / "Revert all" links. On confirm, card disappears and a resolved summary is added to the message area.
4. **Reply context bar (conditional):** when user clicks "discuss" on an edit row, shows which edit is being discussed. Dismissible.
5. **Input area:** text input + morphing action button.

### Edit card behavior:

- Each edit row shows the diff (old → new for replacements, old with strikethrough for deletions, stacked for long rewrites).
- Each row has a status badge: "applied" (green text), "kept" (amber text), "remove"/"keep" (for deletions), "replaced" (gray, non-interactive).
- Below each row's content (visible on hover): "view in document" link + "discuss" link.
- Clicking a row toggles its state and syncs document immediately.
- Hovering a row highlights the corresponding document span. Hovering a document span highlights the corresponding row.

### Morphing action button:

The input area's action button changes based on context:
- **No pending edits:** Send button (↑ icon). Sends chat message.
- **Pending edits + input empty:** Confirm button (✓ Confirm, dark filled). Confirms current edit selections and archives the card.
- **Pending edits + input has text:** Send button (↑ icon). Sends chat message about current edits. After sending, input clears, button returns to Confirm.

This eliminates the need for a separate "Done" button on the edit card. The single button adapts to what the user wants to do next.

### Linear workflow enforcement:

When edits are pending, user can chat (to discuss current edits, request adjustments or explanations). If user requests new analysis, agent responds asking to confirm current edits first. This is agent-side behavior, not a UI restriction — the input always works.

### Top bar:

- Left: file menu button (adjacent to dropdown), filename in monospace.
- Right: outline toggle button.
- File menu: Open, Save, Export .md.

---

## Phase 1 Scope

**In scope:**
- Real agent; edit proposals user-initiated via chat.
- Review: grouped edits, edit anchoring via `old`, old/new selection with immediate document sync, resolve via morphing confirm button.
- Edit states: **active** (operable) and **closed** (greyed out). Closed has reason: **replaced** (reverts to old, counts as chose old) or **stale** (document unchanged, not learned from). Frontend detects stale; agent triggers replaced.
- Chat with integrated edit card (fixed above input), inline @eN edit references, reply context for discussing specific edits.
- TipTap fully editable document (old/new sync + free-form editing), File → Open, File → Save, default `examples/test-text.md`.
- Collapsible document outline sidebar.
- Resolved-edit log only; default choice configurable (Phase 1 default: new); UI via coss ui.

**Deferred to Phase 1.5 / Phase 2:**
- Settings panel UI (all old / all new / subagent recommendation selection).
- File browser / multi-document project navigation.
- `agent/principles/` content (directory may exist but stays empty).
- Full memory model (knowledge, principle, example classification and retrieval).
- Insert edits (requires a location mechanism not yet designed).
- Memory retrieval and application (agent using past examples to improve proposals).
- Desktop app (Tauri wrapper).

---

## Project Structure

```
writing-agent/
├── agent/           # Python (uv): WebSocket server, review, memory
├── frontend/        # React + Vite + coss ui: layout, editor, chat+review, outline
├── examples/        # test-text.md (dev default)
├── .env             # gitignored
└── docs/
```

---

## Memory (Phase 1)

On `group/resolve`, append group outcomes (group, issue, edit outcomes with choices/reasons) to `agent/data/resolved-edits.md`. Agent does not read it back in Phase 1.
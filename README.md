# Writing Agent

A writing IDE where an LLM **proposes** structured edits, the **backend validates and owns** the typed state, and the user reviews, applies, and saves changes. The agent can read project files, propose coherent edit groups, run specialist review workflows, remember accepted preferences, and expose model/tool/subagent settings.

Core principle:

```
LLM proposes.
Backend validates and owns typed state.
Frontend renders and lets users act.
```

The document is never mutated by the LLM directly. Every change flows through:

```
propose_edit_group -> backend validates anchors -> EditGroup stored
-> apply updates the open buffer -> document/save writes the .md file
```

## Features

- **IDE shell** — top bar, Explorer (file tree + outline), document tabs, right-hand Chat column.
- **Pinned Review Queue** — proposed edit groups appear as action cards above the chat stream (not as chat messages, not as a floating overlay). Apply / Reject / Delete, with stale detection when the document changes.
- **EditGroup lifecycle** — replace / delete / insert edits, content-anchored validation (prefix/suffix/heading), offset-independent apply, partial-apply, and replace lineage (`replaces` / `replaced_by`).
- **Save to disk** — `document/save` writes the current buffer atomically (temp file + rename). Applying changes the buffer; saving is a separate, explicit step.
- **Durable state** — sessions, edit groups, and memory persist under `.writing-agent/` and survive backend restart.
- **Cancellable chat turns** — each turn carries a `request_id`; the connection can process `chat/cancel` while a turn streams.
- **Memory** — accepted / rejected / replaced edits become visible, controllable memory examples (positive / negative / preference), scoped into principle / knowledge / example. Memory is inspectable state, not hidden prompt state, and can be disabled.
- **Single Agent mode** — one agent decides when to discuss, read files, check, gather evidence, or propose edits. There is no Ask/Edit mode toggle and no global review/council mode.
- **Specialists (agent-as-tool), kept minimal** — only where isolated context clearly helps: `review` (independent target-reader perspective) and `researcher` (evidence from the local reference base only — no downloads). Mechanical checking is a deterministic `check_consistency` tool; the main agent proposes edits directly (no separate editor subagent).
- **Settings** — a special document tab to manage models (CRUD + active model), tools, subagents, and memory; API keys are masked. Temperature is an internal default and is not user-exposed.
- **Selection → chat** — select text in the editor and "Add to Chat" to attach it as a removable context chip; mentions and selections are sent as structured context.
- **Eval harness** — deterministic smoke suite proves the edit pipeline without a live model.

## Tech stack

- **Frontend**: React 19 + Vite + TypeScript + TipTap (Markdown), [coss ui](https://coss.com/ui) + Nexus UI chat parts.
- **Backend**: Python + websockets + [Strands Agents](https://github.com/strands-agents) + OpenAI-compatible API (managed with `uv`).

## Quick start

### 1. Configure a model

Copy `.env.example` to `.env` at the repo root and set your key (or configure a model from the in-app Settings tab on first run):

```bash
cp .env.example .env
```

`models.yaml` and `.writing-agent/` hold local secret/state and are git-ignored.

### 2. One command (recommended)

```bash
npm install                         # first time: installs concurrently
cd frontend && pnpm install && cd ..
npm run dev                         # Agent :8765 + frontend :5173
```

Open `http://localhost:5173`. The chat header shows **Connected** when the WebSocket is up.

### 3. Run separately

Backend (`ws://localhost:8765`):

```bash
cd agent
uv sync
uv run python main.py
```

Frontend (Vite proxies `/ws` to the agent):

```bash
cd frontend
pnpm install
pnpm dev
```

## Demo script

1. Open `examples/test-text.md`.
2. Open the **Settings** tab; confirm Models / Tools / Subagents / Skills / Rules render. Set an active model if needed.
3. Back on the document, ask the agent: *"Improve the introduction's clarity."*
4. Watch the tool trace (`read_file`, specialists, `propose_edit_group`).
5. An **edit group** appears in the pinned **Review Queue** (not as a chat message).
6. Inspect the rationale, then **Apply** — the editor buffer updates.
7. Click **Save** — the underlying `.md` file changes on disk.
8. Edit the document so an outstanding edit no longer matches — its card becomes **Stale**.
9. Restart the backend — session, edit groups, and memory are restored.

## Testing

Backend (deterministic; no live model):

```bash
cd agent
uv run pytest -q
```

Eval smoke suite:

```bash
cd agent
uv run python -m evals.runner --suite smoke
```

End-to-end WebSocket smoke (real server, no live model):

```bash
cd agent
uv run python scripts/ws_smoke.py
```

Frontend build gate:

```bash
cd frontend
pnpm run build
```

Browser smoke checklist: see [`docs/browser-smoke.md`](docs/browser-smoke.md).

Live integration tests are opt-in (require a running server + model):

```bash
cd agent
uv run pytest -m integration
```

## Architecture

```
frontend (React)          tabs / editor / chat / Review Queue / settings
        │  typed WebSocket protocol (TS <-> Python)
application handlers       session / chat / settings / review / memory
domain services           SessionStore / EditGroupService / MemoryStore / EvalRunner
agent orchestration       WritingAgentRunner / Strands Agent / review + researcher specialists
tools                     read_file / check_consistency / search_references / propose_edit_group
filesystem                project files / .writing-agent state / plugin markdown
```

State ownership: the backend owns session, buffers, edit groups, memory, settings, and registry. The frontend renders backend state. The LLM only produces proposals, which the backend validates before they become state.

The authoritative design and execution plan live in [`handoff/`](handoff/). `docs/` is historical source context.

## Known limitations

- Save is final for MVP; rely on filesystem/VCS history for rollback after save.
- Retrieval is lexical (`search_references` over a `references/` directory); no vector RAG, and no live paper download / DOI fetch. The `researcher` works only from the local reference base.
- Evidence classification (`verification.classify_claim`) is a deterministic, conservative reference implementation used by evals; it is not wired as a live LLM subagent.
- Review is group-level (apply / reject / delete). Per-edit accept/adjust is supported in the backend (`group/replace_edit`) but the MVP UI acts at the group level.
- Composer context chips are created from in-editor selection ("Add to Chat") and `@mentions`. Dragging an Explorer file into the composer is not yet wired (the file-tree drag payload is owned by the tree library); PDF/DOCX import is future work.
- Cancellation stops *forwarding* late deltas; the model may still finish server-side.
- Multi-agent orchestration uses agent-as-tool, not graph/swarm; there is no global review/council mode.

## License

MIT

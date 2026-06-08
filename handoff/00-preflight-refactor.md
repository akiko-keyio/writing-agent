# 00 Preflight Refactor

This is not a rewrite. It is a short stabilization pass that removes the few pieces of technical debt that would otherwise distort every later feature.

The current backend is not a mess. It has a usable shape and passing tests. The frontend has a visible working dev UI. The risk is that several MVP shortcuts are now sitting directly on the path of Settings, Review/EditGroup, Memory, evals, and multi-agent workflows.

## Objective

Before building new backend features, establish a clean baseline:

```text
backend tests green
frontend build green
inert legacy auto-patch path removed or frozen
model settings affect runner creation
runner model creation is injectable for tests
session state has a persistence boundary
handler routing has a clear split-by-need rule
```

## P0. Frontend Build Gate

Current state: `pnpm run build` fails.

Observed error categories:

- `ScrollArea` prop drift: `horizontalScroll`, `viewportRef`.
- Backup explorer variants included in TypeScript build.
- Unused imports and variables under strict TS config.
- Missing `DocumentTocEntry`.
- Missing `vitest` dependency or test exclusion.
- coss/Nexus prop mismatches such as Avatar `size`.
- Nullable type mismatch in layout/top bar paths.

Required action:

- Make `pnpm run build` pass.
- Prefer excluding dev/backup/example pages from production build if they are not part of the app.
- Keep UI behavior unchanged unless a type fix requires a small prop migration.

Verification:

```powershell
cd Y:\agent\writing-agent\frontend
pnpm run build
```

Done when:

- Build exits 0.
- The existing dev UI still opens.
- No product feature work was mixed into this cleanup.

## P0. Remove Or Freeze Legacy Auto Patch

Current files:

- `agent/protocol.py`
- `agent/handler.py`
- `frontend/src/lib/agent-protocol.ts`
- `frontend/src/hooks/use-agent-session.ts`

Problem:

- `SessionState.pending_replacements` and `document/patch` are an inert legacy edit path.
- Current code does not appear to write `pending_replacements`, but the dormant handler block can be accidentally revived.
- If revived, replacement errors would be ignored by the handler.
- This conflicts with the future `EditGroup` lifecycle.

Required decision:

Choose one of these, in order of preference:

1. Remove the chat-end auto-apply path and keep `document/patch` only as deprecated protocol compatibility.
2. Keep `apply_replacements` as a low-level utility, but make all product document changes go through `EditGroupService`.

Do not add new agent behavior that writes to `pending_replacements`.

Verification:

- Existing backend tests pass.
- Add tests proving failed replacements cannot emit document patches if the compatibility path remains.
- Add tests proving new structured edits do not use `pending_replacements`.

Done when:

- There is only one product edit path: `EditGroup`.
- Legacy protocol is either removed or explicitly marked deprecated and unused.

## P0. Fix Mojibake

Current issue:

The known corruption is in planning/design docs, especially the outdated duplicate Review sketch in `docs/principle.md`. Active Python source should still be scanned, but do not assume prompts/errors/tool previews are corrupted unless the scan proves it.

Required action:

- Remove or clearly quarantine corrupted/outdated design text in `docs/principle.md`.
- Replace corrupted punctuation in active source only if the scan finds it.
- Keep source files UTF-8.
- Do not reformat unrelated text.

Verification:

```powershell
cd Y:\agent\writing-agent
rg -n "\\x{FFFD}" agent docs frontend/src
```

Also search for visible mojibake strings if they appear in rendered output, but do not paste corrupted bytes into this handoff file.

Done when:

- No corrupted text remains in active source files.
- `docs/principle.md` no longer contains a contradictory corrupted Review design.
- Backend tests still pass.

## P0. Make Settings Model Config Real And Injectable

Current files:

- `agent/model_manager.py`
- `agent/config.py`
- `agent/strands_runner.py`
- `agent/handler.py`

Problem:

- Settings can write `models.yaml`.
- `WritingAgentRunner` still creates `OpenAIModel` from environment config.
- Active model changes do not reliably affect the runner.
- Later fake-model tests and evals need a model injection seam that does not exist yet.

Required action:

- Add a small model factory:

```text
load active model from models.yaml
fallback to .env config
create OpenAIModel
```

- Make the factory injectable into `WritingAgentRunner`:

```text
WritingAgentRunner(project_root, model_factory=...)
or
WritingAgentRunner(project_root, model=...)
```

This is a testability boundary, not only a Settings feature. Fake-model and stub-runner tests for later phases depend on it.

- Define refresh behavior:

```text
set_active_model affects the next runner/session immediately after runner rebuild
or settings/update explicitly rebuilds the current runner
```

The first option is simpler; the second option is better UX. Pick one and test it. If the current runner is rebuilt, preserve conversation state through the existing snapshot/restore path so model switching does not wipe chat history.

Verification:

- `settings/read` masks API keys.
- `settings/update add_model` writes valid config.
- `settings/update set_active_model` affects the next model factory result.
- `WritingAgentRunner` can be constructed with a fake model or fake model factory in tests.
- Runner rebuild after active-model switch preserves messages and agent state.
- Updating settings never returns raw API keys to the frontend.

Done when:

- Settings is not cosmetic; it controls runtime configuration.
- Backend tests can construct a runner without a live model.

## P0. Add Persistence Boundary

Current file:

- `agent/session_store.py`

Problem:

- Session store is explicitly in-memory MVP.
- Edit groups and memory cannot be built on volatile state.

Required action:

- Establish the file-backed persistence pattern before implementing EditGroup/Memory:

```text
SessionStore
shared JSON read/write helpers
shared atomic write helper
store schema version field
```

- Do not pre-create `EditGroupStore` or `MemoryStore` before their domain models exist. They are future consumers of the same persistence pattern.
- File-backed storage is enough. Do not add a database yet.
- Recommended path:

```text
.writing-agent/
  sessions/
  edit-groups/
  memory/
  eval-runs/
```

Verification:

- Save session, create a new store instance, load session.
- Persist active path, open buffers, messages, and agent state.
- Persist/reload Strands messages containing `tool_use` and `tool_result` blocks.
- Corrupt JSON is handled as a recoverable load error.
- Local state and secret files are covered by git-ignore policy: `models.yaml` and `.writing-agent/`.

Done when:

- Restarting the backend does not erase the user's workflow state.
- Persistence helpers are reusable by future stores without creating empty future abstractions.

## P1. Split Handler Routing Before It Grows

Current file:

- `agent/handler.py`

Problem:

- One function currently handles session, settings, plugin, chat, and legacy patch routing.
- Adding Review/Memory/Eval here will turn it into a hard-to-test controller.

Required action:

Do not create speculative empty handler files in preflight. Use this rule instead:

```text
keep current handler shape until a route family grows
split a route family when adding it would materially enlarge handler.py
move existing tests with the route family when splitting
```

Allowed preflight split:

- Extract settings handlers if model/tool settings work requires it.
- Extract session handlers if persistence work requires it.

Not allowed in preflight:

- Creating empty `review_handlers.py`.
- Introducing a router framework.
- Moving code only for cosmetic organization.

Verification:

- Existing backend tests pass before and after.
- Route behavior remains byte-for-byte equivalent where practical.
- New route files have focused tests.

Done when:

- The next agent has a clear split rule, but preflight remains narrow.

## P1. Prepare Subagent Permission Metadata

Current file:

- `agent/subagents.py`

Problem:

- `readonly` and `is_background` are parsed but do not drive behavior.
- Current built-in tool set is read-only, so enforcing write-tool restrictions before write tools exist would be speculative.
- Future Settings toggles will be misleading unless metadata is exposed clearly.

Required action:

- In preflight, only expose parsed `readonly` and `is_background` metadata through Settings/plugin scan if needed.
- Defer actual permission enforcement until write-capable tools exist.
- Phase 8 owns runtime subagent permission enforcement.

Verification:

- Subagent metadata scan remains robust if one markdown file is malformed.
- Settings can display readonly/background metadata without implying unsupported controls.

Done when:

- Capability metadata is accurate, while runtime enforcement remains scheduled for Phase 8.

## Do Not Refactor These Yet

- Do not rewrite the tab system.
- Do not replace WebSocket with HTTP or SSE.
- Do not introduce a database.
- Do not migrate the whole frontend component library.
- Do not jump to Strands Graph/Swarm.
- Do not build RAG before EditGroup and evals exist.

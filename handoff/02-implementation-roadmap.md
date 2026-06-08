# 02 Implementation Roadmap

Execute phases in order. Do not skip a phase because the UI appears to work.

Each phase has:

- Goal.
- Implementation scope.
- Tests.
- Done criteria.

## Phase 0. Preflight Stabilization

Goal:

Establish a green baseline and remove technical debt that blocks future architecture.

Implement:

- Fix frontend build.
- Remove/freeze legacy `pending_replacements`.
- Fix mojibake.
- Make Settings model config drive model creation.
- Add persistence boundary.
- Thin-split handler routing if adding new routes would otherwise enlarge `handler.py`.
- Expose subagent permission metadata without enforcing speculative write-tool restrictions.

Tests:

```powershell
cd Y:\agent\writing-agent\agent
uv run pytest -q

cd Y:\agent\writing-agent\frontend
pnpm run build
```

Done:

- Backend tests pass.
- Frontend build passes.
- No corrupted source strings.
- New features can be added without extending legacy patch behavior.

## Phase 1. Protocol Hardening

Goal:

Make frontend/backend communication a stable contract.

Implement:

- Consolidate Python message models or validators.
- Ensure TypeScript protocol mirrors Python protocol.
- Add fixtures for representative inbound and outbound messages.
- Add optional `request_id` to inbound `chat/message`.
- Thread `request_id` through stream events, tool events, edit groups, errors, and cancellation.
- Refactor the per-connection loop so a chat turn runs as a tracked cancellable task while the websocket can still read control frames.
- Standardize error messages:

```text
type: "error"
message: string
code?: string
request_id?: string
```

- Define cancellation semantics for `chat/cancel` on top of the tracked turn lifecycle before adding edit-producing tools.

Tests:

- Unknown message returns an error.
- Invalid payload returns typed error.
- Settings, session, document, chat routes accept valid payloads.
- `chat/message` accepts and echoes/carries `request_id`.
- Tool events and future edit groups can be traced to a source `request_id`.
- `chat/cancel` produces a deterministic cancelled state for the active stream.
- The websocket can process `chat/cancel` while a chat task is still running.
- Frontend protocol type guards recognize all outbound messages.

Done:

- Adding a new message type requires updating tests and TS types.

## Phase 2. Durable State

Goal:

Persist sessions and prepare for edit groups, memory, and eval reports.

Implement:

```text
.writing-agent/
  sessions/
  edit-groups/
  memory/
  eval-runs/
```

Add:

- File-backed `SessionStore`.
- Safe JSON read/write helpers.
- Store version field.
- Recoverable corrupt-file handling.
- Atomic write semantics for state files where practical.
- A serialization strategy for Strands messages, including `tool_use` and `tool_result` blocks.
- A git-ignore/secret-handling note for `models.yaml` and `.writing-agent/`.

Tests:

- Save/load session after new store instance.
- Persist open buffers and active path.
- Persist agent messages/state.
- Persist and reload messages containing tool calls/tool results.
- Corrupt JSON does not crash list/load.
- Workspace path traversal is rejected.
- Concurrent saves for the same session do not corrupt the state file in the single-user local case.

Done:

- Backend restart does not erase chat/session/editor overlay state.

## Phase 3. EditGroup Domain

Goal:

Introduce the product's core edit lifecycle.

Implement:

- `EditGroup`, `Edit`, `EditAnchor` domain models.
- Group scoping fields: `session_id` and workspace-relative `path`.
- Edit kinds: replacement, deletion, insertion.
- Replace lineage fields: `replaces` and `replaced_by`.
- `EditGroupStore`.
- `EditGroupService`.
- Anchor validation against open buffer first, disk second.
- Anchor-only validation for insertions.
- Stale detection.
- Overlap detection.
- Explicit apply contract for all-or-partial group application.
- Explicit save semantics via a future `document/save` route.
- Delete/reject/update status.

Suggested files:

```text
agent/edit_groups.py
agent/edit_group_store.py
agent/tests/test_edit_groups.py
```

Tests:

- Unique old text replacement validates.
- Insertion anchored between two paragraphs validates and applies.
- Deletion validates and applies.
- Missing old text produces stale/error.
- Repeated old text requires anchor.
- Overlapping edits are rejected or deterministically ordered.
- Applying a group updates `SessionState.open_buffers`.
- Applying a group is offset-independent across multiple edits.
- Stale edits produce the documented `partially_applied` behavior.
- Applying does not write disk.
- Re-applying an applied group is idempotent or rejected with a clear error.
- Replacing an edit creates a new edit and links old/new edits through replace lineage.
- Group store can list groups by `session_id` and restore the correct groups on session switch.
- Groups survive session reload.

Done:

- Backend can create, validate, persist, and apply edit groups without any LLM.

## Phase 4. Review Protocol and Frontend Bridge

Goal:

Expose edit groups through WebSocket and render them in the UI.

Implement backend messages:

```text
group/propose
group/state
group/update
group/apply
group/delete
document/save
```

Implement frontend:

- Protocol types.
- Hook state for edit groups.
- Pinned, collapsible Review Queue inside the right column, above chat messages and below the chat/model header.
- Independent internal scroll for Review Queue cards when many groups exist.
- Apply/reject/delete actions.
- Stale state display.
- Frontend anchor mapping from backend edit anchors to TipTap decorations.
- Save action that writes the current buffer to disk through `document/save`.

Tests:

- Backend route tests for all group messages.
- Backend route tests for `document/save`, including atomic write success and path rejection.
- Frontend build.
- Browser smoke for proposal/apply/stale.
- Browser smoke that Review Queue stays pinned while chat messages scroll.
- Browser smoke that the composer remains fixed at the bottom.
- Browser smoke for save-to-disk round trip.

Done:

- A deterministic backend test can create and apply a group.
- Browser can show, apply, and save that group.
- Review cards do not scroll away as chat history and do not overlay chat content.
- TipTap highlights remain correct or become stale when matching fails.

## Phase 5. Agent Tool Bridge

Goal:

Let the writing agent propose structured edits through a tool.

Implement:

- `propose_edit_group` Strands tool.
- Tool validates input through `EditGroupService`.
- Tool emits queue events for UI.
- Agent prompt instructs model to use the tool for document modifications.
- Remove any remaining prompt language that encourages direct patching.

Tests:

- Direct tool call creates a group.
- Invalid tool input returns structured error.
- Fake runner chat turn can produce a group without mutating document, using the model injection seam created in preflight.
- Tool event stream appears as chat/tool update.

Done:

- LLM path and non-LLM path both converge on `EditGroupService`.

## Phase 6. Eval Harness

Goal:

Let the agent prove behavior without human feedback.

Implement:

```text
agent/evals/
  cases/
  runner.py
  reports/
```

Case fields:

```text
id
document
instruction
expected
forbidden
autopilot_policy
references?
```

Initial smoke cases should focus on deterministic EditGroup and mechanical behavior. Add reviewer/researcher cases after the relevant specialists exist.

Metrics:

- Structured edit group created.
- Edit anchors valid.
- No direct document mutation.
- Mechanical issue detection.
- Latency and error rate.
- Optional specialist trajectory checks when specialists exist.

Tests:

- Eval runner smoke suite exits 0.
- Regression case exits nonzero.
- Report file is generated.
- Evidence fixture cases can classify supported/contradicted/missing claims once researcher/verifier exist.

Done:

- Backend capability can be evaluated without opening the frontend.

## Phase 7. Memory

Goal:

Capture durable writing preferences and project knowledge.

Implement:

- `MemoryStore`.
- `memory/read` protocol.
- `memory/update` protocol.
- Memory UI under Settings.
- Memory write hooks from accepted/rejected/replaced edit events.
- Export/delete controls.
- Separate global principles from document/project knowledge and examples.

Tests:

- Accepted edit becomes an example candidate.
- Rejected edit is not learned as positive preference.
- Replaced edit records before/after using `replaces`/`replaced_by`.
- Stale edit does not write memory.
- Memory persists across backend restart.
- Memory can be disabled.
- Memory behavior is covered by eval smoke cases before it affects prompts.

Done:

- Memory is visible, editable/deletable, measured by evals, and never silently becomes hidden prompt state.

## Phase 8. Multi-Agent Review

Goal:

Wire specialists into a reliable workflow.

Implement in order:

1. `check`
2. `editor` as role/prompt plus edit tool; separate subagent only if needed
3. `reviewer`
4. `arbiter`
5. `researcher`
6. `verifier`

Workflow:

```text
user instruction
  -> main agent
  -> relevant specialists as tools
  -> arbiter when specialists disagree
  -> editor proposes EditGroup
  -> backend validates
```

Tests:

- Every subagent spec loads.
- Tool names are valid.
- Disabled subagents are not registered.
- Readonly/background permissions are enforced now that write-capable tools exist.
- Researcher cannot mutate document state.
- Researcher can retrieve from deterministic evidence fixtures.
- Verifier classifies claims as supported/contradicted/missing evidence.
- Arbiter output includes confidence and reasons.
- Multi-agent smoke eval passes.

Done:

- Multi-agent behavior is structured, permissioned, and testable.

## Phase 9. Settings Completion

Goal:

Turn Settings into a real control plane.

Implement:

- Model CRUD.
- Active model switching.
- API key masking.
- Tool enable/disable.
- Subagent enable/disable.
- Skill/rule/reference scanning.
- Disabled editing states for features not yet wired.
- First-run model setup for empty `models.yaml` or missing API key.
- Recoverable UI states for provider errors and invalid model config.

Tests:

- Raw API keys never appear in outbound messages.
- Tool toggles affect live registry.
- Subagent toggles affect live registry.
- Active model affects runner factory.
- Malformed plugin markdown does not crash settings read.
- Missing API key produces a user-actionable settings state.

Done:

- Settings UI matches actual backend behavior.
- A new user can configure a model from UI without editing `.env`.

## Phase 10. Product Hardening

Goal:

Make the project demoable and interview-ready.

Implement:

- One-command startup documentation.
- README demo script.
- Architecture diagram.
- Eval report sample.
- Example writing project.
- Browser smoke script or documented checklist.
- Known limitations section.

Final checks:

```powershell
cd Y:\agent\writing-agent\agent
uv run pytest -q

cd Y:\agent\writing-agent\frontend
pnpm run build

cd Y:\agent\writing-agent
npm run dev
```

Done:

- A reviewer can run the app, open a document, ask for a review, inspect edit groups, apply changes, inspect memory/settings, and understand the architecture from docs.

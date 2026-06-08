# 01 Product Architecture

This document defines the target architecture. It should guide implementation decisions when details are ambiguous.

## Product Thesis

The Writing Agent exists to help authors shape documents for readers. The agent should not merely produce nicer prose; it should identify where readers lose the thread, propose concrete changes, verify evidence when needed, and learn stable writing preferences over time.

The product is an IDE-like writing workspace:

```text
left: project files and outline
center: document tabs and editor
right: chat, tool trace, review groups
settings: special document tab
```

## State Ownership

Do not put product truth in LLM text.

Backend owns:

- Session state.
- Open buffer overlays.
- Edit groups.
- Memory.
- Settings.
- Tool/subagent registry.
- Eval results.

Frontend owns:

- Visual layout.
- Local input state.
- Rendering of backend state.
- Browser-only affordances such as split panes and selected UI tabs.

LLM owns:

- Candidate reasoning.
- Proposed edits.
- Specialist analysis.
- Rationale and confidence.

Backend validates and stores any LLM proposal before it becomes product state.

## Layering

Target layers:

```text
frontend React UI
  tabs / editor / chat / review cards / settings

protocol
  typed WebSocket messages mirrored in TS and Python

application handlers
  session / chat / settings / review / memory / eval

domain services
  SessionStore / EditGroupService / MemoryStore / EvalRunner

agent orchestration
  WritingAgentRunner / Strands Agent / specialist subagents

tools
  read_file / propose_edit_group / memory_write / evidence tools

filesystem
  project files / .writing-agent state / plugin markdown
```

## Settings Architecture

Settings should remain a special document tab, not a modal.

Reason:

- It reuses the existing tab/split-pane infrastructure.
- Users can view Settings beside a Skill/Subagent markdown source file.
- It treats configuration as part of the writing workspace, not a transient dialog.

Conceptual grouping:

```text
Customizations
  Skills
  References under Skills
  Rules / Principles
  Memory

Abilities
  Subagents
  Tools

Model
  API key
  Endpoint
  Model ID
  Temperature
```

MVP rule:

- Read and display real backend state.
- Disable editing that is not wired end to end.
- Never show fake enabled controls.

## EditGroup Architecture

This is the core product primitive.

This project follows the apply-group model from the top-level Review design in `docs/principle.md`: the document is not mutated by selecting individual candidate edits; a coherent group is applied through backend validation. Any older immediate-sync sketch in `docs/principle.md` should be treated as outdated design notes unless explicitly revived later.

An edit group represents one coherent proposed change set:

```text
EditGroup
  id
  session_id
  path
  title
  summary
  rationale
  source_agent
  confidence
  status
  created_at
  updated_at
  edits[]

Edit
  id
  kind
  old_text
  new_text
  anchor
  replaces
  replaced_by
  rationale
  risk
  status
```

Scope:

```text
session_id
  The chat/session that produced the group.

path
  The workspace-relative document path.
```

`EditGroupStore` should support `list_for_session(session_id)` and filter by path for document-specific views. Session restore should send `group/state` for the active session so the frontend does not guess which groups belong to which chat.

Edit kinds:

```text
replace
  old_text and new_text are present.

delete
  old_text is present and new_text is empty.

insert
  old_text may be empty; anchor/context determines the insertion point.
```

Required statuses:

```text
proposed
partially_applied
applied
rejected
replaced
deleted
stale
error
```

Replace lineage:

```text
replaces
  Optional edit id that this edit supersedes.

replaced_by
  Optional edit id that supersedes this edit.
```

Use this to distinguish:

```text
rejected
  User did not want the change.

replaced
  User wanted a different version of the change. This may be represented as a status or as `deleted` plus `replaced_by`, but the representation must be explicit and tested.
```

Memory depends on this distinction. Do not postpone it until the Memory phase.

Required backend validation:

- Path must normalize under workspace root.
- Replacement/deletion old text must be found in the current open buffer or disk fallback.
- Insertion edits must use anchor-only positioning, such as prefix/suffix context, heading path, or paragraph hint.
- Ambiguous repeated text must be rejected unless an anchor disambiguates it.
- Overlapping edits must be rejected or deterministically ordered.
- If the buffer changes and anchors no longer match, the edit becomes stale.

The agent may propose. The backend decides whether the proposal is valid.

Apply contract:

- Applying a group operates on all non-deleted, non-stale edits unless a later UI explicitly supports single-edit apply.
- Apply should be offset-independent: use validated content anchors or apply in a deterministic order that cannot shift later edits incorrectly.
- If all eligible edits apply, the group becomes `applied`.
- If some eligible edits apply and some are stale/error, the group becomes `partially_applied`.
- Re-applying an applied group should be rejected with a clear status or treated as idempotent; choose one behavior and test it.
- Save is separate from apply. Applying changes the buffer; `document/save` writes the buffer to disk.
- Save is final for MVP. Rollback should rely on the user's filesystem/VCS rather than an internal undo-after-save system.

## Document Save Architecture

Applying an edit group updates the open buffer. Saving writes that buffer to disk.

The product needs both operations:

```text
apply group
  validates edits and updates SessionState.open_buffers

save document
  writes the current buffer to the workspace file
```

Add an explicit `document/save` route before final delivery. The route should:

- Normalize the path under the workspace root.
- Save only the current open buffer for that path.
- Use atomic write semantics where practical: write temp file, flush, rename.
- Return success/error state to the frontend.
- Never let an LLM call it directly unless an explicit autopilot policy allows it.

This keeps semantic changes review-first while still making the IDE a real editor.

## Memory Architecture

Memory has three kinds:

```text
Knowledge
  facts about the project or document

Principle
  user writing constraints and preferences

Example
  concrete accepted/rejected/replaced edit cases
```

Memory must be visible and controllable.

Storage scopes:

```text
global principles
  Cross-document writing rules and user preferences.

document/project knowledge
  Facts about the current project or document.

examples
  Concrete accepted/rejected/replaced edit cases, usually document-scoped with links back to principles when relevant.
```

MVP storage can live under `.writing-agent/memory/`, but the directory structure must preserve these scopes instead of flattening everything into one bucket.

Relationship to Settings Rules:

- Settings "Rules" and Memory "Principles" should not become competing concepts.
- Treat Rules as the user-visible/global principle surface where possible.
- Memory may propose principle candidates from repeated accepted/replaced examples, but those candidates should become active Rules only through an explicit user-visible action or an explicit autopilot policy.

Learning policy:

- Accepted edits can become positive examples.
- Rejected edits can become negative examples.
- Replaced edits are most valuable because they reveal user preference.
- Stale or failed edits must not become memory.
- Principles should not be silently invented from weak signals.

Memory should be implemented after the eval harness, because memory is regression-prone and needs measurement before it can safely influence agent behavior.

## Multi-Agent Architecture

Use "Agent as Tool" first. Do not start with graph orchestration.

Roles:

```text
reviewer
  Simulates target readers and finds comprehension breaks.

check
  Performs mechanical consistency checks: terminology, tone, symbols, formatting.

researcher
  Retrieves evidence only when facts, citations, or claims need support.

verifier
  Judges whether claims are supported, contradicted, or missing evidence.

editor
  Produces concrete rewrite proposals and EditGroups. Start as a role/prompt plus `propose_edit_group`; make it a separate subagent only if isolation becomes valuable.

arbiter
  Merges disagreements and reports confidence with reasons.
```

Important distinction:

```text
researcher != verifier
```

Researcher fetches evidence. Verification is a workflow:

```text
claim extraction
  -> researcher evidence retrieval
  -> verifier support/contradiction judgment
  -> arbiter merge
  -> editor edit proposal
```

Permissions:

- `researcher` cannot mutate documents.
- `reviewer` and `check` can propose issues.
- `editor` can propose edit groups.
- `arbiter` can merge analysis but should not apply edits.
- Only backend services apply edits.

## RAG Position

Do not build broad RAG first.

Add retrieval only when one of these is needed:

- Search within project documents.
- Retrieve memory examples/principles.
- Retrieve references for factual verification.
- Retrieve tool or skill descriptions when the registry becomes too large.

MVP retrieval can be lexical search plus file reads. Vector search can be added after the eval harness shows retrieval is a bottleneck.

For researcher/verifier tests, add a deterministic evidence base before broad RAG:

```text
agent/evals/cases/<case-id>/references/
or
case file embedded evidence fixtures
```

Researcher should retrieve only from those known sources in deterministic tests. Verifier should classify claims as:

```text
supported
contradicted
missing_evidence
not_requiring_evidence
```

This makes evidence workflows testable without web access or vector search.

## Frontend Anchor Mapping

Backend anchor validation is not enough. The frontend also needs a concrete mapping from edit anchors to TipTap decorations.

Minimum frontend anchor data:

```text
old_text
new_text
prefix_context
suffix_context
heading_path?
paragraph_hint?
content_hash?
```

Frontend behavior:

- Locate `old_text` in the TipTap document using the same content-match assumptions as the backend.
- Use context fields to disambiguate repeated text.
- Render decorations/highlights for proposed edits.
- On user edits, re-run content matching.
- If a match fails or becomes ambiguous, mark the edit stale instead of pretending the highlight is still valid.

Backend and frontend should share the same conceptual stale rules even if implemented in different languages.

## Review Queue UI

Review cards are action state, not chat history. They should not be rendered as ordinary chat messages, and they should not float as an overlay above messages.

Use a pinned Review Queue inside the right chat column:

```text
right column
  chat/model header
  pinned collapsible Review Queue
    independent internal scroll when many groups exist
  chat message stream
    independent scroll
  composer
    fixed at bottom
```

Rules:

- Hide or collapse the Review Queue when there are no active proposed/stale groups.
- Show a compact badge when collapsed, such as `3 suggestions`.
- Keep chat visible below the queue so the user can ask follow-up questions about a selected edit.
- Keep the composer fixed at the bottom.
- Do not use a hard Chat/Review tab switch for MVP, because users often need chat and review visible together.
- Do not use a floating overlay, because it will obscure messages and fight scroll behavior.
- Applying or deleting a group removes it from the active queue and archives it.
- Stale groups remain visible, disabled, and clearly labeled instead of disappearing.
- Clicking a card should scroll the editor to the matching TipTap anchor and highlight it.
- If the anchor becomes stale, remove or warn the highlight and update the card state.

## Autopilot Policy

The development process should be autonomous. The product should still be safe by default.

Policies:

```text
suggest_only
  Default. Agent proposes; user applies.

auto_apply_mechanical
  Only low-risk mechanical edits with exact anchors.

auto_apply_test_mode
  Used by automated tests and evals, not default user behavior.
```

Do not auto-apply semantic or factual changes by default.

## Protocol Shape

Expected new message families:

```text
review/request
review/state
group/propose
group/update
group/apply
group/delete
document/save
memory/read
memory/update
eval/run
eval/report
```

Protocol rules:

- Backend sends full enough state for frontend recovery.
- Frontend may optimistically render loading states, but not invent group content.
- Every outbound message type must be represented in `frontend/src/lib/agent-protocol.ts`.
- Every inbound route must have backend tests.
- `chat/message` should accept a client-generated `request_id`.
- `request_id` should flow through stream start/end, tool events, edit groups, errors, and cancellation state.

## Turn Lifecycle

The current server shape is sequential: while a `chat/message` stream is being drained, the connection cannot read a later `chat/cancel` frame. Cancellation therefore requires a small concurrency refactor before it can be real.

Target lifecycle:

```text
chat/message(request_id)
  -> start tracked asyncio task for the turn
  -> continue reading control frames from the websocket
  -> chat/cancel(request_id) cancels or marks that task cancelled
  -> late events for cancelled request_id are ignored or marked cancelled
```

Each connection should track at most one active turn at MVP unless concurrent turns are explicitly designed later.

## Cancellation Semantics

`chat/cancel` cannot remain an undefined no-op once tools can propose edit groups.

Minimum semantics:

- Cancel stops streaming output if the underlying runner supports cancellation.
- If cancellation cannot stop the model immediately, the backend must stop forwarding late stream deltas for that request.
- Edit groups proposed before cancellation remain in state but should be marked with their source request id.
- Edit groups attempted after cancellation should be ignored or marked cancelled.
- The frontend must show a cancelled state instead of treating the turn as a normal completion.

This prevents half-created review state from becoming indistinguishable from a completed proposal.

## Error And First-Run UX

The product must handle recoverable failure states explicitly:

- Missing API key.
- Empty `models.yaml`.
- Invalid endpoint/model id.
- Model timeout or provider error.
- Tool timeout.
- Save failure.
- Empty workspace or no active document.

Settings should guide first-run model configuration. Chat should not fail silently when the model is unavailable.

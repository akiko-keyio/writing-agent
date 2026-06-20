# 04 Agent Execution Protocol

This document tells the coding agent how to perform the work.

## Operating Assumptions

- The user wants implementation, not more discussion.
- Ask questions only when blocked by missing credentials, destructive actions, or genuinely ambiguous product decisions not resolved in this handoff.
- Prefer the existing architecture and style.
- Make surgical changes.
- Backend functionality must be self-tested before frontend wiring.
- Frontend browser validation is important but should not block backend-only phases.

## Work Loop

For every phase:

```text
1. Read the relevant handoff section.
2. Inspect current code and tests.
3. State the phase goal and success criteria.
4. Add or update tests first.
5. Implement the smallest backend change.
6. Run targeted tests.
7. Run full backend tests.
8. Update protocol/types if needed.
9. Run frontend build at phase gates.
10. Run browser smoke at milestones.
11. Update docs/handoff notes with actual status.
```

Do not skip verification because the change is small.

## Status Format

When leaving notes for the next agent, use:

```text
Phase:
Status:
Changed files:
Tests run:
Known failures:
Next action:
```

## Decision Rules

### When A Simpler Option Exists

Pick the simpler option if it preserves:

- typed backend state
- deterministic tests
- protocol clarity
- user-visible control

### When A Feature Wants More Abstraction

Do not add an abstraction for a single use. Add one only when it removes real duplication or defines a product boundary:

- store boundary
- protocol boundary
- edit validation boundary
- model factory boundary
- tool registry boundary

### When The Frontend Fails

Classify the failure:

```text
frontend build gate
  Must fix at phase gate and final delivery.

frontend integration bug
  Record it and continue backend work if backend tests/evals pass.

visual polish
  Do not block backend phases.
```

### When The LLM Is Needed

Normal tests must not depend on live LLM behavior.

Use:

- direct service calls
- fake model
- stub runner
- tool invocation with controlled input
- eval cases with deterministic expectations

Live LLM tests are optional integration tests.

## Implementation Order

Strict order:

```text
preflight
  -> protocol
     (including request_id and cancellable turn lifecycle)
  -> persistence
  -> EditGroup domain
  -> Review protocol/UI bridge
  -> agent tool bridge
  -> eval harness
  -> memory
  -> multi-agent workflow
  -> settings completion
  -> product hardening
```

Do not implement RAG before eval harness.

Do not implement graph/swarm orchestration before agent-as-tool specialists are stable.

## Backend-First Rule

Before touching frontend for a feature, prove backend behavior with tests.

Example for EditGroup:

```text
Backend first:
  create group
  scope group to session + path
  validate anchors
  validate insertion/deletion/replace kinds
  persist group
  apply group
  save document
  detect stale group

Then frontend:
  render group
  place group in pinned Review Queue, not chat history
  apply action
  save action
  stale display
  TipTap anchor decorations
```

Example for Settings:

```text
Backend first:
  write models.yaml
  mask API key
  create active model
  construct runner with fake model/model factory
  update tool registry

Then frontend:
  form controls
  disabled states
  optimistic refresh
```

## Product UX Rules

- No surprise mutation. Semantic edits are proposed first.
- Mechanical low-risk edits may be auto-applied only under explicit policy.
- Applying an edit group updates the buffer; saving writes to disk.
- Saving is final for MVP; rely on filesystem/VCS history for rollback after save.
- Settings must show real backend state.
- Disabled controls should explain availability through concise labels or tooltips.
- Review cards should show what changes, why, risk, and confidence.
- Review cards belong in a pinned, collapsible Review Queue above chat messages, with independent internal scroll.
- Chat messages remain a conversation stream; edit groups are action state and should not scroll away as chat history.
- Tool traces should be visible but not dominate the writing surface.
- The document editor remains the center of the product.
- Model/API failures, missing API keys, tool timeouts, and save errors must be surfaced as recoverable UI states.
- First-run or empty-workspace states must guide the user to configure a model or open a project.

## Files To Prefer

Likely backend additions:

```text
agent/edit_groups.py
agent/edit_group_store.py
agent/memory_store.py
agent/model_factory.py
agent/handlers/session_handlers.py
agent/handlers/settings_handlers.py
agent/handlers/chat_handlers.py
agent/handlers/review_handlers.py
agent/evals/
```

Likely frontend additions:

```text
frontend/src/components/review-panel.tsx
frontend/src/components/edit-group-card.tsx
frontend/src/hooks/use-edit-groups.ts
frontend/src/lib/agent-protocol.ts
frontend/src/components/settings/
```

Do not create these files blindly. First inspect current equivalents and reuse existing components.

## Definition Of Done Per Phase

A phase is done only when:

- planned behavior is implemented
- tests for that behavior exist
- tests pass
- protocol/types are updated
- docs are updated if behavior changed
- known limitations are recorded

## Final Demo Script

The final product should support this demo:

1. Start app.
2. Open example academic draft.
3. Ask the agent to review the introduction.
4. Agent reads the file through `read_file`.
5. Agent uses reviewer/check/editor as needed.
6. Backend creates structured edit groups.
7. User inspects rationale, risk, and confidence.
8. User applies a group.
9. Editor buffer updates.
10. User saves the document and the markdown file changes on disk.
11. Accepted edit can become a memory example.
12. Settings shows active model, tools, skills, rules, memory, and subagents.
13. Restart backend.
14. Session/edit/memory state remains.
15. Eval report demonstrates the system is tested, not merely demoed.

## Stop Conditions

Stop and ask only when:

- A destructive operation is required.
- Credentials or external service access is required and no fallback exists.
- Existing user changes conflict with required edits and cannot be merged safely.
- A product decision contradicts this handoff and cannot be resolved from docs.

Otherwise, keep implementing and verifying.

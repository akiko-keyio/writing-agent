# 03 Testing and Acceptance

The testing strategy is backend-first. Frontend validation is important, but it should not block backend progress except at phase gates and final acceptance.

## Test Hierarchy

Use this order:

```text
1. Domain unit tests
2. Handler/protocol tests
3. Tool tests
4. Runner tests with fake model/stub runner
5. Eval harness smoke tests
6. Frontend type/build tests
7. Browser smoke tests
8. Optional live LLM tests
```

Do not use live LLM calls for ordinary test gates.

## Required Commands

Backend:

```powershell
cd Y:\agent\writing-agent\agent
uv run pytest -q
```

Frontend:

```powershell
cd Y:\agent\writing-agent\frontend
pnpm run build
```

Eval smoke, once implemented:

```powershell
cd Y:\agent\writing-agent\agent
uv run python -m evals.runner --suite smoke
```

Whole app manual/dev:

```powershell
cd Y:\agent\writing-agent
npm run dev
```

## Backend Test Matrix

### Session

Must test:

- Create session.
- List sessions.
- Switch session.
- Clear session.
- Restore messages and agent state.
- Restore messages containing tool_use/tool_result blocks.
- Restore open buffers and active path.
- Persist across store restart.

### Document Overlay

Must test:

- `document/open` updates buffer.
- `document/change` updates buffer.
- `chat/message` context snapshot wins over stale debounce state.
- `read_file` reads open buffer before disk.
- `document/save` writes the current open buffer to disk.
- `document/save` rejects path traversal.
- Save uses atomic write behavior where practical.
- Invalid paths are rejected.

### Settings

Must test:

- `settings/read`.
- `settings/update add_model`.
- `settings/update update_model`.
- `settings/update remove_model`.
- `settings/update set_active_model`.
- `settings/update set_tool_enabled`.
- API key masking.
- Active model factory behavior.
- Empty config creates a first-run state.
- Missing API key is surfaced without crashing chat.
- Provider/model errors produce recoverable UI state.

### EditGroup

Must test:

- Create valid group.
- Group carries `session_id` and `path`.
- `group/state` restores groups for the active session.
- Reject invalid path.
- Reject missing text.
- Reject ambiguous repeated text without anchor.
- Validate and apply insertion edits with anchor-only positioning.
- Validate and apply deletion edits.
- Detect stale group after buffer change.
- Reject or order overlapping edits.
- Apply group updates open buffer.
- Apply group is offset-independent for multi-edit groups.
- Partial stale/error cases produce the documented `partially_applied` behavior.
- Apply group does not write disk.
- Save after apply writes disk.
- Delete/reject group updates status.
- Replacing an edit links old and new edits with `replaces` and `replaced_by`.
- Persist and reload groups.

### Tools

Must test:

- `read_file` buffer-first behavior.
- `propose_edit_group` creates group.
- Tool errors are structured.
- Tool events are emitted to outbound queue.
- Disabled tools are not registered.
- Tool timeout/error states are surfaced as typed errors.

### Cancellation

Must test:

- `chat/message` carries a `request_id`.
- Stream events, tool events, errors, and edit groups retain that `request_id`.
- The connection can receive `chat/cancel` while a chat turn is streaming.
- `chat/cancel` marks the active stream cancelled.
- Late deltas after cancellation are ignored or tied to the cancelled request.
- Edit groups proposed after cancellation are not accepted as completed turn output.
- Edit groups proposed before cancellation keep traceable request metadata.

### Secret And Local State Handling

Must test or checklist:

- Raw API keys never appear in outbound WebSocket messages.
- `models.yaml` is treated as local secret-bearing state.
- `.writing-agent/` is treated as local user state.
- `.gitignore` or equivalent project policy covers `models.yaml` and `.writing-agent/`.

### Subagents

Must test:

- Markdown frontmatter scan.
- Tool name normalization.
- Disabled subagent is not registered.
- Readonly subagent receives only readonly tools once write tools exist.
- Malformed file does not crash scanner.

### Memory

Must test:

- Create/read/update/delete memory.
- Accepted edit becomes example candidate.
- Rejected edit does not become positive memory.
- Replaced edit records user preference.
- Memory persists.
- Memory can be disabled.

## Eval Matrix

Create small deterministic cases first.

Recommended smoke cases:

1. Mechanical terminology consistency.
2. Introduction clarity rewrite.
3. Reader confusion detection.
4. Duplicate old text requiring anchor.
5. Stale edit after document change.
6. Claim requiring evidence.
7. Claim not requiring evidence.

Phase 6 eval harness should start with cases 1, 2, 4, and 5. Cases 3, 6, and 7 become required once reviewer/researcher/verifier are implemented.

Evidence cases must include deterministic source material:

```text
agent/evals/cases/<case-id>/references/
```

or an embedded evidence fixture in the case file.

Each eval should assert trajectory and state, not just final prose.

Example expectations:

```text
must_call: read_file
must_create: edit_group
must_not_emit: document/patch
must_not_call: researcher
valid_anchor_count: all
```

For evidence cases:

```text
claim_status: supported | contradicted | missing_evidence | not_requiring_evidence
evidence_source: fixture path
```

## Frontend Build Gate

`pnpm run build` must be green at these points:

- After preflight.
- After protocol changes.
- After review UI integration.
- After settings integration.
- Before final delivery.

If frontend build is red due unrelated existing debt during a backend-only phase:

- Document the failure.
- Continue only if backend tests and evals are green.
- Do not ship final product while frontend build is red.

## Browser Smoke

Run browser smoke at milestones, not after every backend unit change.

Required scenario:

1. Open app.
2. Open `examples/test-text.md`.
3. Open Settings tab.
4. Verify Models/Skills/Rules/Tools/Subagents sections render.
5. Return to document tab.
6. Send a chat request: "Improve introduction clarity."
7. Verify tool trace appears.
8. Verify an edit group appears in the pinned Review Queue, not as a normal chat message.
9. Apply the edit group.
10. Verify editor buffer changes.
11. Save the document.
12. Verify the underlying markdown file changes.
13. Modify the document.
14. Verify old group becomes stale when applicable.
15. Verify TipTap highlights disappear or update when anchors become stale.
16. Verify the Review Queue can collapse, shows a suggestion count, and stays pinned while chat scrolls.
17. Verify the composer remains fixed at the bottom.
18. Switch session and back.
19. Verify chat/edit state recovery.

Browser smoke should not replace backend tests.

## Optional Live LLM Tests

Live tests are useful only after deterministic tests pass.

Rules:

- Mark as integration.
- Skip by default when API key is missing.
- Never assert exact model prose.
- Assert tool trajectory and backend state instead.

## Final Acceptance Checklist

The final product is ready only when:

- Backend tests pass.
- Frontend build passes.
- Eval smoke suite passes.
- Browser smoke passes.
- API keys are masked.
- No source mojibake remains.
- No legacy auto-patch path is used for product edits.
- Applied edits can be saved to disk.
- Settings changes affect runtime behavior.
- TipTap anchor mapping works or marks edits stale.
- Review Queue is pinned, collapsible, independently scrollable, and does not cover chat messages.
- Insertions, deletions, replacements, and partial apply behavior are covered.
- Edit groups persist and survive restart.
- Memory persists and is user-visible.
- Subagent/tool settings match runtime registry.
- Missing model/API configuration produces a guided first-run state.
- Cancelled chat turns do not leave ambiguous edit groups.
- Local secret/state files are protected from accidental git commits.
- README explains run/test/demo.

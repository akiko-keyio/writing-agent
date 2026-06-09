# Writing Agent — Execution Status

## 2026-06-09 — Consistency pass (single Agent mode; honest specialists)

Product decision applied: **one Agent mode** only. No Ask/Edit selector, no
global review/revise/verify/council modes, no temperature UI. The main agent
decides when to discuss / read / check / gather evidence / propose edits. All
document changes still go through EditGroup (propose → review → apply → save).

Changed (P0):
- **Fake modes removed**: `chat-composer.tsx` no longer renders the Ask/Agent/Edit
  menu (it was local-only state, never in the protocol); shows a static "Agent"
  label. No protocol mode field exists.
- **Models**: backend `ModelEntry.to_dict(mask_key=True)` now emits `api_key_masked`
  (raw key never leaves backend); yaml save still writes `api_key`. `settings/read`
  uses `display_models_config()` (in-memory `.env` fallback, **no write**). Runner
  rebuilds on add/update/remove/set_active. Frontend: readable model labels
  (`provider · model`, fallback to endpoint host/id — fixes bare "3"); Models page
  shows Active badge, endpoint, masked key, Set active / Edit / Delete.
- **Tools/Subagents sync**: single data model — UI consumes `plugins.subagents`
  (with `enabled`); `settings/update set_subagent_enabled` returns updated
  `plugins`; top-level `subagents` removed from `settings/data`. Toggles are
  authoritative (backend response drives state; errors toast, no optimistic drift).
- **Subagent audit**: removed `editor`, `arbiter`, `verifier`, `check`,
  `reference-list` markdown. Kept `review` (independent reader) and `researcher`
  (rewritten: local references only, no paper-fetch claims). `check` → deterministic
  `check_consistency` tool; verifier taxonomy stays as `verification.classify_claim`
  (evals). Main agent proposes edits directly (no editor subagent). System prompt
  updated to only reference real tools/specialists.
- **Review Queue**: empty pinned state ("No suggestions") instead of `return null`.
  Apply now syncs editor + tab content + dirty via `applyExternalContent`; Save
  flushes the editor's latest markdown (`getMarkdown()`) before writing, and marks
  the tab clean on `document/saved`. Card click scrolls/highlights anchor (existing).
- **Selection → chat**: editor selection toolbar "Add to Chat" → removable composer
  context chips (`lib/chat-attachments.ts`); chips merged into outbound context and
  cleared on send. (Explorer→composer drag deferred: tree drag payload is library-owned.)

Changed (P1):
- **Memory UI**: Settings → Memory (enable toggle, principle/knowledge/example
  lists, delete, clear all). `useSettings` handles `memory/read`/`memory/update`.

Tests: backend `122 passed, 2 deselected`; eval smoke `9/9`; `ws_smoke.py` PASS;
`pnpm run build` GREEN. New backend tests: `test_settings_models.py`,
`check_consistency` tests; updated subagent/plugins/eval tests for the audit.

Remaining risks: per-edit review UI is group-level only (backend supports
`group/replace_edit`); no live paper-fetch; selection toolbar positions via
`coordsAtPos` (transient, hides on scroll). See README "Known limitations".

---


Started from checkpoint `2d9063c`. Backend-first, test-driven per `handoff/`.

Baseline (2026-06-09): backend `35 passed`; frontend `pnpm run build` red.

## Legend
- DONE: implemented + tests green
- WIP: in progress
- TODO: not started
- BLOCKED: see Blocked items

---

## Phase 0 — Preflight Stabilization — DONE (backend) / WIP (frontend gate)

Changed files:
- `agent/model_factory.py` (new): active-model resolution (models.yaml -> .env), `create_active_model`, `has_active_model_config`. Injection seam.
- `agent/strands_runner.py`: `WritingAgentRunner(model=..., model_factory=...)` injection; `_build_agent`; `rebuild_model()` preserves messages/state.
- `agent/handler.py`: `set_active_model` now rebuilds the live runner; removed legacy chat-end `pending_replacements -> document/patch` auto-apply; dropped `apply_replacements` import.
- `agent/storage.py` (new): shared state root (`WRITING_AGENT_STATE_DIR` env or `<root>/.writing-agent`), atomic JSON/text writes, recoverable `read_json`, `CorruptStateError`, `STORE_VERSION`.
- `agent/session_store.py`: now file-backed under `.writing-agent/sessions/`; corrupt-file recovery; `SessionSnapshot.to_dict/from_dict`.
- `agent/tests/fakes.py` (new): `FakeModel`/`FakeTurn`/`fake_model_factory` (Strands `Model` subclass, scripted text + tool calls, no network).
- `agent/tests/conftest.py` (new): autouse fixture isolating state to per-test tmp dir.
- `agent/tests/test_model_factory.py`, `test_fake_runner_chat.py`, `test_persistence.py` (new).
- `agent/tests/test_subagents.py`: added permission-metadata + malformed-file robustness tests.
- `agent/tests/test_ws_integration.py`: streaming deltas no longer exhaust `_recv_until` budget.
- `agent/pyproject.toml`: `pythonpath=[".","tests"]`; default `addopts="-m 'not integration'"`.
- `docs/principle.md`: removed contradictory outdated ("## Oute DATE") immediate-sync Review sketch.

Preflight item status:
- Frontend build gate: WIP (delegated to Composer subagent; verify at gate).
- Legacy auto-patch path: DONE (removed; only EditGroup will mutate docs).
- Mojibake: DONE (no U+FFFD in active source; outdated principle.md section removed).
- Settings model config real + injectable: DONE (model factory + runner rebuild on `set_active_model`).
- Persistence boundary: DONE (file-backed SessionStore + shared atomic helpers).
- Handler split: DEFERRED per rule (split a route family only when adding it enlarges `handler.py`; will split when adding review/save routes in Phase 4).
- Subagent permission metadata: DONE (already exposed by `plugin_scanner`; locked with tests). Enforcement deferred to Phase 8.
- Secrets/gitignore: DONE (`.gitignore` already covers `models.yaml`, `.writing-agent/`).

Tests run: `uv run pytest -q` -> `50 passed, 2 deselected`.

---

## Phase 1 — Protocol Hardening — DONE (backend)
- `request_id` threaded through all chat/tool/error/group frames (`strands_runner`, `handler`).
- Cancellable turn lifecycle: `main.serve_connection` runs each turn as a tracked task; reads `chat/cancel` while streaming; soft `cancel_event` stops forwarding + emits `chat/stream_end{cancelled}`.
- Typed errors: `error_event(message, code?, request_id?)`. One active turn per connection (`turn_in_progress`).
- Tests: `test_protocol_lifecycle.py` (incl. concurrent cancel-while-streaming via `FakeModel` gate).
- PENDING (frontend, batched for Phase 4 gate): mirror `request_id`/`cancelled`/`chat/cancelled`/`code` in `agent-protocol.ts`.

## Phase 2 — Durable State — DONE
- File-backed `SessionStore`, atomic writes, tool_use/tool_result round-trip, corrupt recovery, path-traversal, concurrent same-session saves. `test_persistence.py`.

## Phase 3 — EditGroup Domain — DONE
- `edit_groups.py` (models + content-anchored validate/apply/refresh/replace-lineage), `edit_group_store.py` (session/path scoped, file-backed), `edit_group_service.py` (buffer resolve + orchestration). `test_edit_groups.py` (16).

## Phase 4 — Review Protocol + UI — backend DONE / frontend TODO
- Routes split into `review_handlers.py`: `group/propose|apply|reject|delete|replace_edit|state`, `document/save` (atomic, path-checked, buffer-only). `session/switch` emits `group/state`. `Connection.edit_service`. `test_review_handlers.py` (9).
- TODO frontend: TS protocol mirror, `use-edit-groups` hook, pinned collapsible Review Queue, apply/reject/delete + save actions, TipTap anchor decorations.

## Phase 5 — Agent Tool Bridge — DONE (backend)
- `propose_edit_group` tool (validates via service, emits `group/propose` + tool trace). `READONLY_TOOLS` vs `WRITING_TOOLS`; subagents read-only. System prompt updated. `test_propose_edit_group_tool.py` (4).

## Phase 6 — Eval Harness — DONE
- `evals/runner.py` (`python -m evals.runner --suite smoke`), `evals/cases/*.json` (mechanical-terminology, introduction-clarity, duplicate-text-requires-anchor, stale-edit-after-change). Reports in `evals/reports/` (gitignored). `test_evals.py` (5). Smoke: 4/4 pass.

## Phase 7 — Memory — DONE (backend)
- `memory_store.py` (scoped principle/knowledge/example, enabled flag, learning hooks). Hooks in `review_handlers` (apply->positive, reject->negative, replace->preference; stale skipped). `memory/read`+`memory/update` routes. `MemoryStore` on `Connection`. `test_memory.py` (8) + eval `memory-learns-from-accepted-edit`.

## Phase 8 — Multi-Agent — DONE (backend)
- Specs added: editor (write-capable), arbiter, verifier; researcher/reference-list set `readonly`. `tools_for_spec` permission enforcement (editor gets `propose_edit_group`; others read-only). `subagent_manager.py` (enable/disable, subagents.yaml) + `create_subagent_tools` filtering + `runner.sync_subagents()` + `settings/update set_subagent_enabled` + scan `enabled`. `search_references` tool + `verification.classify_claim` taxonomy. `test_multiagent.py` (10) + eval `multiagent-check-then-edit`.

## Phase 9 — Settings — backend DONE / frontend TODO
- Backend: model CRUD, `set_active_model` (rebuilds runner), `set_tool_enabled`, `set_subagent_enabled`, key masking, `has_active_model_config` first-run detection, `settings/data` now includes `subagents`.

## Frontend block — DONE
- `agent-protocol.ts`: mirrored request_id/cancelled/`chat/cancelled`, EditGroup/Edit/EditAnchor, group/* + document/buffer + document/saved + memory/data, error code, subagents in settings. Type guard set updated.
- `use-agent-session.ts`: edit-group state + handlers (group/propose|update|state, document/buffer|saved), actions (applyGroup/rejectGroup/deleteGroup/saveDocument/requestGroupState), per-turn `request_id`, cancel carries request_id, groups reset on session create/clear.
- `review-panel.tsx` (new): pinned, collapsible, independently-scrollable Review Queue with suggestion-count badge; apply/reject/delete; stale label + disabled apply. Inserted in `chat-thread.tsx` above the message stream; composer stays fixed at bottom. Threaded via `chat-panel`.
- `document-panel.tsx`: Save button -> `document/save`; buffer updates on apply via `onDocumentBuffer`. `layout.tsx` wires save + group actions + saved/error toasts.
- Settings: `useSettings` + `settings-editor` subagent enable/disable toggle (model CRUD + tool toggle already existed); first-run via composer "No model" -> open Settings.

## Phase 10 — DONE
- `README.md` rewritten (apply-group model, run/test/demo, architecture, known limitations).
- `docs/browser-smoke.md` checklist. `agent/scripts/ws_smoke.py` self-contained real-WS end-to-end (session->propose->apply->save->disk), PASS. `references/example-evidence.md` for researcher.

## Continuation hardening
- **TipTap decorations**: `document-editor.tsx` now renders persistent inline decorations for proposed edits (amber `.edit-anchor`) and stale ones (muted strikethrough `.edit-anchor-stale`), recomputed on edit/content change via a ProseMirror plugin; `editHighlights` threaded layout -> DocumentPanel -> editor; click a Review card -> `scrollToText` selects + scrolls. CSS tokens added to `index.css` (semantic `--warning`/`--muted-foreground`).
- **Eval matrix rounded out**: added verifier/evidence cases (`claim-requiring-evidence-supported`, `-missing`, `claim-not-requiring-evidence`) via a deterministic `kind:"evidence"` runner branch over `verification.classify_claim`. Smoke suite now **9/9**; new `evidence` suite. `test_evals.py` extended.
- **Live path**: `scripts/live_smoke.py` (opt-in) exercises the real configured model. From this sandbox the provider endpoint is unreachable (`APIConnectionError`); the backend surfaces a recoverable typed error and the UI recovers via `onError` (no crash). Deterministic pipeline fully proven via tests + `ws_smoke.py`.

## FINAL ACCEPTANCE — GREEN
- `uv run pytest -q` -> `114 passed, 2 deselected`.
- `uv run python -m evals.runner --suite smoke` -> `9/9`.
- `uv run python scripts/ws_smoke.py` -> `WS SMOKE PASS`.
- `pnpm run build` -> GREEN.
- API keys masked; `models.yaml`/`tools.yaml`/`subagents.yaml`/`.writing-agent/` git-ignored.
- One product edit path (EditGroup); legacy auto-patch removed.
- Browser smoke: documented checklist (manual; deterministic loop proven via ws_smoke + tests).

---

## Blocked items
(none)

## Notes
- Live integration tests (`-m integration`) require a running WS server + live model; excluded from default gate by design.
- `FakeModel` streams end-to-end through the Strands event loop offline — basis for Phase 5 tool tests and Phase 6 evals.

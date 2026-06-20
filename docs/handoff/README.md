# Writing Agent Final Delivery Handoff

Last updated: 2026-06-09

This folder is the execution entrypoint for the next coding agent. It merges the preflight refactor plan with the full product implementation roadmap. The goal is to let an agent complete the backend-first, test-driven path to a final usable Writing Agent product without relying on human feedback for intermediate decisions.

## Reading Order

1. `00-preflight-refactor.md`
   Fix the small but high-leverage technical debt before adding product features.
2. `01-product-architecture.md`
   Understand the target architecture, product model, agent boundaries, and state ownership.
3. `02-implementation-roadmap.md`
   Execute the phases in order. Each phase includes implementation work and verification gates.
4. `03-testing-and-acceptance.md`
   Use this as the test matrix. Backend tests and evals come before frontend integration.
5. `04-agent-execution-protocol.md`
   Operational rules for the coding agent that will perform the work autonomously.

## Source Context

The plan is based on the current repository state and these local docs:

- `docs/principle.md`
- `docs/backend.md`
- `docs/frontend.md`
- `docs/protocol.md`
`handoff/` is the authoritative execution handoff for future coding agents.

Observed baseline on 2026-06-09:

- Backend tests pass: `35 passed`.
- Frontend dev UI is visible and usable in browser.
- Frontend production build currently fails with TypeScript errors.
- Settings already exists as a special document tab and should remain that way.
- Backend already has session state, buffer overlay, streaming chat, settings scan/update, plugin scan, and subagent loading.
- `models.yaml` currently stores API keys in plaintext; final product must document this and keep local secret/state files out of git.

Reviewer updates incorporated after plan review:

- Explicit document save/disk persistence path is required.
- Edit models must include replace lineage for memory learning.
- Eval harness moves before Memory.
- Researcher/verifier need a deterministic evidence base before broad RAG.
- Review UI must define frontend anchor mapping into TipTap.
- Preflight must stay narrow and avoid speculative handler/subagent refactors.
- The runner needs an injectable model seam for fake-model tests and evals.
- Chat turns need explicit request ids and cancellable task lifecycle before edit-producing tools.
- EditGroup scope, insertion anchoring, and partial-apply semantics must be pinned before implementation.

## North Star

Build a writing IDE where the agent can read project files, reason about drafts, propose structured edits, run specialist review workflows, remember accepted preferences, and expose settings for models/tools/subagents/plugins.

The product must not be a loose chat wrapper. The important product distinction is:

```text
LLM proposes.
Backend validates and owns typed state.
Frontend renders and lets users inspect or apply changes.
Tests and evals prove the workflow before UI integration.
```

## Non-Negotiable Rules

- Do not start with multi-agent orchestration. Start with typed edit state and evaluation.
- Do not let LLM output directly mutate documents.
- Do not consider an edit complete until the product has an explicit buffer-to-disk save path.
- Do not build evals or agent tool tests on live models; create a model-injection seam first.
- Do not claim cancellation support until the WebSocket loop can read control frames while a chat turn is streaming.
- Do not add new product features while `pnpm run build` is red unless the phase explicitly allows frontend to remain non-blocking.
- Do not use live LLM calls in normal unit tests. Use fake models, stub runners, and direct tool calls.
- Do not hide state in chat messages. Session, edit groups, memory, settings, and eval reports must be backend-owned data.
- Do not rewrite the tab system. Settings as a special document tab is the correct direction.
- Do not perform broad cleanup. Every changed line must support the handoff plan.

## Main Commands

Backend:

```powershell
cd Y:\agent\writing-agent\agent
uv run pytest -q
uv run python main.py
```

Frontend:

```powershell
cd Y:\agent\writing-agent\frontend
pnpm run build
pnpm run dev
```

Whole app:

```powershell
cd Y:\agent\writing-agent
npm run dev
```

## Final Deliverable

The final product is acceptable only when all of these are true:

- Backend unit/integration tests pass.
- Frontend build passes.
- Eval smoke suite passes.
- Browser smoke verifies the main workflow.
- Settings can read/update model/tool/subagent state without leaking API keys.
- Agent can propose structured edit groups and apply them through backend validation.
- Applied edits can be explicitly saved to disk using an atomic write path.
- Session state, edit groups, and memory survive backend restart.
- Multi-agent review is wired through clear role boundaries.
- Per-turn request ids connect chat streams, tool events, edit groups, errors, and cancellation.
- `models.yaml` and `.writing-agent/` are excluded from git or otherwise protected as local user state.
- README/docs explain how to run, test, and demo the product.

# Browser Smoke Checklist

Run at milestones, not after every backend change. Start the app with `npm run dev`
(Agent `:8765` + frontend `:5173`) and a configured model.

Deterministic backend behavior is covered by `uv run pytest -q`, the eval smoke
suite, and `scripts/ws_smoke.py`. This checklist verifies the browser integration.

## Scenario

1. Open the app at `http://localhost:5173`. Chat header shows **Connected**.
2. Open `examples/test-text.md` from the Files tree.
3. Confirm the composer shows a single static **Agent** label — there is **no** Ask / Agent / Edit mode selector.
4. Confirm the model selector shows a readable name (e.g. `OpenAI · gpt-4o`), never a bare number like `3`.
5. Open the **Settings** tab.
6. Verify **Models**, **Skills**, **Rules**, **Tools**, **Subagents**, **Memory** sections render with real data. There is **no** temperature control.
7. In **Models**: confirm each row shows the readable name, endpoint, masked key, an **Active** badge on the active model, and **Set active** / **Edit** / **Delete**. Add a model, set it active, edit it, delete it — the list reflects the backend each time and the key is never shown unmasked.
8. In **Subagents**: only `review` and `researcher` are listed. Toggle one off and on; the switch reflects the backend response.
9. Return to the document tab.
10. Confirm the **Review Queue** shows an empty pinned **No suggestions** state (not absent).
11. Send a chat request: **"Improve introduction clarity."**
12. Verify the tool trace appears (`read_file` / `check_consistency` / `propose_edit_group`).
13. Verify an **edit group** appears in the pinned **Review Queue** — not as an ordinary chat message, and not as a floating overlay. Proposed edits are highlighted in the document.
14. Click a Review card; verify the editor scrolls to and highlights the anchor.
15. **Apply** the edit group; verify the editor buffer changes and the tab shows unsaved (dirty).
16. Click **Save**; verify the underlying markdown file changes on disk and the tab clears dirty.
17. Modify the document so an outstanding edit's target text no longer matches.
18. Verify the affected group becomes **Stale** (apply disabled, clearly labeled, not silently removed).
19. Verify the Review Queue can **collapse**, shows a suggestion count badge, and stays pinned while the chat message stream scrolls independently. The composer remains fixed at the bottom.
20. Select text in the editor; click **Add to Chat**; verify a removable context chip appears in the composer and is included when you send.
21. Start a chat turn and press **Stop**; verify the turn shows a cancelled state and late output is not appended.
22. Apply an edit, then open **Settings → Memory**; verify a positive example is recorded. Toggle memory off; delete an entry.
23. Switch to another chat session and back. Verify chat history and edit-group state are recovered (`group/state` repopulates the queue).
24. Restart the backend (`uv run python main.py`); reload the app. Verify session, edit groups, and memory survived the restart.

## First-run / error states

- With no model configured, the composer shows **No model**; the "configure model" affordance opens Settings → Models. `settings/read` must not create `models.yaml` (no secret-bearing write on read).
- A provider/model error surfaces as a recoverable toast, not a silent failure.
- Saving a path outside the workspace, or with no open buffer, returns a typed error.
- A failed tool/subagent toggle leaves the displayed state unchanged (state is driven by the backend response, not optimistic).

## Pass criteria

- Review Queue is pinned, collapsible, independently scrollable, and never covers chat messages.
- Apply updates the buffer; Save writes disk; stale edits are labeled, not silently dropped.
- Settings reflect real backend state and changes take effect at runtime.
- State survives backend restart.

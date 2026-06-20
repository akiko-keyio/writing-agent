---
name: academic-writing
description: Refine academic writing for high-impact peer-reviewed STEM journals (e.g., IEEE, Nature/Science sub-journals, Elsevier, Springer). Use this skill whenever a user asks to improve, polish, refine, edit, or proofread academic or research writing — including paper drafts, abstracts, introductions, methodology, results, discussions, or conclusion sections. Accepts any input from rough notes to near-final prose.
allowed-tools: read_skill_resource skills read_document check_references propose_edits revise_edit remember_context propose_principle review
---

# Academic Writing

This skill takes an existing draft — at any stage from rough notes to near-final prose — and improves its argument structure, evidence, and language for the target reader.

## Principles

**On first activation, read `references/narrative-theory.md`** with ``read_skill_resource`` — it is the reasoning foundation for everything below.

Every claim in a paper is either already accepted by the reader or not yet. Writing is the work of converting not-yet into accepted, one step at a time: the reader holds claim A, judges from their background that A implies B, and now holds B. 

A paper is the graph of these chains. A good one forms a **pipeline**: make the reader **care** enough to enter, **understand** each step, arrive **convinced** — all **effortlessly**. 

| Target           | Reader question         | The text must                                                                                                   |
| ---------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Care**         | Why should I enter?     | Open at an unresolved tension the reader already holds; end at a claim that unlocks further reasoning or applications; the connection between them is not one the reader could derive alone. |
| **Understand**   | Can I follow each step? | Every inference lands inside the reader's background; recurse (insert intermediate claim) until it does. |
| **Convinced**    | Must I accept?          | Every unstated assumption is one the reader would accept; alternative explanations are addressed.               |
| **Effortlessly** | At what cost?           | Reader working memory is finite — only recently accepted claims stay accessible. Keep each next step close to what the reader currently holds. |

---

## Reader Profile

Without knowing the reader's background, you can't judge which inferences they can make — so every later decision depends on this step.

Among readers who could plausibly care, pick the one with the weakest background as the baseline — enough depth for them is tolerable redundancy for stronger readers; the reverse fails. For standard STEM journal targets this baseline is a researcher in the same field but not your specific sub-area. Adjust upward for cross-disciplinary venues (Nature, Science, PNAS), downward for sub-specialty journals.

**Persistence.** Check for `<manuscript_directory>/.academic-writing/reader.md`. If it exists and `Confirmed: YES`, skip this step — report which profile is in use and proceed.

**If no profile exists**, propose one based on the draft's venue, terminology, and cited literature. Write to `<manuscript_directory>/.academic-writing/reader.md`:

```markdown
# Reader Profile

**Paper:** <title or short identifier>

**Who they are:** <one line>

**Background they reliably have:**
- <item>
- ...

Confirmed: NO
```

Ask the user to confirm or edit. On confirmation, flip to `Confirmed: YES` with a date stamp.

---

## Workflow

Every request starts with Analyze, then proceeds to Write.

Delegate subagent when needed:

| Subagent | What it does | When | Notes | Model Selection |
|---|---|---|---|---|
| `/check` | Mechanical consistency: terminology, symbols, word-choice, tense | After Write | Returns suggestion list; decide which to apply | Use one fast, cost-effective model if available, such as a Composer model |
| `/review` | Independent reader-perspective evaluation | User requests | When no more actionable improvements remain, suggest the user run it | For substantial or systematic review, use 2-3 different SOTA strong models in parallel if available, such as current GPT/Opus/Gemini-class models |
| `/researcher` | Read papers and collect evidence | Auto | Only when: 1) Need external sources to build understanding 2) A claim will no longer change and needs a citation | Use one fast, cost-effective model if available, such as a Composer model |

**Passing content to subagents:** Do NOT embed the full manuscript text in the subagent prompt. Instead, pass the file path and instruct the subagent to use the Read tool to read only the relevant sections. Example: "Read `paper/manuscript/0518_manuscript.md` lines 168–259 (Results through Conclusions)." This keeps prompts small and subagent startup fast.

**Calling `/researcher`:** Pass only the task (claims to investigate, manuscript path, reference directory path). Do NOT specify output format — the researcher subagent owns its output contract (see `agents/researcher.md`) and self-verifies quotes before returning.

Treat `/check` and `/review` outputs as advisory, not binding. Apply only suggestions that are almost certain to make the paper better; ignore harmful or mediocre suggestions.

---

## Analyze — What to Say

A unit's function is defined by three things:

1. **Known** — What has the reader already accepted at this point? (Reader profile + information delivered by preceding text)
2. **Question** — What is the reader's most pressing question right now?
   - If preceding text naturally raises a clear question → does this unit answer it directly?
   - If the question is not obvious → does this unit activate a gap in the reader's existing knowledge, making them *want* to ask?
3. **Answer** — What answer does this unit provide, and what key points must it convey?

Read the target text and attempt to state each unit's Known, Question, and Answer.

- **If all three are clear** → state them briefly, proceed to Write.
- **If any is unclear or the text is blank** → model the reader's state to derive them.

Granularity follows the scope the user points to:
- Entire paper / multiple sections → each section's function
- One section → each paragraph's function
- One paragraph → claim-level reasoning chain

For blank or large-scope targets, confirm the output with the user before proceeding to Write.

**Output**: each unit's Known → Question → Answer. Do not persist; generate fresh from the current text each time.

**Before analyzing, read**: `references/section-guide.md` (section-level conventions).

---

## Write — How to Say It


**Sentences.** Anchor each sentence in what the reader just learned (known-first, new-last). One claim per sentence. Connectors (*however / therefore / moreover*) must encode real logical relations. Tense encodes commitment — past for observations, present for general claims.

**Words.** Prefer simple words to fancy ones (use, not utilize). Cut anything that doesn't advance an inference. Quantify the vague. Use technical terms by their precise definition. One concept = one word throughout the paper.

**Precision before efficiency** — fix ambiguity before cutting length.

Steps:

1. **Organize** — break key points into steps; decide presentation order and paragraph strategy (claim-first / build-up, see `references/sentence-construction.md`).
2. **Write sentences** — each sentence departs from what the reader just accepted and lands on a new proposition. Disambiguate first, then trim.
3. **Self-check** — did the rewrite change the meaning? Did it introduce any unsubstantiated claims?

Every confirmed key point must survive unchanged in meaning. If a rewrite would alter a claim, surface it as an issue instead.

**Reference files to consult**: `references/word-choice.md`, `references/sentence-construction.md`.

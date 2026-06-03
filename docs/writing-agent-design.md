# Writing Agent Design Principles

## Definition

A writing agent helps an author shape their document for its reader.

## Constraints

The writing agent operates under six constraints — three from the LLM, three from the human:

1. LLM output depends on input context.
2. LLM context and attention are limited.
3. LLM can be confidently wrong.
4. Human attention is scarce.
5. Human intent may be vague or still forming.
6. Blind spots cannot be self-detected.

## Procedure

Each step responds to one or more constraints:

1. Gather minimal necessary context: intent, reader, domain, style. [#1, #2]
2. Structure ideas when intent is unclear. [#5]
3. Verify factual claims against external sources. [#3]
4. Simulate the target reader's experience. [#6]
5. Present changes for thorough yet efficient user review. [#3, #4]
6. Learn reliably from user decisions. [#1]

gather → structure → verify → simulate → present → learn

---

## 5. Review

Goals:
1. User evaluates each edit in clean document context.
2. User decides edits thoroughly and efficiently.
3. Agent learns from resolved edits without ambiguity.

Design:
- Document remains clean text at all times. (1)
- Agent proposes edits grouped by issue in a separate interface. (2, 3)
- Default choice per edit is configurable: all old, all new, or subagent recommendation. (2)
- For each edit:
  - User chooses old or new. Choice syncs to document immediately. (1)
  - User can also request adjustment or explanation. (2)
  - Adjustment: agent proposes a replacement in the same group. (2, 3)
  - Explanation: agent responds in chat. (2)
- User resolves a group when satisfied. Resolved groups archive from the interface. (2)
- Resolution includes the final outcome of each edit. Agent learns from this. (3)

Notes:
- An edit closes when agent proposes a revised edit with the same old text (replaced), or when its old text is no longer locatable in the document (stale).
- Replaced edits count as chose old. Stale edits are not learned from.
- Replaced edits revert to old in the document. Stale edits do not modify the document (the user's edit is preserved).
- Both cannot be toggled.

## 6. Memory

Goals:
1. Agent produces better edits over time by learning from user decisions.
2. User has full visibility and control over what agent has learned.

Design:

Three categories:
- **Knowledge** — domain facts not stated in the document. Agent records from user explanations in chat.
- **Principle** — writing rules as pluggable markdown files. Pre-installed from reference files, or created when user explicitly states a new rule.
- **Example** — resolved edit instances, stored independently and linked by reference to corresponding principles.

Roles:
- Agent records knowledge and classifies examples under principles. Agent (currently) does not create, modify, or merge principles.
- Agent classifies resolved edits under principles and notifies user of what it learned.
- User can review, edit, or delete any memory entry at any time. Only user creates or modifies principles.

Storage:
- Knowledge and examples are markdown, exportable, document-scoped. Principles are global, pluggable markdown files — shared across documents.

## Future Directions

The current design prioritizes simplicity. The following directions are deferred until real usage reveals concrete limitations.

**1. Principle DAG.** Principles can be modeled as a directed acyclic graph: root nodes are the four core dimensions; each operational guideline is a derived node connected by an inference edge (parent principle + observable fact → derived guideline). Benefits: conflict resolution becomes traceable through root dimensions, retrieval becomes precise by walking the DAG from task-relevant roots.

**2. Activation model.** Instead of loading principles by task type (agent predicts relevance), principles are activated by evidence: an example from a resolved edit traces back to a principle, that principle becomes active for subsequent sessions. First session loads only core principles; operational guidelines activate as examples accumulate. Long-inactive principles decay back to standby. Benefits: context is data-driven rather than agent-predicted, avoids Constraint #3 in retrieval decisions.

**3. Formal engine + LLM complementary architecture.** LLM and formal reasoning have complementary strengths. LLM handles semantics: interpreting user intent, judging text quality, reasoning in ambiguous contexts. Formal engine handles logic: consistency checking, conflict detection, dependency tracing across a rule set. Neither does the other's job well (Constraint #3: LLM fails at precise logic; formal engines cannot handle semantic ambiguity). Combined, a feedback loop emerges: LLM proposes new rules from user decisions → formal engine checks consistency against existing rules → on conflict, engine pinpoints the exact collision → LLM interprets the conflict semantically and suggests resolution → user decides → engine updates. Each step stays within its component's capability boundary. The Principle DAG (direction 1) is a natural substrate for this engine (e.g., dependency resolution via PubGrub-style algorithms). Deferred until the rule set grows complex enough that human management becomes impractical — the engine's value scales with rule count and interdependency.
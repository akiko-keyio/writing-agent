# Writing Agent Design Principles

## Definition

A writing agent helps an author shape their document for its reader.

## Constraints

**Task**

1. Writer and reader bring different knowledge.
2. Writing conveys information in one direction.
3. Writing quality cannot be mechanically verified.

**Model**

4. The model knows only what it is shown.
5. Context and attention are limited.
6. Can be confidently wrong.

**Human**

7. Attention is scarce.
8. Intent is vague, still forming, and shifts as the document develops.

## Operations

An agent assists writing through five operations, performed as needed and in no fixed order. The constraints above are why this is hard; the design points below are how each operation works around them.

### Collect project context

The agent maintains four kinds of context:

- **Reader** — who they are, what they know, what they expect.
- **Intent** — what the author wants to say, and what they want it to achieve.
- **Domain** — the field's established knowledge: key facts, terminology, conventions.
- **Sources** — the references the author's claims rest on, retrieved and checked on demand.

Missing information is asked for, not guessed. Everything collected is visible and editable, and small enough to stay in context every turn. Intent shifts as the document develops, so context is updated continuously, not collected once.

When intent is still forming, the agent helps the author think through structure and organization in chat — outlines, alternatives, questions — rather than proposing edits to the document.

### Verify claims

The model can be confidently wrong [6], including about factual claims. For the subset of quality that CAN be mechanically checked [3] — citation accuracy, reference existence, source support — deterministic tools do the checking, not the model.

**Trigger:** A factual assertion appears in the document or a proposed edit.

**Mechanism:** A tool retrieves the source. A deterministic check confirms whether the source supports the claim. The author makes the final judgment.

**Citation pipeline:** The agent cites only documents it has retrieved and read (PDF → markdown → indexed storage). Every citation is verified against the source text by deterministic tools. Uncited claims are flagged. The author can trace any citation to its exact location in the source.

**Output:** Verified with citation and source location, or flagged as unverified.

### Simulate reader

Writer and reader bring different knowledge [1], and writing is one-directional [2] — the author cannot unknow what they know, and the reader is not there to signal confusion. The agent can do what the author cannot: read the text without the author's context.

**Trigger:** Author requests it, or before proposing changes to a section.

**Mechanism:** An isolated model call — no author intent, no chat history, no domain notes the reader would not have. The reader profile (from project context) tells the simulation who to play, not what the author meant. Without isolation, the simulation inherits the author's knowledge and sees nothing new.

Any separate model call earns its place through context difference. All output returns through the proposal path. The author sees one agent.

**Output:** Confusion points and comprehension gaps, fed into Propose.

### Propose changes

Most of writing quality comes down to human judgment, and the author's attention is scarce. So the agent proposes changes for review, and review has to be efficient.

**Trigger:** The agent has an improvement to suggest — from its own analysis, from Verify, or from Simulate.

**Mechanism:** An edit is an insertion, deletion, or replacement, anchored by a quote of the original text. The quote locates the edit for the backend and explains it to the author.

The agent does not change the document without the author's decision: it proposes, the author applies or dismisses. The author must answer for every word — the gate rests on this accountability. That same decision is the signal Learn reads, so the gate and the learning loop are one act.

**Grouping.** Edits group by issue. Groups that must be applied together are marked as such; the rest resolve independently.

**Validation.** The backend checks before anything reaches the review queue: anchors locate uniquely, edits within a group do not overlap, pending groups do not collide.

**Resolution.** Applied or dismissed — two terminal states. Before deciding, the author can ask the agent to explain an edit in chat. To adjust, the author requests a change; the agent proposes a new edit pointing back to the old one, and the old edit becomes dismissed-with-pointer.

**Apply.** Applying a group writes its remaining edits into the document, archives the group, and emits the resolution as a learning sample for Learn.

**Staleness.** An edit goes stale when its target can no longer be located. When in doubt, stale.

**Pending proposals as context.** The agent sees its own open proposals before proposing in the same region.

**Output:** A pending edit in the review queue, awaiting the author's decision.

### Learn from decisions

The model knows only what it is shown [4] — without explicit learning, every conversation starts from zero. But intent shifts [8], so learning must not freeze early decisions into permanent rules.

**Trigger:** The author applies, dismisses, or adjusts a proposal.

**Reading the pointer.** A resolved proposal ends applied or dismissed (see Propose). A dismissal either carries a pointer to its replacement or it does not. No pointer = a plain dismissal. A pointer = the author wanted a different approach, not a dismissal of the issue; the replacement edit is the corrective direction. Learning reads the pointer first, then weighs the signal below.

**Signal ambiguity.** A bare dismissal — no pointer — is four-way ambiguous: not now, not here, not this way, or never. The agent does not guess. After repeated dismissals on one pattern, it asks one question.

**Signal strength.** Line-by-line review weighs more than bulk apply. An adjustment encodes both what was wrong and what direction to take. When an edit goes stale because the author fixed the same area themselves, this is offered as a learning candidate: one-click confirm, never assumed.

**Chat statements** are this conversation's intent, not permanent rules. Permanent rules require explicit confirmation. [8]

**What the agent remembers** (all visible, editable, deletable):

- **Domain knowledge** — facts from the author's explanations. Document-scoped.
- **Writing rules** — files the author can read and modify. Each specifies when it applies: genre, section type, writing stage. Shared across documents.
- **Edit examples** — resolved edits linked to the rules they illustrate. Classification can be wrong [6]; the author is notified and can reassign.

Writing rule changes go through the proposal gate. Domain knowledge and edit examples are recorded without pre-approval — visible and reversible.

**Output:** Updated domain knowledge, writing rules, or edit examples.

## Quality

Evaluation layers by what can be checked. [3]

**Mechanically testable.** Anchor accuracy, apply integrity, citation verification. Zero silent corruption.

**Measurable from usage.** Apply / adjust / dismiss rates by edit type. Proposal noise — the share dismissed or ignored [7]. Post-apply reversion — the author undoes a change shortly after applying it.

**Judgment.** Sampled audits: do citations support their claims? Do reader-simulation confusion reports match edits the author later accepts? Does a writing rule's accept rate improve as examples accumulate?

## Deferred

Each item carries a trigger, not a date.

- **Rule conflict detection** — trigger: retrieved rules frequently contradict each other.
- **Retrieval ranking by evidence** — rank rules by linked-example recency. Loading order changes; existence does not.
- **Multi-document projects** — trigger: projects outgrow a document outline plus on-demand section loading.

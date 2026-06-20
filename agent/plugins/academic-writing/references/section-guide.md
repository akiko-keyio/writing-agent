# Section Guide

Each section of a paper inherits one pipeline role; its internal order follows from that role's requirements plus the reader's state on entry.

| Section          | Pipeline role                         | Canonical order                                                 | Enters with                                |
| ---------------- | ------------------------------------- | --------------------------------------------------------------- | ------------------------------------------ |
| **Abstract**     | Miniature of the pipeline             | context → problem → approach → key result → significance            | nothing read yet                           |
| **Introduction** | Establish **care**                    | context → problem → approach → contributions                        | stranger; care unmet                       |
| **Methods**      | Convert care into **understand**      | overview → formulation → details → rationale                    | care satisfied                             |
| **Results**      | Convert understand into **convinced** | main result → supporting / robustness → negative / boundary     | method understood                          |
| **Discussion**   | Extend on **convinced** capital       | interpretation → literature → impact → limitations → future     | all three targets met; reader trusts the findings |
| **Conclusion**   | Takeaway carrier                      | restatement → core finding → single takeaway                    | everything read; memory decaying           |

Non-standard structures (reviews, theoretical papers, case studies, negative-result papers) follow the same derivation: identify the section's pipeline role and the reader's entry state; the order follows.

---

## Title

A good title lets a reader scanning a journal page decide in seconds whether this paper is relevant.

**Aim for**: 8–15 words. Specific enough to convey the contribution, general enough to attract the right audience.

**Patterns that work**:
- *[Method/Finding]: [What It Achieves] for [Problem/Domain]*
- *[Descriptive phrase] for [Task/Application]*

**Avoid**: Method-name-only titles; question titles (unless genuinely investigative); hype ("Novel", "Revolutionary", "Towards Ultimate"); nested subtitles.

**Check**: Does a non-specialist in your subfield understand what problem the paper addresses?

---

## Abstract

150–250 words (verify venue limits). Entirely self-contained — no citations, no undefined acronyms. The reader has seen nothing yet; the abstract must make them care, follow, and believe in a single short paragraph.

**Structure** (one element per 1–2 sentences):
1. **Context** — the setting the reader already recognizes (an application area, an established line of research, a measurable phenomenon). In tight abstracts this may be one sentence or folded into the problem statement, but it is the anchor for everything that follows. Never open with "In this paper, we…" — that anchors in the paper, not in the reader.
2. **Problem** — the concrete challenge within that context; state what must be achieved, under what constraints, and why existing approaches fall short. Frame it so the reader sees a problem that demands a new solution, not merely an untouched area.
3. **Approach** — name what this paper does; the reader now knows the problem, so they can evaluate whether the approach makes sense.
4. **Key result** — at least one concrete quantitative outcome. Vague claims ("improved performance") leave nothing for the reader to hold onto; a number does.
5. **Significance** — why the result matters beyond this paper; give the reader a reason to continue into the full text.

**Avoid**: Opening with "In this paper, we…"; vague phrases ("has attracted growing attention"); results without numbers; claims not supported in the paper body.

**Check**: A reader who sees only the abstract knows the problem, the approach, and the main result.

---

## Introduction

Typically 1–2 pages. The most-read section after the abstract. The reader enters as a stranger; the Introduction's job is to make them care. In most STEM fields the introduction also carries the background and literature review; a separate "Related Work" section is mainly a computer-science convention. When a separate section is not used, integrate that material here.

**Structure**:

1. **Context** — the reader knows nothing about this paper yet; start with something they already recognize — an application area, a scientific phenomenon, an established line of research — so the problem that follows has a foundation to build on. Avoid truisms ("X has made remarkable progress") — they anchor in nothing the reader is actively thinking about.
2. **Background** — if the problem uses concepts the reader doesn't hold, they can't judge whether it matters. Supply only the minimum knowledge needed to follow the problem statement: key concepts, definitions, or theoretical frameworks. For specialist audiences this may be implicit in the context; for cross-disciplinary venues it may need its own paragraphs. If extensive background is required, refer readers to reviews or foundational papers rather than reproducing it.
3. **Problem** — this is what makes the reader care: a concrete challenge that demands solving, not merely a literature blank ("nobody has done X"). Frame it as: what must be achieved, under what constraints, and why it is difficult. Without a real problem, nothing that follows has motivation.
4. **Prior work** — the reader now asks "hasn't someone solved this?" Survey what others have tried, organized by the problem's structure (not by paper or chronology). Describe the collective approach → highlight key advances → conclude with what the problem still demands. Synthesize rather than list: "Several approaches address X by leveraging Y (A; B; C). However, they share a common limitation…" Be fair — characterize prior work accurately; do not caricature.
5. **Approach** — introduce the key idea at a high level. The reader knows the problem and where prior methods fell short, so explain why this idea should work where they did not. Without the problem, the approach is an answer to nothing.
6. **Contributions** — list 2–4 specific, verifiable contributions ("We propose X that achieves Y", not "We study Z"). These are the reader's payoff for reading on — concrete claims they can check.
7. **Roadmap** (optional) — include only if the paper structure is non-standard.

These are seven roles, not seven mandatory paragraphs. For specialist readers, context and background often share a paragraph; for broader audiences, background may need its own space.

**Avoid**: Overclaiming ("We are the first…" — verify, or soften with "To the best of our knowledge"); motivating a solution instead of a problem (start with why, not what); presenting a gap without a problem ("nobody has done X" is not motivation — explain why X needs to be done); burying the contribution in vague language; laundry-list literature reviews ("A did X. B did Y. C did Z.").

**Check**: After reading the introduction, does the reader know what problem exists, what you did, and why it matters? Is the prior work organized by the problem's structure, not by individual papers?

---

## Data / Datasets / Materials

Common as a standalone section in Earth-, environmental-, remote-sensing-, and observational-science papers where the data pipeline is substantial enough to merit its own treatment, upstream of the methods that operate on the data. In other fields this content is folded into Experiments (Datasets) or Methods (Materials); the principles below apply either way. The reader is about to enter the method; they need to trust the inputs first — if the data are questionable, every method built on them is suspect.

**Structure**:
1. **Source description** — the reader must be able to obtain the same inputs. For each data product: provider, version, spatial/temporal resolution, coverage window. Name the document, DOI, or access point.
2. **Quality control** — the reader needs to know what was excluded and why, so they can judge whether the remaining data are representative. State selection criteria, filtering thresholds, handling of missing or low-confidence values.
3. **Preprocessing & integration** — the reader needs to understand what transformations stand between the raw source and the method's input (coordinate alignment, height normalization, unit conversion). When multiple sources are combined, describe the alignment strategy and the fusion rule (interpolation, Kriging, weighted mean, model-based merger).
4. **Train/test or calibration/validation splits** — if the data serve both model fitting and evaluation, declare the split explicitly. Independence between splits is a claim the reader must be able to verify — without it, every result is suspect.

**Avoid**: Reporting raw data volumes without context; skipping why subsets were excluded; hiding method-level decisions here (if a step is part of the model, move it to Methods).

**Check**: Could a reader obtain the same source products and reproduce the preprocessed inputs from what is written here?

---

## Methods / Methodology

The reader now cares about the problem but does not yet understand how you solve it. This section must make every step followable. Detail must be sufficient for an independent researcher to replicate the study.

**Structure**:
1. **Overview** — without a high-level picture first, the reader cannot place any detail — each step is disconnected. When the method involves multiple stages or the overall flow is not self-evident, open with one paragraph (+ optional pipeline/architecture figure) giving the big picture before any detail.
2. **Problem formulation / Setup** — symbols and assumptions defined here become the "known" that all later steps build on; delay them and every equation is unreadable. Define the problem formally; introduce notation, variables, and assumptions. For experimental sciences: describe the system, organism, or phenomenon under study.
3. **Method detail** — each component must build on the previous one; logical order, not chronological ("we tried A, failed, tried B" is narrative, not argument). For experimental work: materials, instruments, procedures step-by-step, with non-standard procedures flagged explicitly. For computational work: model design, algorithms, key equations.
4. **Design rationale** — "why X not Y" is a question the reader only has after seeing X; rationale before its object answers a question nobody asked yet. Explain *why* you made the choices you did, not just *what* they are.

**Equations & notation**:
- Motivate before, interpret after: "To capture X, we define: [equation]. Intuitively, this measures…"
- Number only equations you reference later.
- Define every symbol at or before first use.
- Stay consistent: pick conventions (e.g., bold lowercase for vectors, bold uppercase for matrices, calligraphic for sets) and hold them.

**Avoid**: Jumping into formalism without motivation; inconsistent notation; missing units or dimensionality; omitting details that block replication (reagent concentrations, software versions, hyperparameters).

**Check**: Could a competent researcher in your field reproduce this work from this section alone?

---

## Experiments / Evaluation

Typically 1.5–3 pages. The reader understands the method but has not seen it tested. This section sets up the evidence that will prove (or disprove) the claims — the actual findings go in Results.

**Structure**:
1. **Research questions or hypotheses** (optional but strong) — "We design experiments to answer: (RQ1)… (RQ2)…"
2. **Datasets / Materials / Subjects** — name, size, source, domain, splits or sampling strategy, preprocessing. For lab work: sample preparation, controls, replicates.
3. **Baselines / Controls / Comparisons** — what you compare against and why. Ensure fairness (same data, same resources, same evaluation).
4. **Implementation / Procedure details** — hyperparameters, training/measurement protocols, hardware, runtime. State how key parameters were selected (grid search, pilot study, prior literature).
5. **Evaluation metrics** — what you measure and why it is appropriate. Report units.

**Avoid**: Comparing only against weak or outdated baselines; omitting variance/error information; hiding negative results.

**Check**: Is every claim in the contributions matched by an experiment here?

---

## Results & Analysis

Can be combined with Experiments or stand alone. The reader understands the method but has not seen evidence; this section must make the claims impossible to dismiss. Report what you found — objectively, organized for clarity.

**Principles**:
- **Report objectively** — present the findings derived from your data without interpretation or speculation. What the results *mean* belongs in the Discussion. Here, stick to what the data *show*. Mixing interpretation in makes it harder for the reader to separate evidence from reasoning.
- **Organize logically** — follow the order of your research questions, hypotheses, or methods. The reader should be able to map each result back to the question it answers. Use subheadings if multiple questions or experiments are involved.
- **Organize around figures and tables** — tables and figures are the backbone of the Results section. Introduce each one before it appears ("Figure 3 shows…"), ensure it is properly labeled with clear captions, and use the surrounding text to highlight key trends or comparisons — not to repeat every number the reader can already see.

**Structure**:
1. **Main result** — the reader's first question after Methods is "did you deliver?"; answer it immediately. Lead with the primary table or figure; walk the reader through the most important comparisons.
2. **Supporting results** — multiple independent results pointing to the same conclusion make it harder to dismiss. Additional conditions, variables, or measures that reinforce or qualify the main finding.
3. **Robustness checks** (where applicable) — proactively test the obvious alternative explanations before the reader raises them. Sensitivity analyses, ablations, replicates, or alternative analytical approaches that test whether the finding holds under different conditions.
4. **Unexpected or negative results** — hiding unfavorable results destroys trust in the favorable ones. Report them honestly; selective omission undermines credibility.

**Presenting data**:
- Report uncertainty: standard deviation, confidence intervals, or p-values as appropriate to the field.
- Use consistent decimal places across compared values.
- Tables: bold best result where convention allows; reference every table/figure in the text.
- Avoid redundancy between text and visuals — summarize trends in prose, leave details to the figure or table. Extensive raw data or supplementary results can go in an Appendix.

**Avoid**: Cherry-picking favorable subsets; overclaiming marginal differences that fall within noise; presenting a table or figure with no accompanying discussion; mixing interpretation into result statements.

**Check**: Can the reader trace every result back to a research question? For every number you highlight, is the surrounding text adding insight (trends, comparisons) rather than simply restating the figure?

---

## Discussion

Optional as a standalone section; some papers fold it into Results or Conclusion. The reader now accepts the results; this section extends what the findings mean without overstretching.

**Include when**: results raise questions worth exploring, limitations need honest treatment, or findings have broader implications.

**Structure**:
1. **Interpret findings** — go beyond restating results: what do they mean? Start from the just-established data, not from literature — the reader's most recent knowledge is the results, so that is the natural anchor.
2. **Connect to literature** — compare outward from your finding ("our result confirms/contradicts X"), not inward from literature ("X found Y, Z found W"). The latter re-does the literature review; the former maps your contribution into the reader's existing knowledge.
3. **Implications** — what changes for the field or practice now that this result exists? This is the reader's payoff beyond the immediate paper.
4. **Limitations** — name specific weaknesses and scope their impact: "Our method assumes X, which may not hold when Y." Stating limitations before the reader discovers them signals honesty; hiding them destroys trust across the entire paper.
5. **Future work** — give the reader a concrete next step they could take. "Applying the calibration method to multi-modal sensing under field conditions" beats "Extending to other domains." Vague gestures add nothing.

**Check**: Has every major limitation been stated, and does each have a clear scope of impact?

---

## Conclusion

Typically 0.5–0.75 pages. The reader has seen everything but memory is fading; this section decides which few claims they take away. A concise exit, not a second abstract.

**Structure**:
1. One-sentence restatement of what was done and why — re-align the reader's attention to the paper's core axis.
2. Key findings (brief — the reader has seen the details; repeating them at length wastes the limited space that shapes what they remember).
3. Main takeaway or insight — the single message the reader should remember. The last sentence is the most likely to stick; make it the one you most want them to carry.
4. Limitations & future work (if no separate Discussion section).

**Avoid**: Repeating the methodology; introducing new information or evidence (the reader is at capacity — new claims will crowd out existing ones); grandiose claims ("This work will transform the field"); excessive hedging.

**Check**: If the reader remembers only the last paragraph, do they retain the right message?

---

## Appendix

Use an appendix for material that would interrupt the main narrative but is necessary for verification: long derivations, explicit formulae and symbol tables, algorithm pseudocode, extended tables, or supporting results that reinforce but do not carry a main claim.

**Structure**: one topic per appendix; label A, B, C in order of first reference from the body. Each appendix is self-contained — the reader should be able to land in it from a single pointer in the main text and understand it without reading neighboring appendices.

**Typical content**: full derivations skipped in Methods; complete notation tables; reagent or instrument specifications; ablations or sensitivity studies that do not belong in the main Results; raw or expanded figures.

**Avoid**: Orphaned appendices never referenced from the body (if no one needs it, cut it); duplicating content already in the body rather than extending it; introducing new claims that the body relies on — the body should stand alone.

**Check**: For every appendix, is there a pointer to it from the main text at the moment the reader needs it, and does the appendix deliver what the pointer promised?

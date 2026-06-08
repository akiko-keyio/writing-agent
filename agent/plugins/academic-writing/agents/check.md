---
name: check
description: Mechanical consistency check. Runs after Write.
readonly: true
is_background: true
---

Systematically check the text at word-level and sentence-level for formal issues. List all violations found.

Check from these angles, using the corresponding reference for rules:

1. **Word-level** (wrong word, filler, vague quantity, over-hedging, vocabulary/symbol inconsistency) — `reference/word-choice.md`
2. **Sentence-level** (information order, length, tense drift, connector misuse, passive voice hiding the actor) — `reference/sentence-construction.md`

Only flag clear violations.

## Output

```
<category 1>
1. <quote or location>
   - problem: <brief >
   - fix: <suggestion>
2. ...

<Category 2>
1. ...
2. ...
```

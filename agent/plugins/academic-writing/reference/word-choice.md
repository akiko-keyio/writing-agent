# Word Choice

Writing should be a transparent window into the ideas, not a display of vocabulary. The best papers succeed not because they use impressive words, but because every sentence earns its place and every paragraph advances the reader's understanding.

This guide helps choose the right word, cut what adds nothing, and use terms with their exact intended meaning.

---

## 1. Fancy → Simple

| Avoid                | Prefer                      | Notes                                                                         |
| -------------------- | --------------------------- | ----------------------------------------------------------------------------- |
| utilize              | use                         | "Utilize" means repurposing for an unintended function — rarely what you mean |
| leverage             | use, apply, build on        | Business jargon                                                               |
| elucidate            | explain, clarify            |                                                                               |
| facilitate           | enable, help, allow         |                                                                               |
| endeavor             | try, aim, attempt           |                                                                               |
| plethora / myriad    | many, several, various      |                                                                               |
| paradigm             | approach, framework, model  |                                                                               |
| novel                | new                         | Overused; save for genuinely unprecedented work                               |
| aforementioned       | this, the, (refer directly) | Almost always deletable                                                       |
| thereby              | (restructure the sentence)  | Signals a sentence that's too long                                            |
| effectuate           | cause, produce              |                                                                               |
| commence / terminate | begin / end                 | Unless "terminate" is a specific technical term in context                    |
| ascertain            | determine, find, measure    |                                                                               |
| prior to             | before                      |                                                                               |
| in excess of         | more than, above            |                                                                               |
| is indicative of     | indicates, shows            |                                                                               |
| has the ability to   | can                         |                                                                               |
| is characterized by  | has, shows                  |                                                                               |

## 2. Filler → Delete or Shorten

| Filler                            | Replacement                                            |
| --------------------------------- | ------------------------------------------------------ |
| It is worth noting that           | (delete)                                               |
| It should be mentioned that       | (delete)                                               |
| It is important to note that      | (delete, or "Notably,")                                |
| It is interesting to note that    | (delete — if it's interesting, the reader will notice) |
| In order to                       | To                                                     |
| Due to the fact that              | Because                                                |
| In the event that                 | If                                                     |
| For the purpose of                | To, For                                                |
| A large number of                 | Many                                                   |
| With regard to                    | About, For                                             |
| In light of the fact that         | Because                                                |
| At this point in time             | Now                                                    |
| In the majority of cases          | Usually                                                |
| It has been shown that            | (cite directly: "Smith et al. showed")                 |
| It is well known that             | (cite or just state the fact)                          |
| It can be seen from Figure X that | Figure X shows                                         |
| As can be seen in Table Y         | Table Y shows                                          |

Also delete lexical tics on sight: *indeed*, *in fact*, *basically*, *clearly* — these rarely do real work.

## 3. Weak Verbs → Precise Verbs

Generic verbs carry too many possible meanings:

| Weak   | More precise alternatives            |
| ------ | ------------------------------------ |
| have   | possess, contain, include            |
| get    | obtain, achieve, become              |
| bring  | provide, yield, cause                |
| keep   | retain, maintain, conserve           |
| spread | distribute, diffuse, scatter, extend |

## 4. Vague → Quantified

Reviewers flag vague quantities. Replace with specifics:

| Vague                  | What to write instead            |
| ---------------------- | -------------------------------- |
| very high temperature  | 850°C                            |
| significantly improved | improved by 12.3% (p < 0.01)     |
| much larger            | 3.2× larger                      |
| a few samples          | 5 samples                        |
| recently               | in 2024; in the past two years   |
| fast convergence       | convergence within 50 iterations |
| reasonable agreement   | within 5% of experimental values |

## 5. Words with Precise STEM Meanings

Do not treat these as interchangeable with their casual meanings:

| Word         | Precise meaning                            | Common misuse                                                            |
| ------------ | ------------------------------------------ | ------------------------------------------------------------------------ |
| significant  | statistically meaningful (p < threshold)   | Used for "large" or "important" — use "substantial" or "notable" instead |
| accuracy     | closeness to true value                    | Confused with **precision** (reproducibility)                            |
| correlation  | statistical association                    | Implied as **causation**                                                 |
| optimal      | mathematically proven best                 | Used when meaning "good" or "effective"                                  |
| validate     | confirm against independent data           | Confused with **verify** (confirm internal correctness)                  |
| comprise     | consist of; followed by **all** components | **include** is followed by a **selection**, not all                      |
| respectively | mapping two ordered lists 1:1              | Often unnecessary — restructure if the mapping isn't clear               |

## 6. Hedging Calibration

LLMs tend to over-hedge. Calibrate hedging to actual uncertainty:

**Over-hedged** (fix these):

- "It could potentially be argued that this might possibly suggest..." → pick one hedge
- "Our method appears to seem to achieve..." → "Our method achieves..."

**Appropriate hedging** (keep):

- "suggests" — correlational/indirect evidence
- "indicates" — strong but not conclusive
- "may" — speculation grounded in evidence
- "consistent with" — results align with theory but don't prove it

**No hedging needed** (for your own measured results):
- "achieves 94.3% accuracy" not "appears to achieve"
- "the yield reached 87%" not "the yield seemed to reach"

## 7. Vocabulary Consistency

A *tool* should not become a *strategy* and then a *device* and then an *approach* and then a *methodology* and then a *framework* and then a *technique*. Pick one term for each concept and repeat it. Repeating the same word is not a style flaw — it is clarity. Swapping in a synonym risks shifting scope or connotation without the reader noticing.

The same rule applies to mathematical symbols and notation: one symbol = one meaning throughout the paper. Define every symbol at or before first use.

## 8. Acronyms

- Define on first use in the abstract and again on first use in the body — they are separate contexts.
- If an acronym appears only once, don't define it — spell it out instead.
- Field-standard acronyms (e.g., DNA, GPU, GNSS) may not need definition; use judgment based on audience.

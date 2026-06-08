# Sentence Construction

The reader encounters text one sentence at a time. Good structure respects this: it delivers known information before new, carries one claim per sentence, connects each statement to what came before, and gives every paragraph a single clear purpose. When structure fails, the reader re-reads — or worse, misreads.

This guide covers: claim structure, information ordering, logical connections, voice and tense, paragraph architecture, and narrative framing of data.

---

## 1. Sentence Length and Density

Average sentence length in most journals is 20–26 words. This is not a rigid rule but a useful diagnostic: if your sentence is much longer, check whether the reader has to re-read it.

**Long sentences fail** when the relationship between components becomes hard to track. Warning signs: more than one *and*, more than one *which*, too many prepositions, too many nouns packed together. If a sentence has any of these, split it.

**Consecutive long sentences are worse than individual ones.** Vary the length — a short sentence after two medium ones gives the reader breathing room and can carry emphasis.

## 2. Information Ordering Within a Sentence

Place known information first, new information later. The known part anchors the reader; the new part is what the sentence contributes. This also creates natural sentence-to-sentence linkage: the new information at the end of sentence N becomes the known information at the start of sentence N+1.

**Bad:** "A 12.3% improvement in thermal conductivity was observed when graphene nanoplatelets were added at 0.5 wt%."
**Better:** "Adding graphene nanoplatelets at 0.5 wt% improved thermal conductivity by 12.3%."

The second version leads with the action (which the reader already expects from the methods), and ends with the result (which is new).

## 3. Sentence Start-Up

How a sentence begins sets the reader's frame for processing everything that follows.

**Connect to the previous sentence** by opening with an overlapping repeat, a pro-form (*This result*, *These findings*), or a signalling connector (*However*, *In contrast*). Don't leave the reader to guess the relationship.

**Add a noun after *this/these/that/those*** — "This suggests..." is vague; "This temperature dependence suggests..." is clear. The reader shouldn't have to look back to figure out what *this* refers to.

**Avoid opening with -ing forms or prepositions** (especially *for* and *with*) — they delay the subject and make the sentence harder to parse.

## 4. One Claim Per Sentence

Each sentence should advance a single claim. A sentence that simultaneously pushes a main claim, inserts a definition, and offers an example forces the reader to process three threads at once — and, worse, to guess which is the main line. When the next sentence continues the main claim, the reader must backtrack to re-locate it.

Definitions and examples have their own value, but as separate sentences — placed before or after the main claim, not folded into it.

**Bad:** "We evaluate the model on ImageNet, a dataset of 1.2M labeled images across 1000 classes, achieving 85% top-1 accuracy."

**Better:** "We evaluate the model on ImageNet, a dataset of 1.2M labeled images across 1000 classes. The model achieves 85% top-1 accuracy."

The first version packs the definition of ImageNet and the result into the same sentence. The second separates them: one sets up the evaluation, the next states the result. Each carries one claim.

## 5. Signalling Connectors

Words like *moreover*, *therefore*, *however* are not glue — they are directional signals. Each one tells the reader what relationship the next sentence has to the previous one. The wrong connector sends the reader in the wrong direction.

| Connector | Meaning — check before using |
|---|---|
| therefore | Direct consequence. Is what follows truly caused by what came before? |
| however | Contrast. Is there a real opposition to the previous sentence? |
| moreover | Addition of a *supporting* point. Does this strengthen the same argument? |
| for example | Illustration. Does what follows genuinely exemplify the general claim? |
| in other words | Restatement. Are you truly saying the same thing differently, or introducing something new? |

**Notice:** Using *moreover* or *furthermore* as generic paragraph glue when there is no additive logical relationship. If the connection is simply "here is the next point," no connector is needed — just start the sentence.

## 6. Passive Voice and Ownership

**Agentless passives** (*was performed*, *was analysed* — without saying by whom) hide the actor. This is fine for well-known standard procedures ("Samples were centrifuged at 3000 rpm"), but costs clarity when describing your own contribution. If the reader can't tell whether the work is yours, a predecessor's, or the field's consensus, the sentence has failed.

**Rule of thumb:** Use active voice (*we measured*, *our model predicts*) when the identity of the actor matters — especially for novel contributions. Use passive voice when the actor is irrelevant and the focus should be on what was done or observed.

**Watch for passives buried at the end of long sentences.** The reader has to wait too long to find out what happened:

**Bad:** "Images and patient data from seventeen patients who were suspected of having PH and who had also undergone cardiac MRI and right-sided heart catheterization between 2002 and 2008 were retrospectively reviewed."
**Better:** "We retrospectively reviewed images and patient data from seventeen patients suspected of having PH who had undergone cardiac MRI and right-sided heart catheterization between 2002 and 2008."

## 7. Disambiguating *We*

Impersonal *we/us/our* can mean "we the authors," "we the research community," or "we, everyone." If you use *we* for both yourself and the broader field within the same paper, confusion is inevitable.

For field-wide capabilities, prefer impersonal constructions: "It is now possible to design proteins with new functions" rather than "We can now design proteins with new functions" — unless *you* are the ones who made it possible.

## 8. Verb Tense

Tense is not decoration — it communicates how you want the reader to treat the information.

| Tense | Signal to reader | Use for |
|---|---|---|
| Past simple (*we found*, *X occurred*) | Reporting what happened | Your specific results, specific past studies |
| Present simple (*X occurs*, *the model predicts*) | Stating facts or established truths | General claims, things you believe to be true beyond your study |

"We found that X occurred" is a report of your findings. "We found that X occurs" is a claim that your findings are generalizable facts. The present tense is bolder — use it when the evidence warrants it.

**Be consistent within a section.** If you switch tense, make sure there is a reason and the reader can follow it.

## 9. Paragraph Structure

Plan the function of each paragraph before writing it. Each paragraph should have a single function — describe one result, introduce one concept, make one argument.

**Ideal paragraph length** in research journals is 150–170 words. Whole-page paragraphs overwhelm the reader; clusters of single-sentence paragraphs fragment the argument.

**Start with a narrative entry statement** that tells the reader what the paragraph is doing. Two opening strategies cover most cases — pick the one that matches what the paragraph delivers:

- **Claim-first** — open with the conclusion, then quantify. Use when the paragraph states a self-contained property (*X has property Y*) and the reader holds every prerequisite for the claim. The opening sentence carries the conclusion; the rest is evidence.
- **Build-up** — establish each element, then state the conclusion. Use when the paragraph delivers a comparative or relative judgment (*X outperforms A and B*); each comparand needs its own setup before the conclusion can be read meaningfully. Claim-first here would be empty — *outperforms* carries no information until the comparands are on the table.

Operational test: read your candidate first sentence to a reader who has not seen the paragraph. Can they accept it as a standalone claim, or will they ask *compared to what?* / *under what conditions?* / *why?* If they will ask, the paragraph needs build-up.

| Paragraph type | Recommended opening |
|---|---|
| Property statement (*X has property Y*) | Claim-first |
| Comparative judgment (*X beats A and B*) | Build-up |
| Result reveal (*we achieve N*) | Claim-first or number-first |
| Long mechanism / diagnosis | Build-up (each step is a sub-claim) |

**Section-level framing complements paragraph-level structure.** A build-up paragraph reads cleanly when the section's opening paragraph has already named the comparison the reader is about to see; the conclusion then unfolds within build-up rather than landing as a surprise. If the section has no separate framing paragraph, the first sentence of the data paragraph must do double duty as both section frame and topic sentence — and that is only possible when the paragraph is claim-first.

**Every sentence must serve the paragraph's function.** If a sentence doesn't fit, move it or delete it — don't let it float.

## 10. Wrapping Data in Narrative

Data alone means nothing to the reader. Don't just state numbers — comment on what they mean for the argument:

**Naked:** "The conversion rate was 43%."
**Framed:** "The conversion rate reached 43%, exceeding the theoretical minimum of 38%."

The framing tells the reader whether 43% is good news or bad news. Without it, the reader has to build the interpretation themselves — and may build the wrong one.

This also applies to figures and tables. "Figure 3 shows the temperature profile" tells the reader nothing about *why* they should look at Figure 3. "Figure 3 shows that the temperature profile deviates from the predicted curve above 600°C" gives the reader a reason to look and a frame for what to see.

## 11. Relevance — The "So What?" Test

After writing each sentence, consider whether the reader knows *why* you wrote it. If a potential "so what?" lingers at the end, resolve it — add a phrase like *suggesting that...*, *which means that...*, or *consistent with...*. Don't leave the reader to guess the relevance.

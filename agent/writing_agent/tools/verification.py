"""Deterministic claim classification for the verifier role.

This is a reference implementation of the verifier's taxonomy used for
deterministic tests and evals. The production verifier is an LLM that follows the
same four-way contract; this utility lets us prove the taxonomy without a live
model. It is intentionally conservative: ambiguous cases prefer
``missing_evidence`` over ``supported``.
"""

from __future__ import annotations

import re

SUPPORTED = "supported"
CONTRADICTED = "contradicted"
MISSING_EVIDENCE = "missing_evidence"
NOT_REQUIRING_EVIDENCE = "not_requiring_evidence"

CLAIM_STATUSES = (SUPPORTED, CONTRADICTED, MISSING_EVIDENCE, NOT_REQUIRING_EVIDENCE)

# Words that make a sentence a checkable factual/empirical claim.
_FACTUAL_KEYWORDS = {
    "increase", "increases", "increased", "decrease", "decreases", "decreased",
    "reduce", "reduces", "reduced", "improve", "improves", "improved",
    "cause", "causes", "caused", "outperform", "outperforms", "outperformed",
    "significant", "significantly", "percent", "faster", "slower", "higher",
    "lower", "doubles", "halves", "correlat", "proven", "demonstrates",
}

_NEGATION_TOKENS = {
    "not", "no", "never", "cannot", "fails", "failed", "contradict",
    "contradicts", "contrary", "disproven", "refute", "refutes",
}

_WORD_RE = re.compile(r"[A-Za-z][A-Za-z\-]{3,}")


def requires_evidence(claim: str) -> bool:
    """Whether a statement is a factual claim that should be backed by evidence."""
    text = claim.lower()
    if re.search(r"\d", text) or "%" in text:
        return True
    return any(kw in text for kw in _FACTUAL_KEYWORDS)


def _keywords(text: str) -> set[str]:
    stop = {"this", "that", "with", "from", "have", "which", "their", "these", "those", "than"}
    return {w.lower() for w in _WORD_RE.findall(text) if w.lower() not in stop}


def classify_claim(claim: str, evidence_texts: list[str]) -> str:
    """Classify a claim against retrieved evidence into the four-way taxonomy."""
    if not requires_evidence(claim):
        return NOT_REQUIRING_EVIDENCE

    joined = " ".join(evidence_texts).lower()
    if not joined.strip():
        return MISSING_EVIDENCE

    keywords = _keywords(claim)
    overlap = {k for k in keywords if k in joined}
    if not overlap:
        return MISSING_EVIDENCE

    if any(neg in joined.split() for neg in _NEGATION_TOKENS):
        return CONTRADICTED

    return SUPPORTED

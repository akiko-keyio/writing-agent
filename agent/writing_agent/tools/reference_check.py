"""Lightweight reference quality checks for markdown documents.

DOI resolution uses CrossRef metadata + doi.org reachability.
URL checks use HTTP HEAD with GET fallback.
Local consistency checks ``references/`` for matching entries.
Claim overlap uses ``verification.classify_claim`` conservatively.

Network access is injectable for deterministic tests.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Protocol
from urllib.parse import urlparse

from writing_agent.tools.verification import MISSING_EVIDENCE, classify_claim

DOI_PATTERN = re.compile(
    r"\b(?:doi:\s*|https?://(?:dx\.)?doi\.org/)?(10\.\d{4,9}/[^\s\])>\"']+)",
    re.IGNORECASE,
)
URL_PATTERN = re.compile(r"https?://[^\s\])>\"']+")
CLAIM_PATTERN = re.compile(r"[^.!?\n]{20,200}[.!?]")


class HttpFetcher(Protocol):
    def __call__(
        self,
        method: str,
        url: str,
        *,
        headers: dict[str, str] | None = None,
        timeout: float = 15.0,
    ) -> tuple[int, str]: ...


@dataclass
class ReferenceFinding:
    kind: str
    message: str
    detail: str = ""

    def to_dict(self) -> dict[str, str]:
        return {"kind": self.kind, "message": self.message, "detail": self.detail}


@dataclass
class ReferenceReport:
    path: str
    findings: list[ReferenceFinding] = field(default_factory=list)

    @property
    def ok(self) -> bool:
        return not self.findings

    def to_dict(self) -> dict[str, Any]:
        return {
            "path": self.path,
            "ok": self.ok,
            "finding_count": len(self.findings),
            "findings": [f.to_dict() for f in self.findings],
        }


def _normalize_doi(raw: str) -> str:
    doi = raw.strip().rstrip(".,;")
    if doi.lower().startswith("doi:"):
        doi = doi[4:].strip()
    if "doi.org/" in doi.lower():
        doi = doi.split("doi.org/", 1)[-1]
    return doi


def extract_dois(text: str) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for match in DOI_PATTERN.finditer(text):
        doi = _normalize_doi(match.group(1))
        if doi and doi not in seen:
            seen.add(doi)
            out.append(doi)
    return out


def extract_urls(text: str) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for match in URL_PATTERN.finditer(text):
        url = match.group(0).rstrip(".,;)")
        if "doi.org/" in url.lower():
            continue
        if url not in seen:
            seen.add(url)
            out.append(url)
    return out


def _local_refs_index(refs_dir: Path) -> str:
    if not refs_dir.is_dir():
        return ""
    parts: list[str] = []
    for path in sorted(refs_dir.rglob("*")):
        if path.is_file() and path.suffix.lower() in {".md", ".bib", ".txt"}:
            try:
                parts.append(path.read_text(encoding="utf-8"))
            except OSError:
                continue
    return "\n".join(parts)


def check_doi(
    doi: str,
    fetcher: HttpFetcher,
    *,
    mailto: str = "writing-agent@example.com",
) -> ReferenceFinding | None:
    headers = {
        "User-Agent": f"WritingAgent/1.0 (mailto:{mailto})",
        "Accept": "application/json",
    }
    meta_url = f"https://api.crossref.org/works/{doi}"
    try:
        status, body = fetcher("GET", meta_url, headers=headers)
    except Exception as exc:  # noqa: BLE001
        return ReferenceFinding("doi_error", f"CrossRef lookup failed for {doi}", str(exc))
    if status != 200:
        return ReferenceFinding(
            "doi_unreachable",
            f"DOI not found in CrossRef: {doi}",
            f"HTTP {status}",
        )
    resolve_url = f"https://doi.org/{doi}"
    try:
        r_status, _ = fetcher("HEAD", resolve_url, headers=headers, timeout=10.0)
        if r_status >= 400:
            r_status, _ = fetcher("GET", resolve_url, headers=headers, timeout=10.0)
        if r_status >= 400:
            return ReferenceFinding(
                "doi_resolve_failed",
                f"doi.org could not resolve {doi}",
                f"HTTP {r_status}",
            )
    except Exception as exc:  # noqa: BLE001
        return ReferenceFinding("doi_resolve_failed", f"doi.org resolve failed for {doi}", str(exc))

    if '"title"' not in body:
        return ReferenceFinding(
            "doi_metadata_thin",
            f"CrossRef returned sparse metadata for {doi}",
            "",
        )
    return None


def check_url(url: str, fetcher: HttpFetcher) -> ReferenceFinding | None:
    try:
        status, _ = fetcher("HEAD", url, timeout=10.0)
        if status >= 400 or status == 0:
            status, _ = fetcher("GET", url, timeout=15.0)
        if status >= 400:
            return ReferenceFinding(
                "url_unreachable",
                f"URL not reachable: {url}",
                f"HTTP {status}",
            )
    except Exception as exc:  # noqa: BLE001
        return ReferenceFinding("url_error", f"URL check failed: {url}", str(exc))
    host = urlparse(url).netloc
    if not host:
        return ReferenceFinding("url_invalid", f"Invalid URL: {url}", "")
    return None


def check_local_reference(doi_or_url: str, local_corpus: str) -> ReferenceFinding | None:
    needle = doi_or_url.lower()
    if needle in local_corpus.lower():
        return None
    return ReferenceFinding(
        "local_missing",
        f"No matching entry in references/ for: {doi_or_url}",
        "",
    )


def check_claims(text: str, evidence: str, *, max_claims: int = 5) -> list[ReferenceFinding]:
    findings: list[ReferenceFinding] = []
    for match in list(CLAIM_PATTERN.finditer(text))[:max_claims]:
        claim = match.group(0).strip()
        status = classify_claim(claim, [evidence] if evidence else [])
        if status == MISSING_EVIDENCE:
            findings.append(
                ReferenceFinding(
                    "claim_missing_evidence",
                    "Claim may lack local evidence",
                    claim[:160],
                ),
            )
    return findings


def check_text(
    text: str,
    *,
    project_root: Path,
    path_label: str = "",
    fetcher: HttpFetcher | None = None,
    online: bool = True,
    mailto: str = "writing-agent@example.com",
) -> ReferenceReport:
    """Run reference quality checks on markdown text."""
    refs_dir = project_root / "references"
    local_corpus = _local_refs_index(refs_dir)
    findings: list[ReferenceFinding] = []

    dois = extract_dois(text)
    urls = extract_urls(text)

    for doi in dois:
        miss = check_local_reference(doi, local_corpus)
        if miss:
            findings.append(miss)
        if online and fetcher is not None:
            err = check_doi(doi, fetcher, mailto=mailto)
            if err:
                findings.append(err)

    for url in urls:
        miss = check_local_reference(url, local_corpus)
        if miss:
            findings.append(miss)
        if online and fetcher is not None:
            err = check_url(url, fetcher)
            if err:
                findings.append(err)

    findings.extend(check_claims(text, local_corpus))

    return ReferenceReport(path=path_label or str(project_root), findings=findings)


def check_document(
    doc_path: Path,
    *,
    project_root: Path | None = None,
    fetcher: HttpFetcher | None = None,
    online: bool = True,
    mailto: str = "writing-agent@example.com",
) -> ReferenceReport:
    """Run reference quality checks on a markdown file."""
    text = doc_path.read_text(encoding="utf-8")
    root = project_root or doc_path.parent
    return check_text(
        text,
        project_root=root,
        path_label=str(doc_path),
        fetcher=fetcher,
        online=online,
        mailto=mailto,
    )


def urllib_fetcher() -> HttpFetcher:
    """Default fetcher using urllib (no extra dependencies)."""
    import urllib.error
    import urllib.request

    def _fetch(
        method: str,
        url: str,
        *,
        headers: dict[str, str] | None = None,
        timeout: float = 15.0,
    ) -> tuple[int, str]:
        req = urllib.request.Request(url, method=method.upper(), headers=headers or {})
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                body = resp.read(8192).decode("utf-8", errors="replace")
                return int(resp.status), body
        except urllib.error.HTTPError as exc:
            body = exc.read(8192).decode("utf-8", errors="replace") if exc.fp else ""
            return int(exc.code), body

    return _fetch

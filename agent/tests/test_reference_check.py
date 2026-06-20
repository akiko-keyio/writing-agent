"""Tests for reference_check.py (network mocked)."""

from __future__ import annotations

from pathlib import Path

from reference_check import (
    check_document,
    check_doi,
    check_local_reference,
    extract_dois,
    extract_urls,
)


def test_extract_dois_and_urls() -> None:
    text = "See doi:10.1038/nature12373 and https://example.com/paper"
    assert "10.1038/nature12373" in extract_dois(text)
    assert "https://example.com/paper" in extract_urls(text)


def test_local_reference_missing() -> None:
    finding = check_local_reference("10.9999/missing", "")
    assert finding is not None
    assert finding.kind == "local_missing"


def test_local_reference_present() -> None:
    assert check_local_reference("10.1038/nature12373", "10.1038/nature12373") is None


def test_check_doi_mock_success() -> None:
    def fetcher(method: str, url: str, *, headers=None, timeout=15.0):
        if "crossref.org" in url:
            return 200, '{"message":{"title":["Sample"]}}'
        return 200, ""

    assert check_doi("10.1038/nature12373", fetcher) is None


def test_check_doi_mock_crossref_fail() -> None:
    def fetcher(method: str, url: str, *, headers=None, timeout=15.0):
        return 404, ""

    err = check_doi("10.9999/bad", fetcher)
    assert err is not None
    assert err.kind == "doi_unreachable"


def test_offline_document_check(tmp_path: Path) -> None:
    refs = tmp_path / "references"
    refs.mkdir()
    (refs / "ref.md").write_text("10.1038/nature12373", encoding="utf-8")
    doc = tmp_path / "doc.md"
    doc.write_text("Cited DOI 10.1038/nature12373 in text.", encoding="utf-8")
    report = check_document(doc, project_root=tmp_path, fetcher=None, online=False)
    assert report.ok

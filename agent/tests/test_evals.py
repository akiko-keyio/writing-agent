"""Phase 6: eval harness smoke + regression detection."""

from __future__ import annotations

from pathlib import Path

import pytest

from evals.runner import load_cases, main, run_case, run_suite, write_report


@pytest.fixture(autouse=True)
def _models(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("writing_agent.runtime.model_manager._MODELS_FILE", tmp_path / "models.yaml")


def test_smoke_suite_passes() -> None:
    report = run_suite("smoke")
    assert report.results, "smoke suite must have cases"
    assert report.passed, [r.to_dict() for r in report.results if not r.passed]


def test_smoke_includes_core_cases() -> None:
    ids = {c["id"] for c in load_cases("smoke")}
    assert {"mechanical-terminology", "introduction-clarity"} <= ids
    assert "duplicate-text-requires-anchor" in ids
    assert "stale-edit-after-change" in ids
    assert "check-then-edit" in ids
    assert "memory-learns-from-accepted-edit" in ids


def test_evidence_suite_passes() -> None:
    report = run_suite("evidence")
    assert report.results
    assert report.passed, [r.to_dict() for r in report.results if not r.passed]
    ids = {r.id for r in report.results}
    assert {
        "claim-requiring-evidence-supported",
        "claim-requiring-evidence-missing",
        "claim-not-requiring-evidence",
    } <= ids


def test_regression_case_fails_and_exits_nonzero() -> None:
    # A case whose expectation contradicts reality must fail.
    bad_case = {
        "id": "regression-demo",
        "document_path": "doc.md",
        "document": "We utilize the API.\n",
        "instruction": "tighten",
        "model_script": [
            {
                "tools": [
                    {
                        "name": "propose_edits",
                        "input": {
                            "path": "doc.md",
                            "edits": [
                                {"kind": "replace", "old_text": "utilize", "new_text": "use"}
                            ],
                        },
                    }
                ]
            },
            {"text": "done"},
        ],
        # Reality: a group IS created -> this expectation fails on purpose.
        "expect": {"must_not_create_group": True},
    }
    result = run_case(bad_case)
    assert result.passed is False


def test_main_exit_codes(monkeypatch: pytest.MonkeyPatch) -> None:
    assert main(["--suite", "smoke", "--no-report"]) == 0
    assert main(["--suite", "does-not-exist", "--no-report"]) == 1


def test_report_file_is_generated() -> None:
    report = run_suite("smoke")
    out = write_report(report)
    assert out.exists()
    assert out.read_text(encoding="utf-8").strip().startswith("{")

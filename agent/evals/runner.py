"""Deterministic eval runner.

Each case scripts a fake model trajectory and asserts agent *behavior* (tool
calls, structured edit-group creation, valid anchors, no direct document
mutation, stale handling) rather than exact prose. This lets the system prove
the edit pipeline works without a live model or the frontend.

Usage::

    uv run python -m evals.runner --suite smoke
    uv run python -m evals.runner --case mechanical-terminology
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
import tempfile
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

_EVALS_DIR = Path(__file__).resolve().parent
_CASES_DIR = _EVALS_DIR / "cases"
_REPORTS_DIR = _EVALS_DIR / "reports"


# --------------------------------------------------------------------------
# Case loading
# --------------------------------------------------------------------------


def load_cases(suite: str | None = None, case_id: str | None = None) -> list[dict[str, Any]]:
    cases: list[dict[str, Any]] = []
    for path in sorted(_CASES_DIR.glob("*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        if case_id and data.get("id") != case_id:
            continue
        if suite and suite not in data.get("suites", []):
            continue
        cases.append(data)
    return cases


# --------------------------------------------------------------------------
# Result types
# --------------------------------------------------------------------------


@dataclass
class Check:
    name: str
    ok: bool
    detail: str = ""


@dataclass
class CaseResult:
    id: str
    passed: bool
    checks: list[Check] = field(default_factory=list)
    latency_ms: float = 0.0
    error: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "passed": self.passed,
            "latency_ms": round(self.latency_ms, 2),
            "error": self.error,
            "checks": [
                {"name": c.name, "ok": c.ok, "detail": c.detail} for c in self.checks
            ],
        }


@dataclass
class SuiteReport:
    suite: str
    results: list[CaseResult] = field(default_factory=list)

    @property
    def passed(self) -> bool:
        return all(r.passed for r in self.results) and bool(self.results)

    def to_dict(self) -> dict[str, Any]:
        return {
            "suite": self.suite,
            "generated_at": time.time(),
            "total": len(self.results),
            "passed": sum(1 for r in self.results if r.passed),
            "failed": sum(1 for r in self.results if not r.passed),
            "results": [r.to_dict() for r in self.results],
        }


# --------------------------------------------------------------------------
# Running a single case
# --------------------------------------------------------------------------


def _build_turns(script: list[dict[str, Any]]):
    from fake_model import FakeToolCall, FakeTurn

    turns = []
    tid = 0
    for step in script:
        tool_calls = []
        for t in step.get("tools", []):
            tid += 1
            tool_calls.append(
                FakeToolCall(
                    name=t["name"],
                    tool_input=t.get("input", {}),
                    tool_use_id=f"eval-tool-{tid}",
                ),
            )
        turns.append(
            FakeTurn(
                text=step.get("text", ""),
                reasoning=step.get("reasoning", ""),
                tool_calls=tool_calls,
            ),
        )
    return turns


def _run_evidence_case(case: dict[str, Any]) -> CaseResult:
    """Deterministic verifier classification against an evidence fixture."""
    from verification import classify_claim

    checks: list[Check] = []
    started = time.perf_counter()
    evidence = list(case.get("evidence", []))
    expected = case.get("expect", {}).get("claim_status")
    actual = classify_claim(case.get("claim", ""), evidence)
    checks.append(
        Check(
            f"claim_status:{expected}",
            actual == expected,
            f"got={actual} source={case.get('evidence_source', 'inline')}",
        ),
    )
    latency = (time.perf_counter() - started) * 1000.0
    return CaseResult(
        id=case["id"], passed=all(c.ok for c in checks), checks=checks, latency_ms=latency,
    )


async def _run_case_async(case: dict[str, Any]) -> CaseResult:
    from connection import Connection
    from edit_group_service import EditGroupService
    from edit_group_store import EditGroupStore
    from fake_model import FakeModel
    from handler import handle_message_events
    from memory_store import MemoryEntry, MemoryStore
    from protocol import SessionState
    from session_store import SessionStore
    from strands_runner import WritingAgentRunner

    case_id = case["id"]
    checks: list[Check] = []
    started = time.perf_counter()

    with tempfile.TemporaryDirectory(prefix=f"eval-{case_id}-") as tmp:
        root = Path(tmp)
        path = case.get("document_path", "doc.md")
        document = case.get("document", "")
        # Materialize on disk for read_file/disk fallback + save semantics.
        (root / path).parent.mkdir(parents=True, exist_ok=True)
        (root / path).write_text(document, encoding="utf-8")

        session = SessionState()
        session.open_buffers[path] = document
        session.active_path = path

        store = SessionStore(base_dir=root)
        conn = Connection(
            session=session,
            runner=WritingAgentRunner(
                project_root=root,
                model=FakeModel(
                    _build_turns(case.get("model_script", [])),
                    subagent_responses=case.get("subagent_responses"),
                ),
            ),
            project_root=root,
            session_store=store,
            edit_service=EditGroupService(project_root=root, store=EditGroupStore(base_dir=root)),
            memory_store=MemoryStore(base_dir=root),
            current_session_id=store.create_empty(),
        )
        for raw_entry in case.get("initial_memory", []):
            if isinstance(raw_entry, dict):
                conn.memory_store.add(
                    MemoryEntry.from_dict(
                        {**raw_entry, "id": raw_entry.get("id") or ""},
                    ),
                )

        events: list[dict[str, Any]] = []
        chat_payload: dict[str, Any] = {
            "type": "chat/message",
            "text": case.get("instruction", ""),
            "request_id": "eval",
        }
        if "auto_review" in case:
            chat_payload["auto_review"] = bool(case["auto_review"])
        async for event in handle_message_events(conn, chat_payload):
            events.append(event)

        expect = case.get("expect", {})
        _check_expectations(checks, events, conn, path, document, expect)

        # Optional: apply the first proposed group and assert memory learning.
        if case.get("apply_proposed"):
            await _apply_and_check_memory(checks, events, conn, expect)

        # Optional post-mutation stale check.
        mutate = case.get("mutate_after")
        if mutate:
            conn.session.open_buffers[mutate["path"]] = mutate["document"]
            state_events: list[dict[str, Any]] = []
            async for event in handle_message_events(conn, {"type": "group/state"}):
                state_events.append(event)
            _check_post_state(checks, state_events, expect)

    latency = (time.perf_counter() - started) * 1000.0
    passed = all(c.ok for c in checks) and bool(checks)
    return CaseResult(id=case_id, passed=passed, checks=checks, latency_ms=latency)


def _tool_names(events: list[dict[str, Any]]) -> set[str]:
    return {
        str(e.get("name"))
        for e in events
        if e.get("type") == "chat/tool_update"
    }


def _tool_call_order(events: list[dict[str, Any]]) -> list[str]:
    order: list[str] = []
    for event in events:
        if event.get("type") != "chat/tool_update":
            continue
        status = event.get("status")
        name = event.get("name")
        if status == "running" and isinstance(name, str) and name:
            order.append(name)
    return order


def _check_expectations(
    checks: list[Check],
    events: list[dict[str, Any]],
    conn: Any,
    path: str,
    original: str,
    expect: dict[str, Any],
) -> None:
    types = [e.get("type") for e in events]
    tool_names = _tool_names(events)
    proposed = [e for e in events if e.get("type") == "group/propose"]

    for name in expect.get("must_call", []):
        checks.append(
            Check(f"must_call:{name}", name in tool_names, f"seen={sorted(tool_names)}"),
        )

    for name in expect.get("must_not_call", []):
        checks.append(Check(f"must_not_call:{name}", name not in tool_names))

    expected_order = expect.get("must_call_order")
    if isinstance(expected_order, list) and expected_order:
        order = _tool_call_order(events)
        idx = 0
        ok = True
        for want in expected_order:
            while idx < len(order) and order[idx] != want:
                idx += 1
            if idx >= len(order):
                ok = False
                break
            idx += 1
        checks.append(
            Check(
                "must_call_order",
                ok,
                f"expected={expected_order} seen={order}",
            ),
        )

    if "must_create_group" in expect:
        want = bool(expect["must_create_group"])
        got = len(proposed) > 0
        checks.append(Check("must_create_group", got == want, f"groups={len(proposed)}"))

    if expect.get("must_not_create_group"):
        checks.append(Check("must_not_create_group", len(proposed) == 0))

    for t in expect.get("must_not_emit", []):
        checks.append(Check(f"must_not_emit:{t}", t not in types))

    if expect.get("valid_anchor_count") == "all":
        ok = True
        for evt in proposed:
            for edit in evt["group"]["edits"]:
                if edit["status"] not in ("proposed",):
                    ok = False
        checks.append(Check("valid_anchor_count:all", ok))

    if expect.get("expect_tool_error"):
        has_err = any(
            e.get("type") == "chat/tool_update" and e.get("status") == "error"
            for e in events
        )
        checks.append(Check("expect_tool_error", has_err))

    if "document_unchanged" in expect:
        want = bool(expect["document_unchanged"])
        unchanged = conn.session.open_buffers.get(path) == original
        checks.append(Check("document_unchanged", unchanged == want))

    if "prompt_contains" in expect:
        prompt_text = _conversation_text(conn, role="user")
        for snippet in expect.get("prompt_contains", []):
            checks.append(
                Check(
                    f"prompt_contains:{snippet}",
                    str(snippet) in prompt_text,
                ),
            )

    if "prompt_not_contains" in expect:
        prompt_text = _conversation_text(conn, role="user")
        for snippet in expect.get("prompt_not_contains", []):
            checks.append(
                Check(
                    f"prompt_not_contains:{snippet}",
                    str(snippet) not in prompt_text,
                ),
            )

    if expect.get("memory_has_candidate"):
        from memory_store import is_candidate_principle

        candidates = [
            e for e in conn.memory_store.list(kind="principle")
            if is_candidate_principle(e)
        ]
        checks.append(
            Check(
                "memory_has_candidate",
                len(candidates) > 0,
                f"candidates={len(candidates)}",
            ),
        )

    all_edits = [
        edit
        for evt in proposed
        for edit in evt.get("group", {}).get("edits", [])
    ]
    for snippet in expect.get("edit_new_text_contains", []):
        checks.append(
            Check(
                f"edit_new_text_contains:{snippet}",
                any(str(snippet) in str(edit.get("new_text", "")) for edit in all_edits),
            ),
        )
    for kind in expect.get("edit_kind_includes", []):
        checks.append(
            Check(
                f"edit_kind_includes:{kind}",
                any(edit.get("kind") == kind for edit in all_edits),
            ),
        )


def _conversation_text(conn: Any, *, role: str) -> str:
    parts: list[str] = []
    for msg in conn.runner.messages:
        if msg.get("role") != role:
            continue
        for block in msg.get("content", []):
            if isinstance(block, dict) and "text" in block:
                parts.append(str(block["text"]))
    return "\n".join(parts)


async def _apply_and_check_memory(
    checks: list[Check],
    events: list[dict[str, Any]],
    conn: Any,
    expect: dict[str, Any],
) -> None:
    from handler import handle_message_events

    proposed = [e for e in events if e.get("type") == "group/propose"]
    if not proposed:
        checks.append(Check("apply_proposed", False, "no proposed group to apply"))
        return
    group_id = proposed[0]["group"]["id"]
    apply_events = [
        e
        async for e in handle_message_events(conn, {"type": "group/apply", "group_id": group_id})
    ]
    applied_update = next(
        (e for e in apply_events if e.get("type") == "group/update"), None
    )
    checks.append(
        Check(
            "applied",
            bool(applied_update) and applied_update["group"]["status"] == "applied",
        ),
    )
    if expect.get("memory_example_after"):
        examples = conn.memory_store.list(kind="example")
        positives = [e for e in examples if e.polarity == "positive"]
        checks.append(
            Check("memory_example_after", len(positives) > 0, f"examples={len(examples)}"),
        )


def _check_post_state(
    checks: list[Check],
    state_events: list[dict[str, Any]],
    expect: dict[str, Any],
) -> None:
    want_status = expect.get("group_status_after")
    if not want_status:
        return
    state = next((e for e in state_events if e.get("type") == "group/state"), None)
    statuses = [g["status"] for g in state["groups"]] if state else []
    checks.append(
        Check(
            f"group_status_after:{want_status}",
            want_status in statuses,
            f"statuses={statuses}",
        ),
    )


def run_case(case: dict[str, Any]) -> CaseResult:
    try:
        if case.get("kind") == "evidence":
            return _run_evidence_case(case)
        return asyncio.run(_run_case_async(case))
    except Exception as exc:  # noqa: BLE001
        return CaseResult(id=case.get("id", "?"), passed=False, error=repr(exc))


def run_suite(suite: str = "smoke", case_id: str | None = None) -> SuiteReport:
    cases = load_cases(suite=suite, case_id=case_id)
    report = SuiteReport(suite=suite)
    for case in cases:
        report.results.append(run_case(case))
    return report


def write_report(report: SuiteReport) -> Path:
    _REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    stamp = time.strftime("%Y%m%d-%H%M%S")
    out = _REPORTS_DIR / f"{stamp}-{report.suite}.json"
    out.write_text(json.dumps(report.to_dict(), indent=2), encoding="utf-8")
    latest = _REPORTS_DIR / f"latest-{report.suite}.json"
    latest.write_text(json.dumps(report.to_dict(), indent=2), encoding="utf-8")
    return out


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Writing agent eval runner")
    parser.add_argument("--suite", default="smoke", help="Suite to run (default: smoke)")
    parser.add_argument("--case", default=None, help="Run a single case by id")
    parser.add_argument("--no-report", action="store_true", help="Skip writing a report file")
    args = parser.parse_args(argv)

    report = run_suite(suite=args.suite, case_id=args.case)
    if not report.results:
        print(f"No eval cases matched suite={args.suite!r} case={args.case!r}")
        return 1

    for result in report.results:
        status = "PASS" if result.passed else "FAIL"
        print(f"[{status}] {result.id} ({result.latency_ms:.0f} ms)")
        if not result.passed:
            if result.error:
                print(f"    error: {result.error}")
            for check in result.checks:
                if not check.ok:
                    print(f"    - {check.name}: {check.detail}")

    summary = report.to_dict()
    print(f"\n{summary['passed']}/{summary['total']} cases passed (suite={args.suite}).")

    if not args.no_report:
        out = write_report(report)
        print(f"Report written to {out}")

    return 0 if report.passed else 1


if __name__ == "__main__":
    sys.exit(main())

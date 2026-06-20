"""Tests for check_references writing tool."""

from __future__ import annotations

from pathlib import Path

from writing_agent.server.protocol import SessionState
from writing_agent.tools.writing_tools import check_references


def _tool_context(tmp_path: Path, queue: list, *, session: SessionState | None = None) -> dict:
    return {
        "session": session,
        "project_root": tmp_path,
        "outbound_queue": queue,
    }


def test_check_references_offline_finds_local_missing(tmp_path: Path) -> None:
    refs = tmp_path / "references"
    refs.mkdir()
    (refs / "good.md").write_text("10.1111/1467-8551.00375", encoding="utf-8")
    doc = tmp_path / "demo-manuscript.md"
    doc.write_text(
        "Valid [1] and missing [2].\n"
        "[1] https://doi.org/10.1111/1467-8551.00375\n"
        "[2] https://doi.org/10.1145/3571730\n",
        encoding="utf-8",
    )
    queue: list = []

    class Ctx:
        invocation_state = _tool_context(tmp_path, queue)
        tool_use = {
            "name": "check_references",
            "toolUseId": "tu-check",
            "input": {"path": "demo-manuscript.md", "offline": True},
        }

    result = check_references("demo-manuscript.md", Ctx(), offline=True)  # type: ignore[arg-type]
    assert result["status"] == "success"
    text = result["content"][0]["text"]
    assert "issue(s) found" in text
    assert "10.1145/3571730" in text

    end = next(e for e in queue if e.get("type") == "chat/tool_end")
    assert end["name"] == "check_references"
    assert end["output"]["ok"] is False
    assert end["output"]["offline"] is True
    assert end["output"]["finding_count"] >= 1


def test_check_references_uses_open_buffer(tmp_path: Path) -> None:
    refs = tmp_path / "references"
    refs.mkdir()
    (refs / "good.md").write_text("10.1111/1467-8551.00375", encoding="utf-8")

    session = SessionState()
    session.open_buffers["draft.md"] = (
        "Cited https://doi.org/10.1145/missing-only in buffer.\n"
    )
    queue: list = []

    class Ctx:
        invocation_state = _tool_context(tmp_path, queue, session=session)
        tool_use = {
            "name": "check_references",
            "toolUseId": "tu-buffer",
            "input": {"path": "draft.md", "offline": True},
        }

    result = check_references("draft.md", Ctx(), offline=True)  # type: ignore[arg-type]
    assert result["status"] == "success"
    end = next(e for e in queue if e.get("type") == "chat/tool_end")
    assert end["output"]["source"] == "buffer"
    assert end["output"]["path"] == "draft.md"

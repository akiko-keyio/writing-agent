"""Tests for search_references and read_document modes."""

from pathlib import Path

from writing_tools import read_document, search_references


def _tool_context(tmp_path: Path, queue: list) -> dict:
    return {
        "session": None,
        "project_root": tmp_path,
        "outbound_queue": queue,
    }


def test_read_document_lines_mode(tmp_path: Path) -> None:
    sample = tmp_path / "draft.md"
    sample.write_text("line0\nline1\nline2\n", encoding="utf-8")
    queue: list = []

    class Ctx:
        invocation_state = _tool_context(tmp_path, queue)
        tool_use = {
            "name": "read_document",
            "toolUseId": "tu-lines",
            "input": {"path": "draft.md", "mode": "lines"},
        }

    result = read_document(
        "draft.md",
        Ctx(),  # type: ignore[arg-type]
        mode="lines",
        start_line=1,
        end_line=1,
    )
    assert result["status"] == "success"
    assert "line1" in result["content"][0]["text"]
    assert "line0" not in result["content"][0]["text"].split("line1")[0][-10:]


def test_search_references_finds_terms(tmp_path: Path) -> None:
    refs = tmp_path / "references"
    refs.mkdir()
    (refs / "rag.md").write_text(
        "Retrieval augmented generation improves recall.\n",
        encoding="utf-8",
    )
    queue: list = []

    class Ctx:
        invocation_state = _tool_context(tmp_path, queue)
        tool_use = {
            "name": "search_references",
            "toolUseId": "tu-search",
            "input": {"query": "retrieval recall"},
        }

    result = search_references("retrieval recall", Ctx())  # type: ignore[arg-type]
    assert result["status"] == "success"
    assert "references/rag.md" in result["content"][0]["text"]
    end = next(e for e in queue if e.get("type") == "chat/tool_end")
    assert end["name"] == "search_references"
    assert end["output"]["hit_count"] >= 1

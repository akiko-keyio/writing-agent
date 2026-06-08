from pathlib import Path

from protocol import SessionState
from writing_tools import read_file


def test_read_file_prefers_open_buffer(tmp_path: Path) -> None:
    disk_file = tmp_path / "draft.md"
    disk_file.write_text("from disk\n", encoding="utf-8")

    session = SessionState()
    session.open_buffers["draft.md"] = "from buffer\n"

    queue: list = []

    class Ctx:
        invocation_state = {
            "session": session,
            "project_root": tmp_path,
            "outbound_queue": queue,
        }
        tool_use = {
            "name": "read_file",
            "toolUseId": "tu-overlay",
            "input": {"path": "draft.md"},
        }

    result = read_file("draft.md", Ctx())  # type: ignore[arg-type]
    assert result["status"] == "success"
    assert "from buffer" in result["content"][0]["text"]
    end = next(e for e in queue if e.get("type") == "chat/tool_end")
    assert end["output"]["source"] == "buffer"

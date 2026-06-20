from types import SimpleNamespace

from writing_agent.server.stream_events import StreamAccum, queue_event_to_ws
from writing_agent.runtime.writing_plugin import WritingPlugin, _tool_end_payload


def test_writing_plugin_registers_hooks():
    plugin = WritingPlugin()
    assert plugin.name == "writing"
    assert len(plugin.hooks) >= 2


def test_notify_tool_end_check_completed():
    plugin = WritingPlugin()
    queue: list = []
    event = SimpleNamespace(
        tool_use={
            "name": "check",
            "toolUseId": "tu-check",
            "input": {"input": "examples/test-text.md"},
        },
        invocation_state={"outbound_queue": queue},
        result={
            "status": "success",
            "content": [{"text": "No issues found."}],
        },
        exception=None,
    )
    plugin.notify_tool_end(event)  # type: ignore[arg-type]
    assert len(queue) == 1
    assert queue[0]["type"] == "chat/tool_end"
    assert queue[0]["status"] == "completed"
    assert queue[0]["tool_id"] == "tu-check"
    assert "preview" in queue[0]["output"]


def test_notify_tool_end_skips_read_document():
    event = SimpleNamespace(
        tool_use={"name": "read_document", "toolUseId": "tu-1", "input": {}},
        invocation_state={},
        result={"status": "success"},
        exception=None,
    )
    assert _tool_end_payload(event) is None  # type: ignore[arg-type]


def test_queue_tool_end_maps_to_ws_completed():
    accum = StreamAccum(stream_id="s-1")
    out = queue_event_to_ws(
        {
            "type": "chat/tool_end",
            "tool_id": "tu-check",
            "name": "check",
            "status": "completed",
            "output": {"preview": "done"},
        },
        accum,
    )
    assert out[0]["type"] == "chat/tool_update"
    assert out[0]["status"] == "completed"
    assert out[0]["name"] == "check"

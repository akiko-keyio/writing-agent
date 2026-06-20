from stream_events import StreamAccum, queue_event_to_ws, strands_callback_to_ws


def test_text_delta_maps_to_message_delta():
    accum = StreamAccum(stream_id="s-1")
    out = strands_callback_to_ws({"data": "Hello"}, accum)
    assert out == [{"type": "chat/message_delta", "stream_id": "s-1", "text": "Hello"}]
    assert accum.text == "Hello"


def test_reasoning_delta():
    accum = StreamAccum(stream_id="s-2")
    out = strands_callback_to_ws({"reasoningText": "hmm"}, accum)
    assert out[0]["type"] == "chat/reasoning_delta"
    assert out[0]["text"] == "hmm"


def test_tool_use_stream():
    accum = StreamAccum(stream_id="s-3")
    out = strands_callback_to_ws(
        {
            "type": "tool_use_stream",
            "current_tool_use": {
                "toolUseId": "tu-1",
                "name": "read_document",
                "input": {"path": "a.md"},
            },
        },
        accum,
    )
    assert out[0]["type"] == "chat/tool_update"
    assert out[0]["tool_id"] == "tu-1"
    assert out[0]["status"] == "running"


def test_queue_tool_end():
    accum = StreamAccum(stream_id="s-4")
    queue_event_to_ws(
        {
            "type": "chat/tool_start",
            "tool_id": "tu-1",
            "name": "read_document",
            "input": {"path": "a.md"},
        },
        accum,
    )
    out = queue_event_to_ws(
        {
            "type": "chat/tool_end",
            "tool_id": "tu-1",
            "status": "completed",
            "output": {"path": "a.md"},
        },
        accum,
    )
    assert out[0]["status"] == "completed"
    assert out[0]["name"] == "read_document"


def test_tool_use_stream_skips_placeholder_name_until_known():
    accum = StreamAccum(stream_id="s-5")
    assert (
        strands_callback_to_ws(
            {
                "type": "tool_use_stream",
                "current_tool_use": {
                    "toolUseId": "tu-2",
                    "name": "",
                    "input": {},
                },
            },
            accum,
        )
        == []
    )
    out = queue_event_to_ws(
        {
            "type": "chat/tool_start",
            "tool_id": "tu-2",
            "name": "read_document",
            "input": {"path": "a.md"},
        },
        accum,
    )
    assert out[0]["name"] == "read_document"

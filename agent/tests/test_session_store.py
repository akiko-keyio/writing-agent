from protocol import SessionState
from session_store import SessionStore
from strands_runner import WritingAgentRunner


def test_session_store_create_and_list():
    store = SessionStore()
    sid = store.create_empty()
    assert sid.startswith("sess-")
    listed = store.list_all()
    assert len(listed) == 1
    assert listed[0]["session_id"] == sid


def test_session_store_save_and_load():
    store = SessionStore()
    sid = store.create_empty()
    runner = WritingAgentRunner()
    runner.restore_conversation([{"role": "user", "text": "Hello"}])
    session = SessionState()
    session.open_buffers["notes/draft.md"] = "# Draft"
    session.active_path = "notes/draft.md"

    store.save(sid, runner, session, title="Hello")

    snap = store.load(sid)
    assert snap is not None
    assert snap.title == "Hello"
    assert snap.open_buffers["notes/draft.md"] == "# Draft"
    assert snap.active_path == "notes/draft.md"
    assert len(snap.messages) == 1

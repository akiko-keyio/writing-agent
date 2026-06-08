from protocol import SessionState, apply_replacements


def test_apply_unique_replacement():
    doc = "We utilize the API."
    new, errs = apply_replacements(doc, [{"old": "utilize", "new": "use"}])
    assert errs == []
    assert new == "We use the API."


def test_apply_non_unique_fails():
    doc = "foo bar foo"
    _, errs = apply_replacements(doc, [{"old": "foo", "new": "x"}])
    assert len(errs) == 1


def test_clear_pending_edits():
    session = SessionState()
    session.pending_replacements.append({"old": "a", "new": "b"})
    session.clear_pending_edits()
    assert session.pending_replacements == []


def test_open_buffers_and_active_document():
    session = SessionState()
    session.open_buffers["a.md"] = "hello"
    session.active_path = "a.md"
    assert session.active_document() == "hello"
    session.clear_buffers()
    assert session.active_document() == ""

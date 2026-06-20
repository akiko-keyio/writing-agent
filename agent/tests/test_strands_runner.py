from writing_agent.runtime.strands_runner import WritingAgentRunner, _messages_from_frontend


def test_restore_conversation_from_frontend_roles():
    runner = WritingAgentRunner()
    runner.restore_conversation([
        {"role": "user", "text": "Hello"},
        {"role": "agent", "text": "Hi there"},
    ])
    assert len(runner.messages) == 2
    assert runner.messages[0]["role"] == "user"
    assert runner.messages[1]["role"] == "assistant"
    assert runner.messages[0]["content"][0]["text"] == "Hello"


def test_messages_from_frontend_skips_empty():
    assert _messages_from_frontend([{"role": "user", "text": "  "}]) == []

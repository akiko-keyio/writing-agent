from strands_runner import WritingAgentRunner


def test_snapshot_and_restore_agent_state() -> None:
    runner = WritingAgentRunner()
    runner._agent.state.set("skill", "academic-writing")
    runner._agent.state.set("count", 2)

    snap = runner.snapshot_agent_state()
    assert snap == {"skill": "academic-writing", "count": 2}

    runner._agent.state.set("skill", "other")
    runner.restore_from_snapshot([], snap)
    assert runner._agent.state.get("skill") == "academic-writing"
    assert runner._agent.state.get("count") == 2

"""Shared test fixtures.

Isolate all durable backend state (sessions, edit groups, memory, eval runs) in a
per-test temp directory so tests never touch the developer's real
``.writing-agent/`` state or interfere with each other.
"""

from __future__ import annotations

import pytest


@pytest.fixture(autouse=True)
def _isolate_state(tmp_path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("WRITING_AGENT_STATE_DIR", str(tmp_path / "state"))

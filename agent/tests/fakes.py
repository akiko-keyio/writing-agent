"""Test alias for the shared fake model (lives in the main package so the eval
harness can reuse it at runtime). Import from here in tests for convenience."""

from __future__ import annotations

from writing_agent.runtime.fake_model import (  # noqa: F401
    FakeModel,
    FakeToolCall,
    FakeTurn,
    fake_model_factory,
)

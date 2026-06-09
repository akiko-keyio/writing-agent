"""Deterministic fake model + factory for tests and evals (no network calls).

The fake conforms to the Strands ``Model`` interface so it can be passed to
``Agent`` and ``WritingAgentRunner`` without a live provider. It replays a
scripted sequence of text deltas and tool-use calls. Shared by ``tests/`` and
the eval harness (``evals/``) so deterministic behavior never depends on a live
model.
"""

from __future__ import annotations

import asyncio
import json
from collections.abc import AsyncIterable
from dataclasses import dataclass, field
from typing import Any

from strands.models.model import Model


@dataclass
class FakeToolCall:
    """A scripted tool invocation the fake model should emit."""

    name: str
    tool_input: dict[str, Any]
    tool_use_id: str = "fake-tool-1"


@dataclass
class FakeTurn:
    """One model turn: optional text plus optional tool calls.

    If ``tool_calls`` is non-empty the turn stops with ``tool_use`` so the agent
    event loop runs the tools and calls the model again. Otherwise it ends.
    """

    text: str = ""
    tool_calls: list[FakeToolCall] = field(default_factory=list)
    reasoning: str = ""


class FakeModel(Model):
    """Replays scripted turns. Each ``stream`` call consumes the next turn.

    If ``gate`` is provided the stream blocks on it right after ``messageStart``
    (before any deltas), which lets tests deterministically interleave a
    ``chat/cancel`` while the turn is mid-stream.
    """

    def __init__(
        self,
        turns: list[FakeTurn] | None = None,
        *,
        gate: asyncio.Event | None = None,
    ) -> None:
        self._config: dict[str, Any] = {"model_id": "fake-model"}
        self._turns: list[FakeTurn] = list(turns or [FakeTurn(text="(fake reply)")])
        self._index = 0
        self._gate = gate
        self.stream_calls = 0

    def update_config(self, **model_config: Any) -> None:
        self._config.update(model_config)

    def get_config(self) -> dict[str, Any]:
        return self._config

    async def structured_output(self, output_model, prompt, system_prompt=None, **kwargs):  # type: ignore[override]
        yield {"output": output_model()}

    async def stream(self, *args: Any, **kwargs: Any) -> AsyncIterable[dict[str, Any]]:  # type: ignore[override]
        self.stream_calls += 1
        if self._index < len(self._turns):
            turn = self._turns[self._index]
        else:
            turn = FakeTurn(text="")
        self._index += 1

        yield {"messageStart": {"role": "assistant"}}

        if self._gate is not None:
            await self._gate.wait()

        if turn.reasoning:
            yield {"contentBlockStart": {"contentBlockIndex": 0, "start": {}}}
            yield {
                "contentBlockDelta": {
                    "contentBlockIndex": 0,
                    "delta": {"reasoningContent": {"text": turn.reasoning}},
                },
            }
            yield {"contentBlockStop": {"contentBlockIndex": 0}}

        if turn.text:
            yield {"contentBlockStart": {"contentBlockIndex": 1, "start": {}}}
            yield {
                "contentBlockDelta": {
                    "contentBlockIndex": 1,
                    "delta": {"text": turn.text},
                },
            }
            yield {"contentBlockStop": {"contentBlockIndex": 1}}

        if turn.tool_calls:
            for i, call in enumerate(turn.tool_calls, start=2):
                yield {
                    "contentBlockStart": {
                        "contentBlockIndex": i,
                        "start": {
                            "toolUse": {
                                "toolUseId": call.tool_use_id,
                                "name": call.name,
                            },
                        },
                    },
                }
                yield {
                    "contentBlockDelta": {
                        "contentBlockIndex": i,
                        "delta": {"toolUse": {"input": json.dumps(call.tool_input)}},
                    },
                }
                yield {"contentBlockStop": {"contentBlockIndex": i}}
            yield {"messageStop": {"stopReason": "tool_use"}}
        else:
            yield {"messageStop": {"stopReason": "end_turn"}}


def fake_model_factory(turns: list[FakeTurn] | None = None):
    """Return a zero-arg factory that builds a fresh ``FakeModel`` each call."""

    def _factory() -> FakeModel:
        return FakeModel(turns=turns)

    return _factory

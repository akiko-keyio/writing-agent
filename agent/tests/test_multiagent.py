"""Phase 8: specialist permissions, enable/disable, evidence, verification."""

from __future__ import annotations

import asyncio
from pathlib import Path

import pytest

from writing_agent.server.connection import Connection
from writing_agent.server.handler import handle_message_events
from writing_agent.domain.session_store import SessionStore
from writing_agent.runtime.subagents import create_subagent_tools, load_subagent_specs, tools_for_spec
from writing_agent.tools.verification import (
    CONTRADICTED,
    MISSING_EVIDENCE,
    NOT_REQUIRING_EVIDENCE,
    SUPPORTED,
    classify_claim,
)


@pytest.fixture(autouse=True)
def _models(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("writing_agent.runtime.model_manager._MODELS_FILE", tmp_path / "models.yaml")


@pytest.fixture
def subagents_yaml(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    path = tmp_path / "subagents.yaml"
    monkeypatch.setattr("writing_agent.runtime.subagent_manager._SUBAGENTS_FILE", path)
    return path


# ---- spec presence + permissions -----------------------------------------


def test_remaining_specialists_load() -> None:
    names = {s.name for s in load_subagent_specs()}
    assert {"review", "researcher"} <= names
    # Removed/downgraded specialists must no longer be registered.
    assert names.isdisjoint({"editor", "arbiter", "check", "verifier", "reference-list"})


def test_all_remaining_specialists_readonly() -> None:
    # No subagent is write-capable; only the main agent proposes edits.
    for spec in load_subagent_specs():
        assert spec.readonly is True, f"{spec.name} must be readonly"
        tools = {t.tool_name for t in tools_for_spec(spec)}
        assert "propose_edits" not in tools, f"{spec.name} must not write"
        assert "read_document" in tools
        assert "search_references" in tools
        assert "check_references" in tools
        assert "read_skill_resource" in tools


def test_researcher_cannot_mutate_documents() -> None:
    specs = {s.name: s for s in load_subagent_specs()}
    tools = {t.tool_name for t in tools_for_spec(specs["researcher"])}
    assert "propose_edits" not in tools
    assert tools == {
        "read_document",
        "read_skill_resource",
        "search_references",
        "check_references",
    }


# ---- enable/disable -------------------------------------------------------


def test_disabled_subagent_not_registered() -> None:
    from writing_agent.runtime.fake_model import FakeModel

    tools = create_subagent_tools(model=FakeModel(), enabled_names={"review"})
    names = {t.tool_name for t in tools}
    assert names == {"review"}


def test_subagent_manager_toggle(subagents_yaml: Path) -> None:
    from writing_agent.runtime.subagent_manager import (
        get_enabled_subagent_names,
        list_subagents_for_settings,
        set_subagent_enabled,
    )

    assert "review" in get_enabled_subagent_names()
    set_subagent_enabled("review", False)
    assert "review" not in get_enabled_subagent_names()
    listed = {s["id"]: s for s in list_subagents_for_settings()}
    assert listed["review"]["enabled"] is False


def test_unknown_subagent_toggle_raises(subagents_yaml: Path) -> None:
    from writing_agent.runtime.subagent_manager import set_subagent_enabled

    with pytest.raises(ValueError, match="Unknown subagent"):
        set_subagent_enabled("does-not-exist", True)


# ---- reference check (offline) --------------------------------------------


def test_reference_check_offline(tmp_path: Path) -> None:
    from writing_agent.tools.reference_check import check_document

    refs = tmp_path / "references"
    refs.mkdir()
    (refs / "ref.md").write_text("10.1038/nature12373", encoding="utf-8")
    doc = tmp_path / "doc.md"
    doc.write_text("See doi:10.1038/nature12373", encoding="utf-8")
    report = check_document(doc, project_root=tmp_path, fetcher=None, online=False)
    assert report.ok


# ---- verifier classification ---------------------------------------------


def test_classify_claim_taxonomy() -> None:
    assert classify_claim("This paper proposes a framework.", []) == NOT_REQUIRING_EVIDENCE
    assert (
        classify_claim("Method X increases accuracy by 5 percent.", [])
        == MISSING_EVIDENCE
    )
    assert (
        classify_claim(
            "Method X increases accuracy by 5 percent.",
            ["Method X increases accuracy by 5 percent on the benchmark."],
        )
        == SUPPORTED
    )
    assert (
        classify_claim(
            "Method X increases accuracy.",
            ["Method X does not increase accuracy; results were flat."],
        )
        == CONTRADICTED
    )


# ---- settings route -------------------------------------------------------


def test_settings_set_subagent_enabled_route(subagents_yaml: Path) -> None:
    store = SessionStore()
    conn = Connection.create(store)

    async def _go(raw):
        return [e async for e in handle_message_events(conn, raw)]

    events = asyncio.run(
        _go(
            {
                "type": "settings/update",
                "action": "set_subagent_enabled",
                "subagent_id": "researcher",
                "enabled": False,
            },
        ),
    )
    assert events[0]["type"] == "settings/updated"
    # Authoritative response carries updated plugins (single data model).
    subs = {s["name"]: s for s in events[0]["plugins"]["subagents"]}
    assert subs["researcher"]["enabled"] is False


def test_settings_read_exposes_subagents_via_plugins(subagents_yaml: Path) -> None:
    store = SessionStore()
    conn = Connection.create(store)

    async def _go(raw):
        return [e async for e in handle_message_events(conn, raw)]

    events = asyncio.run(_go({"type": "settings/read"}))
    data = events[0]
    assert data["type"] == "settings/data"
    # Single data model: Settings UI consumes plugins.subagents (with enabled).
    assert "subagents" not in data
    names = {s["name"] for s in data["plugins"]["subagents"]}
    assert {"review", "researcher"} <= names
    for sub in data["plugins"]["subagents"]:
        assert "enabled" in sub

"""Unit tests for Orion knowledge retrieval."""

from __future__ import annotations

from services.orion_knowledge import format_knowledge_for_prompt, retrieve_orion_knowledge


def test_retrieve_orion_knowledge_matches_gems_query() -> None:
    snippets = retrieve_orion_knowledge("how do gems work premium multiplier", limit=3)
    assert snippets
    joined = " ".join(s["body"].lower() for s in snippets)
    assert "gem" in joined


def test_format_knowledge_for_prompt_includes_authoritative_header() -> None:
    text = format_knowledge_for_prompt(
        [{"title": "Test", "category": "product", "body": "SnapRoad gems reward safe miles."}]
    )
    assert "authoritative" in text.lower()
    assert "SnapRoad gems" in text

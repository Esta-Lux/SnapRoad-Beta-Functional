"""Unit tests for `services.online_offers_provider` (placeholder catalog + cursors)."""

import importlib
import sys


def test_placeholder_pagination_stable(monkeypatch):
    monkeypatch.delenv("ONLINE_OFFERS_API_BASE_URL", raising=False)
    monkeypatch.delenv("ONLINE_OFFERS_API_KEY", raising=False)
    monkeypatch.setenv("ONLINE_OFFERS_PROVIDER", "placeholder")
    sys.modules.pop("services.online_offers_provider", None)
    mod = importlib.reload(importlib.import_module("services.online_offers_provider"))
    mod.PAGE_SIZE = 3

    first = mod.fetch_online_catalog(category_slug=None, cursor=None)
    items1 = list(first["items"])
    nc = first.get("next_cursor")
    assert len(items1) <= 3
    assert nc

    cats = first.get("categories") or []
    slug_set = {c.get("slug") for c in cats if isinstance(c, dict)}
    assert slug_set == {"fashion", "electronics", "travel", "beauty", "home", "food_kit", "sports"}

    second = mod.fetch_online_catalog(category_slug=None, cursor=nc)
    items2 = list(second["items"])
    overlap = {i["id"] for i in items1} & {i["id"] for i in items2}
    assert not overlap


def test_cursor_roundtrip(monkeypatch):
    monkeypatch.setenv("ONLINE_OFFERS_PROVIDER", "placeholder")
    sys.modules.pop("services.online_offers_provider", None)
    mod = importlib.reload(importlib.import_module("services.online_offers_provider"))
    cu = mod._encode_cursor(12)
    assert mod._decode_cursor(cu) == 12


def test_http_json_falls_back_when_base_missing(monkeypatch):
    monkeypatch.delenv("ONLINE_OFFERS_API_BASE_URL", raising=False)
    monkeypatch.setenv("ONLINE_OFFERS_PROVIDER", "http_json")
    sys.modules.pop("services.online_offers_provider", None)
    mod = importlib.reload(importlib.import_module("services.online_offers_provider"))
    cat = mod.fetch_online_catalog(category_slug=None, cursor=None)
    assert cat.get("provider") == "placeholder"

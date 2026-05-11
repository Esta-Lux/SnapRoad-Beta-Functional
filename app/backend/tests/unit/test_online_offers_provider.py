"""Unit tests for `services.online_offers_provider` empty/admin-first catalog behavior."""

import importlib
import sys


def _reload_provider(monkeypatch, provider: str = "admin"):
    monkeypatch.setenv("ONLINE_OFFERS_PROVIDER", provider)
    sys.modules.pop("services.online_offers_provider", None)
    return importlib.reload(importlib.import_module("services.online_offers_provider"))


def test_default_catalog_is_empty_without_admin_rows(monkeypatch):
    monkeypatch.delenv("ONLINE_OFFERS_API_BASE_URL", raising=False)
    monkeypatch.delenv("ONLINE_OFFERS_API_KEY", raising=False)
    mod = _reload_provider(monkeypatch)

    cat = mod.fetch_online_catalog(category_slug=None, cursor=None)

    assert cat == {
        "items": [],
        "categories": [],
        "next_cursor": None,
        "provider": "admin_online_offers",
    }


def test_placeholder_provider_no_longer_returns_mock_items(monkeypatch):
    mod = _reload_provider(monkeypatch, "placeholder")

    cat = mod.fetch_online_catalog(category_slug=None, cursor=None)

    assert cat["provider"] == "admin_online_offers"
    assert cat["items"] == []
    assert cat["categories"] == []


def test_cursor_roundtrip(monkeypatch):
    mod = _reload_provider(monkeypatch)
    cu = mod._encode_cursor(12)
    assert mod._decode_cursor(cu) == 12


def test_http_json_returns_empty_when_base_missing(monkeypatch):
    monkeypatch.delenv("ONLINE_OFFERS_API_BASE_URL", raising=False)
    mod = _reload_provider(monkeypatch, "http_json")

    cat = mod.fetch_online_catalog(category_slug=None, cursor=None)

    assert cat.get("provider") == "http_json_unconfigured"
    assert cat.get("items") == []

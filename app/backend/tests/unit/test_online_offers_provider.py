"""Unit tests for `services.online_offers_provider` empty/admin-first catalog behavior."""

import importlib
import sys


def _reload_provider(monkeypatch, provider: str = "admin"):
    monkeypatch.setenv("ONLINE_OFFERS_PROVIDER", provider)
    monkeypatch.delenv("FMTC_API_TOKEN", raising=False)
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


def test_fmtc_provider_filters_expired_and_maps_online_items(monkeypatch):
    monkeypatch.setenv("FMTC_API_TOKEN", "test-token")
    sys.modules.pop("services.fmtc_offers_provider", None)
    mod = importlib.reload(importlib.import_module("services.fmtc_offers_provider"))
    monkeypatch.setattr(
        mod,
        "_load_feed",
        lambda: (
            [
                {
                    "id": 1,
                    "merchant_id": 10,
                    "merchant_name": "Road Store",
                    "status": "active",
                    "label": "Save 25% on road kits",
                    "end_date": "2076-05-16T00:00:00Z",
                    "affiliate_url": "https://example.com/aff",
                    "cascading_full_url": "https://road.example.com/item",
                    "percent": 25,
                    "categories": ["automotive"],
                    "locations": [],
                },
                {
                    "id": 2,
                    "merchant_name": "Old Store",
                    "status": "active",
                    "label": "Expired",
                    "end_date": "2020-01-01T00:00:00Z",
                    "categories": ["automotive"],
                },
            ],
            {"10": {"logos": [{"width": 600, "height": 450, "image_url": "https://img.example.com/logo.png"}]}},
        ),
    )

    cat = mod.fetch_fmtc_online_catalog(category_slug=None, cursor=None)

    assert cat["provider"] == "fmtc"
    assert len(cat["items"]) == 1
    assert cat["items"][0]["id"] == "fmtc_1"
    assert cat["items"][0]["discount_label"] == "25% off"
    assert cat["items"][0]["image_url"] == "https://img.example.com/logo.png"


def test_fmtc_local_requires_address_and_coordinates(monkeypatch):
    monkeypatch.setenv("FMTC_API_TOKEN", "test-token")
    sys.modules.pop("services.fmtc_offers_provider", None)
    mod = importlib.reload(importlib.import_module("services.fmtc_offers_provider"))
    monkeypatch.setattr(
        mod,
        "_load_feed",
        lambda: (
            [
                {
                    "id": 7,
                    "merchant_name": "Airport Parking",
                    "status": "active",
                    "label": "Airport parking deal",
                    "end_date": "2076-05-16T00:00:00Z",
                    "affiliate_url": "https://example.com/parking",
                    "categories": ["local-deals-travel"],
                    "locations": [
                        {"id": "cmh", "address": "1 Airport Rd, Columbus, OH", "lat": 39.999, "lng": -82.888},
                        {"id": "missing-coords", "address": "Nowhere"},
                    ],
                }
            ],
            {},
        ),
    )

    rows = mod.fetch_fmtc_local_offers()

    assert len(rows) == 1
    assert rows[0]["id"] == "fmtc_7_cmh"
    assert rows[0]["offer_source"] == "fmtc"
    assert rows[0]["affiliate_tracking_url"] == "https://example.com/parking"

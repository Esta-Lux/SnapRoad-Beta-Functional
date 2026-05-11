"""Unit tests for TomTom fuel station helper (mocked HTTP)."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

from services import tomtom_fuel as tf


def test_fetch_empty_without_key() -> None:
    assert tf.fetch_tomtom_fuel_stations(40.0, -83.0, api_key="") == []


def _cm(inner: MagicMock) -> MagicMock:
    cm = MagicMock()
    cm.__enter__.return_value = inner
    cm.__exit__.return_value = None
    return cm


def test_fetch_parses_nearby_and_fuel_price() -> None:
    nearby = {
        "results": [
            {
                "type": "POI",
                "position": {"lat": 40.01, "lon": -83.01},
                "poi": {"name": "Shell Test", "brands": [{"name": "Shell"}]},
                "dataSources": [{"fuelPrice": {"id": "1:abc-123"}}],
            }
        ]
    }
    fuel_body = {
        "fuels": [
            {"type": "regular", "price": [{"value": 3.45, "currency": "USD", "volumeUnit": "usGallon"}]},
        ],
        "fuelPrice": "1:abc-123",
    }
    resp_nearby = MagicMock()
    resp_nearby.raise_for_status = MagicMock()
    resp_nearby.json.return_value = nearby

    resp_fuel = MagicMock()
    resp_fuel.status_code = 200
    resp_fuel.raise_for_status = MagicMock()
    resp_fuel.json.return_value = fuel_body

    first = MagicMock()
    first.get.return_value = resp_nearby
    second = MagicMock()
    second.get.return_value = resp_fuel
    clients = iter([_cm(first), _cm(second)])

    with patch("services.tomtom_fuel.httpx.Client", side_effect=lambda *_a, **_k: next(clients)):
        out = tf.fetch_tomtom_fuel_stations(40.0, -83.0, api_key="k")

    assert len(out) == 1
    assert out[0]["name"] == "Shell Test"
    assert out[0]["brand"] == "Shell"
    assert out[0]["price"] == 3.45
    assert out[0]["source"] == "tomtom"
    assert out[0]["lat"] == 40.01
    assert out[0]["lng"] == -83.01


def test_parse_liter_usd_to_gallon() -> None:
    body = {
        "fuels": [
            {"type": "regular", "price": [{"value": 1.0, "currency": "USD", "volumeUnit": "liter"}]},
        ],
    }
    gal = tf._parse_fuel_price_body(body)
    assert gal is not None
    assert abs(gal - 3.785411784) < 0.001


def test_parse_skips_non_usd() -> None:
    body = {
        "fuels": [
            {"type": "regular", "price": [{"value": 1.5, "currency": "EUR", "volumeUnit": "liter"}]},
        ],
    }
    assert tf._parse_fuel_price_body(body) is None

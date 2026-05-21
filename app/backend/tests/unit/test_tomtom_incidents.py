"""Unit tests for TomTom incident normalization."""

from __future__ import annotations

from services.tomtom_incidents import fetch_tomtom_incidents, normalize_tomtom_incidents


_SAMPLE_BODY = {
    "incidents": [
        {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [-82.9988, 39.9612]},
            "properties": {
                "id": "abc123",
                "iconCategory": 1,
                "magnitudeOfDelay": 3,
                "delay": 720,
                "roadNumbers": ["I-71"],
                "from": "Exit 108",
                "to": "Exit 109",
                "startTime": "2026-05-20T10:00:00Z",
                "endTime": "2026-05-20T12:00:00Z",
                "events": [{"description": "Crash on I-71", "iconCategory": 1}],
            },
        },
        {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [-83.0, 39.97]},
            "properties": {
                "iconCategory": 6,
                "delay": 180,
                "roadNumbers": ["US-23"],
                "events": [{"description": "Slow traffic", "iconCategory": 6}],
            },
        },
    ]
}


def test_normalize_tomtom_incidents_maps_categories_and_metadata() -> None:
    rows = normalize_tomtom_incidents(_SAMPLE_BODY, 39.95, -83.0)
    assert len(rows) == 2
    crash = next(r for r in rows if r["type"] == "accident")
    assert crash["id"] == "tomtom-abc123"
    assert crash["source"] == "tomtom"
    assert crash["verified"] is True
    assert crash["delay_seconds"] == 720
    assert crash["severity"] == "high"
    assert crash["road_numbers"] == ["I-71"]
    traffic = next(r for r in rows if r["type"] == "traffic")
    assert traffic["title"] == "Slow traffic"
    assert traffic["severity"] in {"medium", "low"}


def test_fetch_tomtom_incidents_without_api_key_returns_empty() -> None:
    assert fetch_tomtom_incidents(39.96, -82.99, api_key="") == []

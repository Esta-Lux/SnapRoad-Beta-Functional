"""OSM hazards fetch is opt-in via env."""

from services.osm_road_signals import fetch_osm_road_signals


def test_fetch_osm_disabled_by_default(monkeypatch) -> None:
    monkeypatch.delenv("OSM_INCIDENTS_ENABLED", raising=False)
    assert fetch_osm_road_signals(40.0, -83.0) == []

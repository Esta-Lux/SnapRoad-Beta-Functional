"""OpenStreetMap incidents: enabled by default; explicit env opt-out."""

from unittest.mock import MagicMock, patch

from services.osm_road_signals import fetch_osm_road_signals


def test_fetch_osm_disabled_when_explicit_off(monkeypatch) -> None:
    monkeypatch.setenv("OSM_INCIDENTS_ENABLED", "0")
    assert fetch_osm_road_signals(40.0, -83.0) == []


@patch("services.osm_road_signals.httpx.Client")
def test_fetch_osm_default_on_queries_overpass(mock_client_cls, monkeypatch) -> None:
    monkeypatch.delenv("OSM_INCIDENTS_ENABLED", raising=False)
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"elements": []}
    client_inst = MagicMock()
    client_inst.post.return_value = mock_resp
    cm = MagicMock()
    cm.__enter__.return_value = client_inst
    cm.__exit__.return_value = None
    mock_client_cls.return_value = cm
    assert fetch_osm_road_signals(40.0, -83.0) == []
    assert client_inst.post.called

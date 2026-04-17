"""Unit tests for Open-Meteo-backed weather proxy."""

import httpx
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from main import app
from routes.weather import _classify_precipitation


@pytest.mark.parametrize(
    "code,rain,snow,expect_p",
    [
        (0, 0, 0, "none"),
        (61, 1.5, 0, "rain"),
        (71, 0, 0.8, "snow"),
        (85, 0, 0, "snow"),
    ],
)
def test_classify_precipitation_codes(code, rain, snow, expect_p):
    p, intensity, summary = _classify_precipitation(code, rain, snow)
    assert p == expect_p
    assert isinstance(intensity, float)
    assert summary


client = TestClient(app)


def test_weather_current_rejects_null_island():
    r = client.get("/api/weather/current", params={"lat": 0, "lng": 0})
    assert r.status_code == 422


def test_weather_current_rain_mocked():
    fake_resp = MagicMock()
    fake_resp.raise_for_status = MagicMock()
    fake_resp.json = MagicMock(
        return_value={
            "current": {
                "temperature_2m": 52.3,
                "weather_code": 61,
                "is_day": 1,
                "precipitation": 2.1,
                "rain": 2.1,
                "showers": 0,
                "snowfall": 0,
            }
        }
    )
    http = MagicMock()
    http.get = AsyncMock(return_value=fake_resp)

    with patch("routes.weather._get_http", return_value=http):
        r = client.get("/api/weather/current", params={"lat": 40.7128, "lng": -74.006})
    assert r.status_code == 200
    body = r.json()
    assert body["success"] is True
    assert body["data"]["precipitation"] == "rain"
    assert body["data"]["intensity"] > 0
    assert "temperature_f" in body["data"]


def test_weather_current_429_returns_stale_after_cache_expired():
    """When Open-Meteo returns 429, serve last successful grid value if available."""
    import routes.weather as weather_mod

    fake_json = {
        "current": {
            "temperature_2m": 52.3,
            "weather_code": 61,
            "is_day": 1,
            "precipitation": 2.1,
            "rain": 2.1,
            "showers": 0,
            "snowfall": 0,
        }
    }
    ok_resp = MagicMock()
    ok_resp.raise_for_status = MagicMock()
    ok_resp.json = MagicMock(return_value=fake_json)

    req = MagicMock()
    res429 = MagicMock()
    res429.status_code = 429
    res429.headers = {}
    err429 = httpx.HTTPStatusError("429", request=req, response=res429)

    http = MagicMock()
    http.get = AsyncMock(side_effect=[ok_resp, err429, err429])

    params = {"lat": 40.7128, "lng": -74.006}
    with patch("routes.weather._get_http", return_value=http):
        with patch.object(weather_mod, "_maybe_sleep_retry_after", new_callable=AsyncMock):
            r1 = client.get("/api/weather/current", params=params)
            assert r1.status_code == 200
            weather_mod._cache.clear()
            r2 = client.get("/api/weather/current", params=params)

    assert r2.status_code == 200
    body2 = r2.json()
    assert body2["success"] is True
    assert body2.get("stale") is True
    assert body2["data"]["precipitation"] == "rain"

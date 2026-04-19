"""
Open-Meteo proxy for current conditions (no API key). Used by the driver map for
precipitation overlays and Orion context. Rate-limited and short-TTL cached.
"""

import asyncio
import math
import time
from collections import OrderedDict
from typing import Any, Optional

import httpx
from fastapi import APIRouter, HTTPException, Query, Request

from limiter import limiter

router = APIRouter(prefix="/api/weather", tags=["Weather"])

_OPEN_METEO = "https://api.open-meteo.com/v1/forecast"

# One decimal (~11 km) dedupes requests across moving map clients and multiple
# backend instances (each has its own process-local cache).
_GRID_DECIMALS = 1

_http: Optional[httpx.AsyncClient] = None
_CACHE_TTL = 600.0
_CACHE_MAX = 384
_cache: OrderedDict[str, tuple[float, dict[str, Any]]] = OrderedDict()
# Last successful payload per grid key; used when Open-Meteo returns 429/5xx
# after the short-TTL cache has expired.
_stale: OrderedDict[str, dict[str, Any]] = OrderedDict()


def _get_http() -> httpx.AsyncClient:
    global _http
    if _http is None or _http.is_closed:
        _http = httpx.AsyncClient(
            timeout=httpx.Timeout(10, connect=5),
            limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
            follow_redirects=True,
        )
    return _http


def _cache_get(key: str) -> Optional[dict[str, Any]]:
    entry = _cache.get(key)
    if entry is None:
        return None
    ts, val = entry
    if time.monotonic() - ts > _CACHE_TTL:
        _cache.pop(key, None)
        return None
    _cache.move_to_end(key)
    return val


def _cache_set(key: str, val: dict[str, Any]) -> None:
    _cache[key] = (time.monotonic(), val)
    _cache.move_to_end(key)
    while len(_cache) > _CACHE_MAX:
        _cache.popitem(last=False)
    _stale[key] = val
    _stale.move_to_end(key)
    while len(_stale) > _CACHE_MAX:
        _stale.popitem(last=False)


def _stale_get(key: str) -> Optional[dict[str, Any]]:
    entry = _stale.get(key)
    if entry is None:
        return None
    _stale.move_to_end(key)
    return entry


def _grid_key(lat: float, lng: float) -> str:
    r = _GRID_DECIMALS
    return f"{round(lat, r):.{r}f}_{round(lng, r):.{r}f}"


async def _maybe_sleep_retry_after(response: httpx.Response) -> None:
    ra = response.headers.get("Retry-After")
    if not ra:
        await asyncio.sleep(1.5)
        return
    try:
        sec = float(ra)
    except ValueError:
        await asyncio.sleep(1.5)
        return
    sec = min(max(sec, 0.5), 5.0)
    await asyncio.sleep(sec)


def _classify_precipitation(
    code: int,
    rain_mm_h: float,
    snow_cm_h: float,
) -> tuple[str, float, str]:
    """
    Returns (precipitation_key, intensity 0..1, short summary).
    WMO weather code ranges aligned with Open-Meteo docs.
    """
    rain_mm_h = max(0.0, float(rain_mm_h or 0))
    snow_cm_h = max(0.0, float(snow_cm_h or 0))

    snow_codes = {71, 73, 75, 77, 85, 86}
    rain_codes = {51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99}

    is_snow = snow_cm_h > 0.02 or code in snow_codes
    is_rain = (
        not is_snow
        and (rain_mm_h > 0.05 or code in rain_codes or code in (3, 45, 49))
        and code not in snow_codes
    )

    if is_snow:
        inten = min(1.0, 0.25 + snow_cm_h * 2.2 + rain_mm_h * 0.1)
        if code == 86 or snow_cm_h > 1.5:
            summary = "Heavy snow"
        elif code == 85 or snow_cm_h > 0.5:
            summary = "Snow"
        else:
            summary = "Light snow"
        return "snow", round(inten, 3), summary

    if is_rain or rain_mm_h > 0.05:
        inten = min(1.0, 0.2 + rain_mm_h * 1.8)
        if code in (65, 82, 96, 99) or rain_mm_h > 4:
            summary = "Heavy rain"
        elif code in (63, 81) or rain_mm_h > 1:
            summary = "Rain"
        else:
            summary = "Light rain"
        return "rain", round(inten, 3), summary

    if code in (3, 45, 48):
        return "none", 0.0, "Overcast"
    if code in (0, 1):
        return "none", 0.0, "Clear"
    if code == 2:
        return "none", 0.0, "Partly cloudy"

    return "none", 0.0, "Clear"


@router.get("/current")
@limiter.limit("120/minute")
async def weather_current(
    request: Request,
    lat: float = Query(..., ge=-90, le=90, description="Latitude"),
    lng: float = Query(..., ge=-180, le=180, description="Longitude"),
):
    """
    Current conditions at a point. Public (no JWT) so the map can show effects for any session.

    Returns:
      - precipitation: none | rain | snow
      - intensity: 0–1 (visual weight)
      - summary: short phrase for Orion / UI
      - temperature_f, weather_code, is_day
    """
    if math.isfinite(lat) and math.isfinite(lng) and abs(lat) < 1e-5 and abs(lng) < 1e-5:
        raise HTTPException(status_code=422, detail="Invalid coordinates")

    key = _grid_key(lat, lng)
    cached = _cache_get(key)
    if cached is not None:
        return {"success": True, "data": cached}

    params = {
        "latitude": lat,
        "longitude": lng,
        "current": [
            "temperature_2m",
            "weather_code",
            "is_day",
            "precipitation",
            "rain",
            "snowfall",
            "showers",
        ],
        "temperature_unit": "fahrenheit",
        "wind_speed_unit": "mph",
    }

    async def _fetch() -> dict[str, Any]:
        client = _get_http()
        r = await client.get(_OPEN_METEO, params=params)
        r.raise_for_status()
        return r.json()

    try:
        body = await _fetch()
    except httpx.HTTPStatusError as e:
        if e.response is not None and e.response.status_code == 429:
            await _maybe_sleep_retry_after(e.response)
            try:
                body = await _fetch()
            except httpx.HTTPError as e2:
                stale = _stale_get(key)
                if stale is not None:
                    return {"success": True, "data": stale, "stale": True}
                raise HTTPException(
                    status_code=503,
                    detail="Weather service is busy; try again shortly.",
                ) from e2
        else:
            stale = _stale_get(key)
            if stale is not None:
                return {"success": True, "data": stale, "stale": True}
            raise HTTPException(status_code=502, detail=f"Weather service unavailable: {e!r}") from e
    except httpx.HTTPError as e:
        stale = _stale_get(key)
        if stale is not None:
            return {"success": True, "data": stale, "stale": True}
        raise HTTPException(status_code=502, detail=f"Weather service unavailable: {e!r}") from e
    except ValueError as e:
        stale = _stale_get(key)
        if stale is not None:
            return {"success": True, "data": stale, "stale": True}
        raise HTTPException(status_code=502, detail="Invalid weather response") from e

    cur = body.get("current") or {}
    code = int(cur.get("weather_code") or 0)
    temp_f = cur.get("temperature_2m")
    is_day = int(cur.get("is_day") or 0)
    rain = float(cur.get("rain") or 0)
    showers = float(cur.get("showers") or 0)
    snow = float(cur.get("snowfall") or 0)
    rain_combined = max(rain, showers)

    precip, intensity, summary = _classify_precipitation(code, rain_combined, snow)

    data = {
        "precipitation": precip,
        "intensity": intensity if precip != "none" else 0.0,
        "summary": summary,
        "temperature_f": round(float(temp_f), 1) if temp_f is not None else None,
        "weather_code": code,
        "is_day": bool(is_day),
        "rain_mm_h": round(rain_combined, 3),
        "snow_cm_h": round(snow, 3),
    }

    if precip == "none" and temp_f is not None:
        data["summary"] = f"{summary}, {round(float(temp_f))}°F"

    _cache_set(key, data)
    return {"success": True, "data": data}

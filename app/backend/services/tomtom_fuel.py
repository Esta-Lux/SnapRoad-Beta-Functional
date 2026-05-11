"""TomTom Search + Fuel Prices for nearby station regular gasoline (USD/gal).

Nearby Search returns POIs with optional ``dataSources[].fuelPrice.id``; each ID is
resolved via GET /search/2/fuelPrice.json. Keys stay server-side (``TOMTOM_API_KEY``).

Note: TomTom documents Fuel Prices as an automotive add-on — keys without that
entitlement may return POIs without fuelPrice IDs or 403 on fuelPrice requests.
In that case callers should fall back to another provider.
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

from config import TOMTOM_API_KEY

_log = logging.getLogger(__name__)

_NEARBY_URL = "https://api.tomtom.com/search/2/nearbySearch.json"
_FUEL_PRICE_URL = "https://api.tomtom.com/search/2/fuelPrice.json"
_MAX_STATIONS = 24
_MAX_FUEL_DETAIL_CALLS = 20
_CONNECT_TIMEOUT = 5.0
_READ_TIMEOUT = 14.0

# Prefer US-style regular unleaded; TomTom uses lowercase type names in responses.
_FUEL_TYPE_PRIORITY = (
    "regular",
    "sp91_e10",
    "sp91",
    "sp92",
    "sp92_e10",
    "sp93",
    "sp95",
    "sp95_e10",
    "sp95plus",
    "petrol",
)


def _extract_fuel_price_id(result: dict[str, Any]) -> str | None:
    for ds in result.get("dataSources") or []:
        if not isinstance(ds, dict):
            continue
        fp = ds.get("fuelPrice")
        if isinstance(fp, dict):
            rid = fp.get("id")
            if rid:
                return str(rid)
    return None


def _poi_name(result: dict[str, Any]) -> str:
    poi = result.get("poi")
    if isinstance(poi, dict):
        name = poi.get("name")
        if name:
            return str(name)
        brands = poi.get("brands")
        if isinstance(brands, list) and brands:
            b0 = brands[0]
            if isinstance(b0, dict) and b0.get("name"):
                return str(b0["name"])
    return "Gas station"


def _brand(result: dict[str, Any]) -> str:
    poi = result.get("poi")
    if isinstance(poi, dict):
        brands = poi.get("brands")
        if isinstance(brands, list) and brands:
            b0 = brands[0]
            if isinstance(b0, dict) and b0.get("name"):
                return str(b0["name"])
    return _poi_name(result)


def _parse_fuel_price_body(body: dict[str, Any]) -> float | None:
    fuels = body.get("fuels")
    if not isinstance(fuels, list):
        return None
    by_type: dict[str, float] = {}
    for f in fuels:
        if not isinstance(f, dict):
            continue
        t = str(f.get("type") or "").lower()
        prices = f.get("price")
        if not isinstance(prices, list) or not prices:
            continue
        p0 = prices[0]
        if not isinstance(p0, dict):
            continue
        try:
            val = float(p0.get("value"))
        except (TypeError, ValueError):
            continue
        currency = str(p0.get("currency") or "").upper()
        unit = str(p0.get("volumeUnit") or "").lower().replace(" ", "")
        if currency != "USD":
            continue
        if unit in ("usgallon", "us_gallon"):
            price_gal = val
        elif unit == "liter":
            price_gal = val * 3.785411784
        else:
            continue
        by_type[t] = round(price_gal, 3)
    for pref in _FUEL_TYPE_PRIORITY:
        if pref in by_type:
            return by_type[pref]
    return next(iter(by_type.values()), None) if by_type else None


def fetch_tomtom_fuel_stations(lat: float, lng: float, api_key: str | None = None) -> list[dict[str, Any]]:
    key = (api_key if api_key is not None else TOMTOM_API_KEY).strip()
    if not key:
        return []

    timeout = httpx.Timeout(_READ_TIMEOUT, connect=_CONNECT_TIMEOUT)
    headers = {"TomTom-Api-Version": "1"}
    stations: list[dict[str, Any]] = []

    try:
        with httpx.Client(timeout=timeout) as client:
            r = client.get(
                _NEARBY_URL,
                params={
                    "key": key,
                    "lat": lat,
                    "lon": lng,
                    "radius": 25000,
                    "limit": 30,
                    "fuelSet": "Petrol",
                },
            )
            r.raise_for_status()
            data = r.json()
    except Exception as e:
        _log.warning("TomTom nearbySearch failed: %s", e)
        return []

    results = data.get("results") if isinstance(data, dict) else None
    if not isinstance(results, list):
        return []

    candidates: list[tuple[dict[str, Any], str]] = []
    for res in results:
        if not isinstance(res, dict):
            continue
        fp_id = _extract_fuel_price_id(res)
        if not fp_id:
            continue
        pos = res.get("position")
        if not isinstance(pos, dict):
            continue
        try:
            float(pos.get("lat"))
            float(pos.get("lon"))
        except (TypeError, ValueError):
            continue
        candidates.append((res, fp_id))
        if len(candidates) >= _MAX_STATIONS:
            break

    if not candidates:
        _log.info(
            "TomTom nearbySearch returned no POIs with fuelPrice ids (check Fuel Prices entitlement). lat=%s lng=%s",
            lat,
            lng,
        )
        return []

    try:
        with httpx.Client(timeout=timeout) as client:
            detail_calls = 0
            for res, fp_id in candidates:
                if detail_calls >= _MAX_FUEL_DETAIL_CALLS:
                    break
                detail_calls += 1
                try:
                    fr = client.get(
                        _FUEL_PRICE_URL,
                        params={"key": key, "fuelPrice": fp_id},
                        headers=headers,
                    )
                    if fr.status_code == 403:
                        _log.warning(
                            "TomTom fuelPrice returned 403 — API key may lack Fuel Prices product; "
                            "fall back to other providers."
                        )
                        break
                    fr.raise_for_status()
                    fb = fr.json()
                except httpx.HTTPError as e:
                    _log.debug("TomTom fuelPrice HTTP error for %s: %s", fp_id, e)
                    continue
                except ValueError:
                    _log.debug("TomTom fuelPrice non-JSON for %s", fp_id)
                    continue

                price = _parse_fuel_price_body(fb) if isinstance(fb, dict) else None
                if not price or price <= 0:
                    continue
                pos = res.get("position")
                if not isinstance(pos, dict):
                    continue
                stations.append(
                    {
                        "name": _poi_name(res),
                        "price": price,
                        "lat": float(pos["lat"]),
                        "lng": float(pos["lon"]),
                        "brand": _brand(res),
                        "source": "tomtom",
                        "is_estimated": False,
                    }
                )
    except Exception as e:
        _log.warning("TomTom fuelPrice batch failed: %s", e)
        return stations

    return stations

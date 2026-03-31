"""
Google Places API proxy.
Keeps the API key server-side and exposes autocomplete, details, and photo endpoints.
Uses a persistent HTTP client for connection pooling and an in-memory TTL cache
to avoid redundant round-trips while the user is typing.
"""

import os
import time
from collections import OrderedDict
from contextlib import asynccontextmanager
from fastapi import APIRouter, Query, Request, Response
from typing import Optional
import httpx

from limiter import limiter

router = APIRouter(prefix="/api/places", tags=["Places"])

_KEY = lambda: os.environ.get("GOOGLE_PLACES_API_KEY", "")
_BASE = "https://maps.googleapis.com/maps/api/place"

# ---------------------------------------------------------------------------
# Persistent HTTP client — avoids TCP+TLS handshake on every keystroke.
# Created lazily on first request so import-time failures are avoided.
# ---------------------------------------------------------------------------
_http: httpx.AsyncClient | None = None


def _get_http() -> httpx.AsyncClient:
    global _http
    if _http is None or _http.is_closed:
        _http = httpx.AsyncClient(
            timeout=httpx.Timeout(10, connect=5),
            limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
            follow_redirects=True,
        )
    return _http


# ---------------------------------------------------------------------------
# Simple TTL cache (maxsize × entry).  Avoids hitting Google when the user
# is still typing the same prefix or re-searching a recent query.
# ---------------------------------------------------------------------------
_CACHE_TTL = 60          # seconds
_CACHE_MAX = 256         # entries

_autocomplete_cache: OrderedDict[str, tuple[float, list]] = OrderedDict()
_details_cache: OrderedDict[str, tuple[float, dict]] = OrderedDict()


def _cache_get(cache: OrderedDict, key: str):
    entry = cache.get(key)
    if entry is None:
        return None
    ts, val = entry
    if time.monotonic() - ts > _CACHE_TTL:
        cache.pop(key, None)
        return None
    cache.move_to_end(key)
    return val


def _cache_set(cache: OrderedDict, key: str, val, maxsize: int = _CACHE_MAX):
    cache[key] = (time.monotonic(), val)
    cache.move_to_end(key)
    while len(cache) > maxsize:
        cache.popitem(last=False)


# ---------------------------------------------------------------------------
# Shared helpers (Orion, tests, tighter local bias)
# ---------------------------------------------------------------------------

def _location_bias_ok(lat: Optional[float], lng: Optional[float]) -> bool:
    if lat is None or lng is None:
        return False
    if not (-90 <= lat <= 90 and -180 <= lng <= 180):
        return False
    # Skip (0,0) — would skew global results
    if abs(lat) < 1e-5 and abs(lng) < 1e-5:
        return False
    return True


async def fetch_autocomplete_predictions(q: str, lat: Optional[float] = None, lng: Optional[float] = None) -> list:
    """Google Place Autocomplete with optional circular bias; nearest-first when `distance_meters` is present."""
    key = _KEY()
    if not key or not (q or "").strip():
        return []

    cache_key = f"{q.lower().strip()}|{round(lat, 2) if lat is not None else ''}|{round(lng, 2) if lng is not None else ''}"
    cached = _cache_get(_autocomplete_cache, cache_key)
    if cached is not None:
        return cached

    params: dict = {"input": q.strip(), "key": key, "language": "en"}
    if _location_bias_ok(lat, lng):
        params["location"] = f"{lat},{lng}"
        # Tighter local bias + strictbounds so autocomplete stays near the user
        params["radius"] = "25000"
        params["strictbounds"] = "true"

    r = await _get_http().get(f"{_BASE}/autocomplete/json", params=params)
    data = r.json()

    predictions = []
    for p in data.get("predictions", []):
        predictions.append({
            "place_id": p.get("place_id"),
            "name": p.get("structured_formatting", {}).get("main_text", p.get("description", "")),
            "address": p.get("structured_formatting", {}).get("secondary_text", ""),
            "description": p.get("description", ""),
            "types": p.get("types", []),
            "distance_meters": p.get("distance_meters"),
        })

    predictions.sort(
        key=lambda x: (
            x.get("distance_meters") is None,
            x.get("distance_meters") if x.get("distance_meters") is not None else 10**9,
        ),
    )

    if _location_bias_ok(lat, lng):
        predictions = [
            p for p in predictions
            if p.get("distance_meters") is None or p.get("distance_meters") <= 42000
        ]

    _cache_set(_autocomplete_cache, cache_key, predictions)
    return predictions


async def fetch_place_coords_for_orion(place_id: str) -> Optional[dict]:
    """Minimal Place Details for navigation actions (name + lat/lng). Uses details cache when warm."""
    key = _KEY()
    if not key or not place_id:
        return None

    cached = _cache_get(_details_cache, place_id)
    if cached is not None:
        la, ln = cached.get("lat"), cached.get("lng")
        if la is not None and ln is not None:
            return {"name": cached.get("name") or "", "lat": float(la), "lng": float(ln)}

    params = {"place_id": place_id, "fields": "name,geometry", "key": key, "language": "en"}
    r = await _get_http().get(f"{_BASE}/details/json", params=params)
    data = r.json()
    result = data.get("result") or {}
    geo = result.get("geometry", {}).get("location", {})
    la, ln = geo.get("lat"), geo.get("lng")
    if la is None or ln is None:
        return None
    name = result.get("name") or ""
    return {"name": name, "lat": float(la), "lng": float(ln)}


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/autocomplete")
@limiter.limit("60/minute")
async def autocomplete(
    request: Request,
    q: str = Query(..., min_length=1),
    lat: Optional[float] = None,
    lng: Optional[float] = None,
):
    key = _KEY()
    if not key:
        return {"success": False, "error": "Google Places API key not configured", "data": []}

    predictions = await fetch_autocomplete_predictions(q, lat, lng)
    return {"success": True, "data": predictions}


@router.get("/details/{place_id}")
async def place_details(place_id: str):
    key = _KEY()
    if not key:
        return {"success": False, "error": "Google Places API key not configured"}

    cached = _cache_get(_details_cache, place_id)
    if cached is not None:
        return {"success": True, "data": cached}

    fields = (
        "name,formatted_address,formatted_phone_number,geometry,rating,"
        "user_ratings_total,price_level,opening_hours,website,photos,reviews,"
        "types,business_status,url"
    )
    params = {"place_id": place_id, "fields": fields, "key": key, "language": "en"}

    r = await _get_http().get(f"{_BASE}/details/json", params=params)
    data = r.json()

    result = data.get("result", {})
    geo = result.get("geometry", {}).get("location", {})

    photos = []
    for ph in result.get("photos", [])[:10]:
        photos.append({
            "reference": ph.get("photo_reference"),
            "width": ph.get("width"),
            "height": ph.get("height"),
            "attributions": ph.get("html_attributions", []),
        })

    reviews = []
    for rv in result.get("reviews", [])[:5]:
        reviews.append({
            "author": rv.get("author_name", ""),
            "rating": rv.get("rating"),
            "text": rv.get("text", ""),
            "time": rv.get("relative_time_description", ""),
            "profile_photo": rv.get("profile_photo_url", ""),
        })

    hours = result.get("opening_hours", {})

    detail = {
        "place_id": place_id,
        "name": result.get("name", ""),
        "address": result.get("formatted_address", ""),
        "phone": result.get("formatted_phone_number", ""),
        "website": result.get("website", ""),
        "maps_url": result.get("url", ""),
        "lat": geo.get("lat"),
        "lng": geo.get("lng"),
        "rating": result.get("rating"),
        "total_reviews": result.get("user_ratings_total", 0),
        "price_level": result.get("price_level"),
        "types": result.get("types", []),
        "business_status": result.get("business_status", ""),
        "open_now": hours.get("open_now"),
        "hours": hours.get("weekday_text", []),
        "photos": photos,
        "reviews": reviews,
    }
    _cache_set(_details_cache, place_id, detail)
    return {"success": True, "data": detail}


@router.get("/nearby")
async def nearby_places(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    radius: int = Query(50, ge=20, le=50000),
    place_type: Optional[str] = Query(default=None, alias="type", description="Google place type, e.g. gas_station"),
):
    """Return places near a point (for map click). Uses Google Places Nearby Search."""
    key = _KEY()
    if not key:
        return {"success": False, "error": "Google Places API key not configured", "data": []}

    params = {
        "location": f"{lat},{lng}",
        "radius": min(radius, 50000),
        "key": key,
        "language": "en",
    }
    if place_type and place_type.strip():
        params["type"] = place_type.strip()
    r = await _get_http().get(f"{_BASE}/nearbysearch/json", params=params)
    data = r.json()

    raw = []
    for p in data.get("results", [])[:15]:
        geo = p.get("geometry", {}).get("location", {})
        plat = geo.get("lat")
        plng = geo.get("lng")
        if plat is None or plng is None:
            continue
        photos = p.get("photos", [])
        ref = photos[0].get("photo_reference") if photos else None
        raw.append({
            "place_id": p.get("place_id"),
            "name": p.get("name", ""),
            "address": p.get("vicinity", ""),
            "lat": plat,
            "lng": plng,
            "photo_reference": ref,
            "rating": p.get("rating"),
            "types": p.get("types", []),
        })

    def dist_sq(a: dict, b: dict) -> float:
        return (a.get("lat", 0) - b.get("lat", 0)) ** 2 + (a.get("lng", 0) - b.get("lng", 0)) ** 2

    click_point = {"lat": lat, "lng": lng}
    results = sorted(raw, key=lambda r: dist_sq(r, click_point))[:10]

    return {"success": True, "data": results}


@router.get("/photo")
async def place_photo(
    ref: str = Query(..., min_length=1),
    maxwidth: int = Query(400, ge=50, le=1600),
):
    key = _KEY()
    if not key:
        return Response(status_code=503, content="API key not configured")

    url = f"{_BASE}/photo"
    params = {"photoreference": ref, "maxwidth": maxwidth, "key": key}

    r = await _get_http().get(url, params=params)

    content_type = r.headers.get("content-type", "image/jpeg")
    return Response(content=r.content, media_type=content_type, headers={"Cache-Control": "public, max-age=86400"})

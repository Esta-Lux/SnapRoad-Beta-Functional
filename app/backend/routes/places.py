"""
Google Places API proxy.
Keeps the API key server-side and exposes autocomplete, details, and photo endpoints.
Uses a persistent HTTP client for connection pooling and an in-memory TTL cache
to avoid redundant round-trips while the user is typing.
"""

import math
import os
import time
from collections import OrderedDict
from contextlib import asynccontextmanager
from typing import Annotated, Optional

from fastapi import APIRouter, Query, Request, Response
import httpx

from limiter import limiter

router = APIRouter(prefix="/api/places", tags=["Places"])

MSG_GOOGLE_PLACES_KEY_NOT_CONFIGURED = "Google Places API key not configured"

_KEY = lambda: os.environ.get("GOOGLE_PLACES_API_KEY", "")
_BASE = "https://maps.googleapis.com/maps/api/place"

# ---------------------------------------------------------------------------
# Persistent HTTP client — avoids TCP+TLS handshake on every keystroke.
# Created lazily on first request so import-time failures are avoided.
# ---------------------------------------------------------------------------
_http: Optional[httpx.AsyncClient] = None


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

# Bust in-memory details cache when expanding Google `fields` (see place_details).
_DETAILS_CACHE_KEY_VER = "pd4"

# Google Places Details (legacy) — try comprehensive fields first; retry with basic set on INVALID_REQUEST.
_PLACE_DETAILS_FIELDS_BASIC = (
    "name,formatted_address,formatted_phone_number,geometry,rating,"
    "user_ratings_total,price_level,opening_hours,website,photos,reviews,"
    "types,business_status,url"
)
_PLACE_DETAILS_FIELDS_EXTENDED = (
    _PLACE_DETAILS_FIELDS_BASIC
    + ",editorial_summary,"
    "dine_in,delivery,takeout,curbside_pickup,reservable,"
    "serves_beer,serves_wine,serves_breakfast,serves_lunch,serves_dinner,"
    "wheelchair_accessible_entrance,outdoor_seating,live_music,"
    "good_for_children,good_for_groups,payment_options,parking_options"
)


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


def _haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371000.0
    p1 = math.radians(lat1)
    p2 = math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(min(1.0, math.sqrt(a)))


async def fetch_text_search_predictions(
    q: str,
    lat: float,
    lng: float,
    radius_m: int,
    open_now: bool,
) -> list:
    """Place Text Search biased to a circle; supports opennow filter (legacy API)."""
    key = _KEY()
    if not key or not (q or "").strip():
        return []

    rad = int(min(max(radius_m, 1000), 50000))
    cache_key = f"ts|{q.lower().strip()}|{round(lat, 3)}|{round(lng, 3)}|{rad}|{int(open_now)}"
    cached = _cache_get(_textsearch_cache, cache_key)
    if cached is not None:
        return cached

    params: dict = {
        "query": q.strip(),
        "location": f"{lat},{lng}",
        "radius": str(rad),
        "key": key,
        "language": "en",
    }
    if open_now:
        params["opennow"] = "true"

    r = await _get_http().get(f"{_BASE}/textsearch/json", params=params)
    data = r.json()
    status = data.get("status")
    if status not in ("OK", "ZERO_RESULTS"):
        _cache_set(_textsearch_cache, cache_key, [])
        return []

    out: list = []
    for item in data.get("results", [])[:20]:
        geo = item.get("geometry", {}).get("location", {})
        plat = geo.get("lat")
        plng = geo.get("lng")
        if plat is None or plng is None:
            continue
        try:
            dist = _haversine_m(lat, lng, float(plat), float(plng))
        except (TypeError, ValueError):
            dist = None
        oh = item.get("opening_hours") or {}
        out.append({
            "place_id": item.get("place_id"),
            "name": item.get("name", ""),
            "address": item.get("formatted_address", ""),
            "description": item.get("formatted_address", ""),
            "types": item.get("types", []),
            "lat": float(plat),
            "lng": float(plng),
            "distance_meters": int(dist) if dist is not None else None,
            "open_now": oh.get("open_now"),
        })
    out.sort(
        key=lambda x: (
            x.get("distance_meters") is None,
            x.get("distance_meters") if x.get("distance_meters") is not None else 10**9,
        ),
    )
    out = out[:15]
    _cache_set(_textsearch_cache, cache_key, out)
    return out


async def fetch_autocomplete_predictions(
    q: str,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    radius_m: int = 18000,
) -> list:
    """Google Place Autocomplete with optional circular bias; nearest-first when `distance_meters` is present."""
    key = _KEY()
    if not key or not (q or "").strip():
        return []

    r_clamped = int(min(max(radius_m, 3000), 50000))
    cache_key = (
        f"{q.lower().strip()}|{round(lat, 2) if lat is not None else ''}|"
        f"{round(lng, 2) if lng is not None else ''}|r{r_clamped}"
    )
    cached = _cache_get(_autocomplete_cache, cache_key)
    if cached is not None:
        return cached

    params: dict = {"input": q.strip(), "key": key, "language": "en"}
    if _location_bias_ok(lat, lng):
        params["location"] = f"{lat},{lng}"
        params["radius"] = str(r_clamped)
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

    _cache_set(_autocomplete_cache, cache_key, predictions)
    return predictions


async def fetch_place_coords_for_orion(place_id: str) -> Optional[dict]:
    """Minimal Place Details for navigation actions (name + lat/lng). Uses details cache when warm."""
    key = _KEY()
    if not key or not place_id:
        return None

    cache_key = f"{place_id}\x1f{_DETAILS_CACHE_KEY_VER}"
    cached = _cache_get(_details_cache, cache_key)
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
    q: Annotated[str, Query(..., min_length=1)],
    lat: Annotated[Optional[float], Query()] = None,
    lng: Annotated[Optional[float], Query()] = None,
    radius: Annotated[
        Optional[int],
        Query(ge=3000, le=50000, description="Location bias radius in meters (autocomplete / text search)"),
    ] = None,
    open_now: Annotated[
        bool,
        Query(description="If true and lat/lng set, uses Text Search with opennow (otherwise ignored)"),
    ] = False,
    textsearch: Annotated[
        bool,
        Query(
            description=(
                "If true and lat/lng set, uses Place Text Search (distance-ranked) instead of Autocomplete"
            ),
        ),
    ] = False,
):
    key = _KEY()
    if not key:
        return {"success": False, "error": MSG_GOOGLE_PLACES_KEY_NOT_CONFIGURED, "data": []}

    radius_m = radius if radius is not None else 18000
    use_text = _location_bias_ok(lat, lng) and (open_now or textsearch)
    if use_text:
        predictions = await fetch_text_search_predictions(
            q, float(lat), float(lng), radius_m, open_now,
        )
    else:
        predictions = await fetch_autocomplete_predictions(q, lat, lng, radius_m)
    return {"success": True, "data": predictions}


def _build_place_detail(place_id: str, result: dict) -> dict:
    geo = result.get("geometry", {}).get("location", {})
    hours = result.get("opening_hours") or {}

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
            "author_name": rv.get("author_name", ""),
            "rating": rv.get("rating"),
            "text": rv.get("text", ""),
            "time": rv.get("relative_time_description", ""),
            "relative_time_description": rv.get("relative_time_description", ""),
            "profile_photo": rv.get("profile_photo_url", ""),
        })

    es = result.get("editorial_summary")
    if isinstance(es, dict):
        editorial = es.get("overview") or ""
    else:
        editorial = es if isinstance(es, str) else ""

    pay = result.get("payment_options") if isinstance(result.get("payment_options"), dict) else {}
    park = result.get("parking_options") if isinstance(result.get("parking_options"), dict) else {}

    attributes = {
        "dine_in": result.get("dine_in"),
        "delivery": result.get("delivery"),
        "takeout": result.get("takeout"),
        "curbside_pickup": result.get("curbside_pickup"),
        "reservable": result.get("reservable"),
        "serves_beer": result.get("serves_beer"),
        "serves_wine": result.get("serves_wine"),
        "serves_breakfast": result.get("serves_breakfast"),
        "serves_lunch": result.get("serves_lunch"),
        "serves_dinner": result.get("serves_dinner"),
        "wheelchair_accessible": result.get("wheelchair_accessible_entrance"),
        "good_for_groups": result.get("good_for_groups"),
        "good_for_children": result.get("good_for_children"),
        "outdoor_seating": result.get("outdoor_seating"),
        "live_music": result.get("live_music"),
        "accepts_credit_cards": pay.get("acceptsCreditCards"),
        "accepts_apple_pay": pay.get("acceptsApplePay"),
        "accepts_contactless": pay.get("acceptsNfc"),
        "parking_lot": bool(park.get("paidParkingLot") or park.get("freeParkingLot")),
        "free_parking": bool(park.get("freeParkingLot") or park.get("freeStreetParking")),
    }

    return {
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
        "opening_hours": hours,
        "photos": photos,
        "reviews": reviews,
        "editorial_summary": editorial,
        "attributes": attributes,
        "payment_options": pay or None,
        "parking_options": park or None,
    }


@router.get("/details/{place_id}")
async def place_details(place_id: str):
    key = _KEY()
    if not key:
        return {"success": False, "error": MSG_GOOGLE_PLACES_KEY_NOT_CONFIGURED}

    cache_key = f"{place_id}\x1f{_DETAILS_CACHE_KEY_VER}"
    cached = _cache_get(_details_cache, cache_key)
    if cached is not None:
        return {"success": True, "data": cached}

    async def _fetch(fields: str) -> dict:
        params = {"place_id": place_id, "fields": fields, "key": key, "language": "en"}
        r = await _get_http().get(f"{_BASE}/details/json", params=params)
        return r.json()

    data = await _fetch(_PLACE_DETAILS_FIELDS_EXTENDED)
    status = data.get("status")
    if status == "INVALID_REQUEST":
        data = await _fetch(_PLACE_DETAILS_FIELDS_BASIC)
        status = data.get("status")

    if status != "OK":
        err = data.get("error_message") or status or "Place details failed"
        return {"success": False, "error": err}

    result = data.get("result") or {}
    detail = _build_place_detail(place_id, result)
    _cache_set(_details_cache, cache_key, detail)
    return {"success": True, "data": detail}


@router.get("/nearby")
async def nearby_places(
    lat: Annotated[float, Query(..., ge=-90, le=90)],
    lng: Annotated[float, Query(..., ge=-180, le=180)],
    radius: Annotated[int, Query(ge=20, le=50000)] = 50,
    limit: Annotated[int, Query(ge=1, le=30)] = 10,
    place_type: Annotated[
        Optional[str],
        Query(alias="type", description="Google place type, e.g. gas_station"),
    ] = None,
):
    """Return places near a point (for map click). Uses Google Places Nearby Search."""
    key = _KEY()
    if not key:
        return {"success": False, "error": MSG_GOOGLE_PLACES_KEY_NOT_CONFIGURED, "data": []}

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
    # First page returns at most ~20 POIs
    for p in data.get("results", [])[:20]:
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
    take = min(max(limit, 1), 30)
    results = sorted(raw, key=lambda r: dist_sq(r, click_point))[:take]

    return {"success": True, "data": results}


@router.get("/photo")
async def place_photo(
    ref: Annotated[str, Query(..., min_length=1)],
    maxwidth: Annotated[int, Query(ge=50, le=1600)] = 400,
):
    key = _KEY()
    if not key:
        return Response(status_code=503, content="API key not configured")

    url = f"{_BASE}/photo"
    params = {"photoreference": ref, "maxwidth": maxwidth, "key": key}

    r = await _get_http().get(url, params=params)

    content_type = r.headers.get("content-type", "image/jpeg")
    return Response(content=r.content, media_type=content_type, headers={"Cache-Control": "public, max-age=86400"})

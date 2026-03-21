"""
Google Places API proxy.
Keeps the API key server-side and exposes autocomplete, details, and photo endpoints.
"""

import os
from fastapi import APIRouter, Query, Request, Response
from typing import Optional
import httpx

from limiter import limiter

router = APIRouter(prefix="/api/places", tags=["Places"])

_KEY = lambda: os.environ.get("GOOGLE_PLACES_API_KEY", "")
_BASE = "https://maps.googleapis.com/maps/api/place"


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

    params: dict = {
        "input": q,
        "key": key,
        "types": "establishment|geocode",
        "language": "en",
    }
    if lat is not None and lng is not None:
        params["location"] = f"{lat},{lng}"
        params["radius"] = "50000"

    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(f"{_BASE}/autocomplete/json", params=params)
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

    return {"success": True, "data": predictions}


@router.get("/details/{place_id}")
async def place_details(place_id: str):
    key = _KEY()
    if not key:
        return {"success": False, "error": "Google Places API key not configured"}

    fields = (
        "name,formatted_address,formatted_phone_number,geometry,rating,"
        "user_ratings_total,price_level,opening_hours,website,photos,reviews,"
        "types,business_status,url"
    )
    params = {"place_id": place_id, "fields": fields, "key": key, "language": "en"}

    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(f"{_BASE}/details/json", params=params)
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

    return {
        "success": True,
        "data": {
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
        },
    }


@router.get("/nearby")
async def nearby_places(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    radius: int = Query(100, ge=20, le=5000),
):
    """Return places near a point (for map click). Uses Google Places Nearby Search."""
    key = _KEY()
    if not key:
        return {"success": False, "error": "Google Places API key not configured", "data": []}

    params = {
        "location": f"{lat},{lng}",
        "radius": radius,
        "key": key,
        "language": "en",
    }
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(f"{_BASE}/nearbysearch/json", params=params)
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

    # Sort by distance from click so the POI under the tap is first (fixes wrong destination)
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

    async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
        r = await client.get(url, params=params)

    content_type = r.headers.get("content-type", "image/jpeg")
    return Response(content=r.content, media_type=content_type, headers={"Cache-Control": "public, max-age=86400"})

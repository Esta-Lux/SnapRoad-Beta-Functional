"""
Google Directions API proxy.
Returns route polyline, steps, distance and duration in the shape expected by the frontend (DirectionsResult).
"""

import os
import re
from fastapi import APIRouter, Query, Request
from typing import List, Any
import httpx

from limiter import limiter


def _decode_polyline(encoded: str) -> List[dict]:
    """Decode Google's encoded polyline to list of {lat, lng}."""
    if not encoded:
        return []
    points = []
    index = 0
    lat = 0
    lng = 0
    while index < len(encoded):
        b = 0
        shift = 0
        result = 0
        while True:
            b = ord(encoded[index]) - 63
            index += 1
            result |= (b & 0x1F) << shift
            shift += 5
            if b < 0x20:
                break
        dlat = ~(result >> 1) if result & 1 else result >> 1
        lat += dlat

        shift = 0
        result = 0
        while True:
            b = ord(encoded[index]) - 63
            index += 1
            result |= (b & 0x1F) << shift
            shift += 5
            if b < 0x20:
                break
        dlng = ~(result >> 1) if result & 1 else result >> 1
        lng += dlng
        points.append({"lat": lat / 1e5, "lng": lng / 1e5})
    return points


def _normalize_maneuver(maneuver: str) -> str:
    if not maneuver:
        return "straight"
    lower = maneuver.lower().replace("-", " ").replace("_", " ")
    if "right" in lower and "slight" in lower:
        return "slight-right"
    if "left" in lower and "slight" in lower:
        return "slight-left"
    if "right" in lower and "sharp" in lower:
        return "sharp-right"
    if "left" in lower and "sharp" in lower:
        return "sharp-left"
    if "right" in lower:
        return "turn-right"
    if "left" in lower:
        return "turn-left"
    if "u-turn" in lower or "uturn" in lower:
        return "u-turn"
    if "merge" in lower:
        return "merge"
    if "arrive" in lower or "destination" in lower:
        return "arrive"
    return "straight"


router = APIRouter(prefix="/api", tags=["Directions"])

_DIRECTIONS_KEY = lambda: os.environ.get("GOOGLE_PLACES_API_KEY", "") or os.environ.get("GOOGLE_MAPS_API_KEY", "")


@router.get("/directions")
@limiter.limit("30/minute")
async def get_directions(
    request: Request,
    origin_lat: float = Query(..., description="Origin latitude"),
    origin_lng: float = Query(..., description="Origin longitude"),
    dest_lat: float = Query(..., description="Destination latitude"),
    dest_lng: float = Query(..., description="Destination longitude"),
):
    """
    Proxy to Google Directions API. Returns one or more routes with polyline, steps,
    distanceMeters, expectedTravelTimeSeconds — same shape as frontend DirectionsResult.
    """
    key = _DIRECTIONS_KEY()
    if not key:
        return {"success": False, "error": "Google API key not configured", "data": []}

    url = "https://maps.googleapis.com/maps/api/directions/json"
    params = {
        "origin": f"{origin_lat},{origin_lng}",
        "destination": f"{dest_lat},{dest_lng}",
        "key": key,
        "mode": "driving",
        "alternatives": "true",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.get(url, params=params)
            r.raise_for_status()
            data = r.json()
    except Exception as e:
        return {"success": False, "error": str(e), "data": []}

    if data.get("status") != "OK":
        return {"success": False, "error": data.get("status", "UNKNOWN"), "data": []}

    routes_out: List[Any] = []
    for route in data.get("routes", [])[:3]:
        legs = route.get("legs", [])
        if not legs:
            continue
        all_steps = []
        distance_meters = 0
        duration_seconds = 0
        for leg in legs:
            for s in leg.get("steps", []):
                dist = s.get("distance", {}).get("value", 0)
                dur = s.get("duration", {}).get("value", 0)
                distance_meters += dist
                duration_seconds += dur
                maneuver = s.get("maneuver", "") or ""
                html = s.get("html_instructions", "Continue")
                text = re.sub(r"<[^>]+>", "", html) if html else "Continue"
                lanes_raw = s.get("lanes", [])
                lane_hint = None
                if lanes_raw:
                    indications = []
                    for lane in lanes_raw:
                        for ind in lane.get("indications", []) or []:
                            if ind and ind not in indications:
                                indications.append(ind)
                    if indications:
                        lane_hint = "Use lanes: " + ", ".join(indications[:4])
                all_steps.append({
                    "instructions": text or "Continue",
                    "distance": dist,
                    "maneuver": _normalize_maneuver(maneuver),
                    "lanes": lane_hint,
                })
        overview = route.get("overview_polyline", {}).get("points", "")
        polyline = _decode_polyline(overview)
        if not polyline and legs:
            # Build polyline from steps start/end
            polyline = []
            for leg in legs:
                for s in leg.get("steps", []):
                    start = s.get("start_location", {})
                    if start:
                        polyline.append({"lat": start.get("lat"), "lng": start.get("lng")})
                end = leg.get("end_location", {})
                if end:
                    polyline.append({"lat": end.get("lat"), "lng": end.get("lng")})
        if not polyline:
            polyline = [{"lat": origin_lat, "lng": origin_lng}, {"lat": dest_lat, "lng": dest_lng}]
        routes_out.append({
            "polyline": polyline,
            "steps": all_steps,
            "distanceMeters": distance_meters,
            "expectedTravelTimeSeconds": duration_seconds,
            "name": route.get("summary", "Route"),
        })

    return {"success": True, "data": routes_out}

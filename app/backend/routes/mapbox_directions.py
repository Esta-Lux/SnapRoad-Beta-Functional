"""
Mapbox Directions proxy — single server-side token for driving routes.
Returns raw Mapbox JSON (`routes`, etc.) so the mobile client can parse identically
to direct Mapbox calls. Falls back to client token when this env is unset.
"""

from __future__ import annotations

import time
from typing import Annotated, Any, Optional
from urllib.parse import quote

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from config import TOMTOM_API_KEY
from config import mapbox_token_from_env
from limiter import get_mapbox_rate_limit_key, limiter
from middleware.auth import get_current_user

router = APIRouter(prefix="/api/navigation", tags=["Navigation / Mapbox"])

CurrentUser = Annotated[dict, Depends(get_current_user)]

_http: Optional[httpx.AsyncClient] = None

DIRECTIONS_BASE = "https://api.mapbox.com/directions/v5/mapbox"
BANNER_VOICE_QS = (
    "banner_instructions=true&voice_instructions=true&voice_units=imperial"
)
TOMTOM_ROUTING_BASE = "https://api.tomtom.com/routing/1/calculateRoute"


def _mapbox_token() -> str:
    return mapbox_token_from_env()


def _get_http() -> httpx.AsyncClient:
    global _http
    if _http is None or _http.is_closed:
        _http = httpx.AsyncClient(
            timeout=httpx.Timeout(25, connect=8),
            limits=httpx.Limits(max_connections=24, max_keepalive_connections=12),
            follow_redirects=True,
        )
    return _http


class CanonicalEtaBody(BaseModel):
    """Mobile Phase 4 hook — server-authoritative ETA snapshot (stub until Mapbox server-side refresh lands)."""

    route_version: int = Field(default=0, ge=0)
    remaining_seconds_hint: float = Field(default=0, ge=0)
    polyline_hash: Optional[str] = None


class MapboxRoutesBody(BaseModel):
    origin_lat: float = Field(..., ge=-90, le=90)
    origin_lng: float = Field(..., ge=-180, le=180)
    dest_lat: float = Field(..., ge=-90, le=90)
    dest_lng: float = Field(..., ge=-180, le=180)
    profile: str = Field(
        default="driving-traffic",
        description="driving-traffic, driving, or walking (Mapbox Directions v5)",
    )
    exclude: Optional[str] = None
    max_height_m: Optional[float] = Field(default=None, ge=0, le=10)
    alternatives: bool = True
    # Client-supplied epoch ms — not sent to Mapbox; avoids stale identical OD POST bodies behind intermediaries.
    cache_bust_ms: Optional[int] = Field(default=None)


def _tt_points(route: dict[str, Any]) -> list[dict[str, float]]:
    out: list[dict[str, float]] = []
    for leg in route.get("legs") or []:
        for p in leg.get("points") or []:
            lat = p.get("latitude")
            lng = p.get("longitude")
            if isinstance(lat, (int, float)) and isinstance(lng, (int, float)):
                out.append({"lat": float(lat), "lng": float(lng)})
    return out


def _tt_maneuver(m: str) -> str:
    s = str(m or "").lower()
    if "left" in s:
        return "turn-left"
    if "right" in s:
        return "turn-right"
    if "uturn" in s or "u_turn" in s:
        return "u-turn"
    if "roundabout" in s:
        return "roundabout"
    if "arrive" in s:
        return "arrive"
    if "merge" in s:
        return "merge"
    return "straight"


def _tt_steps(route: dict[str, Any]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    instructions = (route.get("guidance") or {}).get("instructions") or []
    route_len = float((route.get("summary") or {}).get("lengthInMeters") or 0)
    offsets = [max(0.0, float(ins.get("routeOffsetInMeters") or 0)) for ins in instructions]
    times = [max(0.0, float(ins.get("travelTimeInSeconds") or 0)) for ins in instructions]
    for idx, ins in enumerate(instructions):
        p = ins.get("point") or {}
        lat = p.get("latitude")
        lng = p.get("longitude")
        offset = offsets[idx] if idx < len(offsets) else 0.0
        next_offset = offsets[idx + 1] if idx + 1 < len(offsets) else route_len
        travel_t = times[idx] if idx < len(times) else 0.0
        next_t = times[idx + 1] if idx + 1 < len(times) else travel_t
        out.append(
            {
                "instruction": str(ins.get("message") or ins.get("street") or "Continue"),
                "distanceMeters": max(0, next_offset - offset),
                "durationSeconds": max(0, next_t - travel_t),
                "maneuver": _tt_maneuver(str(ins.get("maneuver") or "")),
                "lat": float(lat) if isinstance(lat, (int, float)) else 0,
                "lng": float(lng) if isinstance(lng, (int, float)) else 0,
            }
        )
    return out


def _traffic_score(delay_sec: float, travel_sec: float) -> float:
    if travel_sec <= 0:
        return 0.0
    return max(0.0, min(1.0, delay_sec / max(60.0, travel_sec)))


def _normalize_tomtom_route(route: dict[str, Any], idx: int) -> dict[str, Any] | None:
    summary = route.get("summary") or {}
    distance_m = float(summary.get("lengthInMeters") or 0)
    duration_s = float(summary.get("travelTimeInSeconds") or 0)
    if distance_m <= 0 or duration_s <= 0:
        return None
    delay_s = max(0.0, float(summary.get("trafficDelayInSeconds") or 0))
    no_traffic_s = max(0.0, float(summary.get("noTrafficTravelTimeInSeconds") or 0))
    points = _tt_points(route)
    if len(points) < 2:
        return None
    label = "TomTom Traffic" if idx == 0 else f"TomTom Alt {idx}"
    reason = "Live TomTom traffic"
    if delay_s >= 120:
        reason = f"TomTom live traffic · {round(delay_s / 60)} min delay"
    return {
        "provider": "tomtom",
        "polyline": points,
        "steps": _tt_steps(route),
        "distance": distance_m,
        "duration": duration_s,
        "routeType": "alt" if idx else "fastest",
        "routeLabel": label,
        "routeReason": reason,
        "congestionScore": _traffic_score(delay_s, duration_s),
        "trafficDelaySeconds": delay_s,
        "noTrafficDurationSeconds": no_traffic_s,
    }


@router.post("/mapbox-routes")
@limiter.limit("45/minute", key_func=get_mapbox_rate_limit_key)
async def post_mapbox_routes(
    request: Request,
    body: MapboxRoutesBody,
    _user: CurrentUser,
) -> Any:
    """
    Proxy to Mapbox Directions API. Response shape matches Mapbox's JSON (routes, waypoints, …).
    Configure MAPBOX_ACCESS_TOKEN (or MAPBOX_SECRET_TOKEN / MAPBOX_PUBLIC_TOKEN / MAPBOX_TOKEN) on the server.
    """
    token = _mapbox_token()
    if not token:
        raise HTTPException(
            status_code=503,
            detail="Mapbox token not configured on server (set MAPBOX_ACCESS_TOKEN or MAPBOX_TOKEN)",
        )

    prof = body.profile if body.profile in ("driving-traffic", "driving", "walking") else "driving-traffic"
    coords_path = f"{body.origin_lng},{body.origin_lat};{body.dest_lng},{body.dest_lat}"
    token_qs = f"access_token={quote(token, safe='')}"
    alt = "true" if body.alternatives else "false"

    if prof == "walking":
        # Pedestrian graph: no vehicle height / toll exclusions; lighter annotations for reliability on slow links.
        common = (
            f"{token_qs}&geometries=geojson&overview=full&steps=true&language=en"
            f"&annotations=duration,distance&{BANNER_VOICE_QS}"
        )
        url = f"{DIRECTIONS_BASE}/walking/{coords_path}?{common}&alternatives=false"
    else:
        max_h = ""
        if body.max_height_m is not None and body.max_height_m > 0:
            max_h = f"&max_height={min(10.0, float(body.max_height_m))}"
        excl = f"&exclude={body.exclude}" if body.exclude else ""
        common = (
            f"{token_qs}&geometries=geojson&overview=full&steps=true&language=en"
            f"&annotations=congestion,maxspeed,speed,duration&{BANNER_VOICE_QS}{max_h}{excl}"
        )
        url = f"{DIRECTIONS_BASE}/{prof}/{coords_path}?{common}&alternatives={alt}"

    client = _get_http()
    try:
        r = await client.get(url, headers={"Cache-Control": "no-cache"})
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Mapbox request failed: {e!s}") from e

    if not r.is_success:
        raise HTTPException(status_code=r.status_code, detail=r.text[:500] if r.text else "Mapbox error")

    try:
        data = r.json()
    except ValueError as e:
        raise HTTPException(status_code=502, detail="Invalid JSON from Mapbox") from e

    if not isinstance(data, dict) or not data.get("routes"):
        msg = data.get("message") if isinstance(data, dict) else "No routes"
        raise HTTPException(status_code=404, detail=str(msg or "No routes"))

    return data


@router.post("/tomtom-routes")
@limiter.limit("45/minute", key_func=get_mapbox_rate_limit_key)
async def post_tomtom_routes(
    request: Request,
    body: MapboxRoutesBody,
    _user: CurrentUser,
) -> Any:
    """
    TomTom traffic-aware route candidate feed. Used as an additional routing signal
    beside Mapbox so SnapRoad can prefer cleaner roads when TomTom sees live delay.
    """
    if not TOMTOM_API_KEY:
        raise HTTPException(status_code=503, detail="TomTom key not configured")
    if body.profile == "walking":
        return {"routes": [], "provider": "tomtom"}

    locations = f"{body.origin_lat},{body.origin_lng}:{body.dest_lat},{body.dest_lng}"
    url = f"{TOMTOM_ROUTING_BASE}/{quote(locations, safe=':,')}/json"
    params: dict[str, Any] = {
        "key": TOMTOM_API_KEY,
        "traffic": "true",
        "routeType": "fastest",
        "travelMode": "car",
        "routeRepresentation": "polyline",
        "computeTravelTimeFor": "all",
        "instructionsType": "text",
        "language": "en-US",
        "sectionType": "traffic",
        "maxAlternatives": "2" if body.alternatives else "0",
    }
    if body.exclude == "toll":
        params["avoid"] = "tollRoads"
    elif body.exclude == "motorway":
        params["avoid"] = "motorways"

    client = _get_http()
    try:
        r = await client.get(url, params=params, headers={"Cache-Control": "no-cache"})
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"TomTom request failed: {e!s}") from e

    if not r.is_success:
        raise HTTPException(status_code=r.status_code, detail=r.text[:500] if r.text else "TomTom error")
    try:
        data = r.json()
    except ValueError as e:
        raise HTTPException(status_code=502, detail="Invalid JSON from TomTom") from e

    routes = data.get("routes") if isinstance(data, dict) else None
    if not isinstance(routes, list):
        return {"routes": [], "provider": "tomtom"}
    normalized = [x for i, route in enumerate(routes[:3]) if (x := _normalize_tomtom_route(route, i))]
    return {"routes": normalized, "provider": "tomtom"}


@router.post("/canonical-eta")
@limiter.limit("60/minute", key_func=get_mapbox_rate_limit_key)
async def post_canonical_eta_snapshot(
    request: Request,
    body: CanonicalEtaBody,
    _user: CurrentUser,
) -> Any:
    """
    Versioned ETA snapshot contract for multi-surface alignment (Orion, strip, speech).
    Stub: echoes hint until server-side traffic refresh is implemented.
    """
    now_ms = int(time.time() * 1000)
    rem = max(0.0, float(body.remaining_seconds_hint))
    ttl_sec = 45
    return {
        "success": True,
        "data": {
            "routeVersion": int(body.route_version),
            "remainingSeconds": rem,
            "etaEpochMs": now_ms + int(rem * 1000),
            "source": "stub",
            "ttlSec": ttl_sec,
        },
    }

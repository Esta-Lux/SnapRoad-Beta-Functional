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
    profile: str = Field(default="driving-traffic", description="driving-traffic or driving")
    exclude: Optional[str] = None
    max_height_m: Optional[float] = Field(default=None, ge=0, le=10)
    alternatives: bool = True


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

    prof = body.profile if body.profile in ("driving-traffic", "driving") else "driving-traffic"
    coords_path = f"{body.origin_lng},{body.origin_lat};{body.dest_lng},{body.dest_lat}"
    max_h = ""
    if body.max_height_m is not None and body.max_height_m > 0:
        max_h = f"&max_height={min(10.0, float(body.max_height_m))}"
    excl = f"&exclude={body.exclude}" if body.exclude else ""
    alt = "true" if body.alternatives else "false"
    token_qs = f"access_token={quote(token, safe='')}"
    common = (
        f"{token_qs}&geometries=geojson&overview=full&steps=true&language=en"
        f"&annotations=congestion,maxspeed,speed,duration&{BANNER_VOICE_QS}{max_h}{excl}"
    )
    url = f"{DIRECTIONS_BASE}/{prof}/{coords_path}?{common}&alternatives={alt}"

    client = _get_http()
    try:
        r = await client.get(url)
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

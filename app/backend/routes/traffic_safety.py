"""
Proxied OpenStreetMap traffic safety POIs (e.g. speed cameras). Regional gating for store policy.
"""
import json
import logging
import math
import os
import time
from typing import Any, Dict, List, Optional, Tuple

import requests
from cachetools import TTLCache
from fastapi import APIRouter, Query, Request

from limiter import limiter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["traffic_safety"])

OVERPASS_URL = (os.environ.get("OVERPASS_URL") or "https://overpass-api.de/api/interpreter").strip()
OVERPASS_FALLBACK_URL = (os.environ.get("OVERPASS_FALLBACK_URL") or "").strip()

ZONES_CACHE: TTLCache = TTLCache(maxsize=512, ttl=int(os.environ.get("TRAFFIC_SAFETY_CACHE_TTL_SECONDS") or "86400"))

RESTRICTED_REGION_CODES = frozenset(
    x.strip().upper()
    for x in (os.environ.get("TRAFFIC_SAFETY_RESTRICTED_REGIONS") or "FR,CH,DE,VA,DC").split(",")
    if x.strip()
)

_backoff_until: float = 0.0
_backoff_seconds: float = 0.0


def _normalized_region(region: Optional[str]) -> Optional[str]:
    if not region or not str(region).strip():
        return None
    u = str(region).strip().upper()
    if u in RESTRICTED_REGION_CODES:
        return u
    if "-" in u:
        parts = u.split("-")
        if len(parts) == 2 and parts[0] == "US" and parts[1] in RESTRICTED_REGION_CODES:
            return parts[1]
    return None


def _bbox_from_center(lat: float, lng: float, radius_km: float) -> Tuple[float, float, float, float]:
    r = max(0.5, min(radius_km, 50.0))
    lat_d = r / 111.0
    cos_lat = max(0.2, math.cos(math.radians(lat)))
    lng_d = r / (111.0 * cos_lat)
    south, north = lat - lat_d, lat + lat_d
    west, east = lng - lng_d, lng + lng_d
    return south, west, north, east


def _overpass_speed_cameras(south: float, west: float, north: float, east: float) -> str:
    return f"""
[out:json][timeout:25];
(
  node["highway"="speed_camera"]({south},{west},{north},{east});
);
out body;
""".strip()


def _parse_zones(elements: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    for el in elements or []:
        if not isinstance(el, dict) or el.get("type") != "node":
            continue
        lat, lon = el.get("lat"), el.get("lon")
        if not (isinstance(lat, (int, float)) and isinstance(lon, (int, float))):
            continue
        eid = el.get("id")
        tags = el.get("tags") or {}
        out.append(
            {
                "id": f"osm-sc-{eid}",
                "lat": float(lat),
                "lng": float(lon),
                "kind": "speed_camera",
                "maxspeed": tags.get("maxspeed") if isinstance(tags, dict) else None,
                "direction": tags.get("direction") if isinstance(tags, dict) else None,
            }
        )
    return out


@router.get("/traffic-safety/zones")
@limiter.limit("30/minute")
def get_traffic_safety_zones(
    request: Request,
    lat: float = Query(..., description="Center latitude"),
    lng: float = Query(..., description="Center longitude"),
    radius_km: float = Query(5, ge=0.5, le=50, description="Search radius in km"),
    region: str = Query("", description="Device/subdivision code (e.g. FR, US-VA) for policy gating"),
):
    nr = _normalized_region(region)
    if nr:
        return {
            "success": True,
            "disabled": True,
            "reason": "region_restricted",
            "zones": [],
            "disclaimer": "This layer is not available in your region.",
        }

    south, west, north, east = _bbox_from_center(lat, lng, radius_km)
    cache_key = json.dumps(
        {
            "lat": round(lat, 3),
            "lng": round(lng, 3),
            "r": round(radius_km, 1),
        },
        sort_keys=True,
    )
    cached = ZONES_CACHE.get(cache_key)
    if cached is not None:
        return cached

    global _backoff_until, _backoff_seconds
    if time.time() < _backoff_until:
        out = {
            "success": True,
            "limited": True,
            "reason": "rate_limited",
            "retry_after_seconds": int(_backoff_until - time.time()) + 1,
            "zones": [],
            "disclaimer": "Data may be incomplete. Always obey posted speed limits.",
        }
        return out

    q = _overpass_speed_cameras(south, west, north, east)
    urls = [OVERPASS_URL]
    if OVERPASS_FALLBACK_URL:
        urls.append(OVERPASS_FALLBACK_URL)

    zones: List[Dict[str, Any]] = []
    for url in urls:
        try:
            resp = requests.post(
                url,
                data={"data": q},
                timeout=25,
                headers={"User-Agent": "SnapRoad/1.0 (traffic safety Overpass proxy)"},
            )
            if resp.status_code == 429:
                _backoff_seconds = min(max(_backoff_seconds * 2, 15), 120)
                _backoff_until = time.time() + _backoff_seconds
                logger.warning("Overpass 429 (traffic safety) — backing off %ss", _backoff_seconds)
                break
            resp.raise_for_status()
            _backoff_seconds = 0.0
            payload = resp.json()
            elements = payload.get("elements") if isinstance(payload, dict) else []
            zones = _parse_zones(elements if isinstance(elements, list) else [])
            break
        except Exception as e:
            logger.warning("traffic-safety Overpass failed (%s): %s", url, e)

    out = {
        "success": True,
        "limited": len(zones) == 0,
        "zones": zones,
        "disclaimer": "Open data may be incomplete or outdated. This is for driver awareness only; always obey posted limits and signs.",
    }
    ZONES_CACHE[cache_key] = out
    return out

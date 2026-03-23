import os
import math
import time
import json
import logging
from typing import Any, Dict, List, Optional, Tuple

import requests
from cachetools import TTLCache
from fastapi import APIRouter, Query

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["OSM"])

OVERPASS_URL = (os.environ.get("OVERPASS_URL") or "https://overpass-api.de/api/interpreter").strip()

# Cache Overpass responses briefly to reduce load and latency.
_cache: TTLCache = TTLCache(maxsize=256, ttl=int(os.environ.get("OVERPASS_CACHE_TTL_SECONDS") or "90"))


def _round_bbox(b: Tuple[float, float, float, float], digits: int = 3) -> Tuple[float, float, float, float]:
    return tuple(round(x, digits) for x in b)  # type: ignore[return-value]


def _parse_bbox(bbox: str) -> Optional[Tuple[float, float, float, float]]:
    """
    bbox format: minLng,minLat,maxLng,maxLat
    """
    try:
        parts = [p.strip() for p in bbox.split(",")]
        if len(parts) != 4:
            return None
        min_lng, min_lat, max_lng, max_lat = (float(parts[0]), float(parts[1]), float(parts[2]), float(parts[3]))
        if not (math.isfinite(min_lng) and math.isfinite(min_lat) and math.isfinite(max_lng) and math.isfinite(max_lat)):
            return None
        # Normalize ordering
        if max_lng < min_lng:
            min_lng, max_lng = max_lng, min_lng
        if max_lat < min_lat:
            min_lat, max_lat = max_lat, min_lat
        # Clamp to valid world bounds
        min_lng = max(-180.0, min(180.0, min_lng))
        max_lng = max(-180.0, min(180.0, max_lng))
        min_lat = max(-90.0, min(90.0, min_lat))
        max_lat = max(-90.0, min(90.0, max_lat))
        return (min_lng, min_lat, max_lng, max_lat)
    except Exception:
        return None


def _bbox_area_degrees(b: Tuple[float, float, float, float]) -> float:
    min_lng, min_lat, max_lng, max_lat = b
    return max(0.0, (max_lng - min_lng)) * max(0.0, (max_lat - min_lat))


def _overpass_query(
    b: Tuple[float, float, float, float],
    include_signals: bool,
    include_stops: bool,
    include_sidewalks: bool,
) -> str:
    """
    Overpass bbox is: (south,west,north,east) => (minLat,minLng,maxLat,maxLng)
    """
    min_lng, min_lat, max_lng, max_lat = b
    south, west, north, east = min_lat, min_lng, max_lat, max_lng

    parts: List[str] = []
    if include_signals:
        parts.append(f'node["highway"="traffic_signals"]({south},{west},{north},{east});')
        parts.append(f'way["highway"="traffic_signals"]({south},{west},{north},{east});')
    if include_stops:
        parts.append(f'node["highway"="stop"]({south},{west},{north},{east});')
        parts.append(f'way["highway"="stop"]({south},{west},{north},{east});')
    if include_sidewalks:
        # Coverage varies by area; include common tagging patterns.
        parts.append(f'way["highway"="footway"]["footway"="sidewalk"]({south},{west},{north},{east});')
        parts.append(f'way["sidewalk"]({south},{west},{north},{east});')

    inner = "\n".join(parts) if parts else ""
    return f"""
[out:json][timeout:25];
(
{inner}
);
out body geom;
""".strip()


def _centroid_from_geometry(geom: List[Dict[str, Any]]) -> Optional[Tuple[float, float]]:
    if not geom:
        return None
    lats = [p.get("lat") for p in geom if isinstance(p, dict)]
    lons = [p.get("lon") for p in geom if isinstance(p, dict)]
    lats = [x for x in lats if isinstance(x, (int, float)) and math.isfinite(float(x))]
    lons = [x for x in lons if isinstance(x, (int, float)) and math.isfinite(float(x))]
    if not lats or not lons:
        return None
    return (sum(lats) / len(lats), sum(lons) / len(lons))


def _to_signals_and_sidewalks(elements: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    signals: List[Dict[str, Any]] = []
    sidewalk_features: List[Dict[str, Any]] = []

    for el in elements or []:
        if not isinstance(el, dict):
            continue
        el_type = el.get("type")
        el_id = el.get("id")
        tags = el.get("tags") or {}
        if not isinstance(tags, dict):
            tags = {}

        hw = tags.get("highway")

        if hw in ("traffic_signals", "stop"):
            lat = el.get("lat")
            lon = el.get("lon")
            if not (isinstance(lat, (int, float)) and isinstance(lon, (int, float))):
                # Ways: use centroid of geometry
                geom = el.get("geometry")
                if isinstance(geom, list):
                    c = _centroid_from_geometry(geom)
                    if c:
                        lat, lon = c[0], c[1]
            if isinstance(lat, (int, float)) and isinstance(lon, (int, float)):
                signals.append(
                    {
                        "id": f"osm-{el_type}-{el_id}",
                        "type": "traffic-light" if hw == "traffic_signals" else "stop-sign",
                        "lat": float(lat),
                        "lng": float(lon),
                    }
                )
            continue

        # Sidewalk ways: represent as LineString
        if el_type == "way":
            geom = el.get("geometry")
            if not isinstance(geom, list) or len(geom) < 2:
                continue
            is_sidewalk = False
            if tags.get("highway") == "footway" and tags.get("footway") == "sidewalk":
                is_sidewalk = True
            if "sidewalk" in tags:
                # side-walk tagging can be on a road, treat as sidewalk-outline for visual aid
                is_sidewalk = True

            if not is_sidewalk:
                continue

            coords: List[List[float]] = []
            for p in geom:
                if not isinstance(p, dict):
                    continue
                lat = p.get("lat")
                lon = p.get("lon")
                if isinstance(lat, (int, float)) and isinstance(lon, (int, float)):
                    coords.append([float(lon), float(lat)])
            if len(coords) < 2:
                continue
            sidewalk_features.append(
                {
                    "type": "Feature",
                    "properties": {"id": f"osm-way-{el_id}"},
                    "geometry": {"type": "LineString", "coordinates": coords},
                }
            )

    sidewalks_geojson = {"type": "FeatureCollection", "features": sidewalk_features}
    return signals, sidewalks_geojson


@router.get("/osm/features")
def get_osm_features(
    bbox: str = Query(..., description="Viewport bbox: minLng,minLat,maxLng,maxLat"),
    zoom: float = Query(0, description="Map zoom level (used to gate expensive layers like sidewalks)"),
    include: str = Query("signals,stops,sidewalks", description="Comma list: signals,stops,sidewalks"),
):
    b = _parse_bbox(bbox)
    if not b:
        return {"success": False, "error": "Invalid bbox", "signals": [], "sidewalksGeojson": {"type": "FeatureCollection", "features": []}}

    include_set = set([x.strip().lower() for x in include.split(",") if x.strip()])
    include_signals = "signals" in include_set
    include_stops = "stops" in include_set
    include_sidewalks = "sidewalks" in include_set

    # Sidewalk queries can be heavy; only allow when zoomed in enough.
    if float(zoom or 0) < 15:
        include_sidewalks = False

    # Prevent excessively large queries (Overpass can throttle/timeout).
    # If bbox is huge, return only signals/stops (or nothing) until user zooms in.
    area_deg2 = _bbox_area_degrees(b)
    if area_deg2 > 0.08:  # roughly > ~0.28 x 0.28 degrees
        include_sidewalks = False
    if area_deg2 > 0.25:
        # Too large: refuse to query.
        return {
            "success": True,
            "limited": True,
            "reason": "bbox_too_large",
            "signals": [],
            "sidewalksGeojson": {"type": "FeatureCollection", "features": []},
        }

    cache_key = json.dumps(
        {
            "b": _round_bbox(b, digits=3),
            "inc": sorted(list(include_set)),
            "z": int(float(zoom or 0)),
        },
        sort_keys=True,
    )
    cached = _cache.get(cache_key)
    if cached is not None:
        return cached

    q = _overpass_query(b, include_signals, include_stops, include_sidewalks)

    started = time.time()
    try:
        resp = requests.post(
            OVERPASS_URL,
            data={"data": q},
            timeout=25,
            headers={"User-Agent": "SnapRoad/1.0 (OSM Overpass proxy)"},
        )
        resp.raise_for_status()
        payload = resp.json()
        elements = payload.get("elements") if isinstance(payload, dict) else []
        signals, sidewalks_geojson = _to_signals_and_sidewalks(elements if isinstance(elements, list) else [])
        out = {"success": True, "limited": False, "signals": signals, "sidewalksGeojson": sidewalks_geojson}
        _cache[cache_key] = out
        return out
    except Exception as e:
        logger.warning("Overpass query failed: %s", str(e))
        out = {
            "success": True,
            "limited": True,
            "reason": "overpass_error",
            "signals": [],
            "sidewalksGeojson": {"type": "FeatureCollection", "features": []},
        }
        _cache[cache_key] = out
        return out
    finally:
        elapsed_ms = int((time.time() - started) * 1000)
        if elapsed_ms > 1500:
            logger.info("Overpass /osm/features took %sms (bbox=%s)", elapsed_ms, bbox)


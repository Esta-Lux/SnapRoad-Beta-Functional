"""
Optional OpenStreetMap road signals near a coordinate (Overpass).

OpenStreetMap incidents are **enabled by default** once the backend ships this module. Set `OSM_INCIDENTS_ENABLED=0`
to disable Overpass calls (local dev, outages, or etiquette).

Mapbox-incident ingestion is intentionally not bundled here (product / token dependent); callers may merge separately.
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx

logger = logging.getLogger(__name__)


def _truthy(raw: str | None) -> bool:
    if not raw:
        return False
    return raw.strip().lower() in ("1", "true", "yes", "on")


def _falsy(raw: str | None) -> bool:
    """Explicit opt-out: 0, false, off, no."""
    if not raw or not str(raw).strip():
        return False
    return str(raw).strip().lower() in ("0", "false", "no", "off")


def _osm_incidents_enabled() -> bool:
    raw = os.environ.get("OSM_INCIDENTS_ENABLED")
    if raw is None or not str(raw).strip():
        return True
    if _falsy(raw):
        return False
    if _truthy(raw):
        return True
    # Unknown tokens default to enabled (avoid accidental disables from typos).
    return True


def fetch_osm_road_signals(lat: float, lng: float, radius_meters: float = 3500) -> list[dict[str, Any]]:
    if not _osm_incidents_enabled():
        return []
    r = max(800, min(6500, int(radius_meters)))
    # Construction / proposed works and calming nodes — coarse community-level signals only.
    q = f"""[out:json][timeout:14];
(
  way["highway"~"construction|proposed"](around:{r},{lat},{lng});
  node["traffic_calming"](around:{r},{lat},{lng});
);
out center tags 50;
"""
    try:
        with httpx.Client(timeout=18.0) as client:
            resp = client.post(
                "https://overpass-api.de/api/interpreter",
                content=q.encode("utf-8"),
                headers={"Content-Type": "text/plain; charset=utf-8"},
            )
            if resp.status_code != 200:
                logger.debug("OSM Overpass HTTP %s", resp.status_code)
                return []
            data = resp.json()
    except Exception as e:
        logger.debug("OSM Overpass fetch failed: %s", e)
        return []

    elts = data.get("elements")
    if not isinstance(elts, list):
        return []

    rows: list[dict[str, Any]] = []
    for el in elts:
        if not isinstance(el, dict):
            continue
        oid = el.get("id")
        typ = el.get("type")
        tags = el.get("tags") if isinstance(el.get("tags"), dict) else {}

        lat_c: float | None = None
        lng_c: float | None = None
        if typ == "node":
            la = el.get("lat")
            lo = el.get("lon")
            if isinstance(la, (int, float)) and isinstance(lo, (int, float)):
                lat_c, lng_c = float(la), float(lo)
        elif isinstance(el.get("center"), dict):
            c = el["center"]
            la = c.get("lat")
            lo = c.get("lon")
            if isinstance(la, (int, float)) and isinstance(lo, (int, float)):
                lat_c, lng_c = float(la), float(lo)

        if lat_c is None or lng_c is None or oid is None:
            continue

        highway = tags.get("highway")
        calming = tags.get("traffic_calming")
        if highway in ("construction", "proposed"):
            subtype = "construction"
            title = "Road construction (OSM)"
        elif calming:
            subtype = "hazard"
            title = f"Traffic calming ({calming}) · OSM"
        else:
            continue

        now = datetime.now(timezone.utc)
        exp = (now + timedelta(hours=24)).isoformat()
        rows.append({
            "id": f"osm-{typ}-{oid}",
            "type": subtype,
            "lat": lat_c,
            "lng": lng_c,
            "title": title,
            "severity": "medium",
            "description": title,
            "reported_by": "openstreetmap",
            "created_at": now.isoformat(),
            "expires_at": exp,
            "upvotes": 0,
            "downvotes": 0,
            "source": "osm",
        })
    return rows

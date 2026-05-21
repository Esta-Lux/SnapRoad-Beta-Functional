"""TomTom Traffic Incident Details integration for SnapRoad road-feed.

The endpoint returns incidents inside a bounding box. SnapRoad normalizes the
provider shape into the same driver-visible incident contract used by community
reports so the map can render one unified layer.
"""

from __future__ import annotations

import hashlib
import logging
import math
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx

from config import TOMTOM_API_KEY

_log = logging.getLogger(__name__)

_INCIDENT_DETAILS_URL = "https://api.tomtom.com/traffic/services/5/incidentDetails"
_CONNECT_TIMEOUT = 4.0
_READ_TIMEOUT = 9.0
_MAX_RADIUS_MILES = 12.0
_FIELDS = (
    "{incidents{type,geometry{type,coordinates},properties{"
    "id,iconCategory,magnitudeOfDelay,events{description,code,iconCategory},"
    "startTime,endTime,from,to,length,delay,roadNumbers,timeValidity,"
    "probabilityOfOccurrence,numberOfReports,lastReportTime}}}"
)

_ICON_CATEGORY = {
    1: "accident",
    2: "weather",
    3: "hazard",
    4: "weather",
    5: "weather",
    6: "traffic",
    7: "closure",
    8: "closure",
    9: "construction",
    10: "weather",
    11: "weather",
    14: "hazard",
}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _bbox(lat: float, lng: float, radius_miles: float) -> str:
    radius = min(max(float(radius_miles), 0.1), _MAX_RADIUS_MILES)
    lat_delta = radius / 69.0
    cos_lat = max(0.25, abs(math.cos(math.radians(lat))))
    lng_delta = radius / (69.0 * cos_lat)
    return f"{lng - lng_delta:.6f},{lat - lat_delta:.6f},{lng + lng_delta:.6f},{lat + lat_delta:.6f}"


def _haversine_miles(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius_mi = 3958.7613
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * radius_mi * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _first_point(geometry: dict[str, Any]) -> tuple[float, float] | None:
    coords = geometry.get("coordinates")
    if not isinstance(coords, list) or not coords:
        return None

    def walk(node: Any) -> tuple[float, float] | None:
        if isinstance(node, list) and len(node) >= 2 and all(isinstance(x, (int, float)) for x in node[:2]):
            return float(node[1]), float(node[0])
        if isinstance(node, list):
            for child in node:
                found = walk(child)
                if found:
                    return found
        return None

    return walk(coords)


def _main_event(props: dict[str, Any]) -> dict[str, Any]:
    events = props.get("events")
    if isinstance(events, list):
        for event in events:
            if isinstance(event, dict):
                return event
    return {}


def _category(icon_category: Any, event: dict[str, Any]) -> str:
    try:
        icon = int(event.get("iconCategory") or icon_category or 0)
    except (TypeError, ValueError):
        icon = 0
    return _ICON_CATEGORY.get(icon, "hazard")


def _severity(category: str, delay_seconds: int, magnitude: Any) -> str:
    try:
        mag = int(magnitude or 0)
    except (TypeError, ValueError):
        mag = 0
    if category in ("accident", "closure") or delay_seconds >= 900 or mag >= 3:
        return "high"
    if category in ("traffic", "construction", "hazard", "weather") or delay_seconds >= 300 or mag >= 2:
        return "medium"
    return "low"


def _title(category: str, event: dict[str, Any], props: dict[str, Any]) -> str:
    desc = str(event.get("description") or "").strip()
    if desc:
        return desc[:96]
    road_nums = props.get("roadNumbers")
    if isinstance(road_nums, list) and road_nums:
        road = str(road_nums[0])
        return f"{category.replace('_', ' ').title()} on {road}"
    return {
        "accident": "Crash reported",
        "traffic": "Heavy traffic",
        "closure": "Road closure",
        "construction": "Road work",
        "weather": "Weather hazard",
        "hazard": "Road hazard",
    }.get(category, "Traffic incident")


def _expires(props: dict[str, Any]) -> str:
    end = props.get("endTime")
    if isinstance(end, str) and end.strip():
        return end
    return (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()


def _incident_id(props: dict[str, Any], lat: float, lng: float, category: str) -> str:
    raw = str(props.get("id") or "").strip()
    if raw:
        return f"tomtom-{raw}"
    digest = hashlib.sha1(f"{category}:{lat:.5f}:{lng:.5f}:{props.get('from')}:{props.get('to')}".encode()).hexdigest()
    return f"tomtom-{digest[:16]}"


def normalize_tomtom_incidents(body: dict[str, Any], origin_lat: float, origin_lng: float) -> list[dict[str, Any]]:
    incidents = body.get("incidents") if isinstance(body, dict) else None
    if not isinstance(incidents, list):
        return []

    out: list[dict[str, Any]] = []
    for item in incidents:
        if not isinstance(item, dict):
            continue
        props = item.get("properties")
        geom = item.get("geometry")
        if not isinstance(props, dict) or not isinstance(geom, dict):
            continue
        point = _first_point(geom)
        if not point:
            continue
        lat, lng = point
        event = _main_event(props)
        category = _category(props.get("iconCategory"), event)
        try:
            delay_seconds = max(0, int(float(props.get("delay") or 0)))
        except (TypeError, ValueError):
            delay_seconds = 0
        road_numbers = [str(x) for x in props.get("roadNumbers") or [] if str(x).strip()]
        out.append(
            {
                "id": _incident_id(props, lat, lng, category),
                "type": category,
                "lat": lat,
                "lng": lng,
                "title": _title(category, event, props),
                "severity": _severity(category, delay_seconds, props.get("magnitudeOfDelay")),
                "description": str(event.get("description") or "").strip() or None,
                "reported_by": "TomTom Traffic",
                "upvotes": 0,
                "downvotes": 0,
                "created_at": str(props.get("startTime") or props.get("lastReportTime") or _now_iso()),
                "expires_at": _expires(props),
                "distance_miles": round(_haversine_miles(origin_lat, origin_lng, lat, lng), 2),
                "source": "tomtom",
                "provider": "tomtom",
                "verified": True,
                "delay_seconds": delay_seconds,
                "length_meters": props.get("length"),
                "road_numbers": road_numbers,
                "road_name": ", ".join(road_numbers) if road_numbers else None,
                "from": props.get("from"),
                "to": props.get("to"),
                "number_of_reports": props.get("numberOfReports"),
                "last_report_time": props.get("lastReportTime"),
            }
        )
    return out


def fetch_tomtom_incidents(
    lat: float,
    lng: float,
    radius_miles: float = 2.0,
    *,
    api_key: str | None = None,
) -> list[dict[str, Any]]:
    key = (api_key if api_key is not None else TOMTOM_API_KEY).strip()
    if not key:
        return []

    timeout = httpx.Timeout(_READ_TIMEOUT, connect=_CONNECT_TIMEOUT)
    try:
        with httpx.Client(timeout=timeout) as client:
            res = client.get(
                _INCIDENT_DETAILS_URL,
                params={
                    "key": key,
                    "bbox": _bbox(lat, lng, radius_miles),
                    "fields": _FIELDS,
                    "language": "en-US",
                    "timeValidityFilter": "present",
                },
                headers={"Accept-Encoding": "gzip"},
            )
            if res.status_code == 403:
                _log.warning("TomTom incidentDetails returned 403; check Traffic API entitlement.")
                return []
            res.raise_for_status()
            body = res.json()
    except Exception as exc:
        _log.warning("TomTom incidentDetails failed: %s", exc)
        return []
    return normalize_tomtom_incidents(body if isinstance(body, dict) else {}, lat, lng)

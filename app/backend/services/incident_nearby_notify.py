"""Push alerts to drivers recently near an incident (requires profiles.last_known_* + expo_push_token)."""
from __future__ import annotations

import logging
import math
from datetime import datetime, timedelta, timezone
from typing import Any

from database import get_supabase
from services.expo_push import send_expo_push_batch

logger = logging.getLogger(__name__)

_MAX_NOTIFY = 80
_FRESH_MINUTES = 28
_RADIUS_MI = 1.05


def _haversine_miles(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r_lat = math.radians(lat2 - lat1)
    r_lng = math.radians(lng2 - lng1)
    a = math.sin(r_lat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(r_lng / 2) ** 2
    return 3959.0 * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def notify_drivers_near_incident(
    lat: float,
    lng: float,
    exclude_user_id: str,
    title: str,
    body: str,
    data: dict[str, Any] | None = None,
) -> None:
    try:
        sb = get_supabase()
    except Exception as e:
        logger.debug("notify_drivers_near_incident: no supabase: %s", e)
        return

    now = datetime.now(timezone.utc)
    fresh_before = now - timedelta(minutes=_FRESH_MINUTES)
    dlat = _RADIUS_MI / 69.0
    cos_lat = max(0.25, abs(math.cos(math.radians(lat))))
    dlng = _RADIUS_MI / (69.0 * cos_lat)

    try:
        res = (
            sb.table("profiles")
            .select("id,expo_push_token,last_known_lat,last_known_lng,last_known_at")
            .not_.is_("expo_push_token", "null")
            .gte("last_known_lat", lat - dlat)
            .lte("last_known_lat", lat + dlat)
            .gte("last_known_lng", lng - dlng)
            .lte("last_known_lng", lng + dlng)
            .limit(500)
            .execute()
        )
    except Exception as e:
        logger.warning("notify_drivers_near_incident query failed (migration 039 applied?): %s", e)
        return

    rows = res.data or []
    payload: list[dict[str, Any]] = []
    extra = data or {}
    for row in rows:
        uid = str(row.get("id") or "")
        if not uid or uid == exclude_user_id:
            continue
        token = (row.get("expo_push_token") or "").strip()
        if not token.startswith("ExponentPushToken"):
            continue
        la = row.get("last_known_lat")
        lo = row.get("last_known_lng")
        ts = row.get("last_known_at")
        if la is None or lo is None or not ts:
            continue
        try:
            if isinstance(ts, str):
                tsv = datetime.fromisoformat(ts.replace("Z", "+00:00"))
            else:
                continue
            if tsv.tzinfo is None:
                tsv = tsv.replace(tzinfo=timezone.utc)
            if tsv < fresh_before:
                continue
        except Exception:
            continue  # nosec B112
        if _haversine_miles(float(lat), float(lng), float(la), float(lo)) > _RADIUS_MI:
            continue
        payload.append(
            {
                "to": token,
                "title": title[:120],
                "body": body[:200],
                "sound": "default",
                "priority": "high",
                "data": {**extra, "type": "incident_nearby"},
            }
        )
        if len(payload) >= _MAX_NOTIFY:
            break

    if payload:
        send_expo_push_batch(payload)

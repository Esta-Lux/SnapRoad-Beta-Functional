"""Mapbox Directions helpers for commute traffic monitoring (Premium push)."""
from __future__ import annotations

import logging
from typing import Optional, Tuple
from urllib.parse import quote

import httpx

from config import mapbox_token_from_env

logger = logging.getLogger(__name__)

DIRECTIONS_BASE = "https://api.mapbox.com/directions/v5/mapbox"


def traffic_vs_baseline_seconds(
    origin_lat: float,
    origin_lng: float,
    dest_lat: float,
    dest_lng: float,
    *,
    http: Optional[httpx.Client] = None,
    timeout: float = 22.0,
) -> Tuple[Optional[float], Optional[float], Optional[float]]:
    """
    Compare live-traffic drive time to non-traffic driving profile.
    Returns (traffic_sec, baseline_sec, extra_sec) where extra_sec = traffic - baseline.
    """
    token = mapbox_token_from_env()
    if not token:
        logger.warning("commute traffic poll: no Mapbox token configured")
        return None, None, None

    coords_path = f"{origin_lng},{origin_lat};{dest_lng},{dest_lat}"
    qs = (
        f"access_token={quote(token, safe='')}"
        "&geometries=geojson&overview=simplified&steps=false&language=en&alternatives=false"
    )

    def _duration(profile: str, cl: httpx.Client) -> Optional[float]:
        url = f"{DIRECTIONS_BASE}/{profile}/{coords_path}?{qs}"
        try:
            r = cl.get(url)
            if not r.is_success:
                logger.debug("Mapbox %s HTTP %s: %s", profile, r.status_code, r.text[:200])
                return None
            data = r.json()
            routes = data.get("routes") if isinstance(data, dict) else None
            if not routes:
                return None
            dur = routes[0].get("duration")
            if dur is None:
                return None
            return float(dur)
        except Exception as e:
            logger.warning("Mapbox %s request failed: %s", profile, e)
            return None

    own_client = http is None
    cl = http or httpx.Client(timeout=timeout)
    try:
        t_sec = _duration("driving-traffic", cl)
        b_sec = _duration("driving", cl)
        if t_sec is None or b_sec is None or b_sec <= 0:
            return t_sec, b_sec, None
        extra = t_sec - b_sec
        return t_sec, b_sec, extra
    finally:
        if own_client:
            cl.close()


def should_notify_traffic_delay(
    extra_sec: float,
    baseline_sec: float,
    *,
    min_extra_sec: float,
    min_ratio: float,
) -> bool:
    """Notify when delay meets an absolute floor or a fraction of typical drive time (whichever is larger)."""
    if extra_sec <= 0 or baseline_sec <= 0:
        return False
    threshold = max(float(min_extra_sec), float(min_ratio) * float(baseline_sec))
    return extra_sec >= threshold

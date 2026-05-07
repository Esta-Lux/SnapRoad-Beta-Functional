"""Mapbox Directions helpers for commute traffic monitoring pushes."""
from __future__ import annotations

from dataclasses import dataclass
import logging
from typing import Any, Optional, Tuple
from urllib.parse import quote

import httpx

from config import mapbox_token_from_env

logger = logging.getLogger(__name__)

DIRECTIONS_BASE = "https://api.mapbox.com/directions/v5/mapbox"

_CONGESTION_WEIGHT = {
    "unknown": 0,
    "low": 1,
    "moderate": 2,
    "heavy": 3,
    "severe": 4,
}


@dataclass(frozen=True)
class CommuteTrafficRouteOption:
    route_index: int
    duration_sec: float
    distance_meters: Optional[float]
    congestion_label: str
    congestion_score: float


@dataclass(frozen=True)
class CommuteTrafficSnapshot:
    primary_duration_sec: Optional[float]
    baseline_duration_sec: Optional[float]
    extra_sec: Optional[float]
    best_duration_sec: Optional[float]
    best_extra_sec: Optional[float]
    alternate_saves_sec: float
    primary_congestion: str
    best_congestion: str
    route_count: int


def _route_duration(route: dict[str, Any]) -> Optional[float]:
    try:
        dur = float(route.get("duration"))
    except (TypeError, ValueError):
        return None
    return dur if dur > 0 else None


def _route_distance(route: dict[str, Any]) -> Optional[float]:
    try:
        dist = float(route.get("distance"))
    except (TypeError, ValueError):
        return None
    return dist if dist > 0 else None


def _route_congestion(route: dict[str, Any]) -> tuple[str, float]:
    values: list[str] = []
    for leg in route.get("legs") or []:
        annotation = leg.get("annotation") if isinstance(leg, dict) else None
        congestion = annotation.get("congestion") if isinstance(annotation, dict) else None
        if isinstance(congestion, list):
            values.extend(str(v).lower() for v in congestion if v is not None)
    if not values:
        return "unknown", 0.0
    score_total = 0
    counts: dict[str, int] = {}
    for value in values:
        normalized = value if value in _CONGESTION_WEIGHT else "unknown"
        counts[normalized] = counts.get(normalized, 0) + 1
        score_total += _CONGESTION_WEIGHT[normalized]
    label = max(counts.items(), key=lambda item: (_CONGESTION_WEIGHT[item[0]], item[1]))[0]
    return label, score_total / max(1, len(values))


def _traffic_route_options(routes: list[Any]) -> list[CommuteTrafficRouteOption]:
    options: list[CommuteTrafficRouteOption] = []
    for idx, route in enumerate(routes):
        if not isinstance(route, dict):
            continue
        duration = _route_duration(route)
        if duration is None:
            continue
        label, score = _route_congestion(route)
        options.append(
            CommuteTrafficRouteOption(
                route_index=idx,
                duration_sec=duration,
                distance_meters=_route_distance(route),
                congestion_label=label,
                congestion_score=score,
            )
        )
    return options


def _best_clean_option(options: list[CommuteTrafficRouteOption]) -> Optional[CommuteTrafficRouteOption]:
    if not options:
        return None
    # Prefer cleaner roads without choosing a wildly slower detour.
    return min(options, key=lambda opt: opt.duration_sec + opt.congestion_score * 90.0)


def commute_traffic_snapshot(
    origin_lat: float,
    origin_lng: float,
    dest_lat: float,
    dest_lng: float,
    *,
    http: Optional[httpx.Client] = None,
    timeout: float = 22.0,
) -> CommuteTrafficSnapshot:
    """Fetch live traffic alternatives and return the best cleaner-road snapshot."""
    token = mapbox_token_from_env()
    if not token:
        logger.warning("commute traffic poll: no Mapbox token configured")
        return CommuteTrafficSnapshot(None, None, None, None, None, 0.0, "unknown", "unknown", 0)

    coords_path = f"{origin_lng},{origin_lat};{dest_lng},{dest_lat}"
    base_qs = (
        f"access_token={quote(token, safe='')}"
        "&geometries=geojson&overview=full&steps=false&language=en"
    )
    traffic_qs = f"{base_qs}&alternatives=true&annotations=duration,distance,congestion"
    baseline_qs = f"{base_qs}&alternatives=false"

    own_client = http is None
    cl = http or httpx.Client(timeout=timeout)
    try:
        traffic_routes: list[Any] = []
        baseline_sec: Optional[float] = None
        try:
            traffic_url = f"{DIRECTIONS_BASE}/driving-traffic/{coords_path}?{traffic_qs}"
            traffic_res = cl.get(traffic_url)
            if traffic_res.is_success:
                traffic_data = traffic_res.json()
                routes = traffic_data.get("routes") if isinstance(traffic_data, dict) else None
                traffic_routes = routes if isinstance(routes, list) else []
            else:
                logger.debug("Mapbox driving-traffic HTTP %s: %s", traffic_res.status_code, traffic_res.text[:200])
        except Exception as e:
            logger.warning("Mapbox driving-traffic request failed: %s", e)

        try:
            baseline_url = f"{DIRECTIONS_BASE}/driving/{coords_path}?{baseline_qs}"
            baseline_res = cl.get(baseline_url)
            if baseline_res.is_success:
                baseline_data = baseline_res.json()
                routes = baseline_data.get("routes") if isinstance(baseline_data, dict) else None
                if isinstance(routes, list) and routes:
                    baseline_sec = _route_duration(routes[0])
            else:
                logger.debug("Mapbox driving HTTP %s: %s", baseline_res.status_code, baseline_res.text[:200])
        except Exception as e:
            logger.warning("Mapbox driving request failed: %s", e)

        options = _traffic_route_options(traffic_routes)
        primary = options[0] if options else None
        best = _best_clean_option(options)
        primary_sec = primary.duration_sec if primary else None
        best_sec = best.duration_sec if best else None
        extra_sec = primary_sec - baseline_sec if primary_sec is not None and baseline_sec and baseline_sec > 0 else None
        best_extra = best_sec - baseline_sec if best_sec is not None and baseline_sec and baseline_sec > 0 else None
        alternate_saves = max(0.0, (primary_sec or 0.0) - (best_sec or primary_sec or 0.0))
        return CommuteTrafficSnapshot(
            primary_duration_sec=primary_sec,
            baseline_duration_sec=baseline_sec,
            extra_sec=extra_sec,
            best_duration_sec=best_sec,
            best_extra_sec=best_extra,
            alternate_saves_sec=alternate_saves,
            primary_congestion=primary.congestion_label if primary else "unknown",
            best_congestion=best.congestion_label if best else "unknown",
            route_count=len(options),
        )
    finally:
        if own_client:
            cl.close()


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
    snapshot = commute_traffic_snapshot(
        origin_lat,
        origin_lng,
        dest_lat,
        dest_lng,
        http=http,
        timeout=timeout,
    )
    return snapshot.primary_duration_sec, snapshot.baseline_duration_sec, snapshot.extra_sec


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

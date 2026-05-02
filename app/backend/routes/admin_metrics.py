"""
Admin metrics endpoints — overview KPIs and SLO-status badges.

Two endpoints, both admin-only (mounted under the admin router so they
inherit `require_admin`):

    GET /api/admin/metrics/overview
        Aggregate KPIs from Supabase (cached aggregates, no PII).

    GET /api/admin/metrics/slo
        Live SLO rates + ok/warning/critical badges per signal.

Design rules:
    - Reuse the existing in-memory telemetry buffer for API rates so we don't
      add log scraping or a metrics dependency.
    - Reuse existing `sb_get_*_stats` helpers; never fan out to multiple
      per-row queries from this endpoint.
    - Division-by-zero is delegated to `services.slo.safe_ratio` so empty
      tables surface as `None` (rendered as '—'), not as 0%.
"""
from __future__ import annotations

import logging
from typing import Any, Dict

from fastapi import APIRouter

from services import slo
from services.supabase_service import (
    sb_get_live_users,
    sb_get_platform_stats,
    sb_get_redemption_stats,
    sb_get_trips_stats,
)
from services.telemetry_service import telemetry_service

logger = logging.getLogger(__name__)

admin_metrics_router = APIRouter()


def _gather_overview() -> Dict[str, Any]:
    """Aggregate counts for /metrics/overview.

    Trips:    `routes_started` = total trip rows, `routes_completed` = rows
              with status='completed'. Matches `sb_get_trips_stats()`.

    Rewards:  `rewards_issued` = total redemption rows (a redemption == a
              reward changed hands), `rewards_redeemed` = the verified
              subset (partner-confirmed). Matches `sb_get_redemption_stats()`.
    """
    platform = sb_get_platform_stats() or {}
    redemptions = sb_get_redemption_stats() or {}
    trips = sb_get_trips_stats() or {}

    try:
        active_today = int(platform.get("active_today") or 0)
    except (TypeError, ValueError):
        active_today = 0
    if not active_today:
        active_today = len(sb_get_live_users() or [])

    return {
        "total_users": int(platform.get("total_users") or 0),
        "active_users_today": active_today,
        "routes_started": int(trips.get("total_trips") or 0),
        "routes_completed": int(trips.get("completed_trips") or 0),
        "rewards_issued": int(redemptions.get("total") or 0),
        "rewards_redeemed": int(redemptions.get("verified") or 0),
    }


def _gather_slo() -> Dict[str, Any]:
    """Compute SLO rates + badges for /metrics/slo.

    `crash_free_sessions` is a placeholder until the mobile crash pipeline
    feeds counts back to the API. We emit `None` and a status of `ok` so the
    UI shows '—' instead of a red badge for missing data.
    """
    events = telemetry_service.snapshot(limit=500)
    api = slo.compute_api_rates_from_telemetry(events)

    redemptions = sb_get_redemption_stats() or {}
    trips = sb_get_trips_stats() or {}

    reward_total = int(redemptions.get("total") or 0)
    reward_verified = int(redemptions.get("verified") or 0)
    reward_rate = slo.safe_ratio(reward_verified, reward_total)

    trip_total = int(trips.get("total_trips") or 0)
    trip_completed = int(trips.get("completed_trips") or 0)
    route_rate = slo.safe_ratio(trip_completed, trip_total)

    crash_free: float | None = None

    api_status = slo.evaluate_status(api["success_rate"], slo.SLO_THRESHOLDS["api_success_rate"])
    reward_status = slo.evaluate_status(reward_rate, slo.SLO_THRESHOLDS["reward_success_rate"])
    route_status = slo.evaluate_status(route_rate, slo.SLO_THRESHOLDS["route_completion_rate"])
    crash_status = slo.evaluate_status(crash_free, slo.SLO_THRESHOLDS["crash_free_sessions"])

    return {
        "api_success_rate": api["success_rate"],
        "error_rate": api["error_rate"],
        "reward_success_rate": reward_rate,
        "route_completion_rate": route_rate,
        "crash_free_sessions": crash_free,
        "samples": {
            "api_total": api["total"],
            "api_errors": api["errors"],
            "rewards_total": reward_total,
            "rewards_verified": reward_verified,
            "trips_total": trip_total,
            "trips_completed": trip_completed,
        },
        "thresholds": slo.SLO_THRESHOLDS,
        "status": {
            "api": api_status,
            "rewards": reward_status,
            "routes": route_status,
            "crash_free": crash_status,
            "overall": slo.overall_status(
                [api_status, reward_status, route_status, crash_status]
            ),
        },
    }


@admin_metrics_router.get("/admin/metrics/overview")
def metrics_overview():
    try:
        data = _gather_overview()
    except Exception as exc:
        logger.warning("metrics/overview failed: %s", exc)
        return {"success": False, "data": {}, "message": "Metrics unavailable"}
    return {"success": True, "data": data}


@admin_metrics_router.get("/admin/metrics/slo")
def metrics_slo():
    try:
        data = _gather_slo()
    except Exception as exc:
        logger.warning("metrics/slo failed: %s", exc)
        return {"success": False, "data": {}, "message": "SLO unavailable"}
    return {"success": True, "data": data}

from fastapi import APIRouter, Query, HTTPException, Depends, Request
from typing import Annotated, Optional, Any, Dict
from datetime import datetime, timedelta, timezone
import json
import logging
import math
import time
from models.schemas import TripResult, FuelLogCreate
from middleware.auth import get_current_user, get_current_user_optional, get_current_user_or_guest
from pydantic import BaseModel
from uuid import UUID, uuid4
from services.trips_ports import (
    ensure_user,
    get_current_user_id,
    get_fuel_logs_store,
    get_fuel_prices,
    get_trips_store,
    get_users_store,
    get_xp_config,
)
from routes.gamification import add_xp_to_user, recompute_profile_level_fields, sync_earned_driver_badges
from config import ENVIRONMENT, TOMTOM_API_KEY
from services.llm_client import chat_completion_model, get_sync_openai_client
from database import get_supabase
from services.supabase_service import sb_get_profile
from services.premium_access import require_premium_user
from services.guest_activity import is_guest_user_id, record_guest_activity
from limiter import limiter
from services.gas_prices_service import regular_price_usd_for_state_label
from services.tomtom_fuel import fetch_tomtom_fuel_stations

_trips_log = logging.getLogger(__name__)
users_db = get_users_store()
current_user_id = get_current_user_id()
trips_db = get_trips_store()
fuel_logs = get_fuel_logs_store()
FUEL_PRICES = get_fuel_prices()

_MAX_TRIP_SPEED_MPH = 160.0
_MAX_TRIP_AVG_SPEED_MPH = 130.0
_DEFAULT_BASELINE_ROUTE_FUEL_FACTOR = 1.12
_DEFAULT_BASELINE_ROUTE_TIME_FACTOR = 1.08
_SAVINGS_MODEL_VERSION = "route-v1-distance-mpg"
XP_CONFIG = get_xp_config()

try:
    from openai import OpenAI
except Exception:  # pragma: no cover
    OpenAI = None

router = APIRouter(prefix="/api", tags=["Trips"])
trips_history_router = APIRouter()
trips_fuel_router = APIRouter()
trips_legacy_router = APIRouter()

CurrentUser = Annotated[dict, Depends(get_current_user)]
OptionalUser = Annotated[Optional[dict], Depends(get_current_user_optional)]
CurrentUserOrGuest = Annotated[dict, Depends(get_current_user_or_guest)]

_LEGACY_503_RESPONSES = {
    503: {"description": "Legacy endpoint unavailable in production"},
}

_503_RESPONSES = {
    503: {"description": "Service temporarily unavailable"},
}

MAX_FUEL_ANALYTICS_MONTHS = 24

MAX_BATCH_SIZE = 100

MSG_TRIP_NOT_FOUND = "Trip not found"


def _legacy_trips_guard() -> None:
    """Raise 503 for legacy endpoints disabled in production."""
    if ENVIRONMENT == "production":
        raise HTTPException(status_code=503, detail="Legacy trips endpoints unavailable in production")


def _trip_user_id(user: dict) -> str:
    return str(user.get("user_id") or user.get("id") or "").strip()


def _trip_owner_filter(query: Any, uid: str) -> Any:
    """
    Match trips stored under either legacy `profile_id`-only linkage or unified `user_id`.
    Keeps Insights trip list + weekly recap aggregates aligned when older rows omit `user_id`.
    """
    if not uid:
        return query
    return query.or_(f"user_id.eq.{uid},profile_id.eq.{uid}")


def _first_present(r: dict, *keys: str) -> Any:
    for key in keys:
        value = r.get(key)
        if value is not None and value != "":
            return value
    return None


def _float_or_zero(value: Any) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def _float_or_none(value: Any) -> Optional[float]:
    try:
        n = float(value)
        return n if math.isfinite(n) else None
    except (TypeError, ValueError):
        return None


def _positive_float_or_none(value: Any) -> Optional[float]:
    n = _float_or_none(value)
    return n if n is not None and n > 0 else None


def _sanitize_speed_mph(value: Any, max_mph: float = _MAX_TRIP_SPEED_MPH) -> float:
    n = _float_or_none(value)
    if n is None:
        return 0.0
    return max(0.0, min(float(max_mph), n))


def _sanitize_trip_distance_miles(
    distance_miles: Any,
    duration_seconds: Any,
    observed_max_speed_mph: Any = None,
) -> float:
    distance = max(0.0, _float_or_zero(distance_miles))
    duration = _float_or_none(duration_seconds)
    if not duration or duration <= 0 or distance <= 0:
        return distance
    observed_max = _sanitize_speed_mph(observed_max_speed_mph)
    cap_speed = observed_max if observed_max > 0 else _MAX_TRIP_AVG_SPEED_MPH
    return min(distance, max(0.0, (duration / 3600.0) * cap_speed))


def _sanitize_avg_speed_mph(
    distance_miles: Any,
    duration_seconds: Any,
    observed_max_speed_mph: Any = None,
) -> float:
    distance = max(0.0, _float_or_zero(distance_miles))
    duration = _float_or_none(duration_seconds)
    if not duration or duration <= 0 or distance <= 0:
        return 0.0
    avg = min(_MAX_TRIP_AVG_SPEED_MPH, distance / (duration / 3600.0))
    observed_max = _sanitize_speed_mph(observed_max_speed_mph)
    return min(avg, observed_max) if observed_max > 0 else avg


def _int_or_zero(value: Any) -> int:
    try:
        return int(float(value or 0))
    except (TypeError, ValueError):
        return 0


def _trip_row_to_client_shape(r: dict) -> dict:
    """Map a Supabase `trips` row to the JSON shape consumed by mobile Insights."""
    dur_sec = int(r.get("duration_seconds") or 0)
    if not dur_sec and r.get("duration_minutes") is not None:
        dur_sec = int(r.get("duration_minutes") or 0) * 60
    ended = r.get("ended_at") or r.get("started_at") or ""
    date_part = ended[:10] if isinstance(ended, str) and len(ended) >= 10 else ""
    time_part = ""
    if isinstance(ended, str) and "T" in ended:
        try:
            time_part = ended.split("T", 1)[1].replace("Z", "")[:8]
        except Exception:
            time_part = ""
    origin = _first_present(r, "origin", "origin_label", "start_address", "start_location", "startLocation", "from")
    destination = _first_present(
        r,
        "destination",
        "destination_label",
        "dest_label",
        "end_address",
        "end_location",
        "endLocation",
        "to",
    )
    max_speed = _sanitize_speed_mph(_first_present(r, "max_speed_mph", "top_speed_mph", "max_speed"))
    distance = _sanitize_trip_distance_miles(
        _first_present(r, "distance_miles", "distance"),
        dur_sec,
        max_speed or None,
    )
    avg_candidate = _sanitize_speed_mph(
        _first_present(r, "avg_speed_mph", "avg_speed", "average_speed_mph"),
        _MAX_TRIP_AVG_SPEED_MPH,
    )
    avg_speed = (
        avg_candidate
        if avg_candidate > 0 and (max_speed <= 0 or avg_candidate <= max_speed)
        else _sanitize_avg_speed_mph(distance, dur_sec, max_speed or None)
    )
    max_speed = max(max_speed, avg_speed)
    fuel_used = _float_or_zero(_first_present(r, "fuel_used_gallons", "fuel_gallons"))
    fuel_cost = _float_or_zero(_first_present(r, "fuel_cost_estimate", "fuel_cost_usd", "fuel_cost"))
    mileage_value = _float_or_zero(
        _first_present(r, "mileage_value_estimate", "mileage_value_usd", "mileage_value"),
    )
    baseline_fuel = _float_or_zero(
        _first_present(r, "baseline_fuel_estimate_gallons", "baseline_fuel_gallons", "baseline_fuel"),
    )
    route_fuel_savings = _float_or_zero(
        _first_present(r, "route_fuel_savings_gallons", "fuel_savings_gallons", "fuel_saved_gallons"),
    )
    route_savings = _float_or_zero(
        _first_present(r, "route_savings_dollars", "route_savings_usd", "fuel_savings_dollars"),
    )
    baseline_duration = _int_or_zero(_first_present(r, "baseline_duration_seconds", "baseline_duration"))
    time_saved = _int_or_zero(_first_present(r, "time_saved_seconds", "route_time_saved_seconds"))
    hard_braking = _int_or_zero(_first_present(r, "hard_braking_events", "hard_brakes"))
    hard_acceleration = _int_or_zero(_first_present(r, "hard_acceleration_events", "hard_accels"))
    speeding = _int_or_zero(_first_present(r, "speeding_events", "speeding"))
    return {
        "id": str(r.get("id")),
        "date": date_part,
        "time": time_part,
        "started_at": r.get("started_at") or "",
        "ended_at": r.get("ended_at") or "",
        "origin": origin or "Start",
        "destination": destination or "End",
        "distance": distance,
        "distance_miles": distance,
        "duration": dur_sec,
        "duration_seconds": dur_sec,
        "duration_minutes": max(0, dur_sec // 60),
        "safety_score": _float_or_zero(r.get("safety_score")),
        "gems_earned": _int_or_zero(r.get("gems_earned")),
        "xp_earned": _int_or_zero(r.get("xp_earned")),
        "avg_speed_mph": avg_speed,
        "max_speed_mph": max_speed,
        "fuel_used_gallons": fuel_used,
        "fuel_cost_estimate": fuel_cost,
        "mileage_value_estimate": mileage_value,
        "baseline_fuel_estimate_gallons": baseline_fuel,
        "route_fuel_savings_gallons": route_fuel_savings,
        "route_savings_dollars": route_savings,
        "route_savings_usd": route_savings,
        "baseline_duration_seconds": baseline_duration,
        "time_saved_seconds": time_saved,
        "savings_model_version": r.get("savings_model_version") or "",
        "hard_braking_events": hard_braking,
        "hard_acceleration_events": hard_acceleration,
        "speeding_events": speeding,
        "incidents_reported": _int_or_zero(r.get("incidents_reported")),
    }


def _get_trips_supabase(user: dict, page: int, limit: int) -> dict:
    uid = _trip_user_id(user)
    if not uid:
        raise HTTPException(status_code=401, detail="Invalid token")
    sb = get_supabase()
    count_res = (
        _trip_owner_filter(sb.table("trips").select("*", count="exact"), uid)
        .execute()
    )
    total = int(count_res.count or 0)
    start = (page - 1) * limit
    end = start + limit - 1
    res = (
        _trip_owner_filter(sb.table("trips").select("*"), uid)
        .order("ended_at", desc=True)
        .range(start, end)
        .execute()
    )
    items = [_trip_row_to_client_shape(r) for r in (res.data or [])]
    return {
        "success": True,
        "data": {
            "items": items,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "total_pages": (total + limit - 1) // limit if limit else 0,
            },
        },
    }


def _get_trip_history_supabase(user: dict, limit: int) -> dict:
    uid = _trip_user_id(user)
    if not uid:
        raise HTTPException(status_code=401, detail="Invalid token")
    sb = get_supabase()
    res = (
        _trip_owner_filter(sb.table("trips").select("*"), uid)
        .order("ended_at", desc=True)
        .limit(limit)
        .execute()
    )
    recent = [_trip_row_to_client_shape(r) for r in (res.data or [])]
    prof = sb.table("profiles").select("total_trips,total_miles").eq("id", uid).limit(1).execute()
    p = prof.data[0] if prof.data else {}
    return {
        "success": True,
        "data": {
            "recent_trips": recent,
            "total_trips": int(p.get("total_trips") or 0),
            "total_miles": float(p.get("total_miles") or 0),
        },
    }


def _get_trip_by_id_supabase(user: dict, trip_id: str) -> dict:
    uid = _trip_user_id(user)
    if not uid:
        raise HTTPException(status_code=401, detail="Invalid token")
    try:
        UUID(str(trip_id).strip())
    except ValueError:
        return {"success": False, "message": MSG_TRIP_NOT_FOUND}
    sb = get_supabase()
    res = (
        _trip_owner_filter(sb.table("trips").select("*").eq("id", trip_id), uid)
        .limit(1)
        .execute()
    )
    rows = res.data or []
    if not rows:
        return {"success": False, "message": MSG_TRIP_NOT_FOUND}
    return {"success": True, "data": _trip_row_to_client_shape(rows[0])}


# ==================== TRIP HISTORY ====================

@trips_history_router.get("/trips", responses=_LEGACY_503_RESPONSES)
def get_trips(
    user: OptionalUser,
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
):
    if ENVIRONMENT == "production":
        if not user:
            raise HTTPException(status_code=401, detail="Authentication required")
        return _get_trips_supabase(user, page, limit)
    _legacy_trips_guard()
    start = (page - 1) * limit
    end = start + limit

    total = len(trips_db)
    trips = trips_db[start:end]

    return {
        "success": True,
        "data": {
            "items": trips,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "total_pages": (total + limit - 1) // limit
            }
        }
    }

class StartTripBody(BaseModel):
    startLocation: str
    destination: Optional[str] = None


class EndTripBody(BaseModel):
    endLocation: str


@trips_legacy_router.post("/trips/start", responses=_LEGACY_503_RESPONSES)
def start_trip(body: StartTripBody):
    _legacy_trips_guard()
    new_id = str(uuid4())
    now = datetime.now()

    trip = {
        "id": new_id,
        "date": now.strftime("%Y-%m-%d"),
        "time": now.strftime("%I:%M %p"),
        "origin": body.startLocation,
        "destination": body.destination or "End",
        "active": True,
        "events": [],
        
    }

    trips_db.append(trip)
    return {
        "success": True,
        "data": trip
    }


@trips_history_router.get("/trips/history", responses=_LEGACY_503_RESPONSES)
def get_trip_history(user: OptionalUser, limit: Annotated[int, Query(ge=1, le=100)] = 10):
    if ENVIRONMENT == "production":
        if not user:
            raise HTTPException(status_code=401, detail="Authentication required")
        return _get_trip_history_supabase(user, limit)
    _legacy_trips_guard()
    mock_user = users_db.get(current_user_id, {})
    return {
        "success": True,
        "data": {
            "recent_trips": trips_db[:limit],
            "total_trips": mock_user.get("total_trips", 0),
            "total_miles": mock_user.get("total_miles", 0),
        },
    }


@trips_history_router.get("/trips/analytics")
def get_trip_analytics(user: CurrentUser):
    """Aggregate stats for the Rewards / Trip Analytics modal."""
    user_id = _trip_user_id(user)
    try:
        sb = get_supabase()
        prof = sb.table("profiles").select("total_miles,total_trips,safety_score,gems").eq("id", user_id).limit(1).execute()
        if prof.data and user_id:
            p = prof.data[0]
            trips_q = (
                _trip_owner_filter(sb.table("trips").select("safety_score,gems_earned"), user_id)
                .limit(500)
                .execute()
            )
            rows = trips_q.data or []
            n = len(rows)
            avg_safety = (
                sum(float(r.get("safety_score") or 0) for r in rows) / max(n, 1)
                if n
                else float(p.get("safety_score") or 0)
            )
            return {
                "success": True,
                "data": {
                    "total_miles": float(p.get("total_miles") or 0),
                    "total_trips": int(p.get("total_trips") or 0),
                    "avg_safety_score": round(avg_safety, 1),
                    "total_gems": int(p.get("gems") or 0),
                },
            }
    except Exception as exc:
        _trips_log.warning("trips/analytics: %s", exc)

    return {
        "success": True,
        "data": {
            "total_miles": float(user.get("total_miles") or 0),
            "total_trips": int(user.get("total_trips") or 0),
            "avg_safety_score": float(user.get("safety_score") or 0),
            "total_gems": int(user.get("gems") or 0),
        },
    }


@trips_history_router.get("/trips/history/recent")
def get_recent_trips_mobile(
    user: CurrentUser,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
):
    """Flat trip list for Route History modal (matches mobile `Trip` shape)."""
    user_id = _trip_user_id(user)
    out: list = []
    if not user_id:
        return {"success": True, "data": []}
    try:
        sb = get_supabase()
        res = (
            _trip_owner_filter(sb.table("trips").select("*"), user_id)
            .order("ended_at", desc=True)
            .limit(limit)
            .execute()
        )
        for r in res.data or []:
            trip = _trip_row_to_client_shape(r)
            trip["date"] = r.get("ended_at") or r.get("started_at") or trip.get("date") or ""
            out.append(trip)
        return {"success": True, "data": out}
    except Exception as exc:
        _trips_log.warning("trips/history/recent: %s", exc)

    return {"success": True, "data": []}


@trips_history_router.get("/trips/weekly-insights", responses=_LEGACY_503_RESPONSES)
def get_weekly_insights(user: OptionalUser):
    """Must be registered before `/trips/{trip_id}` so `weekly-insights` is not parsed as a UUID trip id."""
    if ENVIRONMENT == "production":
        if not user:
            raise HTTPException(status_code=401, detail="Authentication required")
        require_premium_user(user)
        return _weekly_insights_supabase(user)
    _legacy_trips_guard()
    cutoff_date = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
    week_trips = [t for t in trips_db if t.get("date", "") >= cutoff_date]

    if not week_trips:
        return _EMPTY_WEEK_RESPONSE

    total_miles, total_gems, avg_safety = _weekly_trip_stats(week_trips)
    best_day = _best_safety_day(week_trips)
    summary, tip = _ai_weekly_summary(week_trips, total_miles, avg_safety, best_day)

    return {
        "summary": summary,
        "fuel_saved": round(total_miles * 0.03, 1),
        "incidents_avoided": len(week_trips),
        "best_day": best_day,
        "safety_trend": _safety_trend(avg_safety),
        "gems_earned_week": total_gems,
        "miles_this_week": round(total_miles, 1),
        "trips_this_week": len(week_trips),
        "ai_tip": tip,
    }


@trips_history_router.get("/trips/{trip_id}", responses=_LEGACY_503_RESPONSES)
def get_trip_by_id(trip_id: str, user: OptionalUser):
    if ENVIRONMENT == "production":
        if not user:
            raise HTTPException(status_code=401, detail="Authentication required")
        return _get_trip_by_id_supabase(user, trip_id)
    _legacy_trips_guard()
    trip = next((t for t in trips_db if str(t.get("id")) == str(trip_id)), None)

    if not trip:
        return {
            "success": False,
            "message": MSG_TRIP_NOT_FOUND
        }

    return {
        "success": True,
        "data": trip
    }


@trips_legacy_router.post("/trips/{trip_id}/end", responses=_LEGACY_503_RESPONSES)
def end_trip(trip_id: str, body: EndTripBody):
    _legacy_trips_guard()
    trip = next((t for t in trips_db if t["id"] == trip_id), None)
    if not trip:
        return {"success": False, "message": MSG_TRIP_NOT_FOUND}
    trip["active"] = False
    trip["destination"] = body.endLocation or trip.get("destination") or "End"

    return {
        "success": True,
        "data": {
            "id": trip_id,
            "message": "Trip completed!",
        }
    }




class TripCompleteBody(BaseModel):
    distance_miles: float = 0
    duration_seconds: int = 0
    safety_score: float = 0
    started_at: Optional[str] = None
    ended_at: Optional[str] = None
    origin: Optional[str] = None
    destination: Optional[str] = None
    avg_speed_mph: Optional[float] = None
    max_speed_mph: Optional[float] = None
    fuel_used_gallons: Optional[float] = None
    fuel_cost_estimate: Optional[float] = None
    mileage_value_estimate: Optional[float] = None
    planned_distance_miles: Optional[float] = None
    planned_duration_seconds: Optional[int] = None
    planned_fuel_estimate_gallons: Optional[float] = None
    baseline_distance_miles: Optional[float] = None
    baseline_duration_seconds: Optional[int] = None
    baseline_fuel_estimate_gallons: Optional[float] = None
    route_fuel_savings_gallons: Optional[float] = None
    route_savings_dollars: Optional[float] = None
    time_saved_seconds: Optional[int] = None
    hard_braking_events: int = 0
    hard_acceleration_events: int = 0
    speeding_events: int = 0
    incidents_reported: int = 0
    region_state: Optional[str] = None

# Keep in sync with mobile passive + navigation trip gates (~0.10 mi, 30s, real movement).
_MIN_TRIP_MILES = 0.10
_MIN_TRIP_SECONDS = 30


def _trip_gems_today_utc(user_id: str) -> int:
    """Sum of gems_earned from trips starting UTC midnight (profile_id)."""
    if not user_id:
        return 0
    try:
        sb = get_supabase()
        start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        r = (
            _trip_owner_filter(sb.table("trips").select("gems_earned"), user_id)
            .gte("created_at", start)
            .execute()
        )
        return sum(int(x.get("gems_earned") or 0) for x in (r.data or []))
    except Exception as exc:
        _trips_log.warning("trip gems today query failed: %s", exc)
        return 0


def _compute_trip_rewards(
    distance: float,
    safety: float,
    user: dict,
    duration_seconds: float,
    *,
    profile_id: str,
) -> tuple[int, int]:
    """Return (gems_earned, xp_earned) for a qualifying trip."""
    from services.gem_economy import apply_trip_gem_daily_cap, trip_gems_from_duration_minutes

    is_premium = user.get("is_premium") or user.get("plan", "basic") not in ("basic", "free", "")
    duration_min = max(0.0, float(duration_seconds)) / 60.0
    gems = trip_gems_from_duration_minutes(duration_min, bool(is_premium))
    if profile_id:
        gems = apply_trip_gem_daily_cap(gems, _trip_gems_today_utc(profile_id))
    # Bounded XP so Insights/recap stay readable (was distance*100 + large safety bonus).
    xp_base = min(100, max(5, int(round(float(distance) * 2.0))))
    bonus = 15 if safety >= 85 else (5 if safety >= 70 else 0)
    xp = min(150, xp_base + bonus)
    return gems, xp


def _int_for_pg(v: Any, *, lo: Optional[int] = None, hi: Optional[int] = None) -> int:
    """Integer for PostgREST/Postgres INTEGER columns. JSON must not send 85.0 (float) or PG errors (see Sentry PYTHON-35)."""
    n = int(round(float(v)))
    if lo is not None:
        n = max(lo, n)
    if hi is not None:
        n = min(hi, n)
    return n


def _build_trip_row(
    trip_id: str, user_id: str, body: "TripCompleteBody",
    distance: float, safety: float, gems: int, xp: int,
) -> dict:
    now_iso = datetime.now(timezone.utc).isoformat()
    duration_seconds = _int_for_pg(body.duration_seconds)
    distance = _sanitize_trip_distance_miles(
        distance,
        duration_seconds,
        body.max_speed_mph if body.max_speed_mph is not None else body.avg_speed_mph,
    )
    observed_max_speed = _sanitize_speed_mph(body.max_speed_mph)
    avg_candidate = _sanitize_speed_mph(body.avg_speed_mph, _MAX_TRIP_AVG_SPEED_MPH)
    avg_speed = (
        avg_candidate
        if avg_candidate > 0 and (observed_max_speed <= 0 or avg_candidate <= observed_max_speed)
        else _sanitize_avg_speed_mph(distance, duration_seconds, observed_max_speed or None)
    )
    # Max speed: trust the client's smoothed peak when present; otherwise fall back to avg
    # (never below avg, never above a sane highway ceiling).
    max_speed = max(observed_max_speed, avg_speed)
    fuel_used = (
        float(body.fuel_used_gallons)
        if body.fuel_used_gallons is not None and math.isfinite(float(body.fuel_used_gallons))
        else (float(distance) / 25.0 if distance > 0 else 0.0)
    )
    fuel_cost = (
        float(body.fuel_cost_estimate)
        if body.fuel_cost_estimate is not None and math.isfinite(float(body.fuel_cost_estimate))
        else fuel_used * 3.60
    )
    if body.region_state and fuel_used > 0:
        try:
            pp = regular_price_usd_for_state_label(body.region_state.strip())
            if pp is not None and math.isfinite(pp) and pp > 0:
                fuel_cost = round(float(fuel_used) * float(pp), 2)
        except Exception:
            _trips_log.debug("region_state fuel price resolve skipped", exc_info=True)
    mileage_value = (
        float(body.mileage_value_estimate)
        if body.mileage_value_estimate is not None and math.isfinite(float(body.mileage_value_estimate))
        else float(distance) * 0.67
    )
    price_per_gallon = (fuel_cost / fuel_used) if fuel_used > 0 and fuel_cost > 0 else 3.60
    planned_distance = _positive_float_or_none(body.planned_distance_miles) or distance
    planned_duration = _int_for_pg(body.planned_duration_seconds or duration_seconds, lo=0)
    planned_fuel = _positive_float_or_none(body.planned_fuel_estimate_gallons) or fuel_used
    baseline_distance = _positive_float_or_none(body.baseline_distance_miles)
    baseline_duration = _int_for_pg(
        body.baseline_duration_seconds
        if body.baseline_duration_seconds is not None
        else round(duration_seconds * _DEFAULT_BASELINE_ROUTE_TIME_FACTOR),
        lo=0,
    )
    if baseline_distance is None:
        baseline_distance = max(distance, planned_distance)
    baseline_fuel = _positive_float_or_none(body.baseline_fuel_estimate_gallons)
    if baseline_fuel is None:
        baseline_fuel = max(fuel_used, planned_fuel, fuel_used * _DEFAULT_BASELINE_ROUTE_FUEL_FACTOR)
    route_fuel_savings = _float_or_none(body.route_fuel_savings_gallons)
    if route_fuel_savings is None:
        route_fuel_savings = baseline_fuel - fuel_used
    route_fuel_savings = max(0.0, float(route_fuel_savings))
    route_savings = _float_or_none(body.route_savings_dollars)
    if route_savings is None:
        route_savings = route_fuel_savings * price_per_gallon
    route_savings = max(0.0, float(route_savings))
    time_saved = _int_for_pg(
        body.time_saved_seconds
        if body.time_saved_seconds is not None
        else baseline_duration - duration_seconds,
        lo=0,
    )
    # INTEGER columns: use real Python int so JSON is 85 not 85.0 (invalid input for integer in Postgres).
    return {
        "id": trip_id,
        "user_id": user_id,
        "profile_id": user_id,
        "distance_miles": round(float(distance), 2),
        "duration_seconds": duration_seconds,
        "duration_minutes": max(1, int(round(duration_seconds / 60))) if duration_seconds > 0 else 0,
        "safety_score": _int_for_pg(safety, lo=0, hi=100),
        "gems_earned": _int_for_pg(gems),
        "xp_earned": _int_for_pg(xp),
        "origin": (body.origin or "Start")[:160],
        "destination": (body.destination or "End")[:160],
        "avg_speed_mph": round(max(0.0, avg_speed), 1),
        "max_speed_mph": round(max(0.0, max_speed), 1),
        "fuel_used_gallons": round(max(0.0, fuel_used), 3),
        "fuel_cost_estimate": round(max(0.0, fuel_cost), 2),
        "mileage_value_estimate": round(max(0.0, mileage_value), 2),
        "planned_distance_miles": round(max(0.0, planned_distance), 2),
        "planned_duration_seconds": planned_duration,
        "planned_fuel_estimate_gallons": round(max(0.0, planned_fuel), 3),
        "baseline_distance_miles": round(max(0.0, baseline_distance), 2),
        "baseline_duration_seconds": baseline_duration,
        "baseline_fuel_estimate_gallons": round(max(0.0, baseline_fuel), 3),
        "route_fuel_savings_gallons": round(route_fuel_savings, 3),
        "route_savings_dollars": round(route_savings, 2),
        "time_saved_seconds": time_saved,
        "savings_model_version": _SAVINGS_MODEL_VERSION,
        "started_at": body.started_at or now_iso,
        "ended_at": body.ended_at or now_iso,
        "hard_braking_events": _int_for_pg(body.hard_braking_events),
        "hard_acceleration_events": _int_for_pg(body.hard_acceleration_events),
        "speeding_events": _int_for_pg(body.speeding_events),
        "incidents_reported": _int_for_pg(body.incidents_reported),
        "created_at": now_iso,
        "status": "completed",
    }


def _is_duplicate_key_error(exc: BaseException) -> bool:
    """Postgres unique_violation (23505) or PostgREST duplicate wording."""
    code = getattr(exc, "code", None)
    if code in ("23505", 23505):
        return True
    msg = str(exc).lower()
    return "duplicate key" in msg or "unique constraint" in msg or "already exists" in msg


def _is_missing_trip_column_error(exc: BaseException, column: str) -> bool:
    msg = str(exc).lower()
    col = column.lower()
    return (
        "trips" in msg
        and col in msg
        and "column" in msg
        and ("does not exist" in msg or "could not find" in msg or "schema cache" in msg)
    )


def _strip_missing_trip_optional_column(trip_row: dict, exc: BaseException) -> bool:
    optional_columns = (
        "origin",
        "destination",
        "duration_minutes",
        "avg_speed_mph",
        "max_speed_mph",
        "fuel_used_gallons",
        "fuel_cost_estimate",
        "mileage_value_estimate",
        "planned_distance_miles",
        "planned_duration_seconds",
        "planned_fuel_estimate_gallons",
        "baseline_distance_miles",
        "baseline_duration_seconds",
        "baseline_fuel_estimate_gallons",
        "route_fuel_savings_gallons",
        "route_savings_dollars",
        "time_saved_seconds",
        "savings_model_version",
        "hard_acceleration_events",
    )
    for col in optional_columns:
        if col in trip_row and _is_missing_trip_column_error(exc, col):
            _trips_log.warning("trips.%s missing; retrying trip insert without it", col)
            trip_row.pop(col, None)
            return True
    return False


def _persist_trip_and_update_profile(
    trip_row: dict, user_id: str, gems: int, xp: int, distance: float,
) -> bool:
    """Insert trip row then bump profile counters. Returns True if a new trip row was inserted."""
    from database import reset_supabase_client

    inserted = False
    last_exc: Exception | None = None
    for attempt in range(8):
        try:
            sb = get_supabase()
            sb.table("trips").insert(trip_row).execute()
            inserted = True
            break
        except Exception as exc:
            last_exc = exc
            if _is_duplicate_key_error(exc):
                _trips_log.warning("Trip insert idempotent skip (duplicate id=%s): %s", trip_row.get("id"), exc)
                return False
            if _strip_missing_trip_optional_column(trip_row, exc):
                continue
            if attempt < 7:
                _trips_log.warning("Trip insert attempt %s failed (%s), resetting client and retrying", attempt + 1, exc)
                reset_supabase_client()
                time.sleep(0.08 * (attempt + 1))
            else:
                raise last_exc  # type: ignore[misc]

    if not inserted:
        return False

    last_prof: Exception | None = None
    for attempt in range(3):
        try:
            sb = get_supabase()
            profile = sb.table("profiles").select("gems, xp, total_trips, total_miles, safety_score").eq("id", user_id).limit(1).execute()
            if profile.data:
                p = profile.data[0]
                old_trips = int(p.get("total_trips") or 0)
                old_safety = float(p.get("safety_score") or 0)
                trip_row_safety = float(trip_row.get("safety_score") or 0)
                if old_trips <= 0:
                    new_safety = trip_row_safety
                else:
                    new_safety = (old_safety * old_trips + trip_row_safety) / float(old_trips + 1)
                new_safety = max(0.0, min(100.0, new_safety))
                sb.table("profiles").update({
                    "gems": int(p.get("gems") or 0) + int(gems),
                    "xp": int(p.get("xp") or 0) + int(xp),
                    "total_trips": int(p.get("total_trips") or 0) + 1,
                    "total_miles": round(float(p.get("total_miles") or 0) + float(distance), 2),
                    "safety_score": round(new_safety, 1),
                }).eq("id", user_id).execute()
                try:
                    recompute_profile_level_fields(user_id)
                    sync_earned_driver_badges(user_id)
                except Exception:
                    _trips_log.warning("post-trip level/badge sync failed for user_id=%s", user_id, exc_info=True)
            else:
                _trips_log.warning("No profile row for user_id=%s after trip insert; skipping counter update", user_id)
            return True
        except Exception as exc:
            last_prof = exc
            if attempt < 2:
                _trips_log.warning("Profile update after trip attempt %s failed (%s), resetting client and retrying", attempt + 1, exc)
                reset_supabase_client()
                time.sleep(0.08 * (attempt + 1))
            else:
                raise last_prof  # type: ignore[misc]
    return True


def _read_profile_totals_after_trip(user_id: str) -> Optional[Dict[str, Any]]:
    """Return authoritative profile counters for mobile to sync after /trips/complete."""
    if not user_id:
        return None
    try:
        sb = get_supabase()
        r = sb.table("profiles").select(
            "gems, xp, total_trips, total_miles, level, safety_score",
        ).eq("id", user_id).limit(1).execute()
        if r.data:
            row = r.data[0]
            return {
                "gems": row.get("gems"),
                "xp": row.get("xp"),
                "total_trips": row.get("total_trips"),
                "total_miles": row.get("total_miles"),
                "level": row.get("level"),
                "safety_score": row.get("safety_score"),
            }
    except Exception as exc:
        _trips_log.warning("profile totals read after trip failed: %s", exc)
    return None


@trips_history_router.post("/trips/complete", responses=_503_RESPONSES)
@limiter.limit("30/minute")
def complete_trip(request: Request, body: TripCompleteBody, user: CurrentUserOrGuest):
    """Persist a completed trip to Supabase and update profile stats."""
    user_id = str(user.get("user_id") or user.get("id") or "").strip()
    distance = _sanitize_trip_distance_miles(
        body.distance_miles,
        body.duration_seconds,
        body.max_speed_mph if body.max_speed_mph is not None else body.avg_speed_mph,
    )
    if body.duration_seconds < _MIN_TRIP_SECONDS or distance < _MIN_TRIP_MILES:
        return {
            "success": True,
            "data": {
                "trip_id": None,
                "counted": False,
                "gems_earned": 0,
                "xp_earned": 0,
                "safety_score": max(0, min(100, body.safety_score)),
                "distance_miles": round(distance, 2),
                "message": f"Trips need at least ~{_MIN_TRIP_MILES:.2f} mi and {_MIN_TRIP_SECONDS}s of driving.",
            },
        }
    safety = max(0, min(100, body.safety_score))
    if is_guest_user_id(user_id):
        trip_id = f"guest_trip_{uuid4()}"
        gems_earned, xp_earned = _compute_trip_rewards(
            distance,
            safety,
            {"plan": "free", "is_premium": False},
            body.duration_seconds,
            profile_id="",
        )
        record_guest_activity(
            user_id,
            "trip_complete",
            trip_id=trip_id,
            metadata={
                "distance_miles": round(distance, 2),
                "duration_seconds": _int_for_pg(body.duration_seconds),
                "safety_score": round(safety, 1),
                "origin": body.origin or "Start",
                "destination": body.destination or "End",
                "gems_earned": gems_earned,
                "xp_earned": xp_earned,
            },
        )
        return {
            "success": True,
            "data": {
                "trip_id": trip_id,
                "counted": True,
                "guest": True,
                "gems_earned": gems_earned,
                "xp_earned": xp_earned,
                "safety_score": round(safety, 1),
                "distance_miles": round(distance, 2),
                "duration_seconds": _int_for_pg(body.duration_seconds),
                "origin": body.origin or "Start",
                "destination": body.destination or "End",
                "message": "Guest trip tracked locally and archived for admin review.",
            },
        }
    prof = sb_get_profile(str(user_id)) if user_id else None
    reward_user = {**user, **(prof or {})}
    already_today = _trip_gems_today_utc(user_id)
    gems_earned, xp_earned = _compute_trip_rewards(
        distance, safety, reward_user, body.duration_seconds, profile_id=user_id
    )
    trip_id = str(uuid4())
    trip_row = _build_trip_row(trip_id, user_id, body, distance, safety, gems_earned, xp_earned)

    try:
        inserted = _persist_trip_and_update_profile(trip_row, user_id, gems_earned, xp_earned, distance)
    except Exception as exc:
        _trips_log.error(
            "Supabase trip write failed for user=%s trip=%s distance=%.2f duration=%ds: %s",
            user_id, trip_id, distance, body.duration_seconds, exc,
            exc_info=True,
        )
        if ENVIRONMENT == "production":
            raise HTTPException(status_code=503, detail="Trip storage unavailable")
        inserted = False

    if not inserted:
        return {
            "success": True,
            "data": {
                "trip_id": None,
                "counted": False,
                "gems_earned": 0,
                "xp_earned": 0,
                "safety_score": round(safety, 1),
                "distance_miles": round(distance, 2),
                "message": "Trip was not stored (duplicate or storage conflict).",
            },
        }

    profile_totals = _read_profile_totals_after_trip(user_id)
    if gems_earned > 0 and profile_totals:
        try:
            from services.gem_economy import trip_drive_ledger_metadata
            from services.wallet_ledger import record_wallet_transaction

            sb = get_supabase()
            bal = int(profile_totals.get("gems") or 0)
            is_prem = bool(reward_user.get("is_premium")) or str(reward_user.get("plan") or "").lower() in (
                "premium",
                "family",
            )
            meta = trip_drive_ledger_metadata(
                float(body.duration_seconds),
                distance,
                is_prem,
                int(gems_earned),
                already_today,
            )
            record_wallet_transaction(
                sb,
                user_id=user_id,
                tx_type="trip_drive",
                direction="credit",
                amount=int(gems_earned),
                balance_before=bal - int(gems_earned),
                balance_after=bal,
                reference_type="trip",
                reference_id=trip_id,
                metadata=meta,
            )
        except Exception:
            _trips_log.debug("trip wallet ledger skipped", exc_info=True)

    try:
        from services.friend_challenge_service import bump_friend_challenge_scores_after_trip

        bump_friend_challenge_scores_after_trip(user_id, safety)
    except Exception:
        _trips_log.debug("friend challenge score bump skipped", exc_info=True)

    payload = {
        "trip_id": trip_id,
        "counted": True,
        "gems_earned": gems_earned,
        "xp_earned": xp_earned,
        "safety_score": round(safety, 1),
        "distance_miles": round(distance, 2),
        "duration_seconds": _int_for_pg(body.duration_seconds),
        "origin": body.origin or "Start",
        "destination": body.destination or "End",
        "avg_speed_mph": trip_row.get("avg_speed_mph"),
        "max_speed_mph": trip_row.get("max_speed_mph"),
        "fuel_used_gallons": trip_row.get("fuel_used_gallons"),
        "fuel_cost_estimate": trip_row.get("fuel_cost_estimate"),
        "mileage_value_estimate": trip_row.get("mileage_value_estimate"),
        "baseline_fuel_estimate_gallons": trip_row.get("baseline_fuel_estimate_gallons"),
        "route_fuel_savings_gallons": trip_row.get("route_fuel_savings_gallons"),
        "route_savings_dollars": trip_row.get("route_savings_dollars"),
        "route_savings_usd": trip_row.get("route_savings_dollars"),
        "baseline_duration_seconds": trip_row.get("baseline_duration_seconds"),
        "time_saved_seconds": trip_row.get("time_saved_seconds"),
        "savings_model_version": trip_row.get("savings_model_version"),
        "hard_braking_events": trip_row.get("hard_braking_events"),
        "hard_acceleration_events": trip_row.get("hard_acceleration_events"),
        "speeding_events": trip_row.get("speeding_events"),
        "incidents_reported": trip_row.get("incidents_reported"),
    }
    if profile_totals is not None:
        payload["profile"] = profile_totals
    return {"success": True, "data": payload}


def _compute_safety_score(
    metrics: dict, old_score: float, is_safe: bool, override: Optional[float],
) -> float:
    """Compute new safety score from trip metrics."""
    if is_safe:
        score = min(100, old_score + 1)
    else:
        penalties = metrics.get("hard_brakes", 0) * 2 + metrics.get("speeding_incidents", 0) * 3 + metrics.get("phone_usage", 0) * 5
        score = max(0, old_score - penalties)
    if override is not None:
        score = round(float(override), 1)
    return score


def _compute_xp_changes(
    is_safe: bool, user: dict, new_score: float, old_score: float,
) -> tuple[int, list, dict]:
    """Compute XP changes, update streak on user, return (total_xp, xp_changes, user)."""
    total_xp = 0
    xp_changes: list[dict] = []
    if is_safe:
        total_xp += XP_CONFIG["safe_drive"]
        xp_changes.append({"type": "safe_drive", "xp": XP_CONFIG["safe_drive"]})
        new_streak = user.get("safe_drive_streak", 0) + 1
        user["safe_drive_streak"] = new_streak
        if new_streak % 3 == 0:
            total_xp += XP_CONFIG["consistent_driving"]
            xp_changes.append({"type": "consistent_bonus", "xp": XP_CONFIG["consistent_driving"]})
    else:
        user["safe_drive_streak"] = 0
        if new_score < old_score:
            total_xp += XP_CONFIG["safety_score_penalty"]
            xp_changes.append({"type": "safety_penalty", "xp": XP_CONFIG["safety_score_penalty"]})
    return total_xp, xp_changes, user


def _normalize_route_coords(raw) -> list:
    if raw and isinstance(raw[0], dict):
        return [{"lat": float(c.get("lat", 0)), "lng": float(c.get("lng", 0))} for c in raw]
    return []


@trips_legacy_router.post("/trips/complete-with-safety", responses=_LEGACY_503_RESPONSES)
def complete_trip_with_safety(trip: TripResult):
    _legacy_trips_guard()
    user = ensure_user(current_user_id, "Driver")
    metrics = trip.safety_metrics or {}
    is_safe_drive = metrics.get("hard_brakes", 0) == 0 and metrics.get("speeding_incidents", 0) == 0 and metrics.get("phone_usage", 0) == 0
    old_safety_score = user.get("safety_score", 85)
    new_safety_score = _compute_safety_score(metrics, old_safety_score, is_safe_drive, trip.safety_score)

    user["safety_score"] = new_safety_score
    user["total_trips"] = user.get("total_trips", 0) + 1
    user["total_miles"] = user.get("total_miles", 0) + trip.distance

    total_xp, xp_changes, user = _compute_xp_changes(is_safe_drive, user, new_safety_score, old_safety_score)
    xp_result = add_xp_to_user(current_user_id, total_xp) if total_xp != 0 else {}
    gem_multiplier = user.get("gem_multiplier", 1)
    gems_earned = 5 * gem_multiplier
    user["gems"] = user.get("gems", 0) + gems_earned

    now = datetime.now()
    route_coords = _normalize_route_coords(trip.route_coordinates)
    duration_min = max(1, trip.duration)
    fuel_used = trip.distance / 30.0 if trip.distance else 0.1
    new_id = str(uuid4())
    trips_db.append({
        "id": new_id,
        "date": now.strftime("%Y-%m-%d"),
        "time": now.strftime("%I:%M %p"),
        "origin": trip.origin or "Start",
        "destination": trip.destination or "End",
        "distance_miles": round(trip.distance, 1),
        "duration_minutes": duration_min,
        "safety_score": new_safety_score,
        "gems_earned": gems_earned,
        "xp_earned": total_xp or int(trip.distance * 10),
        "fuel_used_gallons": round(fuel_used, 3),
        "avg_speed_mph": round(trip.distance / (duration_min / 60), 1) if duration_min else 0,
        "route_coordinates": route_coords,
        "events": [],
    })

    return {
        "success": True,
        "message": "Trip completed!",
        "data": {
            "is_safe_drive": is_safe_drive,
            "safety_score": {"old": old_safety_score, "new": new_safety_score, "change": new_safety_score - old_safety_score},
            "xp": {"changes": xp_changes, "total_earned": total_xp, "result": xp_result},
            "gems": {"earned": gems_earned, "multiplier": gem_multiplier},
            "safe_drive_streak": user.get("safe_drive_streak", 0),
            "trip_id": new_id,
        },
    }


@trips_legacy_router.get("/trips/history/detailed", responses=_LEGACY_503_RESPONSES)
def get_detailed_trip_history(
    days: Annotated[int, Query(ge=1, le=365)] = 30,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    sort_by: str = "date",
):
    _legacy_trips_guard()
    cutoff_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
    filtered = [t for t in trips_db if t["date"] >= cutoff_date][:limit]
    total_distance = sum(t["distance_miles"] for t in filtered)
    total_fuel = sum(t["fuel_used_gallons"] for t in filtered)
    total_duration = sum(t["duration_minutes"] for t in filtered)
    avg_safety = sum(t["safety_score"] for t in filtered) / max(len(filtered), 1)
    total_gems = sum(t["gems_earned"] for t in filtered)
    baseline_fuel = total_distance / 25
    fuel_saved = baseline_fuel - total_fuel
    money_saved = fuel_saved * FUEL_PRICES["regular"]
    return {
        "success": True,
        "data": {
            "trips": filtered,
            "analytics": {
                "total_trips": len(filtered), "total_distance_miles": round(total_distance, 1),
                "total_fuel_gallons": round(total_fuel, 2), "total_duration_minutes": total_duration,
                "total_duration_hours": round(total_duration / 60, 1), "avg_safety_score": round(avg_safety, 1),
                "total_gems_earned": round(total_gems), "avg_mpg": round(total_distance / max(total_fuel, 0.1), 1),
                "fuel_saved_gallons": round(max(fuel_saved, 0), 2), "money_saved_dollars": round(max(money_saved, 0), 2),
                "co2_saved_lbs": round(max(fuel_saved, 0) * 19.6, 1),
            },
        },
    }


def _weekly_trip_stats(week_trips: list) -> tuple[float, int, float]:
    """Return (total_miles, total_gems, avg_safety) for the week's trips."""
    total_miles = sum(float(t.get("distance_miles", 0) or 0) for t in week_trips)
    total_gems = sum(int(t.get("gems_earned", 0) or 0) for t in week_trips)
    avg_safety = sum(float(t.get("safety_score", 0) or 0) for t in week_trips) / max(len(week_trips), 1)
    return total_miles, total_gems, avg_safety


def _best_safety_day(week_trips: list) -> str:
    """Find the day of the week with the highest average safety score."""
    day_scores: dict[str, list[float]] = {}
    for trip in week_trips:
        day_str = trip.get("date")
        try:
            dt = datetime.strptime(day_str, "%Y-%m-%d")
            day_name = dt.strftime("%A")
        except Exception:
            day_name = "N/A"
        day_scores.setdefault(day_name, [])
        day_scores[day_name].append(float(trip.get("safety_score", 0) or 0))
    if not day_scores:
        return "N/A"
    return max(day_scores, key=lambda d: sum(day_scores[d]) / max(len(day_scores[d]), 1))


def _ai_weekly_summary(
    week_trips: list, total_miles: float, avg_safety: float, best_day: str,
) -> tuple[str, str]:
    """Ask Orion for a weekly summary and tip; returns (summary, tip) with deterministic fallbacks."""
    summary = (
        f"You completed {len(week_trips)} trips and drove {round(total_miles, 1)} miles this week "
        f"with an average safety score of {round(avg_safety)}."
    )
    tip = (
        "Your safest drives happen when you keep a steady pace. "
        "Try smoother braking on busy interchanges to keep improving."
    )
    client = get_sync_openai_client() if OpenAI is not None else None
    if client is None:
        return summary, tip
    try:
        payload = {
            "trips_this_week": len(week_trips),
            "miles_this_week": round(total_miles, 1),
            "avg_safety_score": round(avg_safety, 1),
            "best_day": best_day,
        }
        response = client.chat.completions.create(
            model=chat_completion_model(),
            temperature=0.3,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are Orion, an in-car driving coach. "
                        "Return strict JSON with keys: summary, ai_tip. "
                        "summary max 1 sentence. ai_tip max 1 sentence."
                    ),
                },
                {"role": "user", "content": json.dumps(payload)},
            ],
            response_format={"type": "json_object"},
        )
        content = (response.choices[0].message.content or "").strip()
        parsed = json.loads(content) if content else {}
        ai_summary = parsed.get("summary")
        ai_tip = parsed.get("ai_tip")
        if isinstance(ai_summary, str) and ai_summary.strip():
            summary = ai_summary.strip()
        if isinstance(ai_tip, str) and ai_tip.strip():
            tip = ai_tip.strip()
    except Exception as e:
        _trips_log.warning("failed to get AI weekly insights: %s", e)
    return summary, tip


def _safety_trend(avg_safety: float) -> str:
    if avg_safety >= 80:
        return "improving"
    if avg_safety >= 60:
        return "steady"
    return "declining"


_EMPTY_WEEK_RESPONSE = {
    "summary": "No trips this week yet. Start driving to get your weekly recap!",
    "fuel_saved": 0,
    "incidents_avoided": 0,
    "best_day": "N/A",
    "safety_trend": "steady",
    "gems_earned_week": 0,
    "miles_this_week": 0,
    "trips_this_week": 0,
    "ai_tip": "Complete your first trip this week to get personalized Orion tips.",
}


def _week_trip_dicts_from_supabase(user_id: str) -> list:
    """Rows shaped for _weekly_trip_stats / _best_safety_day (need `date` YYYY-MM-DD)."""
    sb = get_supabase()
    cutoff = datetime.now(timezone.utc) - timedelta(days=7)
    res = (
        sb.table("trips")
        .select("distance_miles,gems_earned,safety_score,ended_at,started_at")
        .eq("user_id", user_id)
        .order("ended_at", desc=True)
        .limit(400)
        .execute()
    )
    out: list = []
    for r in res.data or []:
        ended_raw = r.get("ended_at") or r.get("started_at")
        if not ended_raw:
            continue
        try:
            es = str(ended_raw).replace("Z", "+00:00")
            dt = datetime.fromisoformat(es)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            if dt < cutoff:
                continue
        except Exception:
            continue  # nosec B112
        out.append({
            "date": dt.strftime("%Y-%m-%d"),
            "distance_miles": r.get("distance_miles", 0),
            "gems_earned": r.get("gems_earned", 0),
            "safety_score": r.get("safety_score", 0),
        })
    return out


def _weekly_insights_supabase(user: dict) -> dict:
    uid = _trip_user_id(user)
    if not uid:
        raise HTTPException(status_code=401, detail="Invalid token")
    week_trips = _week_trip_dicts_from_supabase(uid)
    if not week_trips:
        return _EMPTY_WEEK_RESPONSE
    total_miles, total_gems, avg_safety = _weekly_trip_stats(week_trips)
    best_day = _best_safety_day(week_trips)
    summary, tip = _ai_weekly_summary(week_trips, total_miles, avg_safety, best_day)
    return {
        "summary": summary,
        "fuel_saved": round(total_miles * 0.03, 1),
        "incidents_avoided": len(week_trips),
        "best_day": best_day,
        "safety_trend": _safety_trend(avg_safety),
        "gems_earned_week": total_gems,
        "miles_this_week": round(total_miles, 1),
        "trips_this_week": len(week_trips),
        "ai_tip": tip,
    }


@trips_legacy_router.post("/trips/{trip_id}/share", responses=_LEGACY_503_RESPONSES)
def share_trip(trip_id: str):
    _legacy_trips_guard()
    trip = next((t for t in trips_db if str(t.get("id")) == str(trip_id)), None)
    if not trip:
        return {"success": False, "message": MSG_TRIP_NOT_FOUND}
    share_url = f"https://snaproad.app/trip/{trip_id}"
    return {"success": True, "data": {"share_url": share_url, "trip_summary": f"I drove {trip['distance_miles']} miles with a {trip['safety_score']} safety score!"}}


# ==================== FUEL ====================
# Wired to Supabase fuel_history table. In-memory fallback only for non-production.


def _fuel_uid(user: dict) -> str:
    return str(user.get("user_id") or user.get("id") or "")


def _prior_fill_timestamp(prior: dict) -> Optional[str]:
    ct = prior.get("created_at")
    if ct:
        return str(ct)
    d = prior.get("date")
    return f"{d}T00:00:00+00:00" if d else None


def _trip_miles_since(profile_id: str, since_iso: Optional[str]) -> float:
    """Sum SnapRoad `trips.distance_miles` strictly after last fuel log timestamp."""
    if not since_iso or not profile_id:
        return 0.0
    try:
        sb = get_supabase()
        rows = (
            sb.table("trips")
            .select("distance_miles")
            .eq("profile_id", profile_id)
            .gt("created_at", since_iso)
            .execute()
        )
        return round(sum(float(r.get("distance_miles") or 0) for r in (rows.data or [])), 2)
    except Exception:
        _trips_log.warning("trip miles since fallback for profile_id=%s", profile_id, exc_info=True)
        total = 0.0
        since = str(since_iso)
        for t in trips_db:
            pid = str(t.get("profile_id") or t.get("user_id") or "")
            if pid != str(profile_id):
                continue
            tc = str(t.get("created_at") or "")
            if tc and tc > since:
                total += float(t.get("distance_miles") or 0)
        return round(total, 2)


def _fuel_get_latest_fill(uid: str) -> Optional[dict]:
    try:
        sb = get_supabase()
        r = (
            sb.table("fuel_history")
            .select("*")
            .eq("user_id", uid)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if r.data:
            return r.data[0]
    except Exception:
        _trips_log.debug("fuel latest fill fallback for uid=%s", uid, exc_info=True)
    return fuel_logs[0] if fuel_logs else None


def _fuel_odometer_suggestion(uid: str) -> dict:
    """Last fill + SnapRoad trip miles for smart odometer (missed off-app trips = user adjusts)."""
    blank = {
        "last_fill_odometer_mi": None,
        "last_fill_at": None,
        "trips_miles_since_last_fill": None,
        "suggested_odometer_mi": None,
        "can_auto_odometer": False,
    }
    prior = _fuel_get_latest_fill(uid)
    if not prior:
        return blank
    po = prior.get("odometer")
    if po is None or po == "":
        return blank
    try:
        lo = float(po)
    except (TypeError, ValueError):
        return blank
    since = _prior_fill_timestamp(prior)
    if not since:
        return blank
    trip_miles = _trip_miles_since(uid, since)
    return {
        "last_fill_odometer_mi": round(lo, 1),
        "last_fill_at": since,
        "trips_miles_since_last_fill": round(trip_miles, 1),
        "suggested_odometer_mi": round(lo + trip_miles, 1),
        "can_auto_odometer": True,
    }


def _fuel_query(user: dict, sb=None):
    """Paginated fuel_history for the authenticated user."""
    if sb is None:
        sb = get_supabase()
    return sb.table("fuel_history").select("*").eq("user_id", _fuel_uid(user)).order("created_at", desc=True)


def _fuel_history_paginated_response(user: dict, page: int, limit: int) -> dict:
    """Shared by GET /fuel/history and GET /fuel/logs (Supabase + in-memory dev fallback)."""
    try:
        sb = get_supabase()
        uid = _fuel_uid(user)
        offset = (page - 1) * limit
        rows = (
            sb.table("fuel_history")
            .select("*", count="exact")
            .eq("user_id", uid)
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        total = rows.count if rows.count is not None else len(rows.data or [])
        return {
            "success": True,
            "data": {
                "items": rows.data or [],
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": total,
                    "total_pages": max(1, (total + limit - 1) // limit),
                },
            },
        }
    except Exception:
        _trips_log.warning("fuel history fallback (memory) user=%s", _fuel_uid(user), exc_info=True)
        if ENVIRONMENT == "production":
            raise
        start = (page - 1) * limit
        n = len(fuel_logs)
        return {
            "success": True,
            "data": {
                "items": fuel_logs[start : start + limit],
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": n,
                    "total_pages": max(1, (n + limit - 1) // limit),
                },
            },
        }


@trips_fuel_router.get("/fuel/history")
def get_fuel_history(
    user: CurrentUser,
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
):
    return _fuel_history_paginated_response(user, page, limit)


@trips_fuel_router.post("/fuel/logs")
@trips_fuel_router.post("/fuel/log")
@limiter.limit("20/minute")
def log_fuel(request: Request, entry: FuelLogCreate, user: CurrentUser):
    uid = _fuel_uid(user)
    if not uid:
        raise HTTPException(status_code=401, detail="Invalid user")
    total_cost = round(float(entry.gallons) * float(entry.price_per_gallon), 2)
    is_full = bool(entry.is_full_tank)

    prior_row = _fuel_get_latest_fill(uid)
    prior_odom: Optional[float] = None
    prior_is_full = True
    since_ts: Optional[str] = None
    trip_miles = 0.0
    if prior_row:
        since_ts = _prior_fill_timestamp(prior_row)
        trip_miles = _trip_miles_since(uid, since_ts)
        po = prior_row.get("odometer")
        if po is not None and po != "":
            try:
                prior_odom = float(po)
            except (TypeError, ValueError):
                prior_odom = None
        prior_is_full = bool(prior_row.get("is_full_tank", True))

    odometer_source = "manual"
    new_odom: Optional[float] = None
    if entry.use_auto_odometer:
        if prior_row is None or prior_odom is None:
            raise HTTPException(
                status_code=422,
                detail="Automatic odometer needs a prior fill with odometer. Enter your dash reading for this fill.",
            )
        new_odom = round(prior_odom + trip_miles, 1)
        odometer_source = "auto_trips"
    elif entry.odometer is not None:
        try:
            new_odom = round(float(entry.odometer), 1)
        except (TypeError, ValueError):
            new_odom = None

    if new_odom is None:
        raise HTTPException(
            status_code=422,
            detail="Enter odometer, or log with SnapRoad trip estimate (needs a prior fill with odometer).",
        )

    mpg_this_fill = None
    if (
        new_odom is not None
        and prior_odom is not None
        and new_odom > prior_odom
        and float(entry.gallons) > 0
        and is_full
        and prior_is_full
    ):
        mpg_this_fill = round((new_odom - prior_odom) / float(entry.gallons), 1)

    payload = {
        "user_id": uid,
        "station_name": (entry.station or "Unknown").strip() or "Unknown",
        "price_per_gallon": round(float(entry.price_per_gallon), 4),
        "gallons": round(float(entry.gallons), 4),
        "total_cost": total_cost,
        "odometer": new_odom,
        "is_full_tank": is_full,
        "odometer_source": odometer_source,
        "trips_miles_used": round(trip_miles, 2) if prior_row else None,
    }
    try:
        sb = get_supabase()
        created = sb.table("fuel_history").insert(payload).execute()
        row = (created.data or [{}])[0]
        out = {**row, "mpg_this_fill": mpg_this_fill}
        return {"success": True, "message": "Fuel log entry added", "data": out}
    except Exception:
        _trips_log.warning("fuel log insert fallback (memory) uid=%s", uid, exc_info=True)
        if ENVIRONMENT == "production":
            raise
        now_iso = datetime.now(timezone.utc).isoformat()
        new_entry = {
            **payload,
            "id": str(uuid4()),
            "date": datetime.now(timezone.utc).date().isoformat(),
            "total": total_cost,
            "mpg_this_fill": mpg_this_fill,
            "created_at": now_iso,
        }
        fuel_logs.insert(0, new_entry)
        return {"success": True, "message": "Fuel log entry added (dev/memory)", "data": new_entry}


@trips_fuel_router.get("/fuel/logs")
def get_fuel_logs(
    user: CurrentUser,
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
):
    return _fuel_history_paginated_response(user, page, limit)


@trips_fuel_router.get("/fuel/trends")
def get_fuel_trends(user: CurrentUser):
    try:
        sb = get_supabase()
        uid = _fuel_uid(user)
        rows = sb.table("fuel_history").select("gallons, total_cost, created_at").eq("user_id", uid).execute()
        items = rows.data or []
        total_gallons = sum(float(f.get("gallons", 0)) for f in items)
        total_spent = sum(float(f.get("total_cost", 0)) for f in items)
        avg_price = total_spent / total_gallons if total_gallons > 0 else 0
        return {"success": True, "data": {"total_gallons": round(total_gallons, 1), "total_spent": round(total_spent, 2), "avg_price_per_gallon": round(avg_price, 2), "entries": len(items), "monthly_avg_gallons": round(total_gallons / max(1, len(items) // 30 + 1), 1)}}
    except Exception:
        _trips_log.warning("fuel trends fallback (memory) uid=%s", _fuel_uid(user), exc_info=True)
        if ENVIRONMENT == "production":
            raise
        total_gallons = sum(f["gallons"] for f in fuel_logs)
        total_spent = sum(f.get("total_cost", f.get("total", 0)) for f in fuel_logs)
        avg_price = total_spent / total_gallons if total_gallons > 0 else 0
        return {"success": True, "data": {"total_gallons": round(total_gallons, 1), "total_spent": round(total_spent, 2), "avg_price_per_gallon": round(avg_price, 2), "entries": len(fuel_logs), "monthly_avg_gallons": round(total_gallons / 3, 1)}}


def _haversine_miles(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    rlat1, rlng1, rlat2, rlng2 = map(math.radians, (lat1, lng1, lat2, lng2))
    dlat = rlat2 - rlat1
    dlng = rlng2 - rlng1
    a = math.sin(dlat / 2) ** 2 + math.cos(rlat1) * math.cos(rlat2) * math.sin(dlng / 2) ** 2
    c = 2 * math.asin(min(1.0, math.sqrt(a)))
    return 6371.0 * c * 0.621371


def _mock_nearby_stations(lat: float, lng: float) -> list[dict]:
    base = float(FUEL_PRICES.get("regular", 3.59) or 3.59)
    return [
        {
            "name": "Kroger Gas",
            "price": round(base - 0.05, 3),
            "lat": lat + 0.01,
            "lng": lng + 0.01,
            "brand": "Kroger",
            "source": "estimated_local_fallback",
            "is_estimated": True,
        },
        {
            "name": "Sunoco",
            "price": round(base + 0.05, 3),
            "lat": lat - 0.01,
            "lng": lng + 0.02,
            "brand": "Sunoco",
            "source": "estimated_local_fallback",
            "is_estimated": True,
        },
        {
            "name": "Marathon",
            "price": round(base, 3),
            "lat": lat + 0.02,
            "lng": lng - 0.01,
            "brand": "Marathon",
            "source": "estimated_local_fallback",
            "is_estimated": True,
        },
    ]


def _fetch_gasbuddy_stations(lat: float, lng: float) -> list[dict]:
    try:
        import httpx

        with httpx.Client(timeout=12.0) as client:
            r = client.get(
                "https://www.gasbuddy.com/api/stations/near",
                params={"lat": lat, "lng": lng, "radius": 25, "limit": 30},
            )
            r.raise_for_status()
            data = r.json()
    except Exception as e:
        _trips_log.warning("GasBuddy proxy request failed: %s", e)
        return []
    raw = data.get("stations") if isinstance(data, dict) else None
    if not isinstance(raw, list):
        return []
    out: list[dict] = []
    for s in raw:
        if not isinstance(s, dict):
            continue
        prices = s.get("prices")
        price = 0.0
        if isinstance(prices, list) and prices:
            try:
                price = float((prices[0] or {}).get("credit_price") or 0)
            except (TypeError, ValueError):
                price = 0.0
        try:
            slat = float(s.get("lat"))
            slng = float(s.get("lng"))
        except (TypeError, ValueError):
            continue
        if price <= 0:
            continue
        name = str(s.get("name") or "Station")
        brand = str(s.get("brand") or name)
        out.append({
            "name": name,
            "price": round(price, 3),
            "lat": slat,
            "lng": slng,
            "brand": brand,
            "source": "gasbuddy",
            "is_estimated": False,
        })
    return out


def _stations_to_nearby(stations: list[dict], lat: float, lng: float) -> list[dict]:
    nearby: list[dict] = []
    for s in stations:
        try:
            d = _haversine_miles(lat, lng, float(s["lat"]), float(s["lng"]))
        except (TypeError, ValueError, KeyError):
            d = 0.0
        nearby.append({
            "name": s["name"],
            "address": s.get("brand") or s["name"],
            "regular": s["price"],
            "distance_miles": round(d, 2),
            "lat": s["lat"],
            "lng": s["lng"],
            "source": s.get("source"),
            "is_estimated": bool(s.get("is_estimated")),
        })
    return nearby


@trips_fuel_router.get("/fuel/prices")
def get_fuel_prices(
    lat: Annotated[float, Query(description="Latitude")] = 39.9612,
    lng: Annotated[float, Query(description="Longitude")] = -82.9988,
):
    """Public local fuel snapshot: TomTom (if configured + entitled), else GasBuddy JSON, else estimated nearby."""
    tomtom_configured = bool(TOMTOM_API_KEY)
    stations: list[dict] = []
    source = "estimated_local_fallback"
    is_estimated = True

    if tomtom_configured:
        stations = fetch_tomtom_fuel_stations(lat, lng)
        if stations:
            source = "tomtom"
            is_estimated = False

    if not stations:
        stations = _fetch_gasbuddy_stations(lat, lng)
        if stations:
            source = "gasbuddy"
            is_estimated = False

    if not stations:
        stations = _mock_nearby_stations(lat, lng)
        source = "estimated_local_fallback"
        is_estimated = True

    nearby_stations = _stations_to_nearby(stations, lat, lng)
    return {
        "success": True,
        "data": {
            "prices": FUEL_PRICES,
            "location": {"lat": lat, "lng": lng},
            "source": source,
            "is_estimated": is_estimated,
            "stations": stations,
            "nearby_stations": nearby_stations,
            "tomtom_configured": tomtom_configured,
        },
    }


def _compute_fuel_stats_from_items(items: list) -> dict:
    """Derive gig-driver-friendly stats: interval MPG, $/mi, last odometer (items newest-first)."""
    total_gallons = sum(float(f.get("gallons", 0)) for f in items)
    total_spent = sum(float(f.get("total_cost", f.get("total", 0))) for f in items)

    def _odom(f) -> Optional[float]:
        o = f.get("odometer")
        if o is None or o == "":
            return None
        try:
            v = float(o)
            return v if v > 0 else None
        except (TypeError, ValueError):
            return None

    with_odom = [f for f in items if _odom(f) is not None]
    chrono = sorted(
        with_odom,
        key=lambda f: (f.get("created_at") or f.get("date") or "", f.get("id") or ""),
    )

    last_odometer_mi = round(float(chrono[-1]["odometer"]), 1) if chrono else None
    miles_since_last_fill = None
    if len(chrono) >= 2:
        miles_since_last_fill = round(float(chrono[-1]["odometer"]) - float(chrono[-2]["odometer"]), 1)

    interval_mpgs: list[float] = []
    for i in range(1, len(chrono)):
        prev_f = chrono[i - 1]
        curr_f = chrono[i]
        if not bool(prev_f.get("is_full_tank", True)) or not bool(curr_f.get("is_full_tank", True)):
            continue
        prev_o = float(prev_f["odometer"])
        curr_o = float(curr_f["odometer"])
        gal = float(curr_f.get("gallons", 0))
        if curr_o > prev_o and gal > 0:
            interval_mpgs.append((curr_o - prev_o) / gal)

    avg_mpg = round(sum(interval_mpgs) / len(interval_mpgs), 1) if interval_mpgs else None

    odom_span = None
    if len(chrono) >= 2:
        odom_span = float(chrono[-1]["odometer"]) - float(chrono[0]["odometer"])
    cost_per_mile = None
    if odom_span and odom_span > 0 and total_spent > 0:
        cost_per_mile = round(total_spent / odom_span, 3)

    return {
        "total_entries": len(items),
        "total_gallons": round(total_gallons, 1),
        "total_spent": round(total_spent, 2),
        "avg_mpg": avg_mpg,
        "last_odometer_mi": last_odometer_mi,
        "miles_since_last_fill": miles_since_last_fill,
        "cost_per_mile": cost_per_mile,
    }


@trips_fuel_router.get("/fuel/stats")
def get_fuel_stats(user: CurrentUser):
    try:
        sb = get_supabase()
        uid = _fuel_uid(user)
        rows = (
            sb.table("fuel_history")
            .select("id, gallons, total_cost, odometer, created_at, is_full_tank")
            .eq("user_id", uid)
            .order("created_at", desc=True)
            .execute()
        )
        items = rows.data or []
        data = _compute_fuel_stats_from_items(items)
        data.update(_fuel_odometer_suggestion(uid))
        return {"success": True, "data": data}
    except Exception:
        _trips_log.warning("fuel stats fallback (memory) uid=%s", _fuel_uid(user), exc_info=True)
        if ENVIRONMENT == "production":
            raise
        data = _compute_fuel_stats_from_items(fuel_logs)
        data.update(_fuel_odometer_suggestion(uid))
        return {"success": True, "data": data}


def _fuel_analytics_monthly_supabase(uid: str, month_span: int) -> list:
    sb = get_supabase()
    since = (datetime.now() - timedelta(days=30 * month_span)).isoformat()
    fuel_rows = (
        sb.table("fuel_history")
        .select("gallons, total_cost, created_at")
        .eq("user_id", uid)
        .gte("created_at", since)
        .execute()
    )
    trip_rows = (
        sb.table("trips")
        .select("distance_miles, created_at")
        .eq("profile_id", uid)
        .gte("created_at", since)
        .execute()
    )
    fuel_data = fuel_rows.data or []
    trip_data = trip_rows.data or []
    monthly_data = []
    for i in range(MAX_FUEL_ANALYTICS_MONTHS):
        if i >= month_span:
            break
        month_date = datetime.now() - timedelta(days=30 * i)
        prefix = month_date.strftime("%Y-%m")
        m_fuel = [f for f in fuel_data if (f.get("created_at") or "").startswith(prefix)]
        m_trips = [t for t in trip_data if (t.get("created_at") or "").startswith(prefix)]
        distance = sum(float(t.get("distance_miles", 0)) for t in m_trips)
        fuel = sum(float(f.get("gallons", 0)) for f in m_fuel)
        cost = sum(float(f.get("total_cost", 0)) for f in m_fuel)
        monthly_data.append({
            "month": month_date.strftime("%B %Y"),
            "trips": len(m_trips),
            "distance_miles": round(distance, 1),
            "fuel_gallons": round(fuel, 2),
            "avg_mpg": round(distance / max(fuel, 0.1), 1),
            "cost_estimate": round(cost, 2),
        })
    return monthly_data


def _fuel_analytics_monthly_memory(month_span: int) -> list:
    monthly_data = []
    for i in range(MAX_FUEL_ANALYTICS_MONTHS):
        if i >= month_span:
            break
        month_date = datetime.now() - timedelta(days=30 * i)
        ym = month_date.strftime("%Y-%m")
        month_trips = [t for t in trips_db if t["date"].startswith(ym)]
        distance = sum(t["distance_miles"] for t in month_trips)
        fuel = sum(t["fuel_used_gallons"] for t in month_trips)
        monthly_data.append({
            "month": month_date.strftime("%B %Y"),
            "trips": len(month_trips),
            "distance_miles": round(distance, 1),
            "fuel_gallons": round(fuel, 2),
            "avg_mpg": round(distance / max(fuel, 0.1), 1),
            "cost_estimate": round(fuel * FUEL_PRICES["regular"], 2),
        })
    return monthly_data


@trips_fuel_router.get("/fuel/analytics")
def get_fuel_analytics(user: CurrentUser, months: Annotated[int, Query(ge=1, le=24)] = 3):
    # Loop bound must not be user input directly (Sonar): cap with constant, iterate at most MAX_FUEL_ANALYTICS_MONTHS.
    month_span = min(months, MAX_FUEL_ANALYTICS_MONTHS)
    try:
        monthly_data = _fuel_analytics_monthly_supabase(_fuel_uid(user), month_span)
        return {"success": True, "data": {"monthly_breakdown": monthly_data}}
    except Exception:
        _trips_log.warning("fuel analytics fallback (memory) uid=%s", _fuel_uid(user), exc_info=True)
        if ENVIRONMENT == "production":
            raise
        monthly_data = _fuel_analytics_monthly_memory(month_span)
        return {"success": True, "data": {"monthly_breakdown": monthly_data}}


# ==================== INCIDENTS (legacy shim) ====================
# Keep a non-conflicting legacy endpoint to avoid shadowing the dedicated incidents router.
@trips_legacy_router.post("/incidents/report-legacy", responses=_LEGACY_503_RESPONSES)
def report_incident_legacy(incident: dict):
    _legacy_trips_guard()
    incident_type = str(incident.get("incident_type") or incident.get("type") or "unknown")
    return {"success": True, "message": f"Incident '{incident_type}' reported. Thank you for keeping roads safe!"}


# ==================== 3D ROUTE HISTORY ====================
@trips_legacy_router.get("/routes/history-3d", responses=_LEGACY_503_RESPONSES)
def get_route_history_3d(
    days: Annotated[int, Query(ge=1, le=365)] = 90,
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
):
    _legacy_trips_guard()
    cutoff_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
    filtered = [t for t in trips_db if t["date"] >= cutoff_date][:limit]
    route_groups = {}
    for trip in filtered:
        key = f"{trip['origin']}->{trip['destination']}"
        if key not in route_groups:
            route_groups[key] = {"route_name": key, "origin": trip["origin"], "destination": trip["destination"], "trips": [], "total_distance": 0, "total_trips": 0, "coordinates": trip.get("route_coordinates", [])}
        route_groups[key]["trips"].append(trip)
        route_groups[key]["total_distance"] += trip["distance_miles"]
        route_groups[key]["total_trips"] += 1
    routes_3d = []
    for key, data in route_groups.items():
        avg_safety = sum(t["safety_score"] for t in data["trips"]) / len(data["trips"])
        last_traveled = max(t.get("date", "") for t in data["trips"]) if data["trips"] else None
        routes_3d.append({
            "id": key, "route_name": data["route_name"], "origin": data["origin"], "destination": data["destination"],
            "total_trips": data["total_trips"], "total_distance_miles": round(data["total_distance"], 1),
            "avg_safety_score": round(avg_safety, 1), "coordinates": data["coordinates"],
            "color_intensity": min(data["total_trips"] / 10, 1), "last_traveled": last_traveled
        })
    routes_3d.sort(key=lambda x: x["total_trips"], reverse=True)
    total_distance = sum(r["total_distance_miles"] for r in routes_3d)
    return {"success": True, "data": {"routes": routes_3d, "center": {"lat": 39.9612, "lng": -82.9988}, "total_unique_routes": len(routes_3d), "total_trips": sum(r["total_trips"] for r in routes_3d), "total_distance": total_distance}}


router.include_router(trips_history_router)
router.include_router(trips_fuel_router)
router.include_router(trips_legacy_router)


if ENVIRONMENT == "production":
    # Remove legacy/dev-only endpoints from the production API surface.
    # Route objects store paths relative to the router (without the /api prefix).
    _LEGACY_PROD_DISABLED = {
        "/trips/start",
        "/trips/{trip_id}/end",
        "/trips/complete-with-safety",
        "/trips/history/detailed",
        "/trips/{trip_id}/share",
        "/incidents/report-legacy",
        "/routes/history-3d",
    }
    router.routes = [r for r in router.routes if getattr(r, "path", "") not in _LEGACY_PROD_DISABLED]

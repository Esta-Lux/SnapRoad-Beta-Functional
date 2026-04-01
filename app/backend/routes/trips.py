from fastapi import APIRouter, Query, HTTPException, Depends, Request
from typing import Annotated, Optional
from datetime import datetime, timedelta, timezone
import json
import logging
from models.schemas import TripResult, FuelLogCreate
from middleware.auth import get_current_user
from pydantic import BaseModel
from uuid import uuid4
from services.mock_data import (
    users_db, current_user_id, trips_db, fuel_logs, fuel_stats, FUEL_PRICES, XP_CONFIG,
    create_new_user,
)
from routes.gamification import add_xp_to_user
from config import ENVIRONMENT
from services.llm_client import chat_completion_model, get_sync_openai_client
from database import get_supabase
from services.supabase_service import sb_update_profile

_trips_log = logging.getLogger(__name__)

try:
    from openai import OpenAI
except Exception:  # pragma: no cover
    OpenAI = None

router = APIRouter(prefix="/api", tags=["Trips"])

CurrentUser = Annotated[dict, Depends(get_current_user)]

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


# ==================== TRIP HISTORY ====================

@router.get("/trips", responses=_LEGACY_503_RESPONSES)
def get_trips(
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
):
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

@router.get("/trips/{trip_id}", responses=_LEGACY_503_RESPONSES)
def get_trip_by_id(trip_id: str):
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

class StartTripBody(BaseModel):
    startLocation: str
    destination: Optional[str] = None


class EndTripBody(BaseModel):
    endLocation: str


@router.post("/trips/start", responses=_LEGACY_503_RESPONSES)
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


@router.get("/trips/history", responses=_LEGACY_503_RESPONSES)
def get_trip_history(limit: Annotated[int, Query(ge=1, le=100)] = 10):
    _legacy_trips_guard()
    user = users_db.get(current_user_id, {})
    return {
        "success": True,
        "data": {
            "recent_trips": trips_db[:limit],
            "total_trips": user.get("total_trips", 0),
            "total_miles": user.get("total_miles", 0),
        },
    }


@router.get("/trips/analytics")
def get_trip_analytics(user: CurrentUser):
    """Aggregate stats for the Rewards / Trip Analytics modal."""
    user_id = str(user.get("id") or "")
    try:
        sb = get_supabase()
        prof = sb.table("profiles").select("total_miles,total_trips,safety_score,gems").eq("id", user_id).limit(1).execute()
        if prof.data:
            p = prof.data[0]
            trips_q = sb.table("trips").select("safety_score,gems_earned").eq("user_id", user_id).limit(500).execute()
            rows = trips_q.data or []
            n = len(rows)
            avg_safety = (
                sum(float(r.get("safety_score") or 0) for r in rows) / max(n, 1)
                if n
                else float(p.get("safety_score") or 85)
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
            "avg_safety_score": float(user.get("safety_score") or 85),
            "total_gems": int(user.get("gems") or 0),
        },
    }


@router.get("/trips/history/recent")
def get_recent_trips_mobile(
    user: CurrentUser,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
):
    """Flat trip list for Route History modal (matches mobile `Trip` shape)."""
    user_id = str(user.get("id") or "")
    out: list = []
    try:
        sb = get_supabase()
        res = (
            sb.table("trips")
            .select("id,started_at,ended_at,distance_miles,duration_seconds,safety_score")
            .eq("user_id", user_id)
            .order("ended_at", desc=True)
            .limit(limit)
            .execute()
        )
        for r in res.data or []:
            dur_sec = r.get("duration_seconds")
            if dur_sec is None and r.get("duration_minutes") is not None:
                dur_sec = int(r["duration_minutes"] or 0) * 60
            else:
                dur_sec = int(dur_sec or 0)
            out.append({
                "id": str(r.get("id")),
                "date": r.get("ended_at") or r.get("started_at") or "",
                "origin": "Start",
                "destination": "End",
                "distance": float(r.get("distance_miles") or 0),
                "duration": dur_sec,
                "safety_score": float(r.get("safety_score") or 0),
            })
        return {"success": True, "data": out}
    except Exception as exc:
        _trips_log.warning("trips/history/recent: %s", exc)

    return {"success": True, "data": []}

@router.post("/trips/{trip_id}/end", responses=_LEGACY_503_RESPONSES)
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
    safety_score: float = 85
    started_at: Optional[str] = None
    ended_at: Optional[str] = None
    hard_braking_events: int = 0
    speeding_events: int = 0
    incidents_reported: int = 0

_MIN_TRIP_MILES = 0.15
_MIN_TRIP_SECONDS = 45


def _compute_trip_rewards(
    distance: float, safety: float, user: dict,
) -> tuple[int, int]:
    """Return (gems_earned, xp_earned) for a qualifying trip."""
    is_premium = user.get("is_premium") or user.get("plan", "basic") not in ("basic", "free", "")
    safety_bonus = 5 if safety > 90 else 0
    base_gems = max(1, int(distance * 2)) + safety_bonus
    gems = base_gems * 2 if is_premium else base_gems
    xp = max(10, int(distance * 100)) + (100 if safety > 90 else 0)
    return gems, xp


def _build_trip_row(
    trip_id: str, user_id: str, body: "TripCompleteBody",
    distance: float, safety: float, gems: int, xp: int,
) -> dict:
    now_iso = datetime.now(timezone.utc).isoformat()
    return {
        "id": trip_id,
        "user_id": user_id,
        "profile_id": user_id,
        "distance_miles": round(distance, 2),
        "duration_seconds": body.duration_seconds,
        "safety_score": round(safety, 1),
        "gems_earned": gems,
        "xp_earned": xp,
        "started_at": body.started_at or now_iso,
        "ended_at": body.ended_at or now_iso,
        "hard_braking_events": body.hard_braking_events,
        "speeding_events": body.speeding_events,
        "incidents_reported": body.incidents_reported,
        "created_at": now_iso,
    }


def _persist_trip_and_update_profile(
    trip_row: dict, user_id: str, gems: int, xp: int, distance: float,
) -> None:
    sb = get_supabase()
    sb.table("trips").insert(trip_row).execute()
    profile = sb.table("profiles").select("gems, xp, total_trips, total_miles").eq("id", user_id).limit(1).execute()
    if profile.data:
        p = profile.data[0]
        sb.table("profiles").update({
            "gems": (p.get("gems") or 0) + gems,
            "xp": (p.get("xp") or 0) + xp,
            "total_trips": (p.get("total_trips") or 0) + 1,
            "total_miles": round((p.get("total_miles") or 0) + distance, 2),
        }).eq("id", user_id).execute()


@router.post("/trips/complete", responses=_503_RESPONSES)
def complete_trip(body: TripCompleteBody, user: CurrentUser):
    """Persist a completed trip to Supabase and update profile stats."""
    user_id = user.get("id", "")
    distance = max(0, body.distance_miles)
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
                "message": f"Trips need at least ~{_MIN_TRIP_MILES} mi and {_MIN_TRIP_SECONDS}s of driving.",
            },
        }
    safety = max(0, min(100, body.safety_score))
    gems_earned, xp_earned = _compute_trip_rewards(distance, safety, user)
    trip_id = str(uuid4())
    trip_row = _build_trip_row(trip_id, user_id, body, distance, safety, gems_earned, xp_earned)

    try:
        _persist_trip_and_update_profile(trip_row, user_id, gems_earned, xp_earned, distance)
    except Exception as exc:
        _trips_log.error("Supabase trip write failed: %s", exc)
        if ENVIRONMENT == "production":
            raise HTTPException(status_code=503, detail="Trip storage unavailable")

    return {
        "success": True,
        "data": {
            "trip_id": trip_id,
            "gems_earned": gems_earned,
            "xp_earned": xp_earned,
            "safety_score": round(safety, 1),
            "distance_miles": round(distance, 2),
        },
    }


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


@router.post("/trips/complete-with-safety", responses=_LEGACY_503_RESPONSES)
def complete_trip_with_safety(trip: TripResult):
    _legacy_trips_guard()
    if current_user_id not in users_db:
        users_db[current_user_id] = create_new_user(current_user_id, "Driver")
    user = users_db[current_user_id]
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


@router.get("/trips/history/detailed", responses=_LEGACY_503_RESPONSES)
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


@router.get("/trips/weekly-insights", responses=_LEGACY_503_RESPONSES)
def get_weekly_insights():
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


@router.post("/trips/{trip_id}/share", responses=_LEGACY_503_RESPONSES)
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


def _fuel_query(user: dict, sb=None):
    """Paginated fuel_history for the authenticated user."""
    if sb is None:
        sb = get_supabase()
    return sb.table("fuel_history").select("*").eq("user_id", _fuel_uid(user)).order("created_at", desc=True)


@router.get("/fuel/history")
def get_fuel_history(
    user: CurrentUser,
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
):
    try:
        sb = get_supabase()
        uid = _fuel_uid(user)
        offset = (page - 1) * limit
        rows = sb.table("fuel_history").select("*", count="exact").eq("user_id", uid).order("created_at", desc=True).range(offset, offset + limit - 1).execute()
        total = rows.count if rows.count is not None else len(rows.data or [])
        return {
            "success": True,
            "data": {
                "items": rows.data or [],
                "pagination": {"page": page, "limit": limit, "total": total, "total_pages": max(1, (total + limit - 1) // limit)},
            },
        }
    except Exception:
        if ENVIRONMENT == "production":
            raise
        start = (page - 1) * limit
        return {"success": True, "data": {"items": fuel_logs[start:start + limit], "pagination": {"page": page, "limit": limit, "total": len(fuel_logs), "total_pages": max(1, (len(fuel_logs) + limit - 1) // limit)}}}


@router.post("/fuel/logs")
@router.post("/fuel/log")
def log_fuel(entry: FuelLogCreate, user: CurrentUser):
    uid = _fuel_uid(user)
    total_cost = round(float(entry.gallons) * float(entry.price_per_gallon), 2)
    payload = {
        "user_id": uid,
        "station_name": (entry.station or "Unknown").strip() or "Unknown",
        "price_per_gallon": round(float(entry.price_per_gallon), 4),
        "gallons": round(float(entry.gallons), 4),
        "total_cost": total_cost,
        "odometer": round(float(entry.odometer), 1) if entry.odometer else None,
    }
    try:
        sb = get_supabase()
        created = sb.table("fuel_history").insert(payload).execute()
        row = (created.data or [{}])[0]
        return {"success": True, "message": "Fuel log entry added", "data": row}
    except Exception:
        if ENVIRONMENT == "production":
            raise
        new_entry = {**payload, "id": str(uuid4()), "date": datetime.now(timezone.utc).date().isoformat(), "total": total_cost}
        fuel_logs.insert(0, new_entry)
        return {"success": True, "message": "Fuel log entry added (dev/memory)", "data": new_entry}


@router.get("/fuel/logs")
def get_fuel_logs(
    user: CurrentUser,
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
):
    try:
        sb = get_supabase()
        uid = _fuel_uid(user)
        offset = (page - 1) * limit
        rows = sb.table("fuel_history").select("*", count="exact").eq("user_id", uid).order("created_at", desc=True).range(offset, offset + limit - 1).execute()
        total = rows.count if rows.count is not None else len(rows.data or [])
        return {"success": True, "data": {"items": rows.data or [], "pagination": {"page": page, "limit": limit, "total": total, "total_pages": max(1, (total + limit - 1) // limit)}}}
    except Exception:
        if ENVIRONMENT == "production":
            raise
        start = (page - 1) * limit
        return {"success": True, "data": {"items": fuel_logs[start:start + limit], "pagination": {"page": page, "limit": limit, "total": len(fuel_logs), "total_pages": max(1, (len(fuel_logs) + limit - 1) // limit)}}}


@router.get("/fuel/trends")
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
        if ENVIRONMENT == "production":
            raise
        total_gallons = sum(f["gallons"] for f in fuel_logs)
        total_spent = sum(f.get("total_cost", f.get("total", 0)) for f in fuel_logs)
        avg_price = total_spent / total_gallons if total_gallons > 0 else 0
        return {"success": True, "data": {"total_gallons": round(total_gallons, 1), "total_spent": round(total_spent, 2), "avg_price_per_gallon": round(avg_price, 2), "entries": len(fuel_logs), "monthly_avg_gallons": round(total_gallons / 3, 1)}}


@router.get("/fuel/prices")
def get_fuel_prices(user: CurrentUser, lat: float = 39.9612, lng: float = -82.9988):
    return {
        "success": True,
        "data": {
            "prices": FUEL_PRICES,
            "location": {"lat": lat, "lng": lng},
        },
    }


@router.get("/fuel/stats")
def get_fuel_stats(user: CurrentUser):
    try:
        sb = get_supabase()
        uid = _fuel_uid(user)
        rows = sb.table("fuel_history").select("gallons, total_cost, odometer, created_at").eq("user_id", uid).order("created_at", desc=True).execute()
        items = rows.data or []
        total_gallons = sum(float(f.get("gallons", 0)) for f in items)
        total_spent = sum(float(f.get("total_cost", 0)) for f in items)
        avg_mpg = None
        if len(items) >= 2:
            first_odom = float(items[-1].get("odometer") or 0)
            last_odom = float(items[0].get("odometer") or 0)
            if last_odom > first_odom and total_gallons > 0:
                avg_mpg = round((last_odom - first_odom) / total_gallons, 1)
        return {"success": True, "data": {"total_entries": len(items), "total_gallons": round(total_gallons, 1), "total_spent": round(total_spent, 2), "avg_mpg": avg_mpg}}
    except Exception:
        if ENVIRONMENT == "production":
            raise
        return {"success": True, "data": fuel_stats}


@router.get("/fuel/analytics")
def get_fuel_analytics(user: CurrentUser, months: Annotated[int, Query(ge=1, le=24)] = 3):
    # Loop bound must not be user input directly (Sonar): cap with constant, iterate at most MAX_FUEL_ANALYTICS_MONTHS.
    month_span = min(months, MAX_FUEL_ANALYTICS_MONTHS)
    try:
        sb = get_supabase()
        uid = _fuel_uid(user)
        since = (datetime.now() - timedelta(days=30 * month_span)).isoformat()
        fuel_rows = sb.table("fuel_history").select("gallons, total_cost, created_at").eq("user_id", uid).gte("created_at", since).execute()
        trip_rows = sb.table("trips").select("distance_miles, created_at").eq("profile_id", uid).gte("created_at", since).execute()
        monthly_data = []
        for i in range(MAX_FUEL_ANALYTICS_MONTHS):
            if i >= month_span:
                break
            month_date = datetime.now() - timedelta(days=30 * i)
            prefix = month_date.strftime("%Y-%m")
            m_fuel = [f for f in (fuel_rows.data or []) if (f.get("created_at") or "").startswith(prefix)]
            m_trips = [t for t in (trip_rows.data or []) if (t.get("created_at") or "").startswith(prefix)]
            distance = sum(float(t.get("distance_miles", 0)) for t in m_trips)
            fuel = sum(float(f.get("gallons", 0)) for f in m_fuel)
            cost = sum(float(f.get("total_cost", 0)) for f in m_fuel)
            monthly_data.append({"month": month_date.strftime("%B %Y"), "trips": len(m_trips), "distance_miles": round(distance, 1), "fuel_gallons": round(fuel, 2), "avg_mpg": round(distance / max(fuel, 0.1), 1), "cost_estimate": round(cost, 2)})
        return {"success": True, "data": {"monthly_breakdown": monthly_data}}
    except Exception:
        if ENVIRONMENT == "production":
            raise
        monthly_data = []
        for i in range(MAX_FUEL_ANALYTICS_MONTHS):
            if i >= month_span:
                break
            month_date = datetime.now() - timedelta(days=30 * i)
            month_trips = [t for t in trips_db if t["date"].startswith(month_date.strftime("%Y-%m"))]
            distance = sum(t["distance_miles"] for t in month_trips)
            fuel = sum(t["fuel_used_gallons"] for t in month_trips)
            monthly_data.append({"month": month_date.strftime("%B %Y"), "trips": len(month_trips), "distance_miles": round(distance, 1), "fuel_gallons": round(fuel, 2), "avg_mpg": round(distance / max(fuel, 0.1), 1), "cost_estimate": round(fuel * FUEL_PRICES["regular"], 2)})
        return {"success": True, "data": {"monthly_breakdown": monthly_data}}


# ==================== INCIDENTS (legacy shim) ====================
# Keep a non-conflicting legacy endpoint to avoid shadowing the dedicated incidents router.
@router.post("/incidents/report-legacy", responses=_LEGACY_503_RESPONSES)
def report_incident_legacy(incident: dict):
    _legacy_trips_guard()
    incident_type = str(incident.get("incident_type") or incident.get("type") or "unknown")
    return {"success": True, "message": f"Incident '{incident_type}' reported. Thank you for keeping roads safe!"}


# ==================== 3D ROUTE HISTORY ====================
@router.get("/routes/history-3d", responses=_LEGACY_503_RESPONSES)
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


if ENVIRONMENT == "production":
    # Remove legacy/dev-only endpoints from the production API surface.
    _LEGACY_PROD_DISABLED = {
        "/api/trips",
        "/api/trips/${id}",
        "/api/trips/start",
        "/api/trips/history",
        "/api/trips/${tripId}/end",
        "/api/trips/complete",
        "/api/trips/complete-with-safety",
        "/api/trips/history/detailed",
        "/api/trips/weekly-insights",
        "/api/trips/{trip_id}/share",
        "/api/incidents/report-legacy",
        "/api/routes/history-3d",
    }
    router.routes = [r for r in router.routes if getattr(r, "path", "") not in _LEGACY_PROD_DISABLED]

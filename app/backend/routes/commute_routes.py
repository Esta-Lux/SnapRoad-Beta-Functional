"""Production saved commute routes (A→B) with scheduled alert dispatch."""

import logging
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from database import get_supabase
from limiter import limiter
from middleware.auth import get_current_user
from services.commute_traffic_mapbox import should_notify_traffic_delay, traffic_vs_baseline_seconds
from services.expo_push import send_expo_push
from services.internal_request_auth import verify_commute_internal_request
from services.supabase_service import sb_get_profile
from services.premium_access import profile_row_is_premium

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/commute-routes", tags=["commute_routes"])

FREE_LIMIT = 5
PREMIUM_LIMIT = 20

DAY_KEYS = ("mon", "tue", "wed", "thu", "fri", "sat", "sun")


def _is_premium(user: dict) -> bool:
    return bool(user.get("is_premium")) or user.get("plan", "basic") not in ("basic", "free", "")


def _weekday_key(dt: datetime) -> str:
    return DAY_KEYS[dt.weekday()]


class CommuteRouteCreate(BaseModel):
    name: str = "Commute"
    origin_lat: float
    origin_lng: float
    origin_label: str = ""
    dest_lat: float
    dest_lng: float
    dest_label: str = ""
    leave_by_time: str = Field(..., description="HH:MM local")
    tz: str = "America/New_York"
    alert_minutes_before: int = 120
    days_of_week: List[str] = Field(default_factory=lambda: list(DAY_KEYS))
    notifications_enabled: bool = True


class CommuteRouteUpdate(BaseModel):
    name: Optional[str] = None
    origin_lat: Optional[float] = None
    origin_lng: Optional[float] = None
    origin_label: Optional[str] = None
    dest_lat: Optional[float] = None
    dest_lng: Optional[float] = None
    dest_label: Optional[str] = None
    leave_by_time: Optional[str] = None
    tz: Optional[str] = None
    alert_minutes_before: Optional[int] = None
    days_of_week: Optional[List[str]] = None
    notifications_enabled: Optional[bool] = None


@router.get("")
@limiter.limit("30/minute")
def list_commute_routes(request: Request, user: dict = Depends(get_current_user)):
    uid = user["id"]
    premium = _is_premium(user)
    sb = get_supabase()
    try:
        res = sb.table("commute_routes").select("*").eq("user_id", uid).order("created_at").execute()
        rows = res.data or []
    except Exception:
        rows = []
    return {
        "success": True,
        "data": rows,
        "limit": PREMIUM_LIMIT if premium else FREE_LIMIT,
        "is_premium": premium,
    }


@router.post("")
@limiter.limit("20/minute")
def create_commute_route(
    request: Request,
    body: CommuteRouteCreate,
    user: dict = Depends(get_current_user),
):
    uid = user["id"]
    premium = _is_premium(user)
    limit = PREMIUM_LIMIT if premium else FREE_LIMIT
    sb = get_supabase()
    try:
        existing = sb.table("commute_routes").select("id").eq("user_id", uid).execute()
        count = len(existing.data or [])
    except Exception:
        count = 0
    if count >= limit:
        tier = "Premium" if premium else "Free"
        raise HTTPException(
            status_code=403,
            detail=f"{tier} plan allows up to {limit} saved commute routes.",
        )
    rid = str(uuid.uuid4())
    row = {
        "id": rid,
        "user_id": uid,
        "name": body.name.strip() or "Commute",
        "origin_lat": body.origin_lat,
        "origin_lng": body.origin_lng,
        "origin_label": body.origin_label or "",
        "dest_lat": body.dest_lat,
        "dest_lng": body.dest_lng,
        "dest_label": body.dest_label or "",
        "leave_by_time": body.leave_by_time.strip(),
        "tz": body.tz or "America/New_York",
        "alert_minutes_before": max(5, min(body.alert_minutes_before, 24 * 60)),
        "days_of_week": [d.lower()[:3] for d in body.days_of_week],
        "notifications_enabled": body.notifications_enabled,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        sb.table("commute_routes").insert(row).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail="Could not save commute route") from e
    return {"success": True, "data": row}


@router.put("/{route_id}")
@limiter.limit("20/minute")
def update_commute_route(
    request: Request,
    route_id: str,
    body: CommuteRouteUpdate,
    user: dict = Depends(get_current_user),
):
    uid = user["id"]
    sb = get_supabase()
    updates = {k: v for k, v in body.model_dump(exclude_none=True).items()}
    if not updates:
        raise HTTPException(status_code=400, detail="Nothing to update")
    if "days_of_week" in updates and updates["days_of_week"] is not None:
        updates["days_of_week"] = [d.lower()[:3] for d in updates["days_of_week"]]
    if "alert_minutes_before" in updates and updates["alert_minutes_before"] is not None:
        updates["alert_minutes_before"] = max(5, min(int(updates["alert_minutes_before"]), 24 * 60))
    try:
        res = sb.table("commute_routes").update(updates).eq("id", route_id).eq("user_id", uid).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Commute route not found")
        return {"success": True, "data": res.data[0]}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Update failed")


@router.delete("/{route_id}")
@limiter.limit("20/minute")
def delete_commute_route(request: Request, route_id: str, user: dict = Depends(get_current_user)):
    uid = user["id"]
    sb = get_supabase()
    try:
        sb.table("commute_routes").delete().eq("id", route_id).eq("user_id", uid).execute()
    except Exception:
        raise HTTPException(status_code=500, detail="Delete failed")
    return {"success": True}


def _local_now(tz_name: str) -> datetime:
    try:
        from zoneinfo import ZoneInfo

        return datetime.now(ZoneInfo(tz_name))
    except Exception:
        return datetime.now(timezone.utc)


def _parse_hhmm(s: str) -> Optional[tuple[int, int]]:
    if not s or ":" not in s:
        return None
    parts = s.strip().split(":")
    try:
        h, m = int(parts[0]), int(parts[1])
        if 0 <= h <= 23 and 0 <= m <= 59:
            return h, m
    except ValueError:
        pass
    return None


@router.post("/internal/dispatch")
async def dispatch_commute_alerts(request: Request):
    """Cron/worker: send push alerts when leave window approaches.

    Auth: HMAC-SHA256 over ``{unix_ts}\\n{raw_body}`` in headers X-Internal-Timestamp + X-Internal-Signature
    (see services/internal_request_auth), or legacy X-Commute-Dispatch-Secret when allowed.
    """
    plain = (request.headers.get("X-Commute-Dispatch-Secret") or "").strip() or None
    await verify_commute_internal_request(request, plain_secret_header=plain)
    sb = get_supabase()
    try:
        res = sb.table("commute_routes").select("*").eq("notifications_enabled", True).execute()
        routes = res.data or []
    except Exception:
        routes = []
    today_utc = datetime.now(timezone.utc).date()
    sent = 0
    for route in routes:
        uid = route.get("user_id")
        if not uid:
            continue
        tz_name = route.get("tz") or "UTC"
        now_local = _local_now(str(tz_name))
        wk = _weekday_key(now_local)
        days = route.get("days_of_week") or list(DAY_KEYS)
        if wk not in days:
            continue
        hm = _parse_hhmm(str(route.get("leave_by_time") or ""))
        if not hm:
            continue
        leave_local = now_local.replace(hour=hm[0], minute=hm[1], second=0, microsecond=0)
        alert_min = int(route.get("alert_minutes_before") or 120)
        notify_at = leave_local - timedelta(minutes=alert_min)
        # 15-minute dispatch window
        if not (notify_at <= now_local < notify_at + timedelta(minutes=15)):
            continue
        last_push = route.get("last_push_date")
        if last_push == str(today_utc) or last_push == today_utc.isoformat():
            continue
        prof_row = sb_get_profile(str(uid)) or {}
        token = (prof_row.get("expo_push_token") or "").strip() or None
        is_premium = profile_row_is_premium(prof_row)
        if not token:
            continue
        origin = route.get("origin_label") or "Start"
        dest = route.get("dest_label") or "Destination"
        title = "Time to head out"
        if is_premium:
            body = (
                f"Leave by {route.get('leave_by_time')} for {dest}. "
                "Premium live scan: leave a few minutes early if roads are heavy, or open SnapRoad for a faster alternate route."
            )
        else:
            body = (
                f"Leave by {route.get('leave_by_time')} for {dest}. "
                "Options: leave early for traffic, or try an eco route to save fuel."
            )
        data = {
            "type": "commute_alert",
            "commute_id": route.get("id"),
            "leave_by_time": route.get("leave_by_time"),
            "origin_label": origin,
            "dest_label": dest,
            "alert_minutes_before": alert_min,
            "is_premium": is_premium,
            "suggested_actions": (
                ["leave_early", "alternate_route"] if is_premium else ["leave_early", "eco_route"]
            ),
        }
        if send_expo_push(token, title, body, data):
            try:
                sb.table("commute_routes").update({"last_push_date": str(today_utc)}).eq("id", route["id"]).execute()
            except Exception:
                pass
            sent += 1
    return {"success": True, "dispatched": sent, "checked": len(routes)}


@router.post("/internal/dispatch-traffic")
async def dispatch_commute_traffic_alerts(request: Request):
    """
    Cron/worker (Premium only): poll Mapbox driving-traffic vs driving for each qualifying commute
    and push when delay exceeds COMMUTE_TRAFFIC_* thresholds.

    Auth: same HMAC / legacy headers as POST /internal/dispatch. Legacy plain header must match
    COMMUTE_TRAFFIC_DISPATCH_SECRET if set, else COMMUTE_DISPATCH_SECRET.

    Suggested schedule: every 10 minutes (overlap with leave window is filtered per route).

    Env:
      COMMUTE_TRAFFIC_DISPATCH_SECRET — optional; falls back to COMMUTE_DISPATCH_SECRET (legacy header only)
      COMMUTE_TRAFFIC_WINDOW_START_BEFORE_LEAVE_MIN — default 180 (first poll starts this many minutes before leave_by)
      COMMUTE_TRAFFIC_MIN_EXTRA_SEC — default 300 (absolute delay vs non-traffic baseline)
      COMMUTE_TRAFFIC_EXTRA_RATIO — default 0.12 (delay must also exceed ratio * baseline when combined with min via max())
      COMMUTE_TRAFFIC_PUSH_COOLDOWN_SEC — default 2700 (per-route minimum gap between traffic pushes)
    """
    plain = (request.headers.get("X-Commute-Dispatch-Secret") or "").strip() or None
    legacy_secret = (os.getenv("COMMUTE_TRAFFIC_DISPATCH_SECRET") or os.getenv("COMMUTE_DISPATCH_SECRET") or "").strip()
    await verify_commute_internal_request(
        request,
        plain_secret_header=plain,
        legacy_plain_secret_expected=legacy_secret or None,
    )

    window_min = max(30, min(360, int(os.getenv("COMMUTE_TRAFFIC_WINDOW_START_BEFORE_LEAVE_MIN", "180"))))
    min_extra = float(os.getenv("COMMUTE_TRAFFIC_MIN_EXTRA_SEC", "300"))
    min_ratio = float(os.getenv("COMMUTE_TRAFFIC_EXTRA_RATIO", "0.12"))
    cooldown = max(600, min(24 * 3600, int(os.getenv("COMMUTE_TRAFFIC_PUSH_COOLDOWN_SEC", "2700"))))

    sb = get_supabase()
    try:
        res = sb.table("commute_routes").select("*").eq("notifications_enabled", True).execute()
        routes = res.data or []
    except Exception as e:
        logger.warning("commute traffic poll: list routes failed: %s", e)
        routes = []

    sent = 0
    skipped = 0
    errors = 0

    with httpx.Client(timeout=25.0) as http:
        for route in routes:
            uid = route.get("user_id")
            if not uid:
                skipped += 1
                continue
            prof_row = sb_get_profile(str(uid)) or {}
            if not profile_row_is_premium(prof_row):
                skipped += 1
                continue

            tz_name = route.get("tz") or "UTC"
            now_local = _local_now(str(tz_name))
            wk = _weekday_key(now_local)
            days = route.get("days_of_week") or list(DAY_KEYS)
            if wk not in days:
                skipped += 1
                continue

            hm = _parse_hhmm(str(route.get("leave_by_time") or ""))
            if not hm:
                skipped += 1
                continue

            leave_local = now_local.replace(hour=hm[0], minute=hm[1], second=0, microsecond=0)
            window_start = leave_local - timedelta(minutes=window_min)
            if now_local < window_start or now_local > leave_local:
                skipped += 1
                continue

            if not _traffic_push_cooldown_elapsed(route.get("last_traffic_push_at"), cooldown):
                skipped += 1
                continue

            o_lat = float(route.get("origin_lat"))
            o_lng = float(route.get("origin_lng"))
            d_lat = float(route.get("dest_lat"))
            d_lng = float(route.get("dest_lng"))

            t_sec, b_sec, extra_sec = traffic_vs_baseline_seconds(
                o_lat, o_lng, d_lat, d_lng, http=http,
            )
            if extra_sec is None or t_sec is None or b_sec is None:
                errors += 1
                continue

            if not should_notify_traffic_delay(
                float(extra_sec), float(b_sec), min_extra_sec=min_extra, min_ratio=min_ratio
            ):
                skipped += 1
                continue

            token = (prof_row.get("expo_push_token") or "").strip() or None
            if not token:
                skipped += 1
                continue

            dest = route.get("dest_label") or "your destination"
            extra_min = max(1, int(round(float(extra_sec) / 60.0)))
            traffic_min = max(1, int(round(float(t_sec) / 60.0)))
            baseline_min = max(1, int(round(float(b_sec) / 60.0)))

            title = "Traffic heavier than usual"
            body = (
                f"Route to {dest}: about +{extra_min} min vs typical right now "
                f"({traffic_min} min drive vs ~{baseline_min} min baseline). Leave a bit earlier or open SnapRoad for an alternate route."
            )
            data = {
                "type": "commute_traffic_alert",
                "commute_id": route.get("id"),
                "leave_by_time": route.get("leave_by_time"),
                "dest_label": dest,
                "extra_minutes": extra_min,
                "traffic_duration_min": traffic_min,
                "baseline_duration_min": baseline_min,
                "suggested_actions": ["leave_early", "alternate_route"],
            }
            if send_expo_push(token, title, body, data):
                try:
                    now_iso = datetime.now(timezone.utc).isoformat()
                    sb.table("commute_routes").update(
                        {
                            "last_traffic_push_at": now_iso,
                            "last_traffic_extra_sec": int(round(float(extra_sec))),
                        }
                    ).eq("id", route["id"]).execute()
                    sent += 1
                except Exception as ue:
                    logger.error(
                        "commute traffic poll: push delivered but cooldown persist failed route=%s: %s",
                        route.get("id"),
                        ue,
                    )
                    errors += 1
            else:
                errors += 1

    return {
        "success": True,
        "traffic_pushes_sent": sent,
        "skipped": skipped,
        "mapbox_or_push_errors": errors,
        "checked": len(routes),
        "window_minutes_before_leave": window_min,
    }

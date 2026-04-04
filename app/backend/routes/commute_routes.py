"""Production saved commute routes (A→B) with scheduled alert dispatch."""

import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel, Field

from database import get_supabase
from limiter import limiter
from middleware.auth import get_current_user
from services.expo_push import send_expo_push

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
def dispatch_commute_alerts(
    request: Request,
    x_commute_dispatch_secret: Optional[str] = Header(None, alias="X-Commute-Dispatch-Secret"),
):
    """Cron/worker: send push alerts when leave window approaches. Secured by COMMUTE_DISPATCH_SECRET."""
    expected = (os.getenv("COMMUTE_DISPATCH_SECRET") or "").strip()
    if not expected or x_commute_dispatch_secret != expected:
        raise HTTPException(status_code=403, detail="Forbidden")
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
        prof = sb.table("profiles").select("expo_push_token, is_premium, plan").eq("id", uid).limit(1).execute()
        token = None
        if prof.data:
            token = (prof.data[0].get("expo_push_token") or "").strip() or None
        if not token:
            continue
        origin = route.get("origin_label") or "Start"
        dest = route.get("dest_label") or "Destination"
        title = "Time to head out"
        body = (
            f"Leave by {route.get('leave_by_time')} for {dest}. "
            f"Options: leave early for traffic, or try an eco route to save fuel."
        )
        data = {
            "type": "commute_alert",
            "commute_id": route.get("id"),
            "leave_by_time": route.get("leave_by_time"),
            "origin_label": origin,
            "dest_label": dest,
            "alert_minutes_before": alert_min,
        }
        if send_expo_push(token, title, body, data):
            try:
                sb.table("commute_routes").update({"last_push_date": str(today_utc)}).eq("id", route["id"]).execute()
            except Exception:
                pass
            sent += 1
    return {"success": True, "dispatched": sent, "checked": len(routes)}

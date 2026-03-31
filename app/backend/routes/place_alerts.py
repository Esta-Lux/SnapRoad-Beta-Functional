from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from middleware.auth import get_current_user
from database import get_supabase
from limiter import limiter
import uuid

router = APIRouter(prefix="/api/place-alerts", tags=["place_alerts"])

FREE_LIMIT = 5
PREMIUM_LIMIT = 20


class PlaceAlertCreate(BaseModel):
    name: str
    address: Optional[str] = None
    lat: float
    lng: float
    alert_minutes_before: int = 120
    days_of_week: List[str] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
    time_of_day: Optional[str] = None


class PlaceAlertUpdate(BaseModel):
    name: Optional[str] = None
    alert_minutes_before: Optional[int] = None
    days_of_week: Optional[List[str]] = None
    time_of_day: Optional[str] = None


def _is_premium(user: dict) -> bool:
    return user.get("is_premium") or user.get("plan", "basic") not in ("basic", "free", "")


@router.get("")
@limiter.limit("30/minute")
def list_place_alerts(request: Request, user: dict = Depends(get_current_user)):
    uid = user["id"]
    premium = _is_premium(user)
    sb = get_supabase()
    try:
        res = sb.table("place_alerts").select("*").eq("user_id", uid).order("created_at").execute()
        alerts = res.data or []
    except Exception:
        alerts = []
    return {
        "success": True,
        "data": alerts,
        "limit": PREMIUM_LIMIT if premium else FREE_LIMIT,
        "is_premium": premium,
        "realtime_push": premium,
    }


@router.post("")
@limiter.limit("20/minute")
def create_place_alert(request: Request, body: PlaceAlertCreate, user: dict = Depends(get_current_user)):
    uid = user["id"]
    premium = _is_premium(user)
    limit = PREMIUM_LIMIT if premium else FREE_LIMIT

    sb = get_supabase()
    existing = sb.table("place_alerts").select("id").eq("user_id", uid).execute()
    count = len(existing.data or [])
    if count >= limit:
        tier = "Premium" if premium else "Free"
        raise HTTPException(
            status_code=403,
            detail=f"{tier} plan allows up to {limit} place alerts. Upgrade for more.",
        )

    alert_id = str(uuid.uuid4())
    row = {
        "id": alert_id,
        "user_id": uid,
        "name": body.name,
        "address": body.address or "",
        "lat": body.lat,
        "lng": body.lng,
        "alert_minutes_before": body.alert_minutes_before,
        "days_of_week": body.days_of_week,
        "time_of_day": body.time_of_day,
        "realtime_push": premium,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        sb.table("place_alerts").insert(row).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail="Could not create alert")

    return {"success": True, "data": row}


@router.put("/{alert_id}")
@limiter.limit("20/minute")
def update_place_alert(request: Request, alert_id: str, body: PlaceAlertUpdate, user: dict = Depends(get_current_user)):
    uid = user["id"]
    sb = get_supabase()
    updates = {k: v for k, v in body.dict(exclude_none=True).items()}
    if not updates:
        raise HTTPException(status_code=400, detail="Nothing to update")

    try:
        res = sb.table("place_alerts").update(updates).eq("id", alert_id).eq("user_id", uid).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Alert not found")
        return {"success": True, "data": res.data[0]}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Update failed")


@router.delete("/{alert_id}")
@limiter.limit("20/minute")
def delete_place_alert(request: Request, alert_id: str, user: dict = Depends(get_current_user)):
    uid = user["id"]
    sb = get_supabase()
    try:
        sb.table("place_alerts").delete().eq("id", alert_id).eq("user_id", uid).execute()
    except Exception:
        raise HTTPException(status_code=500, detail="Delete failed")
    return {"success": True}

from fastapi import APIRouter, HTTPException, Query, Depends, Request
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import math
from middleware.auth import get_current_user, require_admin
from limiter import limiter
from database import get_supabase
from config import ENVIRONMENT


router = APIRouter(prefix="/api/incidents", tags=["incidents"])


class IncidentReport(BaseModel):
    type: str  # police, accident, crash, construction, hazard, weather, pothole, closure, camera
    lat: float
    lng: float
    reported_by: Optional[str] = None
    description: Optional[str] = None


class IncidentReportCompat(BaseModel):
    # Backward-compatible payloads (older frontend variants)
    incident_type: Optional[str] = None
    location: Optional[str] = None
    type: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    reported_by: Optional[str] = None
    description: Optional[str] = None


# In-memory store (replace with DB in production)
incidents_db: List[Dict[str, Any]] = []
incident_counter = 0
incident_votes: Dict[str, set[str]] = {}
incident_report_times: Dict[str, List[datetime]] = {}
ALLOWED_INCIDENT_TYPES = {
    "police", "accident", "crash", "construction", "hazard", "weather", "pothole", "closure", "camera"
}


def _severity_for(t: str) -> str:
    t = (t or "").lower()
    if t in ("accident", "crash", "closure"):
        return "high"
    if t in ("police", "construction", "hazard", "weather", "camera"):
        return "medium"
    if t in ("pothole",):
        return "low"
    return "medium"


def _expiry_hours_for(t: str) -> int:
    t = (t or "").lower()
    # Keep incidents on-map by default; removal is primarily by downvotes.
    if t in ("weather",):
        return 24
    return 24


def _to_road_report_payload(report: IncidentReportCompat, user_id: str, now: datetime) -> dict:
    r_type = (report.type or report.incident_type or "").strip().lower()
    return {
        "user_id": user_id,
        "type": r_type,
        "description": report.description,
        "lat": float(report.lat or 0),
        "lng": float(report.lng or 0),
        "upvotes": 0,
        "status": "active",
        "expires_at": (now + timedelta(hours=_expiry_hours_for(r_type))).isoformat(),
        "created_at": now.isoformat(),
    }


@router.post("/report")
@limiter.limit("30/minute")
def report_incident(request: Request, report: IncidentReportCompat, user: dict = Depends(get_current_user)):
    """Create an incident report. Returns the created incident and gems_earned."""
    from services.runtime_config import require_enabled

    require_enabled(
        "incident_submissions_enabled",
        "Incident reporting is temporarily disabled.",
    )
    r_type = (report.type or report.incident_type or "").strip()
    if not r_type:
        raise HTTPException(status_code=422, detail="type is required")
    if r_type.lower() not in ALLOWED_INCIDENT_TYPES:
        raise HTTPException(status_code=422, detail="Invalid incident type")
    if report.lat is None or report.lng is None:
        raise HTTPException(status_code=422, detail="lat/lng are required")
    if not (-90 <= float(report.lat) <= 90) or not (-180 <= float(report.lng) <= 180):
        raise HTTPException(status_code=422, detail="Invalid coordinates")

    uid = str(user.get("id") or "")
    now = datetime.utcnow()
    recent = incident_report_times.get(uid, [])
    recent = [t for t in recent if (now - t).total_seconds() <= 600]
    if len(recent) >= 10:
        raise HTTPException(status_code=429, detail="Too many incident reports. Try again later.")
    recent.append(now)
    incident_report_times[uid] = recent

    exp = now + timedelta(hours=_expiry_hours_for(r_type))
    uid = str(user.get("id") or "")

    # DB-first path for production consistency
    try:
        sb = get_supabase()
        payload = _to_road_report_payload(report, uid, now)
        created = sb.table("road_reports").insert(payload).select("*").execute()
        rows = created.data or []
        if rows:
            row = rows[0]
            incident = {
                "id": row.get("id"),
                "type": row.get("type"),
                "lat": row.get("lat"),
                "lng": row.get("lng"),
                "title": str(row.get("type") or "incident").replace("_", " ").title(),
                "severity": _severity_for(str(row.get("type") or "")),
                "description": row.get("description"),
                "reported_by": uid,
                "upvotes": row.get("upvotes", 0),
                "created_at": row.get("created_at"),
                "expires_at": row.get("expires_at"),
            }
            return {"success": True, "data": incident, "gems_earned": 15}
    except Exception:
        if ENVIRONMENT == "production":
            raise HTTPException(status_code=503, detail="Incident service unavailable")
        pass

    # Fallback (dev/offline)
    global incident_counter
    incident_counter += 1
    incident = {
        "id": incident_counter,
        "type": r_type,
        "lat": float(report.lat),
        "lng": float(report.lng),
        "title": (r_type or "incident").replace("_", " ").title(),
        "severity": _severity_for(r_type),
        "description": report.description,
        "reported_by": report.reported_by or str(user.get("id")),
        "upvotes": 0,
        "created_at": now.isoformat(),
        "expires_at": exp.isoformat(),
    }
    incidents_db.append(incident)
    return {"success": True, "data": incident, "gems_earned": 15}


@router.get("/nearby")
def get_nearby_incidents(
    lat: float = Query(...),
    lng: float = Query(...),
    radius_miles: float = Query(10, ge=0.1, le=200),
    limit: int = Query(100, ge=1, le=100),
):
    """Get all active incidents within radius miles of lat/lng."""
    now = datetime.utcnow()

    # DB-first path
    try:
        sb = get_supabase()
        lat_delta = radius_miles / 69.0
        lng_delta = radius_miles / (69.0 * 0.7)
        res = (
            sb.table("road_reports")
            .select("id,type,description,lat,lng,upvotes,created_at,expires_at")
            .eq("status", "active")
            .gte("lat", lat - lat_delta)
            .lte("lat", lat + lat_delta)
            .gte("lng", lng - lng_delta)
            .lte("lng", lng + lng_delta)
            .gt("expires_at", now.isoformat())
            .execute()
        )
        db_rows = res.data or []
        out: List[Dict[str, Any]] = []
        for row in db_rows:
            dlat = math.radians(float(row.get("lat", 0)) - lat)
            dlon = math.radians(float(row.get("lng", 0)) - lng)
            a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat)) * math.cos(math.radians(float(row.get("lat", 0)))) * math.sin(dlon / 2) ** 2
            d = 3959.0 * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
            if d <= radius_miles:
                out.append(
                    {
                        "id": row.get("id"),
                        "type": row.get("type"),
                        "lat": row.get("lat"),
                        "lng": row.get("lng"),
                        "title": str(row.get("type") or "incident").replace("_", " ").title(),
                        "severity": _severity_for(str(row.get("type") or "")),
                        "description": row.get("description"),
                        "upvotes": row.get("upvotes", 0),
                        "created_at": row.get("created_at"),
                        "expires_at": row.get("expires_at"),
                        "distance_miles": round(d, 2),
                    }
                )
        out.sort(key=lambda x: x.get("distance_miles", 1e9))
        return {"success": True, "data": out[:limit]}
    except Exception:
        if ENVIRONMENT == "production":
            raise HTTPException(status_code=503, detail="Incident service unavailable")
        pass

    out: List[Dict[str, Any]] = []

    for inc in incidents_db:
        try:
            expires = datetime.fromisoformat(inc["expires_at"])
        except Exception:
            continue
        if expires < now:
            continue

        R = 3959.0  # miles
        dLat = math.radians(float(inc["lat"]) - lat)
        dLon = math.radians(float(inc["lng"]) - lng)
        a = math.sin(dLat / 2) ** 2 + math.cos(math.radians(lat)) * math.cos(math.radians(float(inc["lat"]))) * math.sin(dLon / 2) ** 2
        d = R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        if d <= radius_miles:
            out.append({**inc, "distance_miles": round(d, 2)})

    out.sort(key=lambda x: x.get("distance_miles", 1e9))
    return {"success": True, "data": out[:limit]}


@router.post("/dev/seed")
def dev_seed_incidents(
    lat: float = Query(39.9612),
    lng: float = Query(-82.9988),
    _admin: dict = Depends(require_admin),
):
    """Dev helper: seed a few incidents near a coordinate so the map always shows something."""
    if ENVIRONMENT == "production":
        raise HTTPException(status_code=404, detail="Not found")
    global incident_counter
    now = datetime.utcnow()
    seeds = [
        ("construction", lat + 0.006, lng + 0.004, "Construction ahead"),
        ("closure", lat + 0.004, lng - 0.003, "Road closed"),
        ("police", lat - 0.005, lng + 0.002, "Police reported"),
        ("accident", lat - 0.003, lng - 0.004, "Accident reported"),
        ("pothole", lat + 0.002, lng + 0.006, "Pothole"),
    ]
    for t, la, lo, title in seeds:
        incident_counter += 1
        incidents_db.append({
            "id": incident_counter,
            "type": t,
            "lat": float(la),
            "lng": float(lo),
            "title": title,
            "severity": _severity_for(t),
            "description": title,
            "reported_by": "dev-seed",
            "upvotes": 0,
            "created_at": now.isoformat(),
            "expires_at": (now + timedelta(hours=_expiry_hours_for(t))).isoformat(),
        })
    return {"success": True, "seeded": len(seeds)}


@router.post("/{incident_id}/upvote")
@limiter.limit("60/minute")
def upvote_incident(request: Request, incident_id: str, user: dict = Depends(get_current_user)):
    """Upvote confirms an incident is still there; extends expiry by 30 minutes."""
    from services.runtime_config import require_enabled

    require_enabled(
        "incident_voting_enabled",
        "Incident voting is temporarily disabled.",
    )
    # DB-first path
    try:
        sb = get_supabase()
        report_res = sb.table("road_reports").select("id,user_id,upvotes").eq("id", incident_id).limit(1).execute()
        report = report_res.data[0] if report_res.data else None
        if report:
            voter = str(user.get("id") or "")
            owner = str(report.get("user_id") or "")
            if owner and owner == voter:
                raise HTTPException(status_code=400, detail="Cannot upvote your own report")
            try:
                sb.table("road_report_votes").insert({"report_id": report.get("id"), "user_id": voter, "vote": 1}).execute()
            except Exception as e:
                if "duplicate" in str(e).lower() or "unique" in str(e).lower():
                    raise HTTPException(status_code=409, detail="Already voted")
                raise
            sb.table("road_reports").update({"upvotes": int(report.get("upvotes") or 0) + 1}).eq("id", report.get("id")).execute()
            return {"success": True, "upvotes": int(report.get("upvotes") or 0) + 1}
    except HTTPException:
        raise
    except Exception:
        if ENVIRONMENT == "production":
            raise HTTPException(status_code=503, detail="Incident service unavailable")
        pass

    for inc in incidents_db:
        if str(inc.get("id")) == str(incident_id):
            owner = str(inc.get("reported_by") or "")
            voter = str(user.get("id") or "")
            if owner and owner == voter:
                raise HTTPException(status_code=400, detail="Cannot upvote your own report")
            key = str(incident_id)
            voters = incident_votes.setdefault(key, set())
            if voter in voters:
                raise HTTPException(status_code=409, detail="Already upvoted")
            voters.add(voter)
            inc["upvotes"] = int(inc.get("upvotes", 0)) + 1
            try:
                inc["expires_at"] = (datetime.fromisoformat(inc["expires_at"]) + timedelta(minutes=30)).isoformat()
            except Exception:
                inc["expires_at"] = (datetime.utcnow() + timedelta(minutes=30)).isoformat()
            return {"success": True, "upvotes": inc["upvotes"]}
    raise HTTPException(status_code=404, detail="Incident not found")


class ConfirmBody(BaseModel):
    incident_id: str
    confirmed: bool


@router.post("/confirm")
@limiter.limit("40/minute")
def confirm_incident(request: Request, body: ConfirmBody, _user: dict = Depends(get_current_user)):
    """Confirm or deny an incident report. Confirmed extends expiry; denied downvotes."""
    from services.runtime_config import require_enabled

    require_enabled(
        "incident_voting_enabled",
        "Incident voting is temporarily disabled.",
    )
    # DB-first path
    try:
        sb = get_supabase()
        res = sb.table("road_reports").select("id,upvotes").eq("id", body.incident_id).limit(1).execute()
        row = res.data[0] if res.data else None
        if row:
            voter = str((_user or {}).get("id") or "")
            vote_value = 1 if body.confirmed else -1
            try:
                sb.table("road_report_votes").insert(
                    {"report_id": row.get("id"), "user_id": voter, "vote": vote_value}
                ).execute()
            except Exception as e:
                if "duplicate" in str(e).lower() or "unique" in str(e).lower():
                    raise HTTPException(status_code=409, detail="Already voted")
                raise
            current = int(row.get("upvotes") or 0)
            new_votes = current + vote_value
            updates = {"upvotes": new_votes}
            if not body.confirmed and new_votes <= -3:
                updates["status"] = "inactive"
            sb.table("road_reports").update(updates).eq("id", row.get("id")).execute()
            return {
                "success": True,
                "confirmed": body.confirmed,
                "upvotes": new_votes,
                "removed": (not body.confirmed and new_votes <= -3),
            }
    except Exception:
        if ENVIRONMENT == "production":
            raise HTTPException(status_code=503, detail="Incident service unavailable")
        pass

    for inc in incidents_db:
        if str(inc.get("id")) == str(body.incident_id):
            if body.confirmed:
                inc["upvotes"] = int(inc.get("upvotes", 0)) + 1
                try:
                    inc["expires_at"] = (datetime.fromisoformat(inc["expires_at"]) + timedelta(minutes=30)).isoformat()
                except Exception:
                    inc["expires_at"] = (datetime.utcnow() + timedelta(minutes=30)).isoformat()
                return {"success": True, "confirmed": True, "upvotes": inc["upvotes"]}
            else:
                inc["upvotes"] = int(inc.get("upvotes", 0)) - 1
                if inc["upvotes"] <= -3:
                    incidents_db.remove(inc)
                    return {"success": True, "confirmed": False, "removed": True}
                return {"success": True, "confirmed": False, "upvotes": inc["upvotes"]}
    raise HTTPException(status_code=404, detail="Incident not found")


@router.post("/{incident_id}/downvote")
@limiter.limit("60/minute")
def downvote_incident(request: Request, incident_id: str, _user: dict = Depends(get_current_user)):
    """Downvote indicates it's not there; after enough downvotes, remove early."""
    from services.runtime_config import require_enabled

    require_enabled(
        "incident_voting_enabled",
        "Incident voting is temporarily disabled.",
    )
    # DB-first path
    try:
        sb = get_supabase()
        res = sb.table("road_reports").select("id,upvotes").eq("id", incident_id).limit(1).execute()
        row = res.data[0] if res.data else None
        if row:
            voter = str((_user or {}).get("id") or "")
            try:
                sb.table("road_report_votes").insert(
                    {"report_id": row.get("id"), "user_id": voter, "vote": -1}
                ).execute()
            except Exception as e:
                if "duplicate" in str(e).lower() or "unique" in str(e).lower():
                    raise HTTPException(status_code=409, detail="Already voted")
                raise
            new_votes = int(row.get("upvotes") or 0) - 1
            updates = {"upvotes": new_votes}
            if new_votes <= -3:
                updates["status"] = "inactive"
            sb.table("road_reports").update(updates).eq("id", row.get("id")).execute()
            return {"success": True, "upvotes": new_votes, "removed": new_votes <= -3}
    except Exception:
        if ENVIRONMENT == "production":
            raise HTTPException(status_code=503, detail="Incident service unavailable")
        pass

    for inc in incidents_db:
        if str(inc.get("id")) == str(incident_id):
            inc["upvotes"] = int(inc.get("upvotes", 0)) - 1
            if inc["upvotes"] <= -3:
                incidents_db.remove(inc)
                return {"success": True, "removed": True}
            return {"success": True, "upvotes": inc["upvotes"]}
    raise HTTPException(status_code=404, detail="Incident not found")


if ENVIRONMENT == "production":
    _LEGACY_PROD_DISABLED = {
        "/api/incidents/dev/seed",
    }
    router.routes = [r for r in router.routes if getattr(r, "path", "") not in _LEGACY_PROD_DISABLED]


import logging

from fastapi import APIRouter, HTTPException, Query, Depends, Request
from pydantic import BaseModel
from typing import Optional, List, Dict, Any, Annotated
from datetime import datetime, timedelta, timezone
import math
from middleware.auth import get_current_user, require_admin
from limiter import limiter
from database import get_supabase
from config import ENVIRONMENT, EXPOSE_INCIDENT_BACKEND_ERRORS

logger = logging.getLogger(__name__)


router = APIRouter(prefix="/api/incidents", tags=["incidents"])

CurrentUser = Annotated[dict, Depends(get_current_user)]
AdminUser = Annotated[dict, Depends(require_admin)]

MSG_INCIDENT_SERVICE_UNAVAILABLE = "Incident service unavailable"
MSG_INCIDENT_VOTING_DISABLED = "Incident voting is temporarily disabled."
MSG_ALREADY_VOTED = "Already voted"
MSG_CANNOT_UPVOTE_OWN = "Cannot upvote your own report"
MSG_INCIDENT_NOT_FOUND = "Incident not found"
MSG_INCIDENT_REPORTING_DISABLED = "Incident reporting is temporarily disabled."

OPENAPI_ERROR_RESPONSES = {
    400: {"description": "Bad request"},
    404: {"description": "Not found"},
    409: {"description": "Conflict"},
    422: {"description": "Validation error"},
    429: {"description": "Too many requests"},
    503: {"description": "Service unavailable"},
}


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


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
    "police", "accident", "crash", "construction", "hazard", "weather", "pothole", "closure", "camera", "photo"
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


def _expiry_hours_for(_t: str) -> int:
    # Single policy today; weather-specific TTL can diverge here later.
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
        "moderation_status": "pending",
        "expires_at": (now + timedelta(hours=_expiry_hours_for(r_type))).isoformat(),
        "created_at": now.isoformat(),
    }


def _row_to_incident(row: dict, uid: str) -> dict:
    return {
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


def _maybe_raise_incident_503(exc: Exception, context: str) -> None:
    """Log full traceback; in production raise 503 (optional str(exc) in detail for debugging)."""
    logger.exception("%s: %s", context, exc)
    if ENVIRONMENT != "production":
        return
    detail = (
        f"{MSG_INCIDENT_SERVICE_UNAVAILABLE}: {exc!s}"
        if EXPOSE_INCIDENT_BACKEND_ERRORS
        else MSG_INCIDENT_SERVICE_UNAVAILABLE
    )
    raise HTTPException(status_code=503, detail=detail)


def _road_report_rows_after_insert(sb, p: dict, created) -> list:
    """Insert response rows, or fetch the row (supabase-py may not support insert().select())."""
    rows = (created.data or []) if created is not None else []
    if rows:
        return rows
    if p.get("user_id"):
        fetched = (
            sb.table("road_reports")
            .select("*")
            .eq("user_id", p["user_id"])
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        return fetched.data or []
    fetched = (
        sb.table("road_reports")
        .select("*")
        .eq("type", p.get("type") or "")
        .eq("lat", float(p["lat"]))
        .eq("lng", float(p["lng"]))
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    return fetched.data or []


def _insert_road_report_row(sb, p: dict, response_uid: str) -> Optional[dict]:
    try:
        created = sb.table("road_reports").insert(p).execute()
    except Exception as e:
        err = str(e).lower()
        if "moderation_status" in p and ("column" in err or "schema" in err or "pgrst" in err):
            logger.warning("road_reports insert retry without moderation_status: %s", e)
            p2 = {k: v for k, v in p.items() if k != "moderation_status"}
            created = sb.table("road_reports").insert(p2).execute()
        else:
            raise
    rows = _road_report_rows_after_insert(sb, p, created)
    if not rows:
        return None
    return {"success": True, "data": _row_to_incident(rows[0], response_uid), "gems_earned": 50}


def _try_supabase_report(report: IncidentReportCompat, uid: str, now: datetime) -> Optional[dict]:
    sb = get_supabase()
    payload = _to_road_report_payload(report, uid, now)
    try:
        return _insert_road_report_row(sb, payload, uid)
    except Exception as e:
        err = str(e).lower()
        if payload.get("user_id") and (
            "foreign key" in err or "23503" in err or "violates foreign key constraint" in err
        ):
            logger.warning(
                "road_reports insert failed (likely user_id not in auth.users); retrying with user_id=null: %s",
                e,
            )
            return _insert_road_report_row(sb, {**payload, "user_id": None}, uid)
        raise


def _memory_report_fallback(
    report: IncidentReportCompat,
    r_type: str,
    uid: str,
    now: datetime,
    exp: datetime,
) -> dict:
    global incident_counter
    incident_counter += 1
    incident = {
        "id": incident_counter,
        "type": r_type,
        "lat": float(report.lat or 0),
        "lng": float(report.lng or 0),
        "title": (r_type or "incident").replace("_", " ").title(),
        "severity": _severity_for(r_type),
        "description": report.description,
        "reported_by": report.reported_by or uid,
        "upvotes": 0,
        "created_at": now.isoformat(),
        "expires_at": exp.isoformat(),
    }
    incidents_db.append(incident)
    return {"success": True, "data": incident, "gems_earned": 50}


@router.post("/report", responses=OPENAPI_ERROR_RESPONSES)
@limiter.limit("30/minute")
def report_incident(request: Request, report: IncidentReportCompat, user: CurrentUser):
    """Create an incident report. Returns the created incident and gems_earned."""
    from services.runtime_config import require_enabled

    require_enabled(
        "incident_submissions_enabled",
        MSG_INCIDENT_REPORTING_DISABLED,
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
    now = _utc_now()
    recent = incident_report_times.get(uid, [])
    recent = [t for t in recent if (now - t).total_seconds() <= 600]
    if len(recent) >= 10:
        raise HTTPException(status_code=429, detail="Too many incident reports. Try again later.")
    recent.append(now)
    incident_report_times[uid] = recent

    exp = now + timedelta(hours=_expiry_hours_for(r_type))

    try:
        out = _try_supabase_report(report, uid, now)
        if out is not None:
            return out
    except Exception as e:
        _maybe_raise_incident_503(e, "report_incident supabase")

    return _memory_report_fallback(report, r_type, uid, now, exp)


def _haversine_miles(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r_lat = math.radians(lat2 - lat1)
    r_lng = math.radians(lng2 - lng1)
    a = math.sin(r_lat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(r_lng / 2) ** 2
    return 3959.0 * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _nearby_from_db(lat: float, lng: float, radius_miles: float, now: datetime, limit: int) -> List[Dict[str, Any]]:
    sb = get_supabase()
    lat_delta = radius_miles / 69.0
    lng_delta = radius_miles / (69.0 * 0.7)

    def _query(with_moderation: bool):
        q = (
            sb.table("road_reports")
            .select("id,type,description,lat,lng,upvotes,created_at,expires_at")
            .eq("status", "active")
            .gte("lat", lat - lat_delta)
            .lte("lat", lat + lat_delta)
            .gte("lng", lng - lng_delta)
            .lte("lng", lng + lng_delta)
            .gt("expires_at", now.isoformat())
        )
        if with_moderation:
            q = q.or_("moderation_status.eq.approved,moderation_status.is.null")
        return q.execute()

    try:
        res = _query(True)
    except Exception as e:
        logger.warning("road_reports nearby moderation filter unavailable, retrying without it: %s", e)
        res = _query(False)
    db_rows = res.data or []
    out: List[Dict[str, Any]] = []
    for row in db_rows:
        rlat = float(row.get("lat", 0))
        rlng = float(row.get("lng", 0))
        d = _haversine_miles(lat, lng, rlat, rlng)
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
    return out[:limit]


def _nearby_from_memory(lat: float, lng: float, radius_miles: float, now: datetime, limit: int) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    for inc in incidents_db:
        try:
            expires = datetime.fromisoformat(inc["expires_at"])
        except Exception as e:
            logger.warning("failed to parse incident expires_at: %s", e)
            continue
        if expires < now:
            continue
        d = _haversine_miles(lat, lng, float(inc["lat"]), float(inc["lng"]))
        if d <= radius_miles:
            out.append({**inc, "distance_miles": round(d, 2)})
    out.sort(key=lambda x: x.get("distance_miles", 1e9))
    return out[:limit]


@router.get("/nearby", responses=OPENAPI_ERROR_RESPONSES)
def get_nearby_incidents(
    lat: Annotated[float, Query(...)],
    lng: Annotated[float, Query(...)],
    radius_miles: Annotated[float, Query(ge=0.1, le=200)] = 10,
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
):
    """Get all active incidents within radius miles of lat/lng."""
    now = _utc_now()
    try:
        data = _nearby_from_db(lat, lng, radius_miles, now, limit)
        return {"success": True, "data": data}
    except Exception as e:
        _maybe_raise_incident_503(e, "get_nearby_incidents supabase")
    data = _nearby_from_memory(lat, lng, radius_miles, now, limit)
    return {"success": True, "data": data}


@router.post("/dev/seed", responses=OPENAPI_ERROR_RESPONSES)
def dev_seed_incidents(
    _admin: AdminUser,
    lat: Annotated[float, Query()] = 39.9612,
    lng: Annotated[float, Query()] = -82.9988,
):
    """Dev helper: seed a few incidents near a coordinate so the map always shows something."""
    if ENVIRONMENT == "production":
        raise HTTPException(status_code=404, detail="Not found")
    global incident_counter
    now = _utc_now()
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


def _is_vote_duplicate_error(e: Exception) -> bool:
    s = str(e).lower()
    return "duplicate" in s or "unique" in s


def _upvote_db(sb, _incident_id: str, voter: str, report: dict) -> dict:
    owner = str(report.get("user_id") or "")
    if owner and owner == voter:
        raise HTTPException(status_code=400, detail=MSG_CANNOT_UPVOTE_OWN)
    try:
        sb.table("road_report_votes").insert({"report_id": report.get("id"), "user_id": voter, "vote": 1}).execute()
    except Exception as e:
        if _is_vote_duplicate_error(e):
            raise HTTPException(status_code=409, detail=MSG_ALREADY_VOTED)
        raise
    sb.table("road_reports").update({"upvotes": int(report.get("upvotes") or 0) + 1}).eq("id", report.get("id")).execute()
    return {"success": True, "upvotes": int(report.get("upvotes") or 0) + 1}


def _upvote_memory(incident_id: str, voter: str) -> dict:
    for inc in incidents_db:
        if str(inc.get("id")) != str(incident_id):
            continue
        owner = str(inc.get("reported_by") or "")
        if owner and owner == voter:
            raise HTTPException(status_code=400, detail=MSG_CANNOT_UPVOTE_OWN)
        key = str(incident_id)
        voters = incident_votes.setdefault(key, set())
        if voter in voters:
            raise HTTPException(status_code=409, detail=MSG_ALREADY_VOTED)
        voters.add(voter)
        inc["upvotes"] = int(inc.get("upvotes", 0)) + 1
        try:
            inc["expires_at"] = (datetime.fromisoformat(inc["expires_at"]) + timedelta(minutes=30)).isoformat()
        except Exception:
            inc["expires_at"] = (_utc_now() + timedelta(minutes=30)).isoformat()
        return {"success": True, "upvotes": inc["upvotes"]}
    raise HTTPException(status_code=404, detail=MSG_INCIDENT_NOT_FOUND)


@router.post("/{incident_id}/upvote", responses=OPENAPI_ERROR_RESPONSES)
@limiter.limit("60/minute")
def upvote_incident(request: Request, incident_id: str, user: CurrentUser):
    """Upvote confirms an incident is still there; extends expiry by 30 minutes."""
    from services.runtime_config import require_enabled

    require_enabled("incident_voting_enabled", MSG_INCIDENT_VOTING_DISABLED)
    voter = str(user.get("id") or "")
    try:
        sb = get_supabase()
        report_res = sb.table("road_reports").select("id,user_id,upvotes").eq("id", incident_id).limit(1).execute()
        report = report_res.data[0] if report_res.data else None
        if report:
            return _upvote_db(sb, incident_id, voter, report)
    except HTTPException:
        raise
    except Exception as e:
        _maybe_raise_incident_503(e, "upvote_incident supabase")

    return _upvote_memory(incident_id, voter)


class ConfirmBody(BaseModel):
    incident_id: str
    confirmed: bool


def _confirm_db(sb, row: dict, voter: str, body: ConfirmBody) -> dict:
    vote_value = 1 if body.confirmed else -1
    try:
        sb.table("road_report_votes").insert(
            {"report_id": row.get("id"), "user_id": voter, "vote": vote_value}
        ).execute()
    except Exception as e:
        if _is_vote_duplicate_error(e):
            raise HTTPException(status_code=409, detail=MSG_ALREADY_VOTED)
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


def _confirm_memory(body: ConfirmBody) -> dict:
    for inc in incidents_db:
        if str(inc.get("id")) != str(body.incident_id):
            continue
        if body.confirmed:
            inc["upvotes"] = int(inc.get("upvotes", 0)) + 1
            try:
                inc["expires_at"] = (datetime.fromisoformat(inc["expires_at"]) + timedelta(minutes=30)).isoformat()
            except Exception:
                inc["expires_at"] = (_utc_now() + timedelta(minutes=30)).isoformat()
            return {"success": True, "confirmed": True, "upvotes": inc["upvotes"]}
        inc["upvotes"] = int(inc.get("upvotes", 0)) - 1
        if inc["upvotes"] <= -3:
            incidents_db.remove(inc)
            return {"success": True, "confirmed": False, "removed": True}
        return {"success": True, "confirmed": False, "upvotes": inc["upvotes"]}
    raise HTTPException(status_code=404, detail=MSG_INCIDENT_NOT_FOUND)


@router.post("/confirm", responses=OPENAPI_ERROR_RESPONSES)
@limiter.limit("40/minute")
def confirm_incident(request: Request, body: ConfirmBody, _user: CurrentUser):
    """Confirm or deny an incident report. Confirmed extends expiry; denied downvotes."""
    from services.runtime_config import require_enabled

    require_enabled("incident_voting_enabled", MSG_INCIDENT_VOTING_DISABLED)
    voter = str((_user or {}).get("id") or "")
    try:
        sb = get_supabase()
        res = sb.table("road_reports").select("id,upvotes").eq("id", body.incident_id).limit(1).execute()
        row = res.data[0] if res.data else None
        if row:
            return _confirm_db(sb, row, voter, body)
    except HTTPException:
        raise
    except Exception as e:
        _maybe_raise_incident_503(e, "confirm_incident supabase")

    return _confirm_memory(body)


def _downvote_db(sb, row: dict, voter: str) -> dict:
    try:
        sb.table("road_report_votes").insert(
            {"report_id": row.get("id"), "user_id": voter, "vote": -1}
        ).execute()
    except Exception as e:
        if _is_vote_duplicate_error(e):
            raise HTTPException(status_code=409, detail=MSG_ALREADY_VOTED)
        raise
    new_votes = int(row.get("upvotes") or 0) - 1
    updates = {"upvotes": new_votes}
    if new_votes <= -3:
        updates["status"] = "inactive"
    sb.table("road_reports").update(updates).eq("id", row.get("id")).execute()
    return {"success": True, "upvotes": new_votes, "removed": new_votes <= -3}


def _downvote_memory(incident_id: str) -> dict:
    for inc in incidents_db:
        if str(inc.get("id")) != str(incident_id):
            continue
        inc["upvotes"] = int(inc.get("upvotes", 0)) - 1
        if inc["upvotes"] <= -3:
            incidents_db.remove(inc)
            return {"success": True, "removed": True}
        return {"success": True, "upvotes": inc["upvotes"]}
    raise HTTPException(status_code=404, detail=MSG_INCIDENT_NOT_FOUND)


@router.post("/{incident_id}/downvote", responses=OPENAPI_ERROR_RESPONSES)
@limiter.limit("60/minute")
def downvote_incident(request: Request, incident_id: str, _user: CurrentUser):
    """Downvote indicates it's not there; after enough downvotes, remove early."""
    from services.runtime_config import require_enabled

    require_enabled("incident_voting_enabled", MSG_INCIDENT_VOTING_DISABLED)
    voter = str((_user or {}).get("id") or "")
    try:
        sb = get_supabase()
        res = sb.table("road_reports").select("id,upvotes").eq("id", incident_id).limit(1).execute()
        row = res.data[0] if res.data else None
        if row:
            return _downvote_db(sb, row, voter)
    except HTTPException:
        raise
    except Exception as e:
        _maybe_raise_incident_503(e, "downvote_incident supabase")

    return _downvote_memory(incident_id)


if ENVIRONMENT == "production":
    _LEGACY_PROD_DISABLED = {
        "/api/incidents/dev/seed",
    }
    router.routes = [r for r in router.routes if getattr(r, "path", "") not in _LEGACY_PROD_DISABLED]

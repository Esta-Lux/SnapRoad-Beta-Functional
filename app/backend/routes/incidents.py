from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import math


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


@router.post("/report")
async def report_incident(report: IncidentReportCompat):
    """Create an incident report. Returns the created incident and gems_earned."""
    r_type = (report.type or report.incident_type or "").strip()
    if not r_type:
        raise HTTPException(status_code=422, detail="type is required")
    if report.lat is None or report.lng is None:
        raise HTTPException(status_code=422, detail="lat/lng are required")

    global incident_counter
    incident_counter += 1

    now = datetime.utcnow()
    exp = now + timedelta(hours=_expiry_hours_for(r_type))
    incident = {
        "id": incident_counter,
        "type": r_type,
        "lat": float(report.lat),
        "lng": float(report.lng),
        "title": (r_type or "incident").replace("_", " ").title(),
        "severity": _severity_for(r_type),
        "description": report.description,
        "reported_by": report.reported_by,
        "upvotes": 0,
        "created_at": now.isoformat(),
        "expires_at": exp.isoformat(),
    }
    incidents_db.append(incident)
    return {"success": True, "data": incident, "gems_earned": 15}


@router.get("/nearby")
async def get_nearby_incidents(
    lat: float = Query(...),
    lng: float = Query(...),
    radius_miles: float = Query(10, ge=0.1, le=200),
):
    """Get all active incidents within radius miles of lat/lng."""
    now = datetime.utcnow()
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
    return {"success": True, "data": out}


@router.post("/dev/seed")
async def dev_seed_incidents(lat: float = Query(39.9612), lng: float = Query(-82.9988)):
    """Dev helper: seed a few incidents near a coordinate so the map always shows something."""
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
async def upvote_incident(incident_id: int):
    """Upvote confirms an incident is still there; extends expiry by 30 minutes."""
    for inc in incidents_db:
        if int(inc.get("id", -1)) == incident_id:
            inc["upvotes"] = int(inc.get("upvotes", 0)) + 1
            try:
                inc["expires_at"] = (datetime.fromisoformat(inc["expires_at"]) + timedelta(minutes=30)).isoformat()
            except Exception:
                inc["expires_at"] = (datetime.utcnow() + timedelta(minutes=30)).isoformat()
            return {"success": True, "upvotes": inc["upvotes"]}
    raise HTTPException(status_code=404, detail="Incident not found")


@router.post("/{incident_id}/downvote")
async def downvote_incident(incident_id: int):
    """Downvote indicates it's not there; after enough downvotes, remove early."""
    for inc in incidents_db:
        if int(inc.get("id", -1)) == incident_id:
            inc["upvotes"] = int(inc.get("upvotes", 0)) - 1
            if inc["upvotes"] <= -3:
                incidents_db.remove(inc)
                return {"success": True, "removed": True}
            return {"success": True, "upvotes": inc["upvotes"]}
    raise HTTPException(status_code=404, detail="Incident not found")


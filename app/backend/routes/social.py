from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from datetime import datetime, timedelta
from models.schemas import (
    FriendRequest,
    RoadReport,
    LocationUpdateBody,
    LocationSharingBody,
    LocationTagBody,
)
from services.mock_data import (
    users_db, current_user_id, road_reports_db, XP_CONFIG,
)
from routes.gamification import add_xp_to_user, check_community_badges
from middleware.auth import get_current_user
from database import get_supabase
from config import ENVIRONMENT

router = APIRouter(prefix="/api", tags=["Social"])


# ==================== FRIENDS ====================
@router.get("/friends")
def get_friends(
    limit: int = Query(default=100, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
):
    """Redirects to Supabase-backed friends list (was previously in-memory mock)."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    return get_friends_list(limit=limit, current_user=current_user)


@router.get("/friends/search")
def search_friends(q: str = "", user_id: str = "", current_user: dict = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    uid = current_user["id"]
    query = (q or user_id).strip()
    if not query:
        return {"success": True, "data": []}
    supabase = get_supabase()

    # Search by friend_code (exact match, case-insensitive), email, or name
    code_res = supabase.table("profiles").select(
        "id, name, full_name, email, friend_code"
    ).neq("id", uid).ilike("friend_code", query).limit(5).execute()

    safe_q = query[:100].replace("%", "").replace(",", "").replace("(", "").replace(")", "").replace(".", "").strip()
    if not safe_q:
        return {"success": True, "data": []}
    name_res = supabase.table("profiles").select(
        "id, name, full_name, email, friend_code"
    ).neq("id", uid).or_(
        f"full_name.ilike.%{safe_q}%,name.ilike.%{safe_q}%,email.ilike.%{safe_q}%"
    ).limit(10).execute()

    seen = set()
    combined = []
    for row in (code_res.data or []) + (name_res.data or []):
        rid = str(row["id"])
        if rid not in seen:
            seen.add(rid)
            combined.append(row)

    friend_ids_res = supabase.table("friendships").select("user_id_1, user_id_2").or_(
        f"user_id_1.eq.{uid},user_id_2.eq.{uid}"
    ).eq("status", "accepted").execute()
    friend_set = set()
    for row in (friend_ids_res.data or []):
        fid = row["user_id_2"] if str(row["user_id_1"]) == str(uid) else row["user_id_1"]
        friend_set.add(str(fid))

    results = []
    for row in combined:
        results.append({
            "id": str(row["id"]),
            "name": row.get("name") or row.get("full_name") or "Driver",
            "email": row.get("email"),
            "friend_code": row.get("friend_code"),
            "is_friend": str(row["id"]) in friend_set,
        })
    return {"success": True, "data": results[:20]}


@router.get("/friends/my-code")
def get_my_friend_code(current_user: dict = Depends(get_current_user)):
    """Return the current user's 6-character friend code for sharing."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    uid = current_user["id"]
    supabase = get_supabase()
    res = supabase.table("profiles").select("friend_code").eq("id", uid).limit(1).execute()
    code = (res.data[0].get("friend_code") if res.data else None) or ""
    return {"success": True, "data": {"friend_code": code}}


@router.post("/friends/add")
def add_friend(request: FriendRequest, current_user: dict = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    uid = current_user["id"]
    friend_id = request.user_id
    if not friend_id or friend_id == uid:
        raise HTTPException(status_code=400, detail="Invalid friend_id")
    supabase = get_supabase()
    # Check not already friends or pending
    r1 = supabase.table("friendships").select("id").eq("user_id_1", uid).eq("user_id_2", friend_id).execute()
    r2 = supabase.table("friendships").select("id").eq("user_id_1", friend_id).eq("user_id_2", uid).execute()
    if (r1.data and len(r1.data) > 0) or (r2.data and len(r2.data) > 0):
        raise HTTPException(status_code=400, detail="Already friends or request pending")
    supabase.table("friendships").insert({
        "user_id_1": uid,
        "user_id_2": friend_id,
        "status": "pending",
    }).execute()
    return {"success": True, "message": "Friend request sent"}


@router.delete("/friends/{friend_id}")
def remove_friend(friend_id: str, current_user: dict = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    uid = current_user["id"]
    supabase = get_supabase()
    # Delete row where (user_id_1=uid, user_id_2=friend_id) or (user_id_1=friend_id, user_id_2=uid)
    r1 = supabase.table("friendships").delete().eq("user_id_1", uid).eq("user_id_2", friend_id).execute()
    r2 = supabase.table("friendships").delete().eq("user_id_1", friend_id).eq("user_id_2", uid).execute()
    return {"success": True, "message": "Friend removed"}


@router.get("/friends/list")
def get_friends_list(
    limit: int = Query(default=100, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
):
    """List friends with friend_id and status for location sharing."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    uid = current_user["id"]
    supabase = get_supabase()
    res = supabase.table("friendships").select(
        "user_id_1, user_id_2, status"
    ).or_(f"user_id_1.eq.{uid},user_id_2.eq.{uid}").eq("status", "accepted").limit(limit).execute()
    friend_ids = []
    for row in (res.data or []):
        fid = row["user_id_2"] if str(row["user_id_1"]) == str(uid) else row["user_id_1"]
        friend_ids.append(str(fid))
    if not friend_ids:
        return {"success": True, "data": []}
    profiles = supabase.table("profiles").select(
        "id, name, full_name, avatar_url, level, gems, safety_score, friend_code"
    ).in_("id", friend_ids).execute()
    profile_map = {str(p["id"]): p for p in (profiles.data or [])}
    out = []
    for fid in friend_ids:
        p = profile_map.get(fid, {})
        out.append({
            "friend_id": fid,
            "id": fid,
            "status": "accepted",
            "name": p.get("name") or p.get("full_name") or "Friend",
            "avatar_url": p.get("avatar_url"),
            "level": p.get("level", 1),
            "gems": p.get("gems", 0),
            "safety_score": p.get("safety_score", 0),
            "friend_code": p.get("friend_code"),
        })
    return {"success": True, "data": out}


@router.get("/friends/requests")
def get_friend_requests(
    limit: int = Query(default=100, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
):
    """Pending friend requests (incoming)."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    uid = current_user["id"]
    supabase = get_supabase()
    res = supabase.table("friendships").select(
        "id, user_id_1, status, created_at"
    ).eq("user_id_2", uid).eq("status", "pending").limit(limit).execute()
    from_ids = [str(r.get("user_id_1")) for r in (res.data or []) if r.get("user_id_1")]
    profile_map = {}
    if from_ids:
        prof = supabase.table("profiles").select(
            "id, name, full_name, email, avatar_url, friend_code"
        ).in_("id", from_ids).execute()
        for p in (prof.data or []):
            profile_map[str(p["id"])] = p
    requests = []
    for row in (res.data or []):
        fid = str(row.get("user_id_1") or "")
        p = profile_map.get(fid, {})
        requests.append({
            "id": row.get("id"),
            "from_user_id": fid,
            "from_name": p.get("name") or p.get("full_name") or "Driver",
            "from_email": p.get("email"),
            "from_friend_code": p.get("friend_code"),
            "status": "pending",
            "created_at": row.get("created_at"),
        })
    return {"success": True, "data": requests}


@router.get("/friends/requests/sent")
def get_outgoing_friend_requests(
    limit: int = Query(default=100, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
):
    """Pending friend requests you sent (waiting on the other person)."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    uid = current_user["id"]
    supabase = get_supabase()
    res = supabase.table("friendships").select(
        "id, user_id_2, created_at"
    ).eq("user_id_1", uid).eq("status", "pending").limit(limit).execute()
    to_ids = [str(r.get("user_id_2")) for r in (res.data or []) if r.get("user_id_2")]
    profile_map = {}
    if to_ids:
        prof = supabase.table("profiles").select(
            "id, name, full_name, email, friend_code"
        ).in_("id", to_ids).execute()
        for p in (prof.data or []):
            profile_map[str(p["id"])] = p
    out = []
    for row in (res.data or []):
        tid = str(row.get("user_id_2") or "")
        p = profile_map.get(tid, {})
        out.append({
            "id": row.get("id"),
            "to_user_id": tid,
            "to_name": p.get("name") or p.get("full_name") or "Driver",
            "to_email": p.get("email"),
            "created_at": row.get("created_at"),
        })
    return {"success": True, "data": out}


@router.post("/friends/reject")
def reject_friend_request(body: dict, current_user: dict = Depends(get_current_user)):
    """Decline an incoming request (body.friendship_id = row id)."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    uid = current_user["id"]
    friendship_id = body.get("friendship_id")
    if not friendship_id:
        raise HTTPException(status_code=400, detail="friendship_id required")
    supabase = get_supabase()
    supabase.table("friendships").delete().eq("id", friendship_id).eq("user_id_2", uid).eq(
        "status", "pending"
    ).execute()
    return {"success": True, "message": "Request declined"}


@router.post("/friends/accept")
def accept_friend_request(body: dict, current_user: dict = Depends(get_current_user)):
    """Accept a friend request (body.friendship_id = row id)."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    uid = current_user["id"]
    friendship_id = body.get("friendship_id")
    if not friendship_id:
        raise HTTPException(status_code=400, detail="friendship_id required")
    supabase = get_supabase()
    supabase.table("friendships").update({"status": "accepted"}).eq(
        "id", friendship_id
    ).eq("user_id_2", uid).execute()
    return {"success": True, "message": "Friend request accepted"}


@router.post("/friends/location/update")
def update_my_location(body: LocationUpdateBody, current_user: dict = Depends(get_current_user)):
    """Update current user's live location (Supabase: live_locations upsert; mock: no-op)."""
    from services.runtime_config import require_enabled

    require_enabled(
        "live_location_publishing_enabled",
        "Live location publishing is temporarily paused.",
    )
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    uid = current_user["id"]
    try:
        from database import get_supabase
        from config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
        if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
            sb = get_supabase()
            sb.table("live_locations").upsert({
                "user_id": uid,
                "lat": body.lat,
                "lng": body.lng,
                "heading": body.heading,
                "speed_mph": body.speed_mph,
                "is_navigating": body.is_navigating,
                "destination_name": body.destination_name or None,
                "last_updated": datetime.utcnow().isoformat() + "Z",
                "is_sharing": True,
            }).execute()
    except Exception:
        pass
    return {"success": True}


@router.put("/friends/location/sharing")
def set_location_sharing(body: LocationSharingBody, current_user: dict = Depends(get_current_user)):
    """Turn location sharing on or off."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    uid = current_user["id"]
    try:
        from database import get_supabase
        from config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
        if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
            sb = get_supabase()
            sb.table("live_locations").update({
                "is_sharing": body.is_sharing,
                "last_updated": datetime.utcnow().isoformat() + "Z",
            }).eq("user_id", uid).execute()
    except Exception:
        pass
    return {"success": True}


@router.post("/friends/tag")
def send_location_tag(body: LocationTagBody, current_user: dict = Depends(get_current_user)):
    """Send a location tag to a friend."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    uid = current_user["id"]
    try:
        from database import get_supabase
        from config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
        if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
            sb = get_supabase()
            sb.table("location_tags").insert({
                "from_user_id": uid,
                "to_user_id": body.to_user_id,
                "lat": body.lat,
                "lng": body.lng,
                "message": body.message or "Check out where I am!",
            }).execute()
    except Exception:
        pass
    return {"success": True, "message": "Location tag sent"}


# ==================== ROAD REPORTS ====================
@router.get("/reports")
def get_road_reports(
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    radius: float = Query(default=10, ge=0.1, le=200),
    limit: int = Query(default=100, ge=1, le=100),
):
    if ENVIRONMENT == "production":
        raise HTTPException(status_code=503, detail="Use /api/incidents and /api/photo-reports in production")
    reports = road_reports_db
    if lat is not None and lng is not None:
        def is_nearby(r):
            dlat = abs(r["lat"] - lat)
            dlng = abs(r["lng"] - lng)
            dist = ((dlat * 111) ** 2 + (dlng * 111) ** 2) ** 0.5
            return dist <= radius
        reports = [r for r in reports if is_nearby(r)]
    capped = reports[:limit]
    return {"success": True, "data": capped, "total": len(capped)}


@router.post("/reports")
def create_road_report(report: RoadReport):
    if ENVIRONMENT == "production":
        raise HTTPException(status_code=503, detail="Use /api/photo-reports/upload in production")
    user = users_db.get(current_user_id, {})
    new_id = max([r["id"] for r in road_reports_db], default=0) + 1
    new_report = {"id": new_id, "user_id": current_user_id, "type": report.type, "title": report.title, "description": report.description, "lat": report.lat, "lng": report.lng, "photo_url": report.photo_url, "upvotes": 0, "upvoters": [], "created_at": datetime.now().isoformat(), "expires_at": (datetime.now() + timedelta(hours=12)).isoformat(), "verified": False}
    road_reports_db.append(new_report)
    xp_result = add_xp_to_user(current_user_id, XP_CONFIG["photo_report"])
    if current_user_id in users_db:
        users_db[current_user_id]["reports_posted"] = user.get("reports_posted", 0) + 1
    badges_earned = check_community_badges(current_user_id)
    return {"success": True, "message": f"Report posted! +{XP_CONFIG['photo_report']} XP", "data": {"report": new_report, "xp_result": xp_result, "badges_earned": badges_earned}}


@router.post("/reports/{report_id}/upvote")
def upvote_report(report_id: int):
    if ENVIRONMENT == "production":
        raise HTTPException(status_code=503, detail="Use /api/photo-reports/{report_id}/upvote in production")
    report = next((r for r in road_reports_db if r["id"] == report_id), None)
    if not report:
        return {"success": False, "message": "Report not found"}
    if current_user_id in report["upvoters"]:
        return {"success": False, "message": "Already upvoted"}
    if report["user_id"] == current_user_id:
        return {"success": False, "message": "Cannot upvote own report"}
    report["upvotes"] += 1
    report["upvoters"].append(current_user_id)
    reporter_id = report["user_id"]
    if reporter_id in users_db:
        users_db[reporter_id]["gems"] = users_db[reporter_id].get("gems", 0) + 10
        users_db[reporter_id]["reports_upvotes_received"] = users_db[reporter_id].get("reports_upvotes_received", 0) + 1
        check_community_badges(reporter_id)
    return {"success": True, "message": "Upvoted! Reporter earned 10 gems", "data": {"report_id": report_id, "new_upvote_count": report["upvotes"]}}


@router.delete("/reports/{report_id}")
def delete_report(report_id: int):
    if ENVIRONMENT == "production":
        raise HTTPException(status_code=503, detail="Legacy report delete unavailable in production")
    global road_reports_db
    report = next((r for r in road_reports_db if r["id"] == report_id), None)
    if not report:
        return {"success": False, "message": "Report not found"}
    if report["user_id"] != current_user_id:
        return {"success": False, "message": "Can only delete your own reports"}
    road_reports_db[:] = [r for r in road_reports_db if r["id"] != report_id]
    return {"success": True, "message": "Report deleted"}


@router.get("/reports/my")
def get_my_reports(limit: int = Query(default=100, ge=1, le=100)):
    if ENVIRONMENT == "production":
        raise HTTPException(status_code=503, detail="Legacy report listing unavailable in production")
    my_reports = [r for r in road_reports_db if r["user_id"] == current_user_id]
    my_reports = my_reports[:limit]
    total_upvotes = sum(r["upvotes"] for r in my_reports)
    return {"success": True, "data": my_reports, "stats": {"total_reports": len(my_reports), "total_upvotes": total_upvotes, "gems_from_upvotes": total_upvotes * 10}}


# ==================== FAMILY ACTIONS ====================
@router.post("/family/{member_id}/call")
def family_call(member_id: str):
    return {"success": True, "message": f"Calling family member {member_id}"}


@router.post("/family/{member_id}/message")
def family_message(member_id: str):
    return {"success": True, "message": f"Message sent to family member {member_id}"}


# ==================== INCIDENTS (consumer-facing) ====================
@router.get("/incidents")
def get_incidents(
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    radius: float = Query(default=15, ge=0.1, le=200),
    limit: int = Query(default=100, ge=1, le=100),
):
    if ENVIRONMENT == "production":
        raise HTTPException(status_code=503, detail="Use /api/incidents/nearby in production")
    reports = road_reports_db
    if lat is not None and lng is not None:
        filtered = []
        for r in reports:
            dlat = abs(r.get("lat", 0) - lat)
            dlng = abs(r.get("lng", 0) - lng)
            dist = ((dlat * 111) ** 2 + (dlng * 111) ** 2) ** 0.5
            if dist <= radius:
                filtered.append(r)
        reports = filtered
    capped = reports[:limit]
    return {"success": True, "data": capped, "total": len(capped)}


@router.post("/incidents/{incident_id}/upvote")
def upvote_incident(incident_id: int):
    if ENVIRONMENT == "production":
        raise HTTPException(status_code=503, detail="Use /api/incidents/{incident_id}/upvote in production")
    report = next((r for r in road_reports_db if r["id"] == incident_id), None)
    if not report:
        return {"success": False, "message": "Incident not found"}
    if current_user_id in report.get("upvoters", []):
        return {"success": False, "message": "Already upvoted"}
    report["upvotes"] = report.get("upvotes", 0) + 1
    report.setdefault("upvoters", []).append(current_user_id)
    return {"success": True, "data": {"id": incident_id, "upvotes": report["upvotes"]}}


if ENVIRONMENT == "production":
    _LEGACY_PROD_DISABLED = {
        "/api/reports",
        "/api/reports/{report_id}/upvote",
        "/api/reports/{report_id}",
        "/api/reports/my",
        "/api/incidents",
        "/api/incidents/{incident_id}/upvote",
    }
    router.routes = [r for r in router.routes if getattr(r, "path", "") not in _LEGACY_PROD_DISABLED]

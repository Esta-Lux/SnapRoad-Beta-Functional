from fastapi import APIRouter
from typing import Optional
from datetime import datetime, timedelta
from models.schemas import FriendRequest, RoadReport
from services.mock_data import (
    users_db, current_user_id, road_reports_db, XP_CONFIG,
)
from routes.gamification import add_xp_to_user, check_community_badges

router = APIRouter(prefix="/api", tags=["Social"])


# ==================== FRIENDS ====================
@router.get("/friends")
def get_friends():
    user = users_db.get(current_user_id, {})
    friend_ids = user.get("friends", [])
    friends = []
    for fid in friend_ids:
        f = users_db.get(fid, {})
        if f:
            friends.append({"id": fid, "name": f.get("name", "Driver"), "level": f.get("level", 1), "safety_score": f.get("safety_score", 0), "gems": f.get("gems", 0), "is_premium": f.get("is_premium", False)})
    return {"success": True, "data": friends}


@router.get("/friends/search")
def search_friends(q: str = "", user_id: str = ""):
    results = []
    query = (q or user_id).lower()
    for uid, user in users_db.items():
        if uid == current_user_id:
            continue
        if query in user.get("name", "").lower() or query == uid:
            results.append({"id": uid, "name": user.get("name", "Driver"), "level": user.get("level", 1), "safety_score": user.get("safety_score", 0)})
    return {"success": True, "data": results[:20]}


@router.post("/friends/add")
def add_friend(request: FriendRequest):
    if current_user_id not in users_db:
        return {"success": False, "message": "User not found"}
    if request.user_id not in users_db:
        return {"success": False, "message": "Friend not found"}
    friends = users_db[current_user_id].setdefault("friends", [])
    if request.user_id in friends:
        return {"success": False, "message": "Already friends"}
    friends.append(request.user_id)
    users_db[request.user_id].setdefault("friends", []).append(current_user_id)
    return {"success": True, "message": f"Added {users_db[request.user_id].get('name')} as a friend!"}


@router.delete("/friends/{friend_id}")
def remove_friend(friend_id: str):
    if current_user_id in users_db:
        friends = users_db[current_user_id].get("friends", [])
        if friend_id in friends:
            friends.remove(friend_id)
    if friend_id in users_db:
        other_friends = users_db[friend_id].get("friends", [])
        if current_user_id in other_friends:
            other_friends.remove(current_user_id)
    return {"success": True, "message": "Friend removed"}


# ==================== FAMILY ====================
@router.get("/family/members")
def get_family_members():
    return {"success": True, "data": [
        {"id": "f1", "name": "Family Member 1", "role": "parent", "safety_score": 92, "last_trip": "2 hours ago"},
        {"id": "f2", "name": "Family Member 2", "role": "child", "safety_score": 88, "last_trip": "Yesterday"},
    ]}


# ==================== ROAD REPORTS ====================
@router.get("/reports")
def get_road_reports(lat: Optional[float] = None, lng: Optional[float] = None, radius: float = 10):
    reports = road_reports_db
    if lat is not None and lng is not None:
        def is_nearby(r):
            dlat = abs(r["lat"] - lat)
            dlng = abs(r["lng"] - lng)
            dist = ((dlat * 111) ** 2 + (dlng * 111) ** 2) ** 0.5
            return dist <= radius
        reports = [r for r in reports if is_nearby(r)]
    return {"success": True, "data": reports, "total": len(reports)}


@router.post("/reports")
def create_road_report(report: RoadReport):
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
    global road_reports_db
    report = next((r for r in road_reports_db if r["id"] == report_id), None)
    if not report:
        return {"success": False, "message": "Report not found"}
    if report["user_id"] != current_user_id:
        return {"success": False, "message": "Can only delete your own reports"}
    road_reports_db[:] = [r for r in road_reports_db if r["id"] != report_id]
    return {"success": True, "message": "Report deleted"}


@router.get("/reports/my")
def get_my_reports():
    my_reports = [r for r in road_reports_db if r["user_id"] == current_user_id]
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
def get_incidents(lat: Optional[float] = None, lng: Optional[float] = None, radius: float = 15):
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
    return {"success": True, "data": reports, "total": len(reports)}


@router.post("/incidents/{incident_id}/upvote")
def upvote_incident(incident_id: int):
    report = next((r for r in road_reports_db if r["id"] == incident_id), None)
    if not report:
        return {"success": False, "message": "Incident not found"}
    if current_user_id in report.get("upvoters", []):
        return {"success": False, "message": "Already upvoted"}
    report["upvotes"] = report.get("upvotes", 0) + 1
    report.setdefault("upvoters", []).append(current_user_id)
    return {"success": True, "data": {"id": incident_id, "upvotes": report["upvotes"]}}

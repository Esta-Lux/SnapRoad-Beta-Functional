from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime, timedelta
import random
from models.schemas import XPEvent, ChallengeCreate, GemGenerateRequest, GemCollectRequest
from services.mock_data import (
    users_db, current_user_id, ALL_BADGES, COMMUNITY_BADGES,
    challenges_data, challenges_db, route_gems_db, collected_gems_db,
    XP_CONFIG, calculate_xp_for_level, calculate_xp_to_next_level,
)
from middleware.auth import get_current_user
from database import get_supabase
from services.supabase_service import (
    sb_get_profile,
    sb_update_profile,
    sb_create_challenge,
    sb_get_challenges,
)
from config import ENVIRONMENT
import uuid

router = APIRouter(prefix="/api", tags=["Gamification"])
processed_xp_events: set[str] = set()


def _user_state(user_id: str) -> dict:
    profile = sb_get_profile(user_id) or {}
    local = users_db.get(user_id, {})
    merged = {**local, **profile}
    if ENVIRONMENT == "production":
        merged.setdefault("id", user_id)
        return merged
    if user_id not in users_db:
        users_db[user_id] = {"id": user_id}
    users_db[user_id].update(merged)
    return users_db[user_id]


def _persist_user_fields(user_id: str, updates: dict) -> None:
    if ENVIRONMENT != "production":
        users_db.setdefault(user_id, {"id": user_id})
        users_db[user_id].update(updates)
    try:
        ok = sb_update_profile(user_id, updates)
        if ENVIRONMENT == "production" and not ok:
            raise HTTPException(status_code=503, detail="Gamification persistence unavailable")
    except Exception:
        if ENVIRONMENT == "production":
            raise HTTPException(status_code=503, detail="Gamification persistence unavailable")


def add_xp_to_user(user_id: str, xp_amount: int) -> dict:
    user = _user_state(user_id)
    old_level = user.get("level", 1)
    old_xp = user.get("xp", 0)
    new_xp = max(0, old_xp + xp_amount)

    new_level = 1
    xp_threshold = 0
    for lvl in range(2, XP_CONFIG["max_level"] + 1):
        xp_needed = XP_CONFIG["base_xp_to_level"] + (lvl - 2) * XP_CONFIG["xp_increment"]
        xp_threshold += xp_needed
        if new_xp >= xp_threshold:
            new_level = lvl
        else:
            break
    new_level = min(new_level, XP_CONFIG["max_level"])
    updates = {"xp": new_xp, "level": new_level}

    if new_level < XP_CONFIG["max_level"]:
        xp_to_next = XP_CONFIG["base_xp_to_level"] + (new_level - 1) * XP_CONFIG["xp_increment"]
        xp_at_current_level = calculate_xp_for_level(new_level)
        xp_progress = new_xp - xp_at_current_level
        updates["xp_to_next_level"] = xp_to_next
        updates["xp_progress"] = xp_progress
    else:
        updates["xp_to_next_level"] = 0
        updates["xp_progress"] = 0
    _persist_user_fields(user_id, updates)

    level_change = new_level - old_level
    return {"old_level": old_level, "new_level": new_level, "level_change": level_change, "leveled_up": level_change > 0, "leveled_down": level_change < 0, "xp_gained": xp_amount, "total_xp": new_xp, "xp_to_next_level": updates.get("xp_to_next_level", 0)}


def check_community_badges(user_id: str) -> list:
    if user_id not in users_db:
        return []
    user = users_db[user_id]
    earned = user.get("community_badges", [])
    newly_earned = []
    reports_count = user.get("reports_posted", 0)
    upvotes_count = user.get("reports_upvotes_received", 0)
    badge_checks = {1: reports_count >= 1, 2: upvotes_count >= 10, 3: reports_count >= 10, 4: upvotes_count >= 50}
    for badge_id, condition in badge_checks.items():
        if condition and badge_id not in earned:
            earned.append(badge_id)
            newly_earned.append(badge_id)
    users_db[user_id]["community_badges"] = earned
    return newly_earned


# ==================== XP ====================
@router.post("/xp/add")
def add_xp(event: XPEvent, user: dict = Depends(get_current_user)):
    user_id = str(user.get("id") or current_user_id)
    if event.event_id:
        key = f"{user_id}:{event.event_id}"
        if key in processed_xp_events:
            return {"success": True, "message": "XP already processed for this event", "data": {"duplicate": True}}
        processed_xp_events.add(key)
    event_type = event.event_type.lower()
    xp_map = {"photo_report": XP_CONFIG["photo_report"], "offer_redemption": XP_CONFIG["offer_redemption"], "safe_drive": XP_CONFIG["safe_drive"], "consistent_bonus": XP_CONFIG["consistent_driving"], "safety_penalty": XP_CONFIG["safety_score_penalty"]}
    xp_amount = event.amount if event.amount is not None else xp_map.get(event_type, 0)
    if xp_amount == 0:
        return {"success": False, "message": f"Unknown event type: {event_type}"}
    result = add_xp_to_user(user_id, xp_amount)
    message = f"+{xp_amount} XP" if xp_amount > 0 else f"{xp_amount} XP"
    if result.get("leveled_up"):
        message += f" Level up! Now level {result['new_level']}"
    return {"success": True, "message": message, "data": result}


@router.get("/xp/status")
def get_xp_status(user: dict = Depends(get_current_user)):
    user_id = str(user.get("id") or current_user_id)
    user = _user_state(user_id)
    level = user.get("level", 1)
    xp = user.get("xp", 0)
    xp_at_current = calculate_xp_for_level(level)
    xp_to_next = calculate_xp_to_next_level(level) if level < 99 else 0
    xp_progress = xp - xp_at_current
    progress_percent = (xp_progress / xp_to_next * 100) if xp_to_next > 0 else 100
    return {"success": True, "data": {"level": level, "total_xp": xp, "xp_progress": xp_progress, "xp_to_next_level": xp_to_next, "progress_percent": round(progress_percent, 1), "is_max_level": level >= 99}}


@router.get("/xp/config")
def get_xp_config():
    return {"success": True, "data": XP_CONFIG}


# ==================== BADGES ====================
@router.get("/badges")
def get_badges(user: dict = Depends(get_current_user)):
    user_id = str(user.get("id") or current_user_id)
    user = _user_state(user_id)
    earned = set(user.get("badges_earned", []))
    badges = [{**b, "earned": b["id"] in earned} for b in ALL_BADGES]
    return {"success": True, "data": {"badges": badges, "earned_count": len(earned), "total_count": len(ALL_BADGES)}}


@router.get("/badges/categories")
def get_badge_categories():
    categories = {}
    for b in ALL_BADGES:
        cat = b.get("category", "other")
        if cat not in categories:
            categories[cat] = {"name": cat.title(), "count": 0, "badges": []}
        categories[cat]["count"] += 1
        categories[cat]["badges"].append(b)
    return {"success": True, "data": list(categories.values())}


@router.get("/badges/community")
def get_community_badges(user: dict = Depends(get_current_user)):
    user_id = str(user.get("id") or current_user_id)
    user = _user_state(user_id)
    earned_ids = set(user.get("community_badges", []))
    badges = [{**b, "earned": b["id"] in earned_ids} for b in COMMUNITY_BADGES]
    return {"success": True, "data": badges, "earned_count": len(earned_ids), "total_count": len(COMMUNITY_BADGES)}


# ==================== LEADERBOARD ====================
# Top 10 by state; weekly default. Ranked by safety_score (primary), then gems (secondary).
# Each entry includes challenges_participated and badges_count (show on click).
@router.get("/leaderboard")
def get_leaderboard(
    state: str = "all",
    limit: int = Query(default=10, ge=1, le=100),
    time_filter: str = "weekly",
    user: dict = Depends(get_current_user),
):
    all_users = list(users_db.values())
    if state and state.lower() != "all":
        all_users = [u for u in all_users if (u.get("state") or "").upper() == state.upper()]
    # Count challenges participated per user (challenger or opponent)
    def challenges_count(uid):
        return sum(
            1 for c in challenges_db
            if str(c.get("challenger_id")) == str(uid) or str(c.get("opponent_id")) == str(uid)
        )
    # Sort by safety_score desc, then gems desc (tie-break)
    sorted_users = sorted(
        all_users,
        key=lambda x: (x.get("safety_score", 0), x.get("gems", 0)),
        reverse=True,
    )[:limit]
    leaderboard = []
    for i, u in enumerate(sorted_users):
        uid = str(u["id"])
        leaderboard.append({
            "rank": i + 1,
            "id": uid,
            "name": u.get("name", "Driver"),
            "safety_score": u.get("safety_score", 0),
            "level": u.get("level", 1),
            "gems": u.get("gems", 0),
            "total_miles": u.get("total_miles", 0),
            "streak": u.get("streak", 0),
            "state": u.get("state", ""),
            "is_premium": u.get("is_premium", False),
            "badges_count": len(u.get("badges_earned", [])),
            "challenges_participated": challenges_count(uid),
        })
    user_id = str(user.get("id") or current_user_id)
    current_user = _user_state(user_id)
    my_rank = next((e["rank"] for e in leaderboard if str(e["id"]) == user_id), len(leaderboard) + 1)
    # Current user summary for "Your Rank" card
    my_data = {
        "name": current_user.get("name", "Driver"),
        "safety_score": current_user.get("safety_score", 0),
        "gems": current_user.get("gems", 0),
        "level": current_user.get("level", 1),
        "state": current_user.get("state", ""),
    }
    states = sorted(set(u.get("state", "") for u in list(users_db.values()) if u.get("state")))
    return {
        "success": True,
        "data": {
            "leaderboard": leaderboard,
            "my_rank": my_rank,
            "my_score": current_user.get("safety_score", 0),
            "total_drivers": len(all_users),
            "my_data": my_data,
            "states": states,
        },
    }


# ==================== CHALLENGES ====================
@router.get("/challenges")
def get_challenges(limit: int = Query(default=50, ge=1, le=100)):
    return {"success": True, "data": challenges_data[:limit], "count": len(challenges_data[:limit])}


@router.post("/challenges")
def create_challenge(challenge: ChallengeCreate, auth_user: dict = Depends(get_current_user)):
    user_id = str(auth_user.get("id") or current_user_id)
    user = _user_state(user_id)
    opponent = _user_state(str(challenge.opponent_id))
    if not opponent:
        raise HTTPException(status_code=404, detail="Opponent not found")
    if user.get("gems", 0) < challenge.stake:
        raise HTTPException(status_code=400, detail="Not enough gems")
    _persist_user_fields(user_id, {"gems": user.get("gems", 0) - challenge.stake})
    new_challenge = {"id": str(len(challenges_db) + 1), "challenger_id": user_id, "opponent_id": challenge.opponent_id, "challenger_name": user.get("name", "Unknown"), "opponent_name": opponent.get("name", "Unknown"), "stake": challenge.stake, "duration_hours": challenge.duration_hours, "status": "pending", "your_score": user.get("safety_score", 85), "opponent_score": opponent.get("safety_score", 85), "created_at": datetime.now().isoformat(), "ends_at": (datetime.now() + timedelta(hours=challenge.duration_hours)).isoformat()}
    created = sb_create_challenge(new_challenge)
    if created:
        return {"success": True, "message": f"Challenge sent to {opponent.get('name')}!", "data": created}
    if ENVIRONMENT == "production":
        raise HTTPException(status_code=503, detail="Challenge service unavailable")
    challenges_db.append(new_challenge)
    return {"success": True, "message": f"Challenge sent to {opponent.get('name')}!", "data": new_challenge}


@router.post("/challenges/{challenge_id}/accept")
def accept_challenge(challenge_id: str, auth_user: dict = Depends(get_current_user)):
    user_id = str(auth_user.get("id") or current_user_id)
    try:
        db_challenges = sb_get_challenges(limit=200)
        c = next((x for x in db_challenges if str(x.get("id")) == str(challenge_id) and str(x.get("opponent_id")) == user_id), None)
        if c:
            user = _user_state(user_id)
            stake = int(c.get("stake") or 0)
            if user.get("gems", 0) < stake:
                raise HTTPException(status_code=400, detail="Not enough gems")
            _persist_user_fields(user_id, {"gems": user.get("gems", 0) - stake})
            try:
                get_supabase().table("challenges").update({"status": "active"}).eq("id", c.get("id")).execute()
            except Exception:
                pass
            c["status"] = "active"
            return {"success": True, "message": "Challenge accepted!", "data": c}
    except HTTPException:
        raise
    except Exception:
        if ENVIRONMENT == "production":
            raise HTTPException(status_code=503, detail="Challenge service unavailable")
    for c in challenges_db:
        if c["id"] == challenge_id and c["opponent_id"] == user_id:
            user = _user_state(user_id)
            if user.get("gems", 0) < c["stake"]:
                raise HTTPException(status_code=400, detail="Not enough gems")
            _persist_user_fields(user_id, {"gems": user.get("gems", 0) - c["stake"]})
            c["status"] = "active"
            return {"success": True, "message": "Challenge accepted!", "data": c}
    raise HTTPException(status_code=404, detail="Challenge not found")


@router.post("/challenges/{challenge_id}/claim")
def claim_challenge(challenge_id: int, auth_user: dict = Depends(get_current_user)):
    if ENVIRONMENT == "production":
        raise HTTPException(status_code=503, detail="Challenge claim unavailable in production path")
    user_id = str(auth_user.get("id") or current_user_id)
    for ch in challenges_data:
        if ch["id"] == challenge_id and ch.get("completed") and not ch.get("claimed"):
            ch["claimed"] = True
            user = _user_state(user_id)
            new_total = user.get("gems", 0) + ch["gems"]
            _persist_user_fields(user_id, {"gems": new_total})
            return {"success": True, "message": f"Claimed {ch['gems']} gems!", "data": {"gems_earned": ch["gems"], "new_total": new_total}}
    return {"success": False, "message": "Challenge not found or not completed"}


@router.get("/challenges/history")
def get_challenge_history(
    limit: int = Query(default=100, ge=1, le=100),
    user: dict = Depends(get_current_user),
):
    user_id = str(user.get("id") or current_user_id)
    db_challenges = sb_get_challenges(limit=200)
    source = db_challenges if db_challenges else challenges_db
    user_challenges = [c for c in source if str(c.get("challenger_id")) == user_id or str(c.get("opponent_id")) == user_id]
    user_challenges = user_challenges[:limit]
    wins = sum(1 for c in user_challenges if c.get("status") == "won")
    losses = sum(1 for c in user_challenges if c.get("status") == "lost")
    total = wins + losses
    stats = {"total_challenges": len(user_challenges), "wins": wins, "losses": losses, "draws": 0, "win_rate": round((wins / total * 100) if total > 0 else 0), "total_gems_won": wins * 100, "total_gems_lost": losses * 100, "current_streak": min(wins, 3), "best_streak": wins}
    badges = [
        {"id": "first_win", "name": "First Victory", "description": "Win your first challenge", "icon": "trophy", "unlocked": wins >= 1},
        {"id": "win_streak_3", "name": "Hot Streak", "description": "Win 3 in a row", "icon": "flame", "unlocked": stats["best_streak"] >= 3},
        {"id": "total_wins_10", "name": "Champion", "description": "Win 10 total", "icon": "crown", "unlocked": wins >= 10, "progress": wins, "total": 10},
    ]
    return {"success": True, "data": {"challenges": user_challenges, "stats": stats, "badges": badges}}


# ==================== GEMS ====================
@router.post("/gems/generate-route")
def generate_route_gems(req: GemGenerateRequest):
    if ENVIRONMENT == "production":
        raise HTTPException(status_code=503, detail="Gem generation unavailable in production path")
    gems = []
    for i, point in enumerate(req.route_points):
        gem_id = f"gem_{req.trip_id}_{i}_{uuid.uuid4().hex[:4]}"
        offset_lat = random.uniform(-0.002, 0.002)
        offset_lng = random.uniform(-0.002, 0.002)
        gem_type = random.choice(["standard", "standard", "standard", "bonus", "rare"])
        gem_values = {"standard": 5, "bonus": 15, "rare": 50}
        gems.append({"id": gem_id, "lat": point["lat"] + offset_lat, "lng": point["lng"] + offset_lng, "type": gem_type, "value": gem_values[gem_type], "collected": False})
    route_gems_db[req.trip_id] = gems
    return {"success": True, "data": {"trip_id": req.trip_id, "gems": gems, "total_possible": sum(g["value"] for g in gems)}}


@router.post("/gems/collect")
def collect_gem(req: GemCollectRequest, user: dict = Depends(get_current_user)):
    if ENVIRONMENT == "production":
        raise HTTPException(status_code=503, detail="Gem collection unavailable in production path")
    user_id = str(user.get("id") or current_user_id)
    gems = route_gems_db.get(req.trip_id, [])
    gem = next((g for g in gems if g["id"] == req.gem_id and not g["collected"]), None)
    if not gem:
        return {"success": False, "message": "Gem not found or already collected"}
    gem["collected"] = True
    user_profile = _user_state(user_id)
    multiplier = user_profile.get("gem_multiplier", 1)
    earned = gem["value"] * multiplier
    new_total = user_profile.get("gems", 0) + earned
    _persist_user_fields(user_id, {"gems": new_total})
    if req.trip_id not in collected_gems_db:
        collected_gems_db[req.trip_id] = []
    collected_gems_db[req.trip_id].append({"gem_id": req.gem_id, "value": earned})
    return {"success": True, "data": {"gem_id": req.gem_id, "value": earned, "multiplier": multiplier, "new_total": new_total}}


@router.get("/gems/trip-summary/{trip_id}")
def get_trip_gem_summary(trip_id: str):
    if ENVIRONMENT == "production":
        raise HTTPException(status_code=503, detail="Gem trip summary unavailable in production path")
    collected = collected_gems_db.get(trip_id, [])
    total = route_gems_db.get(trip_id, [])
    return {"success": True, "data": {"trip_id": trip_id, "total_gems_on_route": len(total), "gems_collected": len(collected), "total_value": sum(g["value"] for g in collected), "collection_rate": round(len(collected) / max(len(total), 1) * 100, 1)}}


@router.get("/gems/history")
def get_gem_history(user: dict = Depends(get_current_user)):
    user_id = str(user.get("id") or current_user_id)
    user = _user_state(user_id)
    return {"success": True, "data": {"current_balance": user.get("gems", 0), "total_earned": user.get("gems", 0) + 500, "total_spent": 500, "recent_transactions": [{"type": "earned", "amount": 50, "source": "Trip completion", "date": datetime.now().isoformat()}, {"type": "earned", "amount": 100, "source": "Challenge won", "date": (datetime.now() - timedelta(hours=2)).isoformat()}, {"type": "spent", "amount": 500, "source": "Car skin purchase", "date": (datetime.now() - timedelta(days=1)).isoformat()}]}}


# ==================== DRIVING SCORE ====================
@router.get("/driving-score")
def get_driving_score(user: dict = Depends(get_current_user)):
    user_id = str(user.get("id") or current_user_id)
    user = _user_state(user_id)
    base_score = user.get("safety_score", 85)
    metrics = [
        {"id": "speed", "name": "Speed Compliance", "score": min(100, base_score + random.randint(-5, 10)), "trend": random.choice(["up", "stable"]), "description": "Staying within speed limits"},
        {"id": "braking", "name": "Smooth Braking", "score": min(100, base_score + random.randint(-15, 5)), "trend": random.choice(["down", "stable", "up"]), "description": "Gradual, safe braking"},
        {"id": "acceleration", "name": "Smooth Acceleration", "score": min(100, base_score + random.randint(-8, 8)), "trend": "up", "description": "Gradual speed increases"},
        {"id": "following", "name": "Following Distance", "score": min(100, base_score + random.randint(-3, 10)), "trend": "stable", "description": "Safe distance from other cars"},
        {"id": "turns", "name": "Turn Signals", "score": min(100, base_score + random.randint(0, 12)), "trend": "up", "description": "Signaling before turns"},
        {"id": "focus", "name": "Focus Time", "score": min(100, base_score + random.randint(-10, 5)), "trend": random.choice(["stable", "up"]), "description": "Minimal phone distractions"},
    ]
    sorted_metrics = sorted(metrics, key=lambda x: x["score"])
    tip_templates = {"speed": "Try cruise control on highways.", "braking": "Start braking earlier for smoother stops.", "acceleration": "Ease into the gas pedal.", "following": "The 3-second rule is your friend!", "turns": "Keep signaling even when no one's around.", "focus": "Mount your phone for hands-free navigation!"}
    orion_tips = [{"id": str(i + 1), "metric": m["id"], "tip": tip_templates.get(m["id"], "Keep driving safely!"), "priority": "high" if i == 0 else "medium"} for i, m in enumerate(sorted_metrics[:3])]
    overall_score = sum(m["score"] for m in metrics) // len(metrics)
    return {"success": True, "data": {"overall_score": overall_score, "metrics": metrics, "orion_tips": orion_tips, "last_updated": datetime.now().isoformat()}}


# ==================== WEEKLY RECAP ====================
@router.get("/weekly-recap")
def get_weekly_recap(user: dict = Depends(get_current_user)):
    user_id = str(user.get("id") or current_user_id)
    user = _user_state(user_id)
    base_trips = random.randint(8, 15)
    base_miles = base_trips * random.uniform(10, 25)
    stats = {
        "total_trips": base_trips, "total_miles": round(base_miles, 1),
        "total_time_minutes": int(base_miles * 2.5), "gems_earned": random.randint(1500, 3500),
        "xp_earned": random.randint(10000, 20000), "safety_score_avg": user.get("safety_score", 85),
        "safety_score_change": random.randint(-2, 5), "challenges_won": random.randint(0, 3),
        "offers_redeemed": random.randint(2, 6), "streak_days": user.get("safe_drive_streak", 0),
        "rank_change": random.randint(0, 12),
        "highlights": [f"Best safety score: {min(100, user.get('safety_score', 85) + random.randint(2, 8))} on Wednesday", f"Longest trip: {random.randint(25, 60)} miles on Saturday"],
    }
    return {"success": True, "data": stats}


if ENVIRONMENT == "production":
    _LEGACY_PROD_DISABLED = {
        "/api/challenges/{challenge_id}/claim",
        "/api/gems/generate-route",
        "/api/gems/collect",
        "/api/gems/trip-summary/{trip_id}",
    }
    router.routes = [r for r in router.routes if getattr(r, "path", "") not in _LEGACY_PROD_DISABLED]

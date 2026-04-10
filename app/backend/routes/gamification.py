import json
import logging
from typing import Annotated, Any, Optional

from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime, timedelta
from services.demo_random import choice, uniform
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
    sb_insert_friend_challenge,
    sb_list_friend_challenges_for_user,
    sb_get_friend_challenge_for_opponent,
    sb_update_friend_challenge,
)
from services.premium_access import (
    MSG_PREMIUM_REQUIRED,
    profile_row_is_premium,
    user_id_is_premium,
)
from config import ENVIRONMENT
from services.llm_client import chat_completion_model, get_sync_openai_client
import uuid

logger = logging.getLogger(__name__)

MSG_NOT_ENOUGH_GEMS = "Not enough gems"
CurrentUser = Annotated[dict, Depends(get_current_user)]

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


def _normalize_earned_badge_ids(raw: Any) -> set[int]:
    """Parse profiles.badges_earned from Supabase JSONB (list of ints, or legacy shapes)."""
    out: set[int] = set()
    if raw is None:
        return out
    if isinstance(raw, str) and raw.strip():
        try:
            raw = json.loads(raw)
        except (TypeError, json.JSONDecodeError):
            return out
    if not isinstance(raw, list):
        return out
    for x in raw:
        if isinstance(x, dict):
            x = x.get("id") if x.get("id") is not None else x.get("badge_id")
        try:
            out.add(int(x))
        except (TypeError, ValueError):
            continue
    return out


def recompute_profile_level_fields(user_id: str) -> None:
    """Recompute level and XP bar fields from total XP (e.g. after /trips/complete increments xp)."""
    profile = sb_get_profile(user_id) or {}
    new_xp = max(0, int(profile.get("xp") or 0))
    max_lv = int(XP_CONFIG["max_level"])
    new_level = 1
    xp_threshold = 0
    for lvl in range(2, max_lv + 1):
        xp_needed = XP_CONFIG["base_xp_to_level"] + (lvl - 2) * XP_CONFIG["xp_increment"]
        xp_threshold += xp_needed
        if new_xp >= xp_threshold:
            new_level = lvl
        else:
            break
    new_level = min(new_level, max_lv)
    if new_level < max_lv:
        xp_to_next = XP_CONFIG["base_xp_to_level"] + (new_level - 1) * XP_CONFIG["xp_increment"]
        xp_at_current_level = calculate_xp_for_level(new_level)
        xp_progress = max(0, new_xp - xp_at_current_level)
        updates = {"level": new_level, "xp_to_next_level": int(xp_to_next), "xp_progress": int(xp_progress)}
    else:
        updates = {"level": new_level, "xp_to_next_level": 0, "xp_progress": 0}
    _persist_user_fields(user_id, updates)


def sync_earned_driver_badges(user_id: str) -> None:
    """Unlock ALL_BADGES when profile stats meet requirements; writes profiles.badges_earned."""
    profile = sb_get_profile(user_id) or {}
    user_row = _user_state(user_id)
    merged: dict[str, Any] = {**dict(profile), **dict(user_row)}
    earned_prev = _normalize_earned_badge_ids(profile.get("badges_earned") or [])
    new_set = set(earned_prev)
    for b in ALL_BADGES:
        bid = int(b["id"])
        prog = _badge_progress_pct(b, profile, merged, bid in new_set)
        if prog >= 100:
            new_set.add(bid)
    if new_set == earned_prev:
        return
    _persist_user_fields(user_id, {"badges_earned": sorted(new_set)})


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
    try:
        sync_earned_driver_badges(user_id)
    except Exception:
        logger.warning("sync_earned_driver_badges after XP failed", exc_info=True)

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
@router.post("/xp/add", responses={503: {"description": "Gamification persistence unavailable"}})
def add_xp(event: XPEvent, user: CurrentUser):
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
def get_xp_status(user: CurrentUser):
    user_id = str(user.get("id") or current_user_id)
    user = _user_state(user_id)
    level = user.get("level", 1)
    xp = user.get("xp", 0)
    xp_at_current = calculate_xp_for_level(level)
    max_lv = int(XP_CONFIG.get("max_level", 100))
    xp_to_next = calculate_xp_to_next_level(level) if level < max_lv else 0
    xp_progress = xp - xp_at_current
    progress_percent = (xp_progress / xp_to_next * 100) if xp_to_next > 0 else 100
    return {"success": True, "data": {"level": level, "total_xp": xp, "xp_progress": xp_progress, "xp_to_next_level": xp_to_next, "progress_percent": round(progress_percent, 1), "is_max_level": level >= max_lv}}


@router.get("/xp/config")
def get_xp_config():
    return {"success": True, "data": XP_CONFIG}


def _badge_progress_pct(badge: dict, profile: dict, user: dict, earned: bool) -> int:
    if earned:
        return 100
    merged: dict[str, Any] = {**(user or {}), **(profile or {})}
    rtype = (badge.get("requirement_type") or "miles").lower()
    req = float(badge.get("requirement") or 1)
    if req <= 0:
        return 0
    if rtype == "miles":
        cur = float(merged.get("total_miles") or 0)
    elif rtype == "trips":
        cur = float(merged.get("total_trips") or 0)
    elif rtype == "gems":
        cur = float(merged.get("gems") or 0)
    elif rtype == "safety":
        cur = float(merged.get("safety_score") or 0)
    elif rtype == "streak":
        cur = float(merged.get("safe_drive_streak") or merged.get("streak") or 0)
    elif rtype == "level":
        cur = float(merged.get("level") or 1)
    else:
        cur = 0.0
    return int(max(0, min(100, round(100 * cur / req))))


# ==================== BADGES ====================
@router.get("/badges")
def get_badges(user: CurrentUser):
    user_id = str(user.get("id") or current_user_id)
    try:
        sync_earned_driver_badges(user_id)
    except Exception:
        logger.warning("sync_earned_driver_badges on get_badges failed", exc_info=True)
    user_row = _user_state(user_id)
    profile = {}
    try:
        profile = sb_get_profile(user_id) or {}
    except Exception:
        profile = {}
    earned = _normalize_earned_badge_ids(user_row.get("badges_earned") or [])
    badges = []
    for b in ALL_BADGES:
        is_earned = int(b["id"]) in earned
        progress = _badge_progress_pct(b, profile, user_row, is_earned)
        badges.append({
            **b,
            "description": b.get("desc") or "",
            "earned": is_earned,
            "progress": progress,
        })
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
def get_community_badges(user: CurrentUser):
    user_id = str(user.get("id") or current_user_id)
    user = _user_state(user_id)
    earned_ids = set(user.get("community_badges", []))
    badges = [{**b, "earned": b["id"] in earned_ids} for b in COMMUNITY_BADGES]
    return {"success": True, "data": badges, "earned_count": len(earned_ids), "total_count": len(COMMUNITY_BADGES)}


# ==================== CHALLENGES ====================
_ALLOWED_CHALLENGE_TYPES = frozenset({"safest_drive", "longest_trip", "most_gems_earned"})


def _normalize_challenge_type(raw: Optional[str]) -> str:
    s = (raw or "safest_drive").strip().lower().replace("-", "_").replace(" ", "_")
    if s in _ALLOWED_CHALLENGE_TYPES:
        return s
    if "longest" in s:
        return "longest_trip"
    if "gem" in s:
        return "most_gems_earned"
    return "safest_drive"


def _map_friend_challenge_for_viewer(r: dict, viewer_id: str) -> dict:
    """Map DB row to API shape with viewer-relative opponent name, scores, and won/lost/draw."""
    stake = int(r.get("stake_gems") or 0)
    ch_id = str(r.get("challenger_id") or "")
    op_id = str(r.get("opponent_id") or "")
    vid = str(viewer_id or "").strip()
    is_ch = vid == ch_id
    opp_name = (r.get("opponent_name") or "Friend") if is_ch else (r.get("challenger_name") or "Friend")
    ch_s = int(r.get("your_score") or 0)
    op_s = int(r.get("opponent_score") or 0)
    my_score = ch_s if is_ch else op_s
    their_score = op_s if is_ch else ch_s
    raw_status = str(r.get("status") or "")
    display_status = raw_status
    if raw_status == "completed":
        w = r.get("winner_id")
        if w:
            display_status = "won" if str(w) == vid else "lost"
        else:
            display_status = "draw"

    can_accept = raw_status == "pending" and vid == op_id
    pending_outgoing = raw_status == "pending" and vid == ch_id

    return {
        "id": str(r.get("id")),
        "challenger_id": ch_id,
        "opponent_id": op_id,
        "challenger_name": r.get("challenger_name"),
        "opponent_name": opp_name,
        "stake": stake,
        "stake_gems": stake,
        "duration_hours": int(r.get("duration_hours") or 72),
        "challenge_type": r.get("challenge_type"),
        "custom_message": r.get("custom_message"),
        "status": display_status,
        "raw_status": raw_status,
        "can_accept": can_accept,
        "pending_outgoing": pending_outgoing,
        "your_score": my_score,
        "opponent_score": their_score,
        "created_at": r.get("created_at"),
        "ends_at": r.get("ends_at"),
    }


@router.get("/challenges")
def get_challenges(limit: Annotated[int, Query(ge=1, le=100)] = 50):
    return {"success": True, "data": challenges_data[:limit], "count": len(challenges_data[:limit])}


@router.post("/challenges", responses={400: {"description": MSG_NOT_ENOUGH_GEMS}, 404: {"description": "Opponent not found"}, 503: {"description": "Challenge service unavailable"}})
def create_challenge(challenge: ChallengeCreate, auth_user: CurrentUser):
    user_id = str(auth_user.get("id") or current_user_id).strip()
    opponent_id = str(challenge.opponent_id).strip()
    if opponent_id == user_id:
        raise HTTPException(status_code=400, detail="Cannot challenge yourself")
    user = _user_state(user_id)
    opponent = _user_state(opponent_id)
    if not opponent:
        raise HTTPException(status_code=404, detail="Opponent not found")
    profile_opp = sb_get_profile(opponent_id) or {}
    if ENVIRONMENT == "production" and not profile_opp.get("id"):
        raise HTTPException(status_code=404, detail="Opponent not found")
    stake = int(challenge.stake)
    cg = int(user.get("gems", 0) or 0)
    if cg < stake:
        raise HTTPException(status_code=400, detail=MSG_NOT_ENOUGH_GEMS)

    msg = challenge.custom_message
    if msg is not None:
        msg = str(msg).strip()
        if not msg:
            msg = None
        elif len(msg) > 220:
            msg = msg[:220]

    ctype = _normalize_challenge_type(challenge.challenge_type)
    duration = int(challenge.duration_hours)
    ends_at = (datetime.now() + timedelta(hours=duration)).isoformat()
    ch_name = str(user.get("name") or user.get("full_name") or "Driver")
    op_name = str(opponent.get("name") or opponent.get("full_name") or profile_opp.get("full_name") or profile_opp.get("name") or "Friend")

    new_gems = cg - stake
    _persist_user_fields(user_id, {"gems": new_gems})
    payload = {
        "challenger_id": user_id,
        "opponent_id": opponent_id,
        "stake_gems": stake,
        "duration_hours": duration,
        "challenge_type": ctype,
        "custom_message": msg,
        "status": "pending",
        "challenger_name": ch_name[:120],
        "opponent_name": op_name[:120],
        "your_score": int(user.get("safety_score", 85) or 85),
        "opponent_score": int(opponent.get("safety_score", 85) or 85),
        "ends_at": ends_at,
    }
    created = sb_insert_friend_challenge(payload)
    if created:
        out = {**created, "stake": stake, "challenger_gems_remaining": new_gems}
        return {"success": True, "message": f"Challenge sent to {op_name}!", "data": out}

    _persist_user_fields(user_id, {"gems": cg})
    if ENVIRONMENT == "production":
        raise HTTPException(status_code=503, detail="Challenge service unavailable")

    nid = str(len(challenges_db) + 1)
    new_challenge = {
        "id": nid,
        "challenger_id": user_id,
        "opponent_id": opponent_id,
        "challenger_name": ch_name,
        "opponent_name": op_name,
        "stake": stake,
        "stake_gems": stake,
        "duration_hours": duration,
        "challenge_type": ctype,
        "custom_message": msg,
        "status": "pending",
        "your_score": payload["your_score"],
        "opponent_score": payload["opponent_score"],
        "created_at": datetime.now().isoformat(),
        "ends_at": ends_at,
    }
    challenges_db.append(new_challenge)
    return {
        "success": True,
        "message": f"Challenge sent to {op_name}!",
        "data": {**new_challenge, "challenger_gems_remaining": new_gems},
    }


def _deduct_stake_and_activate(user_id: str, challenge: dict) -> dict:
    """Deduct the stake from the user's gems, mark the challenge active, and return the response."""
    user = _user_state(user_id)
    stake = int(challenge.get("stake_gems") or challenge.get("stake") or 0)
    if user.get("gems", 0) < stake:
        raise HTTPException(status_code=400, detail=MSG_NOT_ENOUGH_GEMS)
    _persist_user_fields(user_id, {"gems": user.get("gems", 0) - stake})
    challenge["status"] = "active"
    return {"success": True, "message": "Challenge accepted!", "data": challenge}


@router.post("/challenges/{challenge_id}/accept", responses={400: {"description": MSG_NOT_ENOUGH_GEMS}, 404: {"description": "Challenge not found"}, 503: {"description": "Challenge service unavailable"}})
def accept_challenge(challenge_id: str, auth_user: CurrentUser):
    user_id = str(auth_user.get("id") or current_user_id)
    row = sb_get_friend_challenge_for_opponent(challenge_id, user_id)
    if row and str(row.get("status")) == "pending":
        stake = int(row.get("stake_gems") or 0)
        acc = _user_state(user_id)
        ag = int(acc.get("gems", 0) or 0)
        if ag < stake:
            raise HTTPException(status_code=400, detail=MSG_NOT_ENOUGH_GEMS)
        new_g = ag - stake
        _persist_user_fields(user_id, {"gems": new_g})
        ok = sb_update_friend_challenge(str(row.get("id")), {"status": "active"}, expected_status="pending")
        if not ok:
            _persist_user_fields(user_id, {"gems": ag})
            raise HTTPException(status_code=503, detail="Challenge service unavailable")
        out = _map_friend_challenge_for_viewer({**row, "status": "active"}, user_id)
        out["opponent_gems_remaining"] = new_g
        return {"success": True, "message": "Challenge accepted!", "data": out}
    try:
        db_challenges = sb_get_challenges(limit=200)
        c = next((x for x in db_challenges if str(x.get("id")) == str(challenge_id) and str(x.get("opponent_id")) == user_id), None)
        if c:
            stake = int(c.get("stake_gems") or c.get("stake") or 0)
            c = {**c, "stake": stake, "stake_gems": stake}
            result = _deduct_stake_and_activate(user_id, c)
            try:
                get_supabase().table("challenges").update({"status": "active"}).eq("id", c.get("id")).eq(
                    "opponent_id", user_id
                ).execute()
            except Exception as e:
                logger.warning("failed to update challenge status to active: %s", e)
            return result
    except HTTPException:
        raise
    except Exception:
        if ENVIRONMENT == "production":
            raise HTTPException(status_code=503, detail="Challenge service unavailable")
    for c in challenges_db:
        if str(c.get("id")) == str(challenge_id) and str(c.get("opponent_id")) == user_id:
            stake = int(c.get("stake_gems") or c.get("stake") or 0)
            cc = {**c, "stake": stake, "stake_gems": stake}
            return _deduct_stake_and_activate(user_id, cc)
    raise HTTPException(status_code=404, detail="Challenge not found")


@router.post("/challenges/{challenge_id}/claim", responses={503: {"description": "Challenge claim unavailable in production path"}})
def claim_challenge(challenge_id: int, auth_user: CurrentUser):
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
    user: CurrentUser,
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
):
    from services.friend_challenge_service import resolve_expired_active_friend_challenges

    user_id = str(user.get("id") or current_user_id)
    try:
        resolve_expired_active_friend_challenges()
    except Exception:
        logger.warning("resolve_expired_active_friend_challenges failed", exc_info=True)
    friend_rows = sb_list_friend_challenges_for_user(user_id, limit)
    user_challenges = [_map_friend_challenge_for_viewer(r, user_id) for r in friend_rows]
    if not user_challenges:
        db_challenges = sb_get_challenges(limit=200)
        source = db_challenges if db_challenges else challenges_db
        legacy = [c for c in source if str(c.get("challenger_id")) == user_id or str(c.get("opponent_id")) == user_id]
        user_challenges = [_map_friend_challenge_for_viewer(c, user_id) for c in legacy[:limit]]
    wins = sum(1 for c in user_challenges if c.get("status") == "won")
    losses = sum(1 for c in user_challenges if c.get("status") == "lost")
    draws = sum(1 for c in user_challenges if c.get("status") == "draw")
    total = wins + losses + draws
    stats = {
        "total_challenges": len(user_challenges),
        "wins": wins,
        "losses": losses,
        "draws": draws,
        "win_rate": round((wins / total * 100) if total > 0 else 0),
        "total_gems_won": wins * 100,
        "total_gems_lost": losses * 100,
        "current_streak": min(wins, 3),
        "best_streak": wins,
    }
    badges = [
        {"id": "first_win", "name": "First Victory", "description": "Win your first challenge", "icon": "trophy", "unlocked": wins >= 1},
        {"id": "win_streak_3", "name": "Hot Streak", "description": "Win 3 in a row", "icon": "flame", "unlocked": stats["best_streak"] >= 3},
        {"id": "total_wins_10", "name": "Champion", "description": "Win 10 total", "icon": "crown", "unlocked": wins >= 10, "progress": wins, "total": 10},
    ]
    return {"success": True, "data": {"challenges": user_challenges, "stats": stats, "badges": badges}}


@router.get("/rewards/summary")
def get_rewards_summary(user: CurrentUser):
    """Single payload for driver Rewards top cards (gems, trips, badges, multiplier)."""
    user_id = str(user.get("user_id") or user.get("id") or current_user_id).strip()
    try:
        sync_earned_driver_badges(user_id)
    except Exception:
        logger.warning("sync_earned_driver_badges on rewards/summary failed", exc_info=True)
    profile = sb_get_profile(user_id) or {}
    gems = int(profile.get("gems") or 0)
    total_trips = int(profile.get("total_trips") or 0)
    is_premium = profile_row_is_premium(profile)
    user_row = _user_state(user_id)
    earned = _normalize_earned_badge_ids(user_row.get("badges_earned") or [])
    badges_earned = len(earned)
    badges_total = len(ALL_BADGES)
    return {
        "success": True,
        "data": {
            "gems": gems,
            "total_trips": total_trips,
            "badges_earned": badges_earned,
            "badges_total": badges_total,
            "gem_multiplier_label": "2x" if is_premium else "1x",
            "is_premium": is_premium,
        },
    }


# ==================== GEMS ====================
@router.post("/gems/generate-route", responses={503: {"description": "Gem generation unavailable in production path"}})
def generate_route_gems(req: GemGenerateRequest):
    if ENVIRONMENT == "production":
        raise HTTPException(status_code=503, detail="Gem generation unavailable in production path")
    gems = []
    for i, point in enumerate(req.route_points):
        gem_id = f"gem_{req.trip_id}_{i}_{uuid.uuid4().hex[:4]}"
        offset_lat = uniform(-0.002, 0.002)
        offset_lng = uniform(-0.002, 0.002)
        gem_type = choice(["standard", "standard", "standard", "bonus", "rare"])
        gem_values = {"standard": 5, "bonus": 15, "rare": 50}
        gems.append({"id": gem_id, "lat": point["lat"] + offset_lat, "lng": point["lng"] + offset_lng, "type": gem_type, "value": gem_values[gem_type], "collected": False})
    route_gems_db[req.trip_id] = gems
    return {"success": True, "data": {"trip_id": req.trip_id, "gems": gems, "total_possible": sum(g["value"] for g in gems)}}


@router.post("/gems/collect", responses={503: {"description": "Gem collection unavailable in production path"}})
def collect_gem(req: GemCollectRequest, user: CurrentUser):
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


@router.get("/gems/trip-summary/{trip_id}", responses={503: {"description": "Gem trip summary unavailable in production path"}})
def get_trip_gem_summary(trip_id: str):
    if ENVIRONMENT == "production":
        raise HTTPException(status_code=503, detail="Gem trip summary unavailable in production path")
    collected = collected_gems_db.get(trip_id, [])
    total = route_gems_db.get(trip_id, [])
    return {"success": True, "data": {"trip_id": trip_id, "total_gems_on_route": len(total), "gems_collected": len(collected), "total_value": sum(g["value"] for g in collected), "collection_rate": round(len(collected) / max(len(total), 1) * 100, 1)}}


@router.get("/gems/history")
def get_gem_history(user: CurrentUser):
    user_id = str(user.get("user_id") or user.get("id") or current_user_id).strip()
    try:
        sb = get_supabase()
        profile = sb_get_profile(user_id)
        balance = int((profile or {}).get("gems", 0))

        ledger_rows: list = []
        try:
            from services.wallet_ledger import fetch_recent_ledger

            ledger_rows = fetch_recent_ledger(sb, user_id, limit=50)
        except Exception:
            ledger_rows = []

        # Driver gem activity is sourced only from `wallet_transactions` (append-only ledger).
        _LEDGER_SKIP_TYPES = frozenset({"leaderboard", "weekly_leaderboard", "global_leaderboard"})

        def _ledger_credit_source(tx_type: str) -> str:
            if tx_type == "trip_drive":
                return "Trip reward"
            if tx_type == "challenge_reward":
                return "Challenge reward"
            if tx_type in ("referral", "referral_bonus"):
                return "Referral bonus"
            return tx_type.replace("_", " ").strip().title() or "Gems earned"

        def _ledger_debit_source(tx_type: str) -> str:
            if tx_type == "offer_redeem":
                return "Offer redemption"
            return tx_type.replace("_", " ").strip().title() or "Gems spent"

        transactions = []
        activity_source = "wallet_transactions"
        for row in ledger_rows:
            tx_type = str(row.get("tx_type") or "").strip()
            if tx_type in _LEDGER_SKIP_TYPES:
                continue
            direction = str(row.get("direction") or "")
            amt = int(row.get("amount") or 0)
            rid = str(row.get("id") or "")
            md = row.get("metadata")
            if md is not None and not isinstance(md, dict):
                try:
                    md = json.loads(md) if isinstance(md, str) else {}
                except Exception:
                    md = {}
            if md is None:
                md = {}
            base_tx = {
                "id": rid,
                "tx_type": tx_type,
                "reference_type": row.get("reference_type"),
                "reference_id": str(row.get("reference_id") or "") if row.get("reference_id") is not None else None,
                "balance_before": row.get("balance_before"),
                "balance_after": row.get("balance_after"),
                "date": row.get("created_at", ""),
                "metadata": md,
            }
            if direction == "credit":
                transactions.append({**base_tx, "type": "earned", "amount": amt, "source": _ledger_credit_source(tx_type)})
            elif direction == "debit":
                transactions.append({**base_tx, "type": "spent", "amount": amt, "source": _ledger_debit_source(tx_type)})
        transactions.sort(key=lambda x: x.get("date", ""), reverse=True)

        total_earned = sum(t["amount"] for t in transactions if t["type"] == "earned")
        total_spent = sum(t["amount"] for t in transactions if t["type"] == "spent")
        return {
            "success": True,
            "data": {
                "current_balance": balance,
                "total_earned": total_earned,
                "total_spent": total_spent,
                "recent_transactions": transactions[:20],
                "activity_source": activity_source,
            },
        }
    except Exception:
        if ENVIRONMENT == "production":
            raise
        u = _user_state(user_id)
        return {
            "success": True,
            "data": {
                "current_balance": u.get("gems", 0),
                "total_earned": 0,
                "total_spent": 0,
                "recent_transactions": [],
                "activity_source": "demo_fallback",
            },
        }


@router.get("/gems/activity/{wallet_tx_id}")
def get_gem_activity_detail(wallet_tx_id: str, user: CurrentUser):
    """Hydrate a single wallet_transactions row for Recent Gem Activity detail UI."""
    from services.offer_categories import attach_offer_category_fields
    from services.wallet_ledger import fetch_ledger_row_for_user

    user_id = str(user.get("user_id") or user.get("id") or current_user_id).strip()
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    sb = get_supabase()
    row = fetch_ledger_row_for_user(sb, user_id=user_id, tx_id=wallet_tx_id)
    if not row:
        raise HTTPException(status_code=404, detail="Activity not found")

    tx_type = str(row.get("tx_type") or "")
    ref_type = str(row.get("reference_type") or "")
    ref_id = str(row.get("reference_id") or "").strip()
    md = row.get("metadata") or {}
    if not isinstance(md, dict):
        try:
            md = json.loads(md) if isinstance(md, str) else {}
        except Exception:
            md = {}

    direction = str(row.get("direction") or "")
    amt = int(row.get("amount") or 0)
    base = {
        "wallet_tx_id": str(row.get("id")),
        "tx_type": tx_type,
        "direction": direction,
        "amount": amt,
        "balance_before": row.get("balance_before"),
        "balance_after": row.get("balance_after"),
        "created_at": row.get("created_at"),
        "reference_type": ref_type,
        "reference_id": ref_id or None,
        "metadata": md,
    }

    if tx_type == "offer_redeem" and ref_id:
        rrows = (
            sb.table("redemptions").select("*").eq("id", ref_id).limit(1).execute().data
            or []
        )
        redemption = dict(rrows[0]) if rrows else {}
        oid = str(redemption.get("offer_id") or md.get("offer_id") or "")
        offer: dict = {}
        if oid:
            orows = sb.table("offers").select("*").eq("id", oid).limit(1).execute().data or []
            if orows:
                offer = dict(orows[0])
                attach_offer_category_fields(offer)
        return {
            "success": True,
            "data": {
                "kind": "offer_redemption",
                "base": base,
                "redemption": redemption,
                "offer": offer,
            },
        }

    if tx_type == "trip_drive" and ref_type == "trip" and ref_id:
        trows = (
            sb.table("trips")
            .select("*")
            .eq("id", ref_id)
            .eq("profile_id", user_id)
            .limit(1)
            .execute()
            .data
            or []
        )
        trip = dict(trows[0]) if trows else None
        return {
            "success": True,
            "data": {
                "kind": "trip_reward",
                "base": base,
                "trip": trip,
                "ledger_metadata": md,
            },
        }

    return {
        "success": True,
        "data": {
            "kind": "generic",
            "base": base,
            "ledger_metadata": md,
        },
    }


# ==================== DRIVING SCORE ====================
@router.get("/driving-score")
def get_driving_score(user: CurrentUser):
    user_id = str(user.get("id") or current_user_id)
    if not user_id_is_premium(user_id):
        raise HTTPException(status_code=403, detail=MSG_PREMIUM_REQUIRED)
    tip_templates = {"speed": "Try cruise control on highways.", "braking": "Start braking earlier for smoother stops.", "acceleration": "Ease into the gas pedal.", "following": "The 3-second rule is your friend!", "turns": "Keep signaling even when no one's around.", "focus": "Mount your phone for hands-free navigation!"}
    try:
        sb = get_supabase()
        profile = sb_get_profile(user_id) or {}
        base_score = int(profile.get("safety_score", 0))
        is_premium = profile_row_is_premium(profile)

        trips = sb.table("trips").select("safety_score, hard_braking_events, speeding_events, created_at").eq("profile_id", user_id).order("created_at", desc=True).limit(50).execute()
        rows = trips.data or []

        if not rows:
            metrics = [
                {"id": "speed", "name": "Speed Compliance", "score": 0, "trend": "stable", "description": "Staying within speed limits"},
                {"id": "braking", "name": "Smooth Braking", "score": 0, "trend": "stable", "description": "Gradual, safe braking"},
                {"id": "acceleration", "name": "Smooth Acceleration", "score": 0, "trend": "stable", "description": "Gradual speed increases"},
                {"id": "following", "name": "Following Distance", "score": 0, "trend": "stable", "description": "Safe distance from other cars"},
                {"id": "turns", "name": "Turn Signals", "score": 0, "trend": "stable", "description": "Signaling before turns"},
                {"id": "focus", "name": "Focus Time", "score": 0, "trend": "stable", "description": "Minimal phone distractions"},
            ]
            return {"success": True, "data": {"overall_score": base_score, "metrics": metrics, "orion_tips": [], "last_updated": datetime.now().isoformat(), "no_data": True, "premium_insights": is_premium}}

        avg_safety = sum(float(r.get("safety_score", 0)) for r in rows) / len(rows)
        avg_braking = sum(int(r.get("hard_braking_events", 0)) for r in rows) / len(rows)
        avg_speeding = sum(int(r.get("speeding_events", 0)) for r in rows) / len(rows)
        speed_score = max(0, min(100, int(100 - avg_speeding * 10)))
        braking_score = max(0, min(100, int(100 - avg_braking * 8)))

        metrics = [
            {"id": "speed", "name": "Speed Compliance", "score": speed_score, "trend": "stable", "description": "Staying within speed limits"},
            {"id": "braking", "name": "Smooth Braking", "score": braking_score, "trend": "stable", "description": "Gradual, safe braking"},
            {"id": "acceleration", "name": "Smooth Acceleration", "score": int(avg_safety), "trend": "stable", "description": "Gradual speed increases"},
            {"id": "following", "name": "Following Distance", "score": min(100, int(avg_safety) + 5), "trend": "stable", "description": "Safe distance from other cars"},
            {"id": "turns", "name": "Turn Signals", "score": min(100, int(avg_safety) + 3), "trend": "stable", "description": "Signaling before turns"},
            {"id": "focus", "name": "Focus Time", "score": int(avg_safety), "trend": "stable", "description": "Minimal phone distractions"},
        ]
        sorted_metrics = sorted(metrics, key=lambda x: x["score"])
        orion_tips = []
        if is_premium:
            orion_tips = [{"id": str(i + 1), "metric": m["id"], "tip": tip_templates.get(m["id"], "Keep driving safely!"), "priority": "high" if i == 0 else "medium"} for i, m in enumerate(sorted_metrics[:3])]
        overall_score = base_score or (sum(m["score"] for m in metrics) // len(metrics))
        return {"success": True, "data": {"overall_score": overall_score, "metrics": metrics, "orion_tips": orion_tips, "last_updated": datetime.now().isoformat(), "premium_insights": is_premium}}
    except Exception:
        if ENVIRONMENT == "production":
            raise
        u = _user_state(user_id)
        base_score = u.get("safety_score", 85)
        metrics = [{"id": k, "name": k.title(), "score": base_score, "trend": "stable", "description": ""} for k in ("speed", "braking", "acceleration", "following", "turns", "focus")]
        return {"success": True, "data": {"overall_score": base_score, "metrics": metrics, "orion_tips": [], "last_updated": datetime.now().isoformat(), "premium_insights": False}}


def _llm_orion_tracking_commentary(payload: dict) -> Optional[str]:
    """One-sentence Orion recap from real aggregates; None if LLM unavailable or fails."""
    client = get_sync_openai_client()
    if client is None:
        return None
    try:
        response = client.chat.completions.create(
            model=chat_completion_model(),
            temperature=0.35,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are Orion, SnapRoad's in-car coach. Given ONLY JSON trip aggregates, "
                        "return strict JSON {\"commentary\": \"...\"} where commentary is ONE short sentence, "
                        "no quotes inside, encouraging and specific to the numbers (hard braking, speeding events, miles, trips)."
                    ),
                },
                {"role": "user", "content": json.dumps(payload)},
            ],
            response_format={"type": "json_object"},
        )
        content = (response.choices[0].message.content or "").strip()
        parsed = json.loads(content) if content else {}
        c = parsed.get("commentary")
        if isinstance(c, str) and c.strip():
            return c.strip()
    except Exception as exc:
        logger.warning("orion tracking commentary failed: %s", exc)
    return None


# ==================== WEEKLY RECAP / TRACKING RANGE ====================
@router.get("/weekly-recap")
def get_weekly_recap(
    user: CurrentUser,
    days: Annotated[int, Query(ge=1, le=90)] = 7,
    start: Annotated[Optional[str], Query(description="ISO8601 start; use with end")] = None,
    end: Annotated[Optional[str], Query(description="ISO8601 end")] = None,
):
    user_id = str(user.get("id") or current_user_id)
    if not user_id_is_premium(user_id):
        raise HTTPException(status_code=403, detail=MSG_PREMIUM_REQUIRED)
    try:
        sb = get_supabase()
        profile = sb_get_profile(user_id) or {}
        is_premium = profile_row_is_premium(profile)

        if start and end:
            trip_q = (
                sb.table("trips")
                .select(
                    "distance_miles, duration_minutes, gems_earned, xp_earned, safety_score, created_at, hard_braking_events, speeding_events"
                )
                .eq("profile_id", user_id)
                .gte("created_at", start)
                .lte("created_at", end)
            )
            trip_res = trip_q.execute()
            redemption_res = (
                sb.table("redemptions")
                .select("id")
                .eq("user_id", user_id)
                .gte("created_at", start)
                .lte("created_at", end)
                .execute()
            )
        else:
            cutoff = (datetime.now() - timedelta(days=days)).isoformat()
            trip_res = (
                sb.table("trips")
                .select(
                    "distance_miles, duration_minutes, gems_earned, xp_earned, safety_score, created_at, hard_braking_events, speeding_events"
                )
                .eq("profile_id", user_id)
                .gte("created_at", cutoff)
                .execute()
            )
            redemption_res = sb.table("redemptions").select("id").eq("user_id", user_id).gte("created_at", cutoff).execute()

        trips = trip_res.data or []
        offers_redeemed = len(redemption_res.data or [])

        total_miles = sum(float(t.get("distance_miles", 0)) for t in trips)
        total_time = sum(int(t.get("duration_minutes", 0)) for t in trips)
        gems_earned = sum(int(t.get("gems_earned", 0)) for t in trips)
        xp_earned = sum(int(t.get("xp_earned", 0)) for t in trips)
        safety_scores = [float(t["safety_score"]) for t in trips if t.get("safety_score")]
        safety_avg = int(sum(safety_scores) / len(safety_scores)) if safety_scores else int(profile.get("safety_score", 0))

        best_safety = max(safety_scores) if safety_scores else 0
        longest = max((float(t.get("distance_miles", 0)) for t in trips), default=0)
        hard_sum = sum(int(t.get("hard_braking_events") or 0) for t in trips)
        speed_sum = sum(int(t.get("speeding_events") or 0) for t in trips)
        highlights = []
        if best_safety:
            highlights.append(f"Best safety score: {int(best_safety)}")
        if longest:
            highlights.append(f"Longest trip: {round(longest, 1)} miles")

        orion_commentary: Optional[str] = None
        if is_premium and trips:
            payload = {
                "trips": len(trips),
                "miles_rounded": round(total_miles, 1),
                "safety_avg": safety_avg,
                "hard_braking_events_total": hard_sum,
                "speeding_events_total": speed_sum,
                "gems_earned": gems_earned,
            }
            orion_commentary = _llm_orion_tracking_commentary(payload)

        stats = {
            "total_trips": len(trips),
            "total_miles": round(total_miles, 1),
            "total_time_minutes": total_time,
            "gems_earned": gems_earned,
            "xp_earned": xp_earned,
            "safety_score_avg": safety_avg,
            "offers_redeemed": offers_redeemed,
            "streak_days": int(profile.get("safe_drive_streak", 0)),
            "highlights": highlights,
            "range_days": days if not (start and end) else None,
            "orion_commentary": orion_commentary,
            "premium_insights": is_premium,
            "behavior": {"hard_braking_events_total": hard_sum, "speeding_events_total": speed_sum},
        }
        return {"success": True, "data": stats}
    except Exception:
        if ENVIRONMENT == "production":
            raise
        u = _user_state(user_id)
        return {
            "success": True,
            "data": {
                "total_trips": 0,
                "total_miles": 0,
                "total_time_minutes": 0,
                "gems_earned": 0,
                "xp_earned": 0,
                "safety_score_avg": u.get("safety_score", 0),
                "offers_redeemed": 0,
                "streak_days": u.get("safe_drive_streak", 0),
                "highlights": [],
                "orion_commentary": None,
                "premium_insights": False,
                "behavior": {"hard_braking_events_total": 0, "speeding_events_total": 0},
            },
        }


@router.get("/profile/tracking-summary")
def get_tracking_summary(
    user: CurrentUser,
    days: Annotated[int, Query(ge=1, le=90)] = 7,
    start: Annotated[Optional[str], Query()] = None,
    end: Annotated[Optional[str], Query()] = None,
):
    """Alias for range-aware recap stats (same payload as /api/weekly-recap)."""
    return get_weekly_recap(user, days=days, start=start, end=end)


if ENVIRONMENT == "production":
    _LEGACY_PROD_DISABLED = {
        "/api/challenges/{challenge_id}/claim",
        "/api/gems/generate-route",
        "/api/gems/collect",
        "/api/gems/trip-summary/{trip_id}",
    }
    router.routes = [r for r in router.routes if getattr(r, "path", "") not in _LEGACY_PROD_DISABLED]

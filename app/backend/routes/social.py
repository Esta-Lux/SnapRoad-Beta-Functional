import logging
import re

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from typing import Annotated, Optional
from datetime import datetime, timedelta, timezone
from models.schemas import (
    FriendRequest,
    FriendCategoryCreateBody,
    FriendCategoryUpdateBody,
    FriendCategoryMemberBody,
    RoadReport,
    LocationUpdateBody,
    LocationSharingBody,
    LocationTagBody,
    ConvoyStartBody,
)
from services.mock_data import (
    users_db, current_user_id, road_reports_db, XP_CONFIG,
)
from routes.gamification import add_xp_to_user, check_community_badges
from middleware.auth import get_current_user
from database import get_supabase
from config import ENVIRONMENT
from services.premium_access import require_premium_user
from limiter import limiter

logger = logging.getLogger(__name__)


def _utc_timestamptz_iso() -> str:
    """RFC 3339 string for Postgres timestamptz. UTC isoformat already ends with +00:00 — do not append Z."""
    return datetime.now(timezone.utc).isoformat()


MSG_AUTH_REQUIRED = "Authentication required"
MSG_FRIEND_TRACKING_DISABLED = "Friend tracking is temporarily disabled."

CurrentUser = Annotated[dict, Depends(get_current_user)]

_PROFILE_SEARCH_COLS = "id, name, full_name, email, friend_code"

router = APIRouter(prefix="/api", tags=["Social"])

LIVE_LOCATION_SHARING_MODES = {"while_using", "always_follow"}

FRIEND_CATEGORY_COLORS = {
    "#3b82f6",
    "#22c55e",
    "#8b5cf6",
    "#f59e0b",
    "#ef4444",
    "#14b8a6",
    "#ec4899",
    "#64748b",
}


def _normalize_category_color(color: Optional[str]) -> str:
    val = (color or "#3B82F6").strip().lower()
    if not val.startswith("#"):
        val = f"#{val}"
    if val not in FRIEND_CATEGORY_COLORS:
        return "#3B82F6"
    return val.upper()


def _friendship_accepted(sb, uid: str, other_id: str) -> bool:
    rel = sb.table("friendships").select("id").or_(
        f"and(user_id_1.eq.{uid},user_id_2.eq.{other_id}),and(user_id_1.eq.{other_id},user_id_2.eq.{uid})"
    ).eq("status", "accepted").limit(1).execute()
    return bool(rel.data)


def _is_missing_column_error(err: Exception, table: str, column: str) -> bool:
    s = str(err).lower()
    table_l = table.lower()
    column_l = column.lower()
    if table_l not in s or column_l not in s or "column" not in s:
        return False
    return (
        "does not exist" in s
        or "could not find" in s
        or "schema cache" in s
    )


def _execute_live_location_mutation_with_optional_columns(payload: dict, execute_fn, action: str):
    """Run a live_locations mutation, dropping optional columns absent from older Supabase schemas."""
    optional_columns = ("battery_pct", "sharing_mode")
    while True:
        try:
            return execute_fn()
        except Exception as e:
            missing = next(
                (
                    col
                    for col in optional_columns
                    if col in payload and _is_missing_column_error(e, "live_locations", col)
                ),
                None,
            )
            if missing is None:
                raise
            logger.warning("live_locations.%s missing; retrying %s without %s", missing, action, missing)
            payload.pop(missing, None)


def _normalize_live_location_sharing_mode(value: Optional[str], is_sharing: bool) -> str:
    if not is_sharing:
        return "off"
    val = (value or "while_using").strip().lower()
    if val in LIVE_LOCATION_SHARING_MODES:
        return val
    return "while_using"


def _select_live_locations_with_optional_battery(sb, user_ids: list[str]):
    cols_with_battery = (
        "user_id, lat, lng, heading, speed_mph, is_sharing, "
        "last_updated, is_navigating, destination_name, battery_pct"
    )
    try:
        res = sb.table("live_locations").select(cols_with_battery).in_("user_id", user_ids).execute()
        return res, True
    except Exception as e:
        if not _is_missing_column_error(e, "live_locations", "battery_pct"):
            raise
        logger.warning("live_locations.battery_pct missing; retrying friends list without battery_pct")
        cols_without_battery = (
            "user_id, lat, lng, heading, speed_mph, is_sharing, "
            "last_updated, is_navigating, destination_name"
        )
        res = sb.table("live_locations").select(cols_without_battery).in_("user_id", user_ids).execute()
        return res, False


# ==================== FRIENDS ====================
@router.get("/friends", responses={401: {"description": MSG_AUTH_REQUIRED}})
def get_friends(
    current_user: CurrentUser,
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
):
    """Redirects to Supabase-backed friends list (was previously in-memory mock)."""
    if not current_user:
        raise HTTPException(status_code=401, detail=MSG_AUTH_REQUIRED)
    return get_friends_list(limit=limit, current_user=current_user)


@router.get("/friends/search", responses={401: {"description": MSG_AUTH_REQUIRED}})
@limiter.limit("60/minute")
def search_friends(request: Request, current_user: CurrentUser, q: str = "", user_id: str = ""):
    if not current_user:
        raise HTTPException(status_code=401, detail=MSG_AUTH_REQUIRED)
    require_premium_user(current_user)
    uid = current_user["id"]
    query = (q or user_id).strip()
    if len(query) > 100:
        raise HTTPException(status_code=400, detail="Search query too long (max 100 characters)")
    if not query:
        return {"success": True, "data": []}
    supabase = get_supabase()

    # Search by friend_code (exact match, case-insensitive), email, or name
    code_res = supabase.table("profiles").select(
        _PROFILE_SEARCH_COLS
    ).neq("id", uid).ilike("friend_code", query).limit(5).execute()

    # Avoid PostgREST `.or_()` string interpolation; use separate ilike filters.
    safe_q = re.sub(r"[%(),]", "", query).strip()
    if not safe_q:
        name_rows: list = []
    else:
        pat = f"%{safe_q}%"
        fn = supabase.table("profiles").select(_PROFILE_SEARCH_COLS).neq("id", uid).ilike("full_name", pat).limit(10).execute()
        nm = supabase.table("profiles").select(_PROFILE_SEARCH_COLS).neq("id", uid).ilike("name", pat).limit(10).execute()
        em = supabase.table("profiles").select(_PROFILE_SEARCH_COLS).neq("id", uid).ilike("email", pat).limit(10).execute()
        seen_ids: set[str] = set()
        name_rows = []
        for chunk in (fn.data or [], nm.data or [], em.data or []):
            for row in chunk:
                rid = str(row.get("id", ""))
                if rid and rid not in seen_ids:
                    seen_ids.add(rid)
                    name_rows.append(row)

    seen = set()
    combined = []
    for row in (code_res.data or []) + name_rows:
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


@router.get("/friends/my-code", responses={401: {"description": MSG_AUTH_REQUIRED}})
def get_my_friend_code(current_user: CurrentUser):
    """Return the current user's 6-character friend code for sharing."""
    if not current_user:
        raise HTTPException(status_code=401, detail=MSG_AUTH_REQUIRED)
    require_premium_user(current_user)
    uid = current_user["id"]
    supabase = get_supabase()
    res = supabase.table("profiles").select("friend_code").eq("id", uid).limit(1).execute()
    code = (res.data[0].get("friend_code") if res.data else None) or ""
    return {"success": True, "data": {"friend_code": code}}


@router.post("/friends/add", responses={401: {"description": MSG_AUTH_REQUIRED}, 400: {"description": "Invalid request or already friends"}})
@limiter.limit("20/minute")
def add_friend(request: Request, body: FriendRequest, current_user: CurrentUser):
    if not current_user:
        raise HTTPException(status_code=401, detail=MSG_AUTH_REQUIRED)
    require_premium_user(current_user)
    uid = current_user["id"]
    friend_id = body.user_id
    if not friend_id or friend_id == uid:
        raise HTTPException(status_code=400, detail="Invalid friend_id")
    supabase = get_supabase()
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


@router.delete("/friends/{friend_id}", responses={401: {"description": MSG_AUTH_REQUIRED}})
@limiter.limit("30/minute")
def remove_friend(request: Request, friend_id: str, current_user: CurrentUser):
    if not current_user:
        raise HTTPException(status_code=401, detail=MSG_AUTH_REQUIRED)
    require_premium_user(current_user)
    uid = current_user["id"]
    supabase = get_supabase()
    # Delete row where (user_id_1=uid, user_id_2=friend_id) or (user_id_1=friend_id, user_id_2=uid)
    supabase.table("friendships").delete().eq("user_id_1", uid).eq("user_id_2", friend_id).execute()
    supabase.table("friendships").delete().eq("user_id_1", friend_id).eq("user_id_2", uid).execute()
    return {"success": True, "message": "Friend removed"}


@router.get("/friends/list", responses={401: {"description": MSG_AUTH_REQUIRED}})
def get_friends_list(
    current_user: CurrentUser,
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
):
    """List friends with friend_id and status for location sharing."""
    if not current_user:
        raise HTTPException(status_code=401, detail=MSG_AUTH_REQUIRED)
    require_premium_user(current_user)
    from services.runtime_config import require_enabled

    require_enabled("friend_tracking_enabled", MSG_FRIEND_TRACKING_DISABLED)
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
    cat_members_res = supabase.table("friend_category_members").select(
        "friend_user_id, friend_category_id, friend_categories(id, name, color)"
    ).in_("friend_user_id", friend_ids).execute()
    cat_map: dict[str, list[dict]] = {}
    for row in (cat_members_res.data or []):
        fid = str(row.get("friend_user_id") or "")
        raw_cat = row.get("friend_categories") or {}
        cat = {
            "id": str(raw_cat.get("id") or row.get("friend_category_id") or ""),
            "name": raw_cat.get("name") or "Category",
            "color": raw_cat.get("color") or "#3B82F6",
        }
        if not cat["id"]:
            continue
        cat_map.setdefault(fid, []).append(cat)
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
            "categories": cat_map.get(fid, []),
        })
    loc_res, has_battery_col = _select_live_locations_with_optional_battery(supabase, friend_ids)
    loc_map = {str(r["user_id"]): r for r in (loc_res.data or [])}
    for row in out:
        fid = row["friend_id"]
        ll = loc_map.get(fid)
        if not ll:
            row["is_sharing"] = False
            continue
        row["lat"] = ll.get("lat")
        row["lng"] = ll.get("lng")
        row["heading"] = ll.get("heading")
        row["speed_mph"] = ll.get("speed_mph")
        row["is_sharing"] = bool(ll.get("is_sharing"))
        row["last_updated"] = ll.get("last_updated")
        row["is_navigating"] = bool(ll.get("is_navigating"))
        row["destination_name"] = ll.get("destination_name")
        if has_battery_col:
            bat = ll.get("battery_pct")
            if bat is not None:
                row["battery_pct"] = int(bat)
    return {"success": True, "data": out}


@router.get("/friends/categories", responses={401: {"description": MSG_AUTH_REQUIRED}})
def get_friend_categories(current_user: CurrentUser):
    if not current_user:
        raise HTTPException(status_code=401, detail=MSG_AUTH_REQUIRED)
    require_premium_user(current_user)
    uid = current_user["id"]
    supabase = get_supabase()
    cats_res = supabase.table("friend_categories").select(
        "id, name, color, created_at"
    ).eq("user_id", uid).order("name").execute()
    cats = list(cats_res.data or [])
    if not cats:
        return {"success": True, "data": []}
    cat_ids = [str(c.get("id")) for c in cats if c.get("id")]
    counts_res = supabase.table("friend_category_members").select(
        "friend_category_id"
    ).in_("friend_category_id", cat_ids).execute()
    counts: dict[str, int] = {}
    for row in (counts_res.data or []):
        cid = str(row.get("friend_category_id") or "")
        if not cid:
            continue
        counts[cid] = counts.get(cid, 0) + 1
    out = []
    for c in cats:
        cid = str(c.get("id") or "")
        out.append({
            "id": cid,
            "name": c.get("name") or "Category",
            "color": c.get("color") or "#3B82F6",
            "friend_count": counts.get(cid, 0),
            "created_at": c.get("created_at"),
        })
    return {"success": True, "data": out}


@router.post("/friends/categories", responses={401: {"description": MSG_AUTH_REQUIRED}})
@limiter.limit("30/minute")
def create_friend_category(request: Request, body: FriendCategoryCreateBody, current_user: CurrentUser):
    if not current_user:
        raise HTTPException(status_code=401, detail=MSG_AUTH_REQUIRED)
    require_premium_user(current_user)
    uid = current_user["id"]
    supabase = get_supabase()
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Category name is required")
    ins = supabase.table("friend_categories").insert({
        "user_id": uid,
        "name": name,
        "color": _normalize_category_color(body.color),
    }).execute()
    created = (ins.data or [{}])[0]
    return {"success": True, "data": created}


@router.put("/friends/categories/{category_id}", responses={401: {"description": MSG_AUTH_REQUIRED}})
@limiter.limit("30/minute")
def update_friend_category(request: Request, category_id: str, body: FriendCategoryUpdateBody, current_user: CurrentUser):
    if not current_user:
        raise HTTPException(status_code=401, detail=MSG_AUTH_REQUIRED)
    require_premium_user(current_user)
    uid = current_user["id"]
    supabase = get_supabase()
    payload: dict[str, object] = {}
    if body.name is not None:
        name = body.name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="Category name cannot be empty")
        payload["name"] = name
    if body.color is not None:
        payload["color"] = _normalize_category_color(body.color)
    if not payload:
        return {"success": True, "data": {"id": category_id}}
    payload["updated_at"] = _utc_timestamptz_iso()
    res = supabase.table("friend_categories").update(payload).eq("id", category_id).eq("user_id", uid).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"success": True, "data": res.data[0]}


@router.delete("/friends/categories/{category_id}", responses={401: {"description": MSG_AUTH_REQUIRED}})
@limiter.limit("30/minute")
def delete_friend_category(request: Request, category_id: str, current_user: CurrentUser):
    if not current_user:
        raise HTTPException(status_code=401, detail=MSG_AUTH_REQUIRED)
    require_premium_user(current_user)
    uid = current_user["id"]
    supabase = get_supabase()
    supabase.table("friend_categories").delete().eq("id", category_id).eq("user_id", uid).execute()
    return {"success": True}


@router.post("/friends/categories/{category_id}/members", responses={401: {"description": MSG_AUTH_REQUIRED}})
@limiter.limit("30/minute")
def add_friend_to_category(request: Request, category_id: str, body: FriendCategoryMemberBody, current_user: CurrentUser):
    if not current_user:
        raise HTTPException(status_code=401, detail=MSG_AUTH_REQUIRED)
    require_premium_user(current_user)
    uid = current_user["id"]
    friend_id = body.friend_id.strip()
    if not friend_id:
        raise HTTPException(status_code=400, detail="friend_id is required")
    supabase = get_supabase()
    owns = supabase.table("friend_categories").select("id").eq("id", category_id).eq("user_id", uid).limit(1).execute()
    if not owns.data:
        raise HTTPException(status_code=404, detail="Category not found")
    if not _friendship_accepted(supabase, uid, friend_id):
        raise HTTPException(status_code=400, detail="Friend is not in accepted list")
    supabase.table("friend_category_members").upsert({
        "friend_category_id": category_id,
        "friend_user_id": friend_id,
    }).execute()
    return {"success": True}


@router.delete("/friends/categories/{category_id}/members/{friend_id}", responses={401: {"description": MSG_AUTH_REQUIRED}})
@limiter.limit("30/minute")
def remove_friend_from_category(request: Request, category_id: str, friend_id: str, current_user: CurrentUser):
    if not current_user:
        raise HTTPException(status_code=401, detail=MSG_AUTH_REQUIRED)
    require_premium_user(current_user)
    uid = current_user["id"]
    supabase = get_supabase()
    owns = supabase.table("friend_categories").select("id").eq("id", category_id).eq("user_id", uid).limit(1).execute()
    if not owns.data:
        raise HTTPException(status_code=404, detail="Category not found")
    supabase.table("friend_category_members").delete().eq("friend_category_id", category_id).eq("friend_user_id", friend_id).execute()
    return {"success": True}


@router.get("/friends/requests", responses={401: {"description": MSG_AUTH_REQUIRED}})
def get_friend_requests(
    current_user: CurrentUser,
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
):
    """Pending friend requests (incoming)."""
    if not current_user:
        raise HTTPException(status_code=401, detail=MSG_AUTH_REQUIRED)
    require_premium_user(current_user)
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


@router.get("/friends/requests/sent", responses={401: {"description": MSG_AUTH_REQUIRED}})
def get_outgoing_friend_requests(
    current_user: CurrentUser,
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
):
    """Pending friend requests you sent (waiting on the other person)."""
    if not current_user:
        raise HTTPException(status_code=401, detail=MSG_AUTH_REQUIRED)
    require_premium_user(current_user)
    uid = current_user["id"]
    supabase = get_supabase()
    res = supabase.table("friendships").select(
        "id, user_id_2, created_at"
    ).eq("user_id_1", uid).eq("status", "pending").limit(limit).execute()
    to_ids = [str(r.get("user_id_2")) for r in (res.data or []) if r.get("user_id_2")]
    profile_map = {}
    if to_ids:
        prof = supabase.table("profiles").select(
            _PROFILE_SEARCH_COLS
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


@router.post("/friends/reject", responses={400: {"description": "Missing friendship_id"}, 401: {"description": MSG_AUTH_REQUIRED}})
@limiter.limit("30/minute")
def reject_friend_request(request: Request, body: dict, current_user: CurrentUser):
    """Decline an incoming request (body.friendship_id = row id)."""
    if not current_user:
        raise HTTPException(status_code=401, detail=MSG_AUTH_REQUIRED)
    require_premium_user(current_user)
    uid = current_user["id"]
    friendship_id = body.get("friendship_id")
    if not friendship_id:
        raise HTTPException(status_code=400, detail="friendship_id required")
    supabase = get_supabase()
    supabase.table("friendships").delete().eq("id", friendship_id).eq("user_id_2", uid).eq(
        "status", "pending"
    ).execute()
    return {"success": True, "message": "Request declined"}


@router.delete(
    "/friends/requests/{friendship_id}",
    responses={
        400: {"description": "Missing friendship_id"},
        401: {"description": MSG_AUTH_REQUIRED},
        404: {"description": "Request not found or already resolved"},
    },
)
@limiter.limit("30/minute")
def cancel_outgoing_friend_request(request: Request, friendship_id: str, current_user: CurrentUser):
    """
    Withdraw an outgoing friend request you previously sent.

    Safety: restricted to rows where `user_id_1 = current_user` (you are the sender)
    AND `status = 'pending'`, so this cannot be used to terminate an accepted
    friendship (use `DELETE /friends/{friend_id}` for that) or to cancel somebody
    else's request.
    """
    if not current_user:
        raise HTTPException(status_code=401, detail=MSG_AUTH_REQUIRED)
    require_premium_user(current_user)
    uid = current_user["id"]
    fid = (friendship_id or "").strip()
    if not fid:
        raise HTTPException(status_code=400, detail="friendship_id required")
    supabase = get_supabase()
    # Verify the row exists, belongs to us (as sender), and is still pending before deleting —
    # returning 404 lets the client drop the row from its UI with confidence.
    existing = (
        supabase.table("friendships")
        .select("id")
        .eq("id", fid)
        .eq("user_id_1", uid)
        .eq("status", "pending")
        .limit(1)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Request not found or already resolved")
    supabase.table("friendships").delete().eq("id", fid).eq("user_id_1", uid).eq(
        "status", "pending"
    ).execute()
    return {"success": True, "message": "Request cancelled"}


@router.post("/friends/accept", responses={400: {"description": "Missing friendship_id"}, 401: {"description": MSG_AUTH_REQUIRED}})
@limiter.limit("30/minute")
def accept_friend_request(request: Request, body: dict, current_user: CurrentUser):
    """Accept a friend request (body.friendship_id = row id)."""
    if not current_user:
        raise HTTPException(status_code=401, detail=MSG_AUTH_REQUIRED)
    require_premium_user(current_user)
    uid = current_user["id"]
    friendship_id = body.get("friendship_id")
    if not friendship_id:
        raise HTTPException(status_code=400, detail="friendship_id required")
    supabase = get_supabase()
    supabase.table("friendships").update({"status": "accepted"}).eq(
        "id", friendship_id
    ).eq("user_id_2", uid).execute()
    return {"success": True, "message": "Friend request accepted"}


@router.get("/friends/location/sharing", responses={401: {"description": MSG_AUTH_REQUIRED}})
def get_my_location_sharing(current_user: CurrentUser):
    """Current user's location sharing preference (false if no live_locations row yet)."""
    if not current_user:
        raise HTTPException(status_code=401, detail=MSG_AUTH_REQUIRED)
    require_premium_user(current_user)
    from services.runtime_config import require_enabled

    require_enabled("friend_tracking_enabled", MSG_FRIEND_TRACKING_DISABLED)
    uid = current_user["id"]
    from database import get_supabase
    from config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise HTTPException(status_code=503, detail="Location sharing backend is not configured.")
    try:
        sb = get_supabase()
        try:
            res = sb.table("live_locations").select("is_sharing, sharing_mode").eq("user_id", uid).limit(1).execute()
        except Exception as e:
            if not _is_missing_column_error(e, "live_locations", "sharing_mode"):
                raise
            res = sb.table("live_locations").select("is_sharing").eq("user_id", uid).limit(1).execute()
        if res.data and len(res.data) > 0:
            is_sharing = bool(res.data[0].get("is_sharing"))
            return {
                "success": True,
                "data": {
                    "is_sharing": is_sharing,
                    "sharing_mode": _normalize_live_location_sharing_mode(res.data[0].get("sharing_mode"), is_sharing),
                },
            }
        return {"success": True, "data": {"is_sharing": False, "sharing_mode": "off"}}
    except Exception as e:
        logger.warning("failed to read location sharing: %s", e)
        raise HTTPException(status_code=500, detail="Failed to read location sharing state.")


@router.post("/friends/location/update", responses={401: {"description": MSG_AUTH_REQUIRED}})
@limiter.limit("300/minute")
def update_my_location(request: Request, body: LocationUpdateBody, current_user: CurrentUser):
    """Update current user's live location (Supabase: live_locations upsert; mock: no-op)."""
    from services.runtime_config import require_enabled

    require_enabled("friend_tracking_enabled", MSG_FRIEND_TRACKING_DISABLED)
    require_enabled(
        "live_location_publishing_enabled",
        "Live location publishing is temporarily paused.",
    )
    if not current_user:
        raise HTTPException(status_code=401, detail=MSG_AUTH_REQUIRED)
    require_premium_user(current_user)
    uid = current_user["id"]
    from database import get_supabase
    from config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise HTTPException(status_code=503, detail="Location sharing backend is not configured.")
    try:
        sb = get_supabase()
        prev = sb.table("live_locations").select("is_sharing").eq("user_id", uid).limit(1).execute()
        prev_share = None
        if prev.data and len(prev.data) > 0:
            prev_share = prev.data[0].get("is_sharing")
        if body.is_sharing is not None:
            is_sharing = bool(body.is_sharing)
        elif prev_share is not None:
            is_sharing = bool(prev_share)
        else:
            is_sharing = False
        payload = {
            "user_id": uid,
            "lat": body.lat,
            "lng": body.lng,
            "heading": body.heading,
            "speed_mph": body.speed_mph,
            "is_navigating": body.is_navigating,
            "destination_name": body.destination_name or None,
            "last_updated": _utc_timestamptz_iso(),
            "is_sharing": is_sharing,
        }
        if body.battery_pct is not None:
            payload["battery_pct"] = int(body.battery_pct)
        sharing_mode = _normalize_live_location_sharing_mode(body.sharing_mode, is_sharing)
        if sharing_mode != "off":
            payload["sharing_mode"] = sharing_mode
        _execute_live_location_mutation_with_optional_columns(
            payload,
            lambda: sb.table("live_locations").upsert(payload).execute(),
            "location upsert",
        )
    except Exception as e:
        logger.warning("failed to upsert live location: %s", e)
        raise HTTPException(status_code=500, detail="Failed to update live location.")
    return {"success": True}


@router.put("/friends/location/sharing", responses={401: {"description": MSG_AUTH_REQUIRED}})
@limiter.limit("30/minute")
def set_location_sharing(request: Request, body: LocationSharingBody, current_user: CurrentUser):
    """Turn location sharing on or off. Upserts a row when enabling sharing if none exists."""
    if not current_user:
        raise HTTPException(status_code=401, detail=MSG_AUTH_REQUIRED)
    require_premium_user(current_user)
    from services.runtime_config import require_enabled

    require_enabled("friend_tracking_enabled", MSG_FRIEND_TRACKING_DISABLED)
    uid = current_user["id"]
    from database import get_supabase
    from config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise HTTPException(status_code=503, detail="Location sharing backend is not configured.")
    try:
        sb = get_supabase()
        now = _utc_timestamptz_iso()
        existing = sb.table("live_locations").select("user_id, lat, lng").eq("user_id", uid).limit(1).execute()
        sharing_mode = _normalize_live_location_sharing_mode(body.sharing_mode, bool(body.is_sharing))
        if existing.data and len(existing.data) > 0:
            update_payload: dict[str, object] = {
                "is_sharing": body.is_sharing,
                "last_updated": now,
            }
            if sharing_mode != "off":
                update_payload["sharing_mode"] = sharing_mode
            if body.lat is not None and body.lng is not None:
                update_payload["lat"] = float(body.lat)
                update_payload["lng"] = float(body.lng)
            _execute_live_location_mutation_with_optional_columns(
                update_payload,
                lambda: sb.table("live_locations").update(update_payload).eq("user_id", uid).execute(),
                "sharing update",
            )
        elif body.is_sharing:
            lat = float(body.lat) if body.lat is not None else 0.0
            lng = float(body.lng) if body.lng is not None else 0.0
            insert_payload = {
                "user_id": uid,
                "lat": lat,
                "lng": lng,
                "is_sharing": True,
                "sharing_mode": sharing_mode if sharing_mode != "off" else "while_using",
                "is_navigating": False,
                "last_updated": now,
            }
            _execute_live_location_mutation_with_optional_columns(
                insert_payload,
                lambda: sb.table("live_locations").insert(insert_payload).execute(),
                "sharing insert",
            )
    except Exception as e:
        logger.warning("failed to update location sharing setting: %s", e)
        raise HTTPException(status_code=500, detail="Failed to update location sharing.")
    return {"success": True}


@router.post("/friends/tag", responses={401: {"description": MSG_AUTH_REQUIRED}})
@limiter.limit("30/minute")
def send_location_tag(request: Request, body: LocationTagBody, current_user: CurrentUser):
    """Send a location tag to a friend."""
    if not current_user:
        raise HTTPException(status_code=401, detail=MSG_AUTH_REQUIRED)
    require_premium_user(current_user)
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
    except Exception as e:
        logger.warning("failed to insert location tag: %s", e)
    return {"success": True, "message": "Location tag sent"}


@router.post("/social/convoy/start", responses={401: {"description": MSG_AUTH_REQUIRED}})
@limiter.limit("10/minute")
def convoy_start(request: Request, body: ConvoyStartBody, current_user: CurrentUser):
    """Persist a convoy session; navigation still happens client-side from destination."""
    if not current_user:
        raise HTTPException(status_code=401, detail=MSG_AUTH_REQUIRED)
    require_premium_user(current_user)
    uid = str(current_user["id"])
    sb = get_supabase()
    member_ids_clean = [
        str(m).strip() for m in body.member_ids if m and str(m).strip() and str(m).strip() != uid
    ]
    if not member_ids_clean:
        raise HTTPException(status_code=400, detail="Pick at least one friend for the convoy")
    for mid in member_ids_clean:
        if not _friendship_accepted(sb, uid, mid):
            raise HTTPException(status_code=400, detail="All convoy members must be accepted friends")
    dest = {
        "name": body.destination_name.strip(),
        "lat": body.destination_lat,
        "lng": body.destination_lng,
    }
    convoy_id = None
    try:
        ins = sb.table("convoys").insert(
            {
                "leader_id": uid,
                "group_id": None,
                "destination": dest,
                "member_ids": member_ids_clean,
                "status": "active",
            }
        ).execute()
        if ins.data:
            convoy_id = str(ins.data[0].get("id")) if ins.data[0].get("id") is not None else None
    except Exception as e:
        logger.warning("convoys insert failed: %s", e)
    return {"success": True, "data": {"convoy_id": convoy_id, "destination": dest}}


# ==================== ROAD REPORTS ====================
@router.get("/reports", responses={503: {"description": "Legacy route unavailable in production"}})
def get_road_reports(
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    radius: Annotated[float, Query(ge=0.1, le=200)] = 10,
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
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


@router.post("/reports", responses={503: {"description": "Legacy route unavailable in production"}})
def create_road_report(report: RoadReport):
    if ENVIRONMENT == "production":
        raise HTTPException(status_code=503, detail="Use /api/photo-reports/upload in production")
    user = users_db.get(current_user_id, {})
    new_id = max([r["id"] for r in road_reports_db], default=0) + 1
    now = datetime.now(timezone.utc)
    new_report = {"id": new_id, "user_id": current_user_id, "type": report.type, "title": report.title, "description": report.description, "lat": report.lat, "lng": report.lng, "photo_url": report.photo_url, "upvotes": 0, "upvoters": [], "created_at": now.isoformat(), "expires_at": (now + timedelta(hours=12)).isoformat(), "verified": False}
    road_reports_db.append(new_report)
    xp_result = add_xp_to_user(current_user_id, XP_CONFIG["photo_report"])
    if current_user_id in users_db:
        users_db[current_user_id]["reports_posted"] = user.get("reports_posted", 0) + 1
    badges_earned = check_community_badges(current_user_id)
    return {"success": True, "message": f"Report posted! +{XP_CONFIG['photo_report']} XP", "data": {"report": new_report, "xp_result": xp_result, "badges_earned": badges_earned}}


@router.post("/reports/{report_id}/upvote", responses={503: {"description": "Legacy route unavailable in production"}})
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


@router.delete("/reports/{report_id}", responses={503: {"description": "Legacy route unavailable in production"}})
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


@router.get("/reports/my", responses={503: {"description": "Legacy route unavailable in production"}})
def get_my_reports(limit: Annotated[int, Query(ge=1, le=100)] = 100):
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
@router.get("/incidents", responses={503: {"description": "Legacy route unavailable in production"}})
def get_incidents(
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    radius: Annotated[float, Query(ge=0.1, le=200)] = 15,
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
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


# Legacy /incidents/{incident_id}/upvote removed — canonical route is in routes/incidents.py (str param, DB-backed).

if ENVIRONMENT == "production":
    _LEGACY_PROD_DISABLED = {
        "/api/reports",
        "/api/reports/{report_id}/upvote",
        "/api/reports/{report_id}",
        "/api/reports/my",
        "/api/incidents",
    }
    router.routes = [r for r in router.routes if getattr(r, "path", "") not in _LEGACY_PROD_DISABLED]

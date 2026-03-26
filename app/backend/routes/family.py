from fastapi import APIRouter, Depends, HTTPException, Query
import random
import string
import uuid
from datetime import datetime, timedelta
from typing import Any, Optional

from middleware.auth import get_current_user
from database import get_supabase
from config import ENVIRONMENT

router = APIRouter(prefix="/api/family", tags=["family"])

_mock_groups_by_id: dict[str, dict] = {}
_mock_group_id_by_invite: dict[str, str] = {}
_mock_members_by_group: dict[str, list[dict]] = {}


def _mk_invite_code() -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "".join(random.choice(alphabet) for _ in range(8))


def _mock_get_members_payload(user_id: str, limit: int = 100) -> dict:
    for gid, members in _mock_members_by_group.items():
        if any(str(m.get("user_id")) == str(user_id) for m in members):
            group = _mock_groups_by_id.get(gid, {})
            return {
                "group_id": gid,
                "invite_code": group.get("invite_code"),
                "members": members[:limit],
            }
    return {"members": []}


def _require_member_group(supabase: Any, user_id: str) -> dict:
    membership = (
        supabase.table("family_members")
        .select("group_id, role")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not membership.data:
        raise HTTPException(status_code=404, detail="No family group found")
    return membership.data[0]


def _assert_same_group_member(supabase: Any, group_id: str, target_user_id: str) -> None:
    member = (
        supabase.table("family_members")
        .select("id")
        .eq("group_id", group_id)
        .eq("user_id", target_user_id)
        .limit(1)
        .execute()
    )
    if not member.data:
        raise HTTPException(status_code=404, detail="Member not found in group")


@router.post("/create")
async def create_family_group(body: dict, user: dict = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    uid = user["id"]
    name = body.get("name", "My Family")
    try:
        supabase = get_supabase()
        invite_code = _mk_invite_code()
        res = supabase.table("family_groups").insert({"name": name, "created_by": uid, "invite_code": invite_code}).execute()
        if not res.data:
            raise HTTPException(status_code=500, detail="Failed to create family group")
        group = res.data[0]
        # Add creator as admin
        supabase.table("family_members").upsert(
            {"group_id": group["id"], "user_id": uid, "role": "admin"},
            on_conflict="group_id,user_id",
        ).execute()
        if not group.get("invite_code"):
            group["invite_code"] = invite_code
        return group
    except HTTPException:
        raise
    except Exception:
        if ENVIRONMENT == "production":
            raise HTTPException(status_code=503, detail="Family service unavailable")
        gid = str(uuid.uuid4())
        invite = _mk_invite_code()
        group = {"id": gid, "name": name, "created_by": uid, "invite_code": invite}
        _mock_groups_by_id[gid] = group
        _mock_group_id_by_invite[invite] = gid
        _mock_members_by_group.setdefault(gid, [])
        _mock_members_by_group[gid].append(
            {
                "id": str(uuid.uuid4()),
                "group_id": gid,
                "user_id": uid,
                "role": "admin",
                "max_speed_mph": 75,
                "curfew_time": None,
                "focus_mode": False,
                "profiles": {
                    "id": uid,
                    "full_name": user.get("email") or "Admin",
                    "avatar_url": None,
                    "name": user.get("email") or "Admin",
                },
            }
        )
        return group


@router.post("/join")
async def join_family(body: dict, user: dict = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    code = (body.get("invite_code") or "").strip().upper()
    if not code:
        raise HTTPException(status_code=400, detail="invite_code required")
    try:
        supabase = get_supabase()
        group = supabase.table("family_groups").select("*").eq("invite_code", code).single().execute()
        if not group.data:
            raise HTTPException(status_code=404, detail="Invalid invite code")
        # Upsert membership (avoid duplicates)
        supabase.table("family_members").upsert(
            {"group_id": group.data["id"], "user_id": user["id"], "role": "member"},
            on_conflict="group_id,user_id",
        ).execute()
        return group.data
    except HTTPException:
        raise
    except Exception:
        if ENVIRONMENT == "production":
            raise HTTPException(status_code=503, detail="Family service unavailable")
        gid = _mock_group_id_by_invite.get(code)
        if not gid:
            raise HTTPException(status_code=404, detail="Invalid invite code")
        members = _mock_members_by_group.setdefault(gid, [])
        if not any(str(m.get("user_id")) == str(user["id"]) for m in members):
            members.append(
                {
                    "id": str(uuid.uuid4()),
                    "group_id": gid,
                    "user_id": user["id"],
                    "role": "member",
                    "max_speed_mph": 75,
                    "curfew_time": None,
                    "focus_mode": False,
                    "profiles": {
                        "id": user["id"],
                        "full_name": user.get("email") or "Member",
                        "avatar_url": None,
                        "name": user.get("email") or "Member",
                    },
                }
            )
        return _mock_groups_by_id.get(gid, {"id": gid, "invite_code": code})


@router.get("/members")
async def get_members(
    limit: int = Query(default=100, ge=1, le=100),
    user: dict = Depends(get_current_user),
):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        supabase = get_supabase()
        membership = (
            supabase.table("family_members")
            .select("group_id")
            .eq("user_id", user["id"])
            .limit(1)
            .execute()
        )
        membership_data = membership.data or []
        if not membership_data:
            # Repair flow: if user created a group but membership row is missing, recreate admin membership.
            created_group = (
                supabase.table("family_groups")
                .select("id, invite_code")
                .eq("created_by", user["id"])
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )
            if created_group.data:
                gid = created_group.data[0]["id"]
                supabase.table("family_members").upsert(
                    {"group_id": gid, "user_id": user["id"], "role": "admin"},
                    on_conflict="group_id,user_id",
                ).execute()
                membership_data = [{"group_id": gid}]
            else:
                membership_data = []
        if not membership_data:
            # If Supabase is configured but user has no rows yet, fall back to mock in dev.
            if ENVIRONMENT == "production":
                raise HTTPException(status_code=503, detail="Family membership unavailable")
            mock_payload = _mock_get_members_payload(user["id"], limit=limit)
            if mock_payload.get("group_id"):
                return mock_payload
            return {"members": []}
        group_id = membership_data[0]["group_id"]
        group = (
            supabase.table("family_groups")
            .select("id, name, invite_code")
            .eq("id", group_id)
            .single()
            .execute()
        )
        try:
            members = (
                supabase.table("family_members")
                .select("*, profiles(id, full_name, avatar_url, name)")
                .eq("group_id", group_id)
                .execute()
            )
            members_data = members.data or []
        except Exception:
            # Some envs don't have FK metadata for nested profiles select.
            members = (
                supabase.table("family_members")
                .select("*")
                .eq("group_id", group_id)
                .execute()
            )
            members_data = members.data or []
            uids = [m.get("user_id") for m in members_data if m.get("user_id")]
            profiles_map = {}
            if uids:
                try:
                    pr = (
                        supabase.table("profiles")
                        .select("id, full_name, avatar_url, name")
                        .in_("id", uids)
                        .execute()
                    )
                    profiles_map = {str(p.get("id")): p for p in (pr.data or []) if p.get("id")}
                except Exception:
                    profiles_map = {}
            for m in members_data:
                m["profiles"] = profiles_map.get(str(m.get("user_id")))
        return {
            "group_id": group_id,
            "group_name": (group.data or {}).get("name"),
            "invite_code": (group.data or {}).get("invite_code"),
            "members": members_data[:limit],
        }
    except Exception:
        if ENVIRONMENT == "production":
            raise HTTPException(status_code=503, detail="Family membership unavailable")
        return _mock_get_members_payload(user["id"], limit=limit)


@router.post("/sos")
async def sos_alert(body: Optional[dict] = None, user: dict = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    uid = user["id"]
    event_type = str((body or {}).get("type") or "manual")
    lat = (body or {}).get("lat")
    lng = (body or {}).get("lng")
    custom_message = (body or {}).get("message")
    recipients: list[str] = []
    try:
        supabase = get_supabase()
        supabase.table("live_locations").update({"sos_active": True}).eq("user_id", uid).execute()
        me = _require_member_group(supabase, uid)
        group_id = str(me.get("group_id"))
        members_res = (
            supabase.table("family_members")
            .select("user_id")
            .eq("group_id", group_id)
            .execute()
        )
        recipients = [str(m.get("user_id")) for m in (members_res.data or []) if m.get("user_id")]
        location_suffix = ""
        if lat is not None and lng is not None:
            location_suffix = f" at {float(lat):.5f}, {float(lng):.5f}"
        message = custom_message or f"Emergency SOS ({event_type}){location_suffix}"
        for recipient_id in recipients:
            try:
                supabase.table("notifications").insert(
                    {
                        "user_id": recipient_id,
                        "from_user_id": uid,
                        "type": "family_sos",
                        "title": "Emergency SOS",
                        "message": message,
                        "is_read": False,
                    }
                ).execute()
            except Exception:
                pass
        try:
            supabase.table("family_events").insert(
                {
                    "group_id": group_id,
                    "member_id": uid,
                    "type": "sos",
                    "message": message,
                    "metadata": {"lat": lat, "lng": lng, "source": event_type},
                }
            ).execute()
        except Exception:
            pass
    except Exception:
        if ENVIRONMENT == "production":
            raise HTTPException(status_code=503, detail="Family SOS service unavailable")
    return {"success": True, "message": "SOS sent to family", "type": event_type, "sent_to": len(recipients)}


@router.put("/group/{group_id}/member/{member_id}/sharing")
async def set_member_sharing(group_id: str, member_id: str, body: dict, user: dict = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    supabase = get_supabase()
    me = _require_member_group(supabase, user["id"])
    if str(me.get("group_id")) != str(group_id):
        raise HTTPException(status_code=403, detail="Not in this family group")
    if me.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    _assert_same_group_member(supabase, group_id, member_id)
    is_sharing = bool(body.get("is_sharing", True))
    supabase.table("live_locations").upsert(
        {"user_id": member_id, "is_sharing": is_sharing},
        on_conflict="user_id",
    ).execute()
    return {"success": True, "user_id": member_id, "is_sharing": is_sharing}


@router.post("/privacy-window")
async def request_privacy_window(body: dict, user: dict = Depends(get_current_user)):
    uid = user["id"]
    duration_hours = int(body.get("duration_hours", 2) or 2)
    expires_at = (datetime.now() + timedelta(hours=duration_hours)).isoformat()
    try:
        supabase = get_supabase()
        supabase.table("live_locations").update({"privacy_window_until": expires_at}).eq("user_id", uid).execute()
    except Exception:
        if ENVIRONMENT == "production":
            raise HTTPException(status_code=503, detail="Family privacy service unavailable")
    return {"success": True, "expires_at": expires_at}


@router.post("/checkin")
async def send_checkin(body: dict, user: dict = Depends(get_current_user)):
    uid = user["id"]
    preset_id = body.get("preset_id")
    recipient_ids = body.get("recipient_ids", [])
    PRESETS = {
        "on_way": "On my way",
        "running_late": "Running late",
        "arrived_safe": "Arrived safe!",
        "pick_me_up": "Can you pick me up?",
        "need_help": "I need help",
        "heading_home": "Heading home now",
    }
    message = PRESETS.get(preset_id, "Check-in")
    try:
        supabase = get_supabase()
        for recipient_id in recipient_ids:
            supabase.table("notifications").insert(
                {
                    "user_id": recipient_id,
                    "from_user_id": uid,
                    "type": "family_checkin",
                    "title": "Family check-in",
                    "message": message,
                    "read": False,
                }
            ).execute()
    except Exception:
        if ENVIRONMENT == "production":
            raise HTTPException(status_code=503, detail="Family check-in service unavailable")
    return {"success": True, "message": message, "sent_to": len(recipient_ids)}


@router.put("/settings")
async def update_member_settings(body: dict, user: dict = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    uid = user["id"]
    target_user_id = body.get("user_id") or uid
    update: dict = {}
    if "max_speed_mph" in body:
        update["max_speed_mph"] = body["max_speed_mph"]
    if "curfew_time" in body:
        update["curfew_time"] = body["curfew_time"]
    if "focus_mode" in body:
        update["focus_mode"] = body["focus_mode"]
    if "role" in body:
        update["role"] = body["role"]
    if not update:
        return {"success": True}
    try:
        supabase = get_supabase()

        # Authorization: user can always edit their own settings; editing others requires admin in same group.
        if str(target_user_id) != str(uid):
            my_membership = (
                supabase.table("family_members")
                .select("group_id, role")
                .eq("user_id", uid)
                .limit(1)
                .execute()
            )
            # If Supabase is configured but the user has no membership rows yet (dev/mock),
            # fall back to the mock store instead of hard failing.
            if not my_membership.data:
                raise RuntimeError("No Supabase membership; use mock fallback")
            if my_membership.data[0].get("role") != "admin":
                raise HTTPException(status_code=403, detail="Admin only")
            group_id = my_membership.data[0].get("group_id")
            if not group_id:
                raise RuntimeError("No group_id; use mock fallback")
            target_membership = (
                supabase.table("family_members")
                .select("id")
                .eq("group_id", group_id)
                .eq("user_id", target_user_id)
                .limit(1)
                .execute()
            )
            if not target_membership.data:
                raise RuntimeError("Target not found in Supabase; use mock fallback")
            supabase.table("family_members").update(update).eq("group_id", group_id).eq("user_id", target_user_id).execute()
            return {"success": True}

        supabase.table("family_members").update(update).eq("user_id", uid).execute()
        return {"success": True}
    except HTTPException:
        raise
    except Exception:
        if ENVIRONMENT == "production":
            raise HTTPException(status_code=503, detail="Family settings service unavailable")
        payload = _mock_get_members_payload(uid)
        gid = payload.get("group_id")
        if not gid:
            raise HTTPException(status_code=404, detail="Member not found")
        members = _mock_members_by_group.get(gid, [])
        my = next((m for m in members if str(m.get("user_id")) == str(uid)), None)
        if str(target_user_id) != str(uid) and (my or {}).get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin only")
        tgt = next((m for m in members if str(m.get("user_id")) == str(target_user_id)), None)
        if not tgt:
            raise HTTPException(status_code=404, detail="Member not found")
        tgt.update(update)
        return {"success": True}


@router.put("/group/name")
async def rename_group(body: dict, user: dict = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    group_id = str(body.get("group_id") or "").strip()
    name = str(body.get("name") or "").strip()
    if not group_id or not name:
        raise HTTPException(status_code=400, detail="group_id and name are required")
    supabase = get_supabase()
    me = _require_member_group(supabase, user["id"])
    if str(me.get("group_id")) != group_id:
        raise HTTPException(status_code=403, detail="Not in this family group")
    if me.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    updated = supabase.table("family_groups").update({"name": name}).eq("id", group_id).execute()
    return {"success": True, "group": (updated.data or [{}])[0]}


@router.get("/trips")
async def get_family_trips(user: dict = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    supabase = get_supabase()
    membership = (
        supabase.table("family_members")
        .select("group_id, role")
        .eq("user_id", user["id"])
        .limit(1)
        .execute()
    )
    if not membership.data or membership.data[0].get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    group_id = membership.data[0]["group_id"]
    trips = (
        supabase.table("family_trips")
        .select("*, profiles(full_name, name)")
        .eq("group_id", group_id)
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )
    return {"trips": trips.data or []}


@router.get("/group/{group_id}/members")
async def get_group_members(
    group_id: str,
    limit: int = Query(default=100, ge=1, le=100),
    user: dict = Depends(get_current_user),
):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    supabase = get_supabase()
    try:
        me = _require_member_group(supabase, user["id"])
    except HTTPException:
        # Repair flow: if requester created this group but has no membership row, restore as admin.
        group_probe = (
            supabase.table("family_groups")
            .select("id, created_by")
            .eq("id", group_id)
            .single()
            .execute()
        )
        if group_probe.data and str(group_probe.data.get("created_by")) == str(user["id"]):
            supabase.table("family_members").upsert(
                {"group_id": group_id, "user_id": user["id"], "role": "admin"},
                on_conflict="group_id,user_id",
            ).execute()
            me = {"group_id": group_id, "role": "admin"}
        else:
            raise
    if str(me.get("group_id")) != str(group_id):
        raise HTTPException(status_code=403, detail="Not in this family group")

    group_res = (
        supabase.table("family_groups")
        .select("id, name, invite_code, created_by, created_at")
        .eq("id", group_id)
        .single()
        .execute()
    )
    try:
        members_res = (
            supabase.table("family_members")
            .select("id, group_id, user_id, role, max_speed_mph, curfew_time, focus_mode, profiles(id, full_name, avatar_url, name)")
            .eq("group_id", group_id)
            .execute()
        )
        members_data = members_res.data or []
    except Exception:
        members_res = (
            supabase.table("family_members")
            .select("id, group_id, user_id, role, max_speed_mph, curfew_time, focus_mode")
            .eq("group_id", group_id)
            .execute()
        )
        members_data = members_res.data or []
        uids = [m.get("user_id") for m in members_data if m.get("user_id")]
        profiles_map = {}
        if uids:
            try:
                pr = (
                    supabase.table("profiles")
                    .select("id, full_name, avatar_url, name")
                    .in_("id", uids)
                    .execute()
                )
                profiles_map = {str(p.get("id")): p for p in (pr.data or []) if p.get("id")}
            except Exception:
                profiles_map = {}
        for m in members_data:
            m["profiles"] = profiles_map.get(str(m.get("user_id")))
    member_ids = [m.get("user_id") for m in (members_data or []) if m.get("user_id")]
    live_res = (
        supabase.table("live_locations")
        .select("user_id, lat, lng, speed_mph, heading, battery_level, is_sharing, sos_active, last_updated")
        .in_("user_id", member_ids)
        .execute()
        if member_ids
        else None
    )
    live_by_uid = {str(r.get("user_id")): r for r in ((live_res.data or []) if live_res else []) if r.get("user_id")}

    out_members = []
    for m in (members_data or []):
        uid = str(m.get("user_id"))
        enriched = dict(m)
        enriched["live"] = live_by_uid.get(uid)
        out_members.append(enriched)

    return {"group": group_res.data or {}, "members": out_members[:limit], "viewer_role": me.get("role")}


@router.get("/group/{group_id}/events")
async def get_group_events(group_id: str, limit: int = Query(default=20, ge=1, le=50), user: dict = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    supabase = get_supabase()
    me = _require_member_group(supabase, user["id"])
    if str(me.get("group_id")) != str(group_id):
        raise HTTPException(status_code=403, detail="Not in this family group")

    events = (
        supabase.table("family_events")
        .select("id, group_id, member_id, type, place_id, place_name, message, metadata, created_at")
        .eq("group_id", group_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return {"events": events.data or []}


@router.post("/event")
async def post_family_event(body: dict, user: dict = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    supabase = get_supabase()
    me = _require_member_group(supabase, user["id"])
    group_id = str(body.get("group_id") or me.get("group_id") or "")
    if not group_id:
        raise HTTPException(status_code=400, detail="group_id is required")
    if str(me.get("group_id")) != group_id:
        raise HTTPException(status_code=403, detail="Not in this family group")

    member_id = str(body.get("member_id") or user["id"])
    _assert_same_group_member(supabase, group_id, member_id)
    event_type = str(body.get("type") or "").strip()
    if not event_type:
        raise HTTPException(status_code=400, detail="type is required")

    payload = {
        "group_id": group_id,
        "member_id": member_id,
        "type": event_type,
        "place_id": body.get("place_id"),
        "place_name": body.get("place_name"),
        "message": body.get("message"),
        "metadata": body.get("metadata") if isinstance(body.get("metadata"), dict) else {},
    }
    created = supabase.table("family_events").insert(payload).execute()

    # Notify all members by default (including actor), while honoring opt-out preferences.
    group_members_res = (
        supabase.table("family_members")
        .select("user_id")
        .eq("group_id", group_id)
        .execute()
    )
    prefs_res = (
        supabase.table("family_member_notifications")
        .select("user_id, notify_arrival_home, notify_departure_school, notify_start_driving, notify_speed_exceeded, speed_threshold_mph")
        .eq("group_id", group_id)
        .execute()
    )
    prefs_by_uid = {str(p.get("user_id") or ""): p for p in (prefs_res.data or []) if p.get("user_id")}
    recipients = []
    for m in (group_members_res.data or []):
        uid = str(m.get("user_id") or "")
        if not uid:
            continue
        pref = prefs_by_uid.get(uid, {})
        should_notify = True
        if event_type == "arrival":
            should_notify = bool(pref.get("notify_arrival_home", True))
        elif event_type == "departure":
            should_notify = bool(pref.get("notify_departure_school", True))
        elif event_type == "driving_start":
            should_notify = bool(pref.get("notify_start_driving", True))
        elif event_type == "speed_exceeded":
            should_notify = bool(pref.get("notify_speed_exceeded", True))
        if should_notify:
            recipients.append(uid)

    for uid in recipients:
        try:
            supabase.table("notifications").insert(
                {
                    "user_id": uid,
                    "type": "family_event",
                    "title": "Family update",
                    "message": body.get("message") or f"New family event: {event_type}",
                    "is_read": False,
                }
            ).execute()
        except Exception:
            # Notification table schema can vary; event write remains authoritative.
            pass

    return {"success": True, "event": (created.data or [None])[0]}


@router.get("/member/{member_id}/trips")
async def get_member_trips(member_id: str, limit: int = Query(default=30, ge=1, le=100), user: dict = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    supabase = get_supabase()
    me = _require_member_group(supabase, user["id"])
    group_id = str(me.get("group_id"))
    _assert_same_group_member(supabase, group_id, member_id)
    if str(user["id"]) != str(member_id) and me.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    try:
        trips_res = (
            supabase.table("trips")
            .select("*")
            .eq("user_id", member_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
    except Exception:
        trips_res = (
            supabase.table("trips")
            .select("*")
            .eq("profile_id", member_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
    return {"trips": trips_res.data or []}


@router.get("/member/{member_id}/stats")
async def get_member_stats(member_id: str, user: dict = Depends(get_current_user)):
    trips_payload = await get_member_trips(member_id=member_id, limit=200, user=user)
    trips = trips_payload.get("trips", [])
    total_trips = len(trips)
    total_miles = 0.0
    avg_speed_sum = 0.0
    avg_speed_count = 0
    hard_brakes = 0
    hard_accels = 0
    score_sum = 0.0
    score_count = 0
    for t in trips:
        meters = t.get("distance_meters") or t.get("distance") or 0
        try:
            total_miles += float(meters) / 1609.34
        except Exception:
            pass
        if t.get("average_speed_mph") is not None:
            avg_speed_sum += float(t.get("average_speed_mph") or 0)
            avg_speed_count += 1
        hard_brakes += int(t.get("hard_braking_count") or 0)
        hard_accels += int(t.get("rapid_acceleration_count") or 0)
        if t.get("safety_score") is not None:
            score_sum += float(t.get("safety_score") or 0)
            score_count += 1

    return {
        "stats": {
            "total_trips": total_trips,
            "total_miles": round(total_miles, 2),
            "average_speed_mph": round(avg_speed_sum / avg_speed_count, 1) if avg_speed_count else 0,
            "hard_brakes": hard_brakes,
            "rapid_accelerations": hard_accels,
            "driving_score": round(score_sum / score_count, 1) if score_count else 0,
        }
    }


@router.put("/group/{group_id}/places")
async def put_group_places(group_id: str, body: dict, user: dict = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    supabase = get_supabase()
    me = _require_member_group(supabase, user["id"])
    if str(me.get("group_id")) != str(group_id):
        raise HTTPException(status_code=403, detail="Not in this family group")
    if me.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    places = body.get("places")
    if not isinstance(places, list):
        raise HTTPException(status_code=400, detail="places must be an array")

    # Replace model: deactivate old, upsert provided places.
    supabase.table("place_alerts").update({"active": False}).eq("group_id", group_id).execute()
    created = []
    for p in places:
        row = {
            "group_id": group_id,
            "created_by": user["id"],
            "watch_user_id": p.get("watch_user_id"),
            "name": p.get("name"),
            "lat": p.get("lat"),
            "lng": p.get("lng"),
            "radius_meters": p.get("radius_meters", 200),
            "alert_on": p.get("alert_on", "both"),
            "active": True,
        }
        ins = supabase.table("place_alerts").insert(row).execute()
        if ins.data:
            created.append(ins.data[0])
    return {"success": True, "places": created}


@router.get("/group/{group_id}/places")
async def get_group_places(
    group_id: str,
    limit: int = Query(default=100, ge=1, le=100),
    user: dict = Depends(get_current_user),
):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    supabase = get_supabase()
    me = _require_member_group(supabase, user["id"])
    if str(me.get("group_id")) != str(group_id):
        raise HTTPException(status_code=403, detail="Not in this family group")
    places = (
        supabase.table("place_alerts")
        .select("id, group_id, created_by, watch_user_id, name, lat, lng, radius_meters, alert_on, active, created_at")
        .eq("group_id", group_id)
        .eq("active", True)
        .order("created_at", desc=False)
        .execute()
    )
    return {"places": (places.data or [])[:limit]}


@router.delete("/group/{group_id}/member/{member_id}")
async def remove_group_member(group_id: str, member_id: str, user: dict = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    supabase = get_supabase()
    me = _require_member_group(supabase, user["id"])
    if str(me.get("group_id")) != str(group_id):
        raise HTTPException(status_code=403, detail="Not in this family group")
    if me.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    if str(user["id"]) == str(member_id):
        raise HTTPException(status_code=400, detail="Admin cannot remove themselves")
    _assert_same_group_member(supabase, group_id, member_id)
    supabase.table("family_members").delete().eq("group_id", group_id).eq("user_id", member_id).execute()
    return {"success": True}


@router.post("/group/{group_id}/member/{member_id}/remove")
async def remove_group_member_post(group_id: str, member_id: str, user: dict = Depends(get_current_user)):
    return await remove_group_member(group_id=group_id, member_id=member_id, user=user)


@router.put("/member/{member_id}/notifications")
async def put_member_notifications(member_id: str, body: dict, user: dict = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    supabase = get_supabase()
    me = _require_member_group(supabase, user["id"])
    group_id = str(me.get("group_id"))
    _assert_same_group_member(supabase, group_id, member_id)
    if str(user["id"]) != str(member_id) and me.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    payload = {
        "group_id": group_id,
        "user_id": member_id,
        "notify_arrival_home": bool(body.get("notify_arrival_home", True)),
        "notify_departure_school": bool(body.get("notify_departure_school", True)),
        "notify_start_driving": bool(body.get("notify_start_driving", True)),
        "notify_speed_exceeded": bool(body.get("notify_speed_exceeded", True)),
        "speed_threshold_mph": int(body.get("speed_threshold_mph", 70) or 70),
    }
    up = supabase.table("family_member_notifications").upsert(payload, on_conflict="group_id,user_id").execute()
    return {"success": True, "preferences": (up.data or [payload])[0]}


@router.get("/leaderboard")
async def get_family_leaderboard(
    group_id: str,
    period: str = "weekly",
    limit: int = Query(default=100, ge=1, le=100),
    user: dict = Depends(get_current_user),
):
    try:
        supabase = get_supabase()
        members_res = supabase.table("family_members").select("user_id, profiles(full_name, avatar_url)").eq("group_id", group_id).execute()
        if not members_res.data:
            return {"entries": [], "shared_gems": 0}
        since = (datetime.now() - timedelta(days=7)).isoformat() if period == "weekly" else "2020-01-01"
        entries = []
        shared_gems = 0
        for member in members_res.data:
            uid = member["user_id"]
            trips = supabase.table("trips").select("safety_score, gems_earned").eq("user_id", uid).gte("created_at", since).execute()
            trip_data = trips.data or []
            avg_safety = round(sum(t.get("safety_score", 0) for t in trip_data) / max(len(trip_data), 1))
            gems = sum(t.get("gems_earned", 0) for t in trip_data)
            shared_gems += gems
            profile = member.get("profiles") or {}
            entries.append(
                {
                    "user_id": uid,
                    "name": profile.get("full_name", "Member"),
                    "avatar": profile.get("avatar_url"),
                    "safety_score_avg": avg_safety,
                    "trips_this_week": len(trip_data),
                    "gems_this_week": gems,
                    "trend": "same",
                }
            )
        entries.sort(key=lambda x: x["gems_this_week"], reverse=True)
        for i, e in enumerate(entries):
            e["rank"] = i + 1
        return {"entries": entries[:limit], "shared_gems": shared_gems}
    except Exception:
        if ENVIRONMENT == "production":
            raise HTTPException(status_code=503, detail="Family leaderboard unavailable")
        return {"entries": [], "shared_gems": 0}


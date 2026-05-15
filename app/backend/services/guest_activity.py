from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any, Optional

from services.supabase_service import _sb, _table_missing

_GUEST_RE = re.compile(r"^guest_[A-Za-z0-9_-]{8,80}$")


def normalize_guest_id(value: object) -> str:
    raw = str(value or "").strip()
    return raw if _GUEST_RE.match(raw) else ""


def is_guest_user_id(value: object) -> bool:
    return bool(normalize_guest_id(value))


def guest_user_from_header(value: object) -> Optional[dict]:
    guest_id = normalize_guest_id(value)
    if not guest_id:
        return None
    now = datetime.now(timezone.utc).isoformat()
    return {
        "id": guest_id,
        "user_id": guest_id,
        "role": "guest",
        "is_guest": True,
        "email": "",
        "name": "Guest Driver",
        "plan": "free",
        "is_premium": False,
        "created_at": now,
    }


def record_guest_activity(
    guest_id: str,
    event_type: str,
    *,
    metadata: Optional[dict[str, Any]] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    trip_id: Optional[str] = None,
    offer_id: Optional[str] = None,
) -> None:
    gid = normalize_guest_id(guest_id)
    if not gid:
        return
    now = datetime.now(timezone.utc).isoformat()
    sb = _sb()
    try:
        sb.table("guest_sessions").upsert(
            {
                "guest_id": gid,
                "last_seen_at": now,
                "event_count": 0,
            },
            on_conflict="guest_id",
        ).execute()
    except Exception as exc:
        if _table_missing(exc):
            return
    try:
        sb.table("guest_events").insert(
            {
                "guest_id": gid,
                "event_type": str(event_type or "activity")[:64],
                "metadata": metadata or {},
                "lat": lat,
                "lng": lng,
                "trip_id": trip_id,
                "offer_id": offer_id,
                "created_at": now,
            }
        ).execute()
    except Exception:
        return


def list_guest_users(limit: int = 500) -> list[dict]:
    try:
        res = (
            _sb()
            .table("guest_sessions")
            .select("*")
            .order("last_seen_at", desc=True)
            .limit(max(1, min(int(limit), 2000)))
            .execute()
        )
    except Exception as exc:
        if _table_missing(exc):
            return []
        return []
    rows = res.data or []
    out: list[dict] = []
    for row in rows:
        gid = normalize_guest_id(row.get("guest_id"))
        if not gid:
            continue
        out.append(
            {
                "id": gid,
                "email": "",
                "name": "Guest Driver",
                "plan": "free",
                "is_premium": False,
                "gems": 0,
                "safety_score": 0,
                "total_miles": float(row.get("total_miles") or 0),
                "total_trips": int(row.get("total_trips") or 0),
                "total_savings": float(row.get("total_savings") or 0),
                "status": "active",
                "role": "guest",
                "created_at": row.get("first_seen_at") or row.get("created_at"),
                "updated_at": row.get("last_seen_at"),
                "guest_id": gid,
                "is_guest": True,
                "guest_event_count": int(row.get("event_count") or 0),
                "last_seen_at": row.get("last_seen_at"),
            }
        )
    return out

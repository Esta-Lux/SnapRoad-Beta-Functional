from collections import Counter
from datetime import datetime, timezone
from typing import Optional
import uuid

from config import ENVIRONMENT
from database import get_supabase

_memory_events: list[dict] = []


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _store_event(payload: dict) -> dict:
    try:
        result = get_supabase().table("offer_analytics").insert(payload).execute()
        if result.data:
            return result.data[0]
    except Exception:
        if ENVIRONMENT == "production":
            raise
    _memory_events.append(payload)
    return payload


def record_offer_event(
    *,
    offer: dict,
    event_type: str,
    partner_id: Optional[str] = None,
    user_id: Optional[str] = None,
    location_id: Optional[int] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    trip_id: Optional[str] = None,
) -> dict:
    partner = partner_id or offer.get("partner_id")
    offer_type = str(offer.get("offer_type") or ("admin" if offer.get("is_admin_offer") else "partner")).lower()
    store_user = user_id if offer_type == "partner" else None
    payload = {
        "id": str(uuid.uuid4()),
        "offer_id": offer.get("id"),
        "event_type": event_type,
        "partner_id": partner,
        "user_id": store_user,
        "location_id": location_id,
        "lat": lat,
        "lng": lng,
        "trip_id": trip_id,
        "created_at": _iso_now(),
    }
    event = _store_event(payload)

    updates = {}
    if event_type == "view":
        updates["view_count"] = int(offer.get("view_count") or offer.get("views") or 0) + 1
    elif event_type == "visit":
        updates["visit_count"] = int(offer.get("visit_count") or 0) + 1
    elif event_type == "redeem":
        updates["redemption_count"] = int(offer.get("redemption_count") or 0) + 1

    if updates:
        try:
            get_supabase().table("offers").update(updates).eq("id", offer.get("id")).execute()
        except Exception:
            if ENVIRONMENT == "production":
                raise
        offer.update(updates)

    return event


def _list_events(limit: int = 5000) -> list[dict]:
    try:
        result = get_supabase().table("offer_analytics").select("*").order("created_at", desc=True).limit(limit).execute()
        return result.data or []
    except Exception:
        if ENVIRONMENT == "production":
            return []
        return sorted(_memory_events, key=lambda item: item.get("created_at", ""), reverse=True)[:limit]


def summarize_offer_analytics(limit: int = 200) -> list[dict]:
    events = _list_events(limit=5000)
    grouped: dict[str, dict] = {}
    for event in events:
        offer_id = str(event.get("offer_id") or "")
        if not offer_id:
            continue
        bucket = grouped.setdefault(
            offer_id,
            {
                "offer_id": event.get("offer_id"),
                "partner_id": event.get("partner_id"),
                "views": 0,
                "visits": 0,
                "redemptions": 0,
                "latest_at": event.get("created_at"),
            },
        )
        if event.get("event_type") == "view":
            bucket["views"] += 1
        elif event.get("event_type") == "visit":
            bucket["visits"] += 1
        elif event.get("event_type") == "redeem":
            bucket["redemptions"] += 1
        if str(event.get("created_at") or "") > str(bucket.get("latest_at") or ""):
            bucket["latest_at"] = event.get("created_at")

    rows = list(grouped.values())
    rows.sort(key=lambda item: (item["redemptions"], item["visits"], item["views"]), reverse=True)
    return rows[:limit]


def recent_offer_feed(limit: int = 50) -> list[dict]:
    events = _list_events(limit=limit)
    return [
        {
            "event_type": event.get("event_type"),
            "offer_id": event.get("offer_id"),
            "partner_id": event.get("partner_id"),
            "created_at": event.get("created_at"),
            "lat": event.get("lat"),
            "lng": event.get("lng"),
        }
        for event in events[:limit]
    ]


def map_data_for_day(day: Optional[datetime] = None) -> list[dict]:
    target = (day or datetime.now(timezone.utc)).strftime("%Y-%m-%d")
    points = []
    for event in _list_events(limit=5000):
        if event.get("event_type") != "redeem":
            continue
        created_at = str(event.get("created_at") or "")
        if not created_at.startswith(target):
            continue
        lat = event.get("lat")
        lng = event.get("lng")
        if lat is None or lng is None:
            continue
        points.append(
            {
                "offer_id": event.get("offer_id"),
                "partner_id": event.get("partner_id"),
                "lat": lat,
                "lng": lng,
                "created_at": created_at,
            }
        )
    return points


def today_realtime_summary() -> dict:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    events = [event for event in _list_events(limit=5000) if str(event.get("created_at") or "").startswith(today)]
    counts = Counter(event.get("event_type") for event in events)
    top_offers = Counter(str(event.get("offer_id")) for event in events if event.get("event_type") == "redeem")
    top_partners = Counter(str(event.get("partner_id")) for event in events if event.get("event_type") == "redeem")
    return {
        "today_views": counts.get("view", 0),
        "today_visits": counts.get("visit", 0),
        "today_redemptions": counts.get("redeem", 0),
        "top_offers_today": [
            {"offer_id": offer_id, "redemptions": count}
            for offer_id, count in top_offers.most_common(10)
        ],
        "top_partners_today": [
            {"partner_id": partner_id, "redemptions": count}
            for partner_id, count in top_partners.most_common(10)
        ],
    }

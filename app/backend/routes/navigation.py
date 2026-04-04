from fastapi import APIRouter, Query, Body, Depends, HTTPException
from starlette.requests import Request
from pydantic import BaseModel
from typing import Optional, List, Any, Dict, Tuple
from datetime import datetime, timedelta
import logging
import math

from services.demo_random import choice, randint
import httpx
from limiter import limiter
from models.schemas import NavigationRequest, Location, Route, Widget
from services.mock_data import (
    saved_locations, saved_routes, widget_settings, MAP_LOCATIONS,
    road_reports_db, users_db,
)
from config import (
    CAMERAS_API_KEY,
    CAMERAS_API_URL,
    CAMERAS_API_KEY_AS_HEADER,
    ENVIRONMENT,
    OHGO_API_KEY,
    OHGO_API_BASE,
)
from middleware.auth import get_current_user
from database import get_supabase
from services.cache import cache_get, cache_set


class VoiceCommandBody(BaseModel):
    command: str = ""
    lat: Optional[float] = None
    lng: Optional[float] = None

router = APIRouter(prefix="/api", tags=["Navigation"])


def _resolve_user_scoped_data(auth_user: dict) -> tuple[str, list, list]:
    user_id = str(auth_user.get("user_id") or auth_user.get("id") or "").strip()
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid auth context")
    user = users_db.get(user_id)
    if not user:
        if ENVIRONMENT == "production":
            # Avoid mutating in-memory state in production read paths.
            return user_id, list(saved_locations), list(saved_routes)
        user = users_db.setdefault(user_id, {"id": user_id})
    if "saved_locations" not in user:
        if ENVIRONMENT == "production":
            return user_id, list(saved_locations), list(user.get("saved_routes", saved_routes))
        user["saved_locations"] = list(saved_locations)
    if "saved_routes" not in user:
        if ENVIRONMENT == "production":
            return user_id, list(user.get("saved_locations", saved_locations)), list(saved_routes)
        user["saved_routes"] = list(saved_routes)
    return user_id, user["saved_locations"], user["saved_routes"]


def _production_saved_places_user_id(auth_user: dict) -> str:
    uid = str(auth_user.get("user_id") or auth_user.get("id") or "").strip()
    if not uid:
        raise HTTPException(status_code=401, detail="Invalid auth context")
    return uid


def _sb_list_user_saved_places(uid: str) -> list:
    sb = get_supabase()
    try:
        res = sb.table("user_saved_places").select("*").eq("user_id", uid).order("created_at").execute()
    except Exception:
        return []
    out = []
    for x in res.data or []:
        out.append({
            "id": int(x["id"]),
            "name": x.get("name") or "",
            "address": x.get("address") or "",
            "category": x.get("category") or "favorite",
            "lat": x.get("lat"),
            "lng": x.get("lng"),
            "created_at": x.get("created_at"),
        })
    return out


def _nav_offer_distance_miles(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    import math

    r = 3958.8
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lng2 - lng1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    return 2 * r * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ==================== SAVED LOCATIONS ====================
@router.get("/locations")
def get_locations(
    limit: int = Query(default=100, ge=1, le=100),
    auth_user: dict = Depends(get_current_user),
):
    if ENVIRONMENT == "production":
        uid = _production_saved_places_user_id(auth_user)
        user_locations = _sb_list_user_saved_places(uid)
        return {"success": True, "data": user_locations[:limit], "count": len(user_locations[:limit])}
    _, user_locations, _ = _resolve_user_scoped_data(auth_user)
    return {"success": True, "data": user_locations[:limit], "count": len(user_locations[:limit])}


@router.post("/locations")
def add_location(location: Location, auth_user: dict = Depends(get_current_user)):
    if ENVIRONMENT == "production":
        uid = _production_saved_places_user_id(auth_user)
        sb = get_supabase()
        row = {
            "user_id": uid,
            "name": location.name,
            "address": location.address or "",
            "category": (location.category or "favorite").strip() or "favorite",
            "lat": location.lat,
            "lng": location.lng,
        }
        try:
            ins = sb.table("user_saved_places").insert(row).execute()
            saved = (ins.data or [{}])[0]
            if "id" not in saved:
                raise ValueError("no id")
        except Exception:
            raise HTTPException(status_code=500, detail="Could not save place")
        loc = {
            "id": int(saved["id"]),
            "name": saved.get("name") or location.name,
            "address": saved.get("address") or "",
            "category": saved.get("category") or "favorite",
            "lat": saved.get("lat", location.lat),
            "lng": saved.get("lng", location.lng),
            "created_at": saved.get("created_at") or datetime.now().isoformat(),
        }
        return {"success": True, "message": "Location saved", "data": loc}
    _, user_locations, _ = _resolve_user_scoped_data(auth_user)
    new_id = max([l.get("id", 0) for l in user_locations], default=0) + 1
    loc = {"id": new_id, "name": location.name, "address": location.address, "category": location.category, "lat": location.lat, "lng": location.lng, "created_at": datetime.now().isoformat()}
    user_locations.append(loc)
    return {"success": True, "message": "Location saved", "data": loc}


@router.delete("/locations/{location_id}")
def delete_location(location_id: int, auth_user: dict = Depends(get_current_user)):
    if ENVIRONMENT == "production":
        uid = _production_saved_places_user_id(auth_user)
        sb = get_supabase()
        try:
            sb.table("user_saved_places").delete().eq("user_id", uid).eq("id", location_id).execute()
        except Exception:
            raise HTTPException(status_code=500, detail="Could not delete place")
        return {"success": True, "message": "Location deleted"}
    _, user_locations, _ = _resolve_user_scoped_data(auth_user)
    user_locations[:] = [l for l in user_locations if l.get("id") != location_id]
    return {"success": True, "message": "Location deleted"}


# ==================== ROUTES ====================
@router.get("/routes")
def get_routes(
    limit: int = Query(default=100, ge=1, le=100),
    auth_user: dict = Depends(get_current_user),
):
    _, _, user_routes = _resolve_user_scoped_data(auth_user)
    return {"success": True, "data": user_routes[:limit], "count": len(user_routes[:limit])}


@router.post("/routes")
def add_route(route: Route, auth_user: dict = Depends(get_current_user)):
    if ENVIRONMENT == "production":
        raise HTTPException(status_code=503, detail="Legacy saved routes unavailable in production")
    _, _, user_routes = _resolve_user_scoped_data(auth_user)
    new_id = max([r.get("id", 0) for r in user_routes], default=0) + 1
    estimated_time = int(route.estimated_time or 18)
    distance = round(float(route.distance or max(1, estimated_time * 0.33)), 1)
    r = {
        "id": new_id,
        "name": route.name,
        "origin": route.origin,
        "destination": route.destination,
        "departure_time": route.departure_time,
        "days_active": route.days_active,
        "notifications": route.notifications,
        "estimated_time": estimated_time,
        "distance": distance,
        "active": True,
        "created_at": datetime.now().isoformat(),
    }
    user_routes.append(r)
    return {"success": True, "message": "Route saved", "data": r}


@router.delete("/routes/{route_id}")
def delete_route(route_id: int, auth_user: dict = Depends(get_current_user)):
    if ENVIRONMENT == "production":
        raise HTTPException(status_code=503, detail="Legacy saved routes unavailable in production")
    _, _, user_routes = _resolve_user_scoped_data(auth_user)
    before = len(user_routes)
    user_routes[:] = [r for r in user_routes if r.get("id") != route_id]
    if len(user_routes) == before:
        return {"success": False, "message": "Route not found"}
    return {"success": True, "message": "Route deleted"}


@router.post("/routes/{route_id}/toggle")
@router.put("/routes/{route_id}/toggle")
def toggle_route(route_id: int, auth_user: dict = Depends(get_current_user)):
    if ENVIRONMENT == "production":
        raise HTTPException(status_code=503, detail="Legacy saved routes unavailable in production")
    _, _, user_routes = _resolve_user_scoped_data(auth_user)
    route = next((r for r in user_routes if r.get("id") == route_id), None)
    if not route:
        return {"success": False, "message": "Route not found"}
    route["active"] = not route.get("active", True)
    return {"success": True, "data": route}


@router.post("/routes/{route_id}/notifications")
@router.put("/routes/{route_id}/notifications")
def toggle_notifications(route_id: int, auth_user: dict = Depends(get_current_user)):
    if ENVIRONMENT == "production":
        raise HTTPException(status_code=503, detail="Legacy saved routes unavailable in production")
    _, _, user_routes = _resolve_user_scoped_data(auth_user)
    route = next((r for r in user_routes if r.get("id") == route_id), None)
    if not route:
        return {"success": False, "message": "Route not found"}
    route["notifications"] = not route.get("notifications", True)
    return {"success": True, "data": route}


# ==================== ROUTE NOTIFICATIONS (reminders, leave-early, faster route) ====================
def _parse_time(hhmm: str) -> Optional[int]:
    """Parse 'HH:MM' or 'H:MM' to minutes since midnight. Returns None if invalid."""
    if not hhmm or ":" not in hhmm:
        return None
    parts = hhmm.strip().split(":")
    if len(parts) != 2:
        return None
    try:
        h, m = int(parts[0]), int(parts[1])
        if 0 <= h <= 23 and 0 <= m <= 59:
            return h * 60 + m
    except ValueError:
        pass
    return None


def _minutes_to_time(minutes: int) -> str:
    """Convert minutes since midnight to 'HH:MM'."""
    h = (minutes // 60) % 24
    m = minutes % 60
    return f"{h:02d}:{m:02d}"


def _is_premium_or_family(user: Dict[str, Any]) -> bool:
    plan = str(user.get("plan") or "").lower()
    return bool(user.get("is_premium")) or plan in {"premium", "family"} or bool(user.get("is_family_plan"))


def _traffic_profile_for_departure(dep_minutes: int, now_minutes: int) -> Tuple[float, int]:
    """
    Return (traffic_multiplier, alt_minutes_saved) tuned for peak windows.
    Multiplier > 1 means slower current route than baseline.
    """
    dep_hour = (dep_minutes // 60) % 24
    is_am_peak = 7 <= dep_hour <= 9
    is_pm_peak = 15 <= dep_hour <= 19
    minutes_until_departure = max(0, dep_minutes - now_minutes)
    pre_departure_pressure = 1.18 if minutes_until_departure <= 45 else 1.10 if minutes_until_departure <= 120 else 1.0
    if is_am_peak or is_pm_peak:
        mult = 1.28 * pre_departure_pressure
        saved = 7 if minutes_until_departure <= 60 else 5
    else:
        mult = 1.10 * pre_departure_pressure
        saved = 4 if minutes_until_departure <= 60 else 3
    return mult, saved


def _compute_route_options(route: Dict[str, Any], dep_minutes: int, now_minutes: int) -> Dict[str, Any]:
    baseline = int(route.get("estimated_time") or 18)
    baseline = max(5, baseline)
    mult, saved_hint = _traffic_profile_for_departure(dep_minutes, now_minutes)
    eta_minutes = int(round(baseline * mult))
    eta_minutes = max(baseline, min(120, eta_minutes))
    alt_saved = max(2, min(15, saved_hint + max(0, (eta_minutes - baseline) // 4)))
    alt_eta = max(baseline, eta_minutes - alt_saved)
    desired_arrival = dep_minutes + baseline
    leave_by_minutes = max(now_minutes, desired_arrival - eta_minutes)
    return {
        "baseline_minutes": baseline,
        "eta_minutes": eta_minutes,
        "alt_eta_minutes": alt_eta,
        "saved_minutes": max(0, eta_minutes - alt_eta),
        "desired_arrival": _minutes_to_time(desired_arrival),
        "leave_by": _minutes_to_time(leave_by_minutes),
    }


@router.get("/routes/notifications")
def get_route_notifications(
    auth_user: dict = Depends(get_current_user),
    lat: Optional[float] = Query(None, description="Current latitude for ETA/leave-by"),
    lng: Optional[float] = Query(None, description="Current longitude for ETA/leave-by"),
    window_minutes: int = Query(120, description="Notify when departure is within this many minutes"),
    limit: int = Query(default=100, ge=1, le=100),
):
    """
    Return route notifications with two options:
    1) Leave early to still arrive on scheduled time.
    2) Faster route to avoid traffic stress.
    Premium/family users are push-eligible; free users receive in-app only notifications.
    """
    user_id, _, user_routes = _resolve_user_scoped_data(auth_user)
    user = users_db.get(user_id, {})
    push_eligible = _is_premium_or_family(user)
    now = datetime.now()
    today_weekday = now.strftime("%a")  # Mon, Tue, ...
    current_minutes = now.hour * 60 + now.minute
    notifications: List[Dict[str, Any]] = []

    for route in user_routes:
        if not route.get("notifications") or not route.get("active", True):
            continue
        days = route.get("days_active") or []
        if today_weekday not in days:
            continue
        dep = _parse_time(route.get("departure_time") or "08:00")
        if dep is None:
            continue
        # Departure in the past today: skip (or could support “next occurrence”)
        if dep < current_minutes:
            continue
        minutes_until_departure = dep - current_minutes
        if minutes_until_departure > window_minutes:
            continue

        route_id = route.get("id")
        route_name = route.get("name") or "Route"
        destination = route.get("destination") or "destination"
        options = _compute_route_options(route, dep, current_minutes)
        delivery = "push_and_in_app" if push_eligible else "in_app_only"

        # Route reminder
        notifications.append({
            "id": f"reminder-{route_id}-{now.timestamp()}",
            "type": "route_reminder",
            "route_id": route_id,
            "route_name": route_name,
            "destination": destination,
            "departure_time": route.get("departure_time"),
            "desired_arrival": options["desired_arrival"],
            "eta_minutes": options["eta_minutes"],
            "delivery": delivery,
            "message": f"{route_name}: depart around {route.get('departure_time')} to arrive by {options['desired_arrival']}",
        })

        notifications.append({
            "id": f"leave_early-{route_id}-{now.timestamp()}",
            "type": "leave_early",
            "route_id": route_id,
            "route_name": route_name,
            "destination": destination,
            "departure_time": route.get("departure_time"),
            "desired_arrival": options["desired_arrival"],
            "leave_by": options["leave_by"],
            "eta_minutes": options["eta_minutes"],
            "delivery": delivery,
            "message": f"Leave by {options['leave_by']} to reach {destination} by {options['desired_arrival']}",
        })
        notifications.append({
            "id": f"faster_route-{route_id}-{now.timestamp()}",
            "type": "faster_route",
            "route_id": route_id,
            "route_name": route_name,
            "destination": destination,
            "departure_time": route.get("departure_time"),
            "desired_arrival": options["desired_arrival"],
            "eta_minutes": options["alt_eta_minutes"],
            "saved_minutes": options["saved_minutes"],
            "saved_dollars": round(min(6.0, options["saved_minutes"] * 0.18), 2),
            "delivery": delivery,
            "message": f"Try a faster route: save ~{options['saved_minutes']} min and still arrive by {options['desired_arrival']}",
        })

    notifications = notifications[:limit]
    return {"success": True, "data": notifications, "total": len(notifications), "push_eligible": push_eligible}


@router.get("/navigation/nearby-offers")
def get_navigation_nearby_offers(
    lat: float = Query(...),
    lng: float = Query(...),
    trip_id: str = Query(...),
    auth_user: dict = Depends(get_current_user),
):
    from routes.offers import _active_offers_source

    user_id, user_locations, user_routes = _resolve_user_scoped_data(auth_user)
    prior_visits = users_db.get(user_id, {}).get("saved_locations", user_locations) or user_locations
    history = users_db.get(user_id, {}).get("saved_routes", user_routes) or user_routes
    alerted_key = f"nearby-offers-alerted:{trip_id}"
    alerted_ids = {str(item) for item in (cache_get(alerted_key) or [])}

    ranked = []
    for offer in _active_offers_source(limit=500):
        offer_id = str(offer.get("id") or "")
        if not offer_id or offer_id in alerted_ids:
            continue
        offer_lat = float(offer.get("lat") or 0)
        offer_lng = float(offer.get("lng") or 0)
        miles = _nav_offer_distance_miles(lat, lng, offer_lat, offer_lng)
        if miles > 1.0:
            continue

        score = 0.0
        offer_type = str(offer.get("offer_type") or ("admin" if offer.get("is_admin_offer") else "partner")).lower()
        if offer_type == "partner":
            score += 5
        score += max(0, 1.2 - miles) * 10
        score += max(0, float(offer.get("boost_multiplier") or 1.0) - 1.0) * 6

        business_name = str(offer.get("business_name") or "").lower()
        business_type = str(offer.get("business_type") or "").lower()
        if any(business_name and business_name in str(loc.get("name") or "").lower() for loc in prior_visits):
            score += 3
        if any(business_type and business_type in str(loc.get("category") or "").lower() for loc in prior_visits):
            score += 2
        if any(business_name and business_name in str(route.get("destination") or "").lower() for route in history):
            score += 2

        ranked.append({
            **offer,
            "distance_miles": round(miles, 2),
            "score": round(score, 2),
        })

    ranked.sort(key=lambda item: item.get("score", 0), reverse=True)
    selected = ranked[:2]
    cache_set(alerted_key, list(alerted_ids) + [str(item.get("id")) for item in selected], ttl=24 * 60 * 60)
    return {"success": True, "data": selected, "count": len(selected)}


class LeaveEarlyBody(BaseModel):
    origin_lat: Optional[float] = None
    origin_lng: Optional[float] = None
    dest_lat: Optional[float] = None
    dest_lng: Optional[float] = None
    desired_arrival: Optional[str] = None  # "HH:MM"


@router.post("/routes/{route_id}/notify-leave-early")
def notify_leave_early(route_id: int, body: Optional[LeaveEarlyBody] = Body(None), auth_user: dict = Depends(get_current_user)):
    """Compute leave-by time for a route so user can arrive by desired time. Returns leave_by and eta_minutes."""
    _, _, user_routes = _resolve_user_scoped_data(auth_user)
    route = next((r for r in user_routes if r.get("id") == route_id), None)
    if not route:
        return {"success": False, "message": "Route not found"}
    if body is None:
        body = LeaveEarlyBody()
    if body.desired_arrival:
        desired = body.desired_arrival
    else:
        dep_min = _parse_time(route.get("departure_time") or "08:00") or 8 * 60
        baseline = max(5, int(route.get("estimated_time") or 18))
        desired = _minutes_to_time(dep_min + baseline)
    desired_min = _parse_time(desired)
    if desired_min is None:
        desired_min = 8 * 60

    now = datetime.now()
    current_minutes = now.hour * 60 + now.minute
    dep_minutes = _parse_time(route.get("departure_time") or "08:00") or desired_min

    if all(v is not None for v in (body.origin_lat, body.origin_lng, body.dest_lat, body.dest_lng)):
        origin_lat = float(body.origin_lat)
        origin_lng = float(body.origin_lng)
        dest_lat = float(body.dest_lat)
        dest_lng = float(body.dest_lng)
        dlat = abs(dest_lat - origin_lat)
        dlng = abs(dest_lng - origin_lng)
        distance_km = ((dlat * 111) ** 2 + (dlng * 111) ** 2) ** 0.5
        distance_miles = distance_km * 0.621371
        eta_minutes = max(5, round((distance_miles / 30) * 60))
    else:
        options = _compute_route_options(route, dep_minutes, current_minutes)
        eta_minutes = int(options["eta_minutes"])

    leave_by_minutes = desired_min - eta_minutes
    if leave_by_minutes < current_minutes:
        leave_by_minutes = current_minutes
    leave_by_str = _minutes_to_time(leave_by_minutes)

    return {
        "success": True,
        "data": {
            "route_id": route_id,
            "leave_by": leave_by_str,
            "eta_minutes": eta_minutes,
            "desired_arrival": desired,
            "destination": route.get("destination") or "destination",
        },
    }


# ==================== NAVIGATION ====================
@router.post("/navigation/start")
def start_navigation(nav: NavigationRequest):
    return {"success": True, "data": {"destination": nav.destination, "eta": "15 min", "distance": "5.2 mi", "active": True}}


@router.post("/navigation/stop")
def stop_navigation():
    return {"success": True, "message": "Navigation stopped"}


@router.post("/navigation/voice-command")
def voice_command(body: VoiceCommandBody):
    return {"success": True, "data": {"command": body.command, "response": f"Processing: {body.command}", "action": "navigate"}}


# ==================== MAP SEARCH ====================
import os as _os


@router.get("/map/search")
async def search_map_locations(
    q: str = Query(..., min_length=1),
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    limit: int = Query(default=8, ge=1, le=100),
):
    places_key = _os.environ.get("GOOGLE_PLACES_API_KEY", "")
    if places_key:
        try:
            params: Dict[str, Any] = {"input": q, "key": places_key, "language": "en"}
            if lat is not None and lng is not None:
                params["location"] = f"{lat},{lng}"
                params["radius"] = "50000"
            async with httpx.AsyncClient(timeout=8) as client:
                r = await client.get("https://maps.googleapis.com/maps/api/place/autocomplete/json", params=params)
            data = r.json()
            predictions = data.get("predictions", [])[:limit]
            results = []
            for p in predictions:
                results.append({
                    "name": p.get("structured_formatting", {}).get("main_text", p.get("description", "")),
                    "address": p.get("description", ""),
                    "place_id": p.get("place_id", ""),
                    "type": ", ".join(p.get("types", [])[:2]),
                })
            return {"success": True, "data": results, "query": q, "total_results": len(results)}
        except Exception as exc:
            _nav_log.warning("Places API search failed, falling back to local: %s", exc)

    query = q.lower().strip()
    results = []
    for loc in MAP_LOCATIONS:
        name_match = query in loc["name"].lower()
        address_match = query in loc["address"].lower()
        type_match = query in loc["type"].lower()
        if name_match or address_match or type_match:
            relevance = (10 if name_match else 0) + (5 if address_match else 0) + (3 if type_match else 0)
            if name_match and loc["name"].lower().startswith(query):
                relevance += 5
            distance = None
            if lat is not None and lng is not None:
                dlat = abs(loc["lat"] - lat)
                dlng = abs(loc["lng"] - lng)
                distance = ((dlat * 111) ** 2 + (dlng * 111) ** 2) ** 0.5
            results.append({**loc, "relevance": relevance, "distance_km": round(distance, 2) if distance else None})
    results.sort(key=lambda x: (-x["relevance"], x.get("distance_km") or 999))
    return {"success": True, "data": results[:limit], "query": q, "total_results": len(results)}


@router.get("/map/directions")
def get_mock_directions(origin_lat: float, origin_lng: float, dest_lat: float, dest_lng: float, dest_name: Optional[str] = "Destination"):
    if ENVIRONMENT == "production":
        raise HTTPException(status_code=503, detail="Mock directions unavailable in production")
    dlat = abs(dest_lat - origin_lat)
    dlng = abs(dest_lng - origin_lng)
    distance_km = ((dlat * 111) ** 2 + (dlng * 111) ** 2) ** 0.5
    distance_miles = distance_km * 0.621371
    eta_minutes = int((distance_miles / 30) * 60) + randint(2, 8)
    lat_diff = dest_lat - origin_lat
    lng_diff = dest_lng - origin_lng
    direction = ("north" if lat_diff > 0 else "south") if abs(lat_diff) > abs(lng_diff) else ("east" if lng_diff > 0 else "west")
    streets = ["High St", "Broad St", "Main St", "3rd Ave", "Lane Ave"]
    steps = [
        {"instruction": f"Head {direction}", "distance": f"{round(distance_miles * 0.15, 1)} mi", "duration": f"{int(eta_minutes * 0.15)} min", "maneuver": "straight"},
        {"instruction": f"Turn right onto {choice(streets)}", "distance": f"{round(distance_miles * 0.35, 1)} mi", "duration": f"{int(eta_minutes * 0.35)} min", "maneuver": "turn-right"},
        {"instruction": f"Turn left onto {choice(streets)}", "distance": f"{round(distance_miles * 0.35, 1)} mi", "duration": f"{int(eta_minutes * 0.35)} min", "maneuver": "turn-left"},
        {"instruction": f"Arrive at {dest_name}", "distance": f"{round(distance_miles * 0.15, 1)} mi", "duration": f"{int(eta_minutes * 0.15)} min", "maneuver": "arrive"},
    ]
    return {"success": True, "data": {"origin": {"lat": origin_lat, "lng": origin_lng}, "destination": {"lat": dest_lat, "lng": dest_lng, "name": dest_name}, "distance": {"km": round(distance_km, 2), "miles": round(distance_miles, 2), "text": f"{round(distance_miles, 1)} mi"}, "duration": {"minutes": eta_minutes, "text": f"{eta_minutes} min"}, "steps": steps, "route_type": "fastest", "traffic": choice(["light", "moderate", "heavy"])}}


# ==================== WIDGETS ====================
@router.get("/widgets")
def get_widgets():
    if ENVIRONMENT == "production":
        raise HTTPException(status_code=503, detail="Legacy widget settings unavailable in production")
    return {"success": True, "data": widget_settings}


@router.post("/widgets/{widget_id}/toggle")
@router.put("/widgets/{widget_id}/toggle")
def toggle_widget(widget_id: str):
    if ENVIRONMENT == "production":
        raise HTTPException(status_code=503, detail="Legacy widget settings unavailable in production")
    if widget_id in widget_settings:
        widget_settings[widget_id]["visible"] = not widget_settings[widget_id]["visible"]
    return {"success": True, "data": widget_settings}


@router.post("/widgets/{widget_id}/collapse")
@router.put("/widgets/{widget_id}/collapse")
def collapse_widget(widget_id: str):
    if ENVIRONMENT == "production":
        raise HTTPException(status_code=503, detail="Legacy widget settings unavailable in production")
    if widget_id in widget_settings:
        widget_settings[widget_id]["collapsed"] = not widget_settings[widget_id]["collapsed"]
    return {"success": True, "data": widget_settings}


@router.put("/widgets/{widget_id}/position")
def update_widget_position(widget_id: str, body: dict):
    if ENVIRONMENT == "production":
        raise HTTPException(status_code=503, detail="Legacy widget settings unavailable in production")
    if widget_id in widget_settings:
        widget_settings[widget_id]["position"] = body.get("position", 0)
    return {"success": True, "data": widget_settings}


def _normalize_ohgo_camera_views(cam: dict) -> List[dict]:
    """Extract still-image URLs for mobile/web clients (matches useMapLayers / OHGOCamera shape)."""
    raw = cam.get("cameraViews") or cam.get("camera_views") or []
    if not isinstance(raw, list):
        return []
    out: List[dict] = []
    for v in raw:
        if not isinstance(v, dict):
            continue
        small = (v.get("smallUrl") or v.get("small_url") or "").strip()
        large = (v.get("largeUrl") or v.get("large_url") or "").strip()
        if not large and not small:
            continue
        out.append({
            "id": str(v.get("id", "")),
            "small_url": small or large,
            "large_url": large or small,
            "direction": str(v.get("direction") or "").strip(),
        })
    return out


def _normalize_camera_item(item: Any, index: int) -> Optional[dict]:
    """Convert a single item from an external cameras API into our report shape."""
    if not isinstance(item, dict):
        return None
    lat = item.get("lat") or item.get("latitude")
    lng = item.get("lng") or item.get("longitude")
    if lat is None or lng is None:
        return None
    try:
        lat_f, lng_f = float(lat), float(lng)
    except (TypeError, ValueError):
        return None
    title = item.get("title") or item.get("name") or item.get("description") or "Traffic camera"
    row: dict = {
        "id": item.get("id", f"cam-{index}"),
        "type": "camera",
        "lat": lat_f,
        "lng": lng_f,
        "title": str(title)[:200],
        "description": str(item.get("description") or item.get("name") or "")[:500],
        "severity": "medium",
        "upvotes": 0,
        "created_at": item.get("created_at"),
        "expires_at": item.get("expires_at"),
    }
    cv_raw = item.get("camera_views") or item.get("cameraViews")
    if isinstance(cv_raw, list) and cv_raw:
        row["camera_views"] = _normalize_ohgo_camera_views({"cameraViews": cv_raw})
    return row


def _fetch_cameras_from_api(lat: float, lng: float, radius_km: float) -> List[dict]:
    """Call external cameras API using CAMERAS_API_KEY and CAMERAS_API_URL. Returns list of normalized report dicts."""
    if not CAMERAS_API_KEY or not (CAMERAS_API_URL or "").strip():
        return []
    url = (CAMERAS_API_URL or "").strip()
    params: dict = {"lat": lat, "lng": lng, "radius": radius_km}
    if not CAMERAS_API_KEY_AS_HEADER and CAMERAS_API_KEY:
        params["key"] = CAMERAS_API_KEY
    headers: dict = {}
    if CAMERAS_API_KEY_AS_HEADER and CAMERAS_API_KEY:
        headers["X-API-Key"] = CAMERAS_API_KEY
    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.get(url, params=params, headers=headers or None)
            resp.raise_for_status()
            data = resp.json()
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning("Cameras API request failed: %s", e)
        return []
    # Support common response shapes: list, or { data: [] }, or { cameras: [] }, or { results: [] }
    raw_list = data if isinstance(data, list) else None
    if raw_list is None and isinstance(data, dict):
        raw_list = data.get("data") or data.get("cameras") or data.get("results") or data.get("items")
    if not isinstance(raw_list, list):
        return []
    out = []
    for i, item in enumerate(raw_list):
        norm = _normalize_camera_item(item, i)
        if norm:
            out.append(norm)
    return out


def _fetch_ohgo_cameras(lat: float, lng: float, radius_km: float) -> List[dict]:
    """
    Ohio DOT OHGO public API. Radius query matches web DriverApp: "lat,lng,miles".
    """
    if not OHGO_API_KEY:
        return []
    # OHGO caps at 50 miles; convert km → miles
    miles = max(5, min(int(round(radius_km * 0.621371)), 50))
    radius_param = f"{lat},{lng},{miles}"
    log = logging.getLogger(__name__)
    cameras_url = f"{OHGO_API_BASE}/api/v1/cameras"
    try:
        with httpx.Client(timeout=12.0) as client:
            resp = client.get(
                cameras_url,
                params={"api-key": OHGO_API_KEY, "radius": radius_param},
            )
            resp.raise_for_status()
            data = resp.json()
    except Exception as e:
        log.warning("OHGO cameras request failed: %s", e)
        return []
    if not isinstance(data, dict):
        return []
    results = data.get("results")
    if not isinstance(results, list):
        return []
    out: List[dict] = []
    for i, cam in enumerate(results):
        if not isinstance(cam, dict):
            continue
        try:
            lat_f = float(cam.get("latitude"))
            lng_f = float(cam.get("longitude"))
        except (TypeError, ValueError):
            continue
        cid = cam.get("id", i)
        loc = cam.get("location") or cam.get("mainRoute") or "Traffic camera"
        route = cam.get("mainRoute") or ""
        out.append({
            "id": f"ohgo-{cid}",
            "type": "camera",
            "lat": lat_f,
            "lng": lng_f,
            "title": str(loc)[:200],
            "description": str(route)[:500],
            "severity": "medium",
            "upvotes": 0,
            "created_at": None,
            "expires_at": None,
            "camera_views": _normalize_ohgo_camera_views(cam),
        })
    return out


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Great-circle distance in km (accurate for map radius filtering)."""
    rlat1, rlng1, rlat2, rlng2 = map(math.radians, (lat1, lng1, lat2, lng2))
    dlat = rlat2 - rlat1
    dlng = rlng2 - rlng1
    a = math.sin(dlat / 2) ** 2 + math.cos(rlat1) * math.cos(rlat2) * math.sin(dlng / 2) ** 2
    c = 2 * math.asin(min(1.0, math.sqrt(a)))
    return 6371.0 * c


# ==================== CAMERA DETAIL (lazy view-fetch for mobile sheet) ====================
@router.get("/map/camera-detail")
def get_camera_detail(
    lat: float = Query(...),
    lng: float = Query(...),
    radius_km: float = Query(default=1.5, ge=0.05, le=20),
):
    """
    Return the OHGO camera nearest to (lat, lng) within radius_km, including full camera_views.
    Used by the mobile TrafficCameraSheet when a marker was loaded without view URLs.
    """
    if not OHGO_API_KEY:
        return {"success": False, "data": None, "error": "OHGO not configured"}
    miles = max(1, min(int(round(radius_km * 0.621371)), 5))
    radius_param = f"{lat},{lng},{miles}"
    log = logging.getLogger(__name__)
    cameras_url = f"{OHGO_API_BASE}/api/v1/cameras"
    try:
        with httpx.Client(timeout=12.0) as client:
            resp = client.get(cameras_url, params={"api-key": OHGO_API_KEY, "radius": radius_param})
            resp.raise_for_status()
            data = resp.json()
    except Exception as e:
        log.warning("OHGO camera-detail request failed: %s", e)
        return {"success": False, "data": None, "error": "OHGO request failed"}

    results = data.get("results") if isinstance(data, dict) else None
    if not isinstance(results, list) or not results:
        return {"success": True, "data": None}

    # Pick the closest camera to the requested coordinates.
    best = None
    best_dist = float("inf")
    for cam in results:
        if not isinstance(cam, dict):
            continue
        try:
            clat, clng = float(cam.get("latitude")), float(cam.get("longitude"))
        except (TypeError, ValueError):
            continue
        d = _haversine_km(lat, lng, clat, clng)
        if d < best_dist:
            best_dist = d
            best = cam

    if not best:
        return {"success": True, "data": None}

    cid = best.get("id", "")
    return {
        "success": True,
        "data": {
            "id": f"ohgo-{cid}",
            "title": str(best.get("location") or best.get("mainRoute") or "Traffic camera")[:200],
            "description": str(best.get("mainRoute") or "")[:500],
            "lat": float(best.get("latitude")),
            "lng": float(best.get("longitude")),
            "camera_views": _normalize_ohgo_camera_views(best),
        },
    }


# ==================== MAP CAMERAS (dedicated, no report-count competition) ====================
@router.get("/map/cameras")
@limiter.limit("60/minute")
def get_map_cameras(
    request: Request,
    lat: float = Query(...),
    lng: float = Query(...),
    radius: float = Query(default=80, ge=0.5, le=100),
):
    """
    Return OHGO traffic cameras for the mobile cameras layer.
    Separated from /map/traffic so cameras are never truncated by the road-report limit.
    """
    cameras: List[dict] = []

    # OHGO (Ohio DOT)
    if OHGO_API_KEY:
        cameras.extend(_fetch_ohgo_cameras(lat, lng, radius))

    # Optional generic cameras API
    if CAMERAS_API_KEY and (CAMERAS_API_URL or "").strip():
        cameras.extend(_fetch_cameras_from_api(lat, lng, radius))

    # Distance filter (haversine; OHGO already radius-filters but a second pass is a no-op cost)
    filtered: List[dict] = []
    for c in cameras:
        clat, clng = c.get("lat"), c.get("lng")
        if clat is None or clng is None:
            continue
        try:
            d = _haversine_km(float(lat), float(lng), float(clat), float(clng))
        except (TypeError, ValueError):
            continue
        if d <= radius:
            filtered.append(c)

    # No OHGO → fall back to seed data cameras so the layer always has something in dev
    if not filtered:
        for r in road_reports_db:
            if r.get("type") == "camera":
                filtered.append(r)

    out = []
    for c in filtered:
        row = {
            "id": c.get("id"),
            "type": "camera",
            "lat": c.get("lat"),
            "lng": c.get("lng"),
            "title": c.get("title", "Traffic camera"),
            "description": c.get("description", ""),
            "severity": "medium",
            "camera_views": c.get("camera_views") if isinstance(c.get("camera_views"), list) else [],
        }
        out.append(row)

    return {"success": True, "data": out, "total": len(out)}


# ==================== MAP TRAFFIC ====================
@router.get("/map/traffic")
@limiter.limit("60/minute")
def get_map_traffic(
    request: Request,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    radius: float = Query(default=15, ge=0.1, le=200),
    limit: int = Query(default=100, ge=1, le=500),
):
    """Return road reports and traffic cameras for map overlay. Merges OHGO (Ohio) when OHGO_API_KEY is set; optional generic CAMERAS_API_URL fetch."""
    reports = []
    try:
        sb = get_supabase()
        try:
            rr = (
                sb.table("road_reports")
                .select("id,type,lat,lng,description,upvotes,created_at,expires_at")
                .eq("status", "active")
                .or_("moderation_status.eq.approved,moderation_status.is.null")
                .limit(300)
                .execute()
            )
        except Exception as mod_err:
            logger.warning("map/traffic road_reports moderation filter skipped: %s", mod_err)
            rr = (
                sb.table("road_reports")
                .select("id,type,lat,lng,description,upvotes,created_at,expires_at")
                .eq("status", "active")
                .limit(300)
                .execute()
            )
        reports = rr.data or []
    except Exception:
        if ENVIRONMENT == "production":
            raise HTTPException(status_code=503, detail="Traffic overlay unavailable")
        reports = list(road_reports_db)
    # Fetch cameras from external API when key and URL are configured
    if lat is not None and lng is not None and CAMERAS_API_KEY and (CAMERAS_API_URL or "").strip():
        external = _fetch_cameras_from_api(lat, lng, radius)
        reports.extend(external)
    # Ohio OHGO cameras (server-side; web DriverApp uses GET /api/map/cameras)
    if lat is not None and lng is not None:
        reports.extend(_fetch_ohgo_cameras(lat, lng, radius))
    # Filter by distance only when lat/lng provided (so external + DB reports near user are shown)
    if lat is not None and lng is not None:
        filtered = []
        for r in reports:
            rlat, rlng = r.get("lat"), r.get("lng")
            if rlat is None or rlng is None:
                continue
            try:
                dist_km = _haversine_km(float(lat), float(lng), float(rlat), float(rlng))
            except (TypeError, ValueError):
                continue
            if dist_km <= radius:
                filtered.append(r)
        reports = filtered
    # If nothing in radius, still return seed data so map always has cameras to show
    if not reports and road_reports_db:
        reports = list(road_reports_db)

    overlays = []
    for r in reports:
        rtype = r.get("type", "hazard")
        severity = "high" if rtype in ("accident", "police") else "medium" if rtype in ("construction", "hazard", "camera") else "low"
        row = {
            "id": r.get("id"),
            "type": rtype,
            "lat": r.get("lat"),
            "lng": r.get("lng"),
            "title": r.get("title", rtype.capitalize()),
            "description": r.get("description", ""),
            "severity": severity,
            "upvotes": r.get("upvotes", 0),
            "created_at": r.get("created_at"),
            "expires_at": r.get("expires_at"),
        }
        if rtype == "camera":
            cv = r.get("camera_views")
            row["camera_views"] = cv if isinstance(cv, list) else []
        overlays.append(row)
    overlays = overlays[:limit]
    return {"success": True, "data": overlays, "total": len(overlays)}


# ==================== NAVIGATION ETA ====================
@router.get("/navigation/eta")
def get_navigation_eta(
    origin_lat: float = Query(...),
    origin_lng: float = Query(...),
    dest_lat: float = Query(...),
    dest_lng: float = Query(...),
    speed_mph: float = Query(30, description="Current speed in mph"),
):
    """Compute ETA from current position to destination based on straight-line distance and speed."""
    dlat = abs(dest_lat - origin_lat)
    dlng = abs(dest_lng - origin_lng)
    distance_km = ((dlat * 111) ** 2 + (dlng * 111) ** 2) ** 0.5
    distance_miles = distance_km * 0.621371
    speed = max(speed_mph, 5)
    eta_minutes = round((distance_miles / speed) * 60)
    return {
        "success": True,
        "data": {
            "distance_miles": round(distance_miles, 2),
            "distance_km": round(distance_km, 2),
            "eta_minutes": eta_minutes,
            "eta_text": f"{eta_minutes} min",
            "speed_mph": speed,
        },
    }


if ENVIRONMENT == "production":
    _LEGACY_PROD_DISABLED = {
        "/api/locations",
        "/api/locations/{location_id}",
        "/api/routes",
        "/api/routes/{route_id}",
        "/api/routes/{route_id}/toggle",
        "/api/routes/{route_id}/notifications",
        "/api/map/directions",
        "/api/widgets",
        "/api/widgets/{widget_id}/toggle",
        "/api/widgets/{widget_id}/collapse",
        "/api/widgets/{widget_id}/position",
    }
    router.routes = [r for r in router.routes if getattr(r, "path", "") not in _LEGACY_PROD_DISABLED]

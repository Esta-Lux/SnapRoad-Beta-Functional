from fastapi import APIRouter, Query, Body
from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime, timedelta
import random, math
from models.schemas import NavigationRequest, Location, Route, Widget
from services.mock_data import (
    saved_locations, saved_routes, widget_settings, MAP_LOCATIONS,
    road_reports_db,
)


class VoiceCommandBody(BaseModel):
    command: str = ""
    lat: Optional[float] = None
    lng: Optional[float] = None

router = APIRouter(prefix="/api", tags=["Navigation"])


# ==================== SAVED LOCATIONS ====================
@router.get("/locations")
def get_locations():
    return {"success": True, "data": saved_locations}


@router.post("/locations")
def add_location(location: Location):
    new_id = max([l.get("id", 0) for l in saved_locations], default=0) + 1
    loc = {"id": new_id, "name": location.name, "address": location.address, "category": location.category, "lat": location.lat, "lng": location.lng, "created_at": datetime.now().isoformat()}
    saved_locations.append(loc)
    return {"success": True, "message": "Location saved", "data": loc}


@router.delete("/locations/{location_id}")
def delete_location(location_id: int):
    saved_locations[:] = [l for l in saved_locations if l.get("id") != location_id]
    return {"success": True, "message": "Location deleted"}


# ==================== ROUTES ====================
@router.get("/routes")
def get_routes():
    return {"success": True, "data": saved_routes}


@router.post("/routes")
def add_route(route: Route):
    new_id = max([r.get("id", 0) for r in saved_routes], default=0) + 1
    r = {"id": new_id, "name": route.name, "origin": route.origin, "destination": route.destination, "departure_time": route.departure_time, "days_active": route.days_active, "notifications": route.notifications, "active": True, "created_at": datetime.now().isoformat()}
    saved_routes.append(r)
    return {"success": True, "message": "Route saved", "data": r}


@router.delete("/routes/{route_id}")
def delete_route(route_id: int):
    before = len(saved_routes)
    saved_routes[:] = [r for r in saved_routes if r.get("id") != route_id]
    if len(saved_routes) == before:
        return {"success": False, "message": "Route not found"}
    return {"success": True, "message": "Route deleted"}


@router.post("/routes/{route_id}/toggle")
@router.put("/routes/{route_id}/toggle")
def toggle_route(route_id: int):
    route = next((r for r in saved_routes if r.get("id") == route_id), None)
    if not route:
        return {"success": False, "message": "Route not found"}
    route["active"] = not route.get("active", True)
    return {"success": True, "data": route}


@router.post("/routes/{route_id}/notifications")
@router.put("/routes/{route_id}/notifications")
def toggle_notifications(route_id: int):
    route = next((r for r in saved_routes if r.get("id") == route_id), None)
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


@router.get("/routes/notifications")
def get_route_notifications(
    lat: Optional[float] = Query(None, description="Current latitude for ETA/leave-by"),
    lng: Optional[float] = Query(None, description="Current longitude for ETA/leave-by"),
    window_minutes: int = Query(60, description="Notify when departure is within this many minutes"),
):
    """Return pending route notifications: reminders, leave-by, and optional faster-route suggestions."""
    now = datetime.now()
    today_weekday = now.strftime("%a")  # Mon, Tue, ...
    current_minutes = now.hour * 60 + now.minute
    notifications: List[Dict[str, Any]] = []

    for route in saved_routes:
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

        # Route reminder
        notifications.append({
            "id": f"reminder-{route_id}-{now.timestamp()}",
            "type": "route_reminder",
            "route_id": route_id,
            "route_name": route_name,
            "destination": destination,
            "departure_time": route.get("departure_time"),
            "message": f"Leave soon for {route_name} — {destination}",
        })

        # Leave-by: if we have user position, compute ETA and leave_by time (mock dest for now)
        if lat is not None and lng is not None:
            # Mock destination: offset from origin so ETA is plausible (e.g. ~5–15 min)
            dest_lat = lat + 0.03 + random.uniform(-0.01, 0.01)
            dest_lng = lng + 0.02 + random.uniform(-0.01, 0.01)
            dlat = abs(dest_lat - lat)
            dlng = abs(dest_lng - lng)
            distance_km = ((dlat * 111) ** 2 + (dlng * 111) ** 2) ** 0.5
            distance_miles = distance_km * 0.621371
            speed = 30
            eta_minutes = max(5, min(45, round((distance_miles / speed) * 60)))
            leave_by_minutes = dep - eta_minutes
            if leave_by_minutes < current_minutes:
                leave_by_minutes = current_minutes
            leave_by_str = _minutes_to_time(leave_by_minutes)
            notifications.append({
                "id": f"leave_early-{route_id}-{now.timestamp()}",
                "type": "leave_early",
                "route_id": route_id,
                "route_name": route_name,
                "destination": destination,
                "departure_time": route.get("departure_time"),
                "leave_by": leave_by_str,
                "eta_minutes": eta_minutes,
                "message": f"Leave by {leave_by_str} to reach {destination} by {route.get('departure_time')}",
            })

    # Optional: one mock "faster route" suggestion
    if saved_routes and random.random() < 0.3:
        eligible = [x for x in saved_routes if x.get("notifications") and x.get("active", True)]
        if eligible:
            r = random.choice(eligible)
            saved_min = random.randint(5, 15)
            saved_d = round(random.uniform(1, 3), 2)
            notifications.append({
                "id": f"faster_route-{r.get('id')}-{now.timestamp()}",
                "type": "faster_route",
                "route_id": r.get("id"),
                "route_name": r.get("name") or "Route",
                "destination": r.get("destination") or "destination",
                "saved_minutes": saved_min,
                "saved_dollars": saved_d,
                "message": f"A faster route could save ~{saved_min} min and ~${saved_d:.2f} on {r.get('name', 'this route')}",
            })

    return {"success": True, "data": notifications, "total": len(notifications)}


class LeaveEarlyBody(BaseModel):
    origin_lat: Optional[float] = None
    origin_lng: Optional[float] = None
    dest_lat: Optional[float] = None
    dest_lng: Optional[float] = None
    desired_arrival: Optional[str] = None  # "HH:MM"


@router.post("/routes/{route_id}/notify-leave-early")
def notify_leave_early(route_id: int, body: Optional[LeaveEarlyBody] = Body(None)):
    """Compute leave-by time for a route so user can arrive by desired time. Returns leave_by and eta_minutes."""
    route = next((r for r in saved_routes if r.get("id") == route_id), None)
    if not route:
        return {"success": False, "message": "Route not found"}
    if body is None:
        body = LeaveEarlyBody()
    desired = body.desired_arrival or route.get("departure_time") or "08:00"
    desired_min = _parse_time(desired)
    if desired_min is None:
        desired_min = 8 * 60

    origin_lat = body.origin_lat if body.origin_lat is not None else 39.9612
    origin_lng = body.origin_lng if body.origin_lng is not None else -82.9988
    dest_lat = body.dest_lat if body.dest_lat is not None else origin_lat + 0.03
    dest_lng = body.dest_lng if body.dest_lng is not None else origin_lng + 0.02

    dlat = abs(dest_lat - origin_lat)
    dlng = abs(dest_lng - origin_lng)
    distance_km = ((dlat * 111) ** 2 + (dlng * 111) ** 2) ** 0.5
    distance_miles = distance_km * 0.621371
    eta_minutes = max(5, round((distance_miles / 30) * 60))
    leave_by_minutes = desired_min - eta_minutes
    now = datetime.now()
    current_minutes = now.hour * 60 + now.minute
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
@router.get("/map/search")
def search_map_locations(q: str = Query(..., min_length=1), lat: Optional[float] = None, lng: Optional[float] = None, limit: int = 8):
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
    dlat = abs(dest_lat - origin_lat)
    dlng = abs(dest_lng - origin_lng)
    distance_km = ((dlat * 111) ** 2 + (dlng * 111) ** 2) ** 0.5
    distance_miles = distance_km * 0.621371
    eta_minutes = int((distance_miles / 30) * 60) + random.randint(2, 8)
    lat_diff = dest_lat - origin_lat
    lng_diff = dest_lng - origin_lng
    direction = ("north" if lat_diff > 0 else "south") if abs(lat_diff) > abs(lng_diff) else ("east" if lng_diff > 0 else "west")
    streets = ["High St", "Broad St", "Main St", "3rd Ave", "Lane Ave"]
    steps = [
        {"instruction": f"Head {direction}", "distance": f"{round(distance_miles * 0.15, 1)} mi", "duration": f"{int(eta_minutes * 0.15)} min", "maneuver": "straight"},
        {"instruction": f"Turn right onto {random.choice(streets)}", "distance": f"{round(distance_miles * 0.35, 1)} mi", "duration": f"{int(eta_minutes * 0.35)} min", "maneuver": "turn-right"},
        {"instruction": f"Turn left onto {random.choice(streets)}", "distance": f"{round(distance_miles * 0.35, 1)} mi", "duration": f"{int(eta_minutes * 0.35)} min", "maneuver": "turn-left"},
        {"instruction": f"Arrive at {dest_name}", "distance": f"{round(distance_miles * 0.15, 1)} mi", "duration": f"{int(eta_minutes * 0.15)} min", "maneuver": "arrive"},
    ]
    return {"success": True, "data": {"origin": {"lat": origin_lat, "lng": origin_lng}, "destination": {"lat": dest_lat, "lng": dest_lng, "name": dest_name}, "distance": {"km": round(distance_km, 2), "miles": round(distance_miles, 2), "text": f"{round(distance_miles, 1)} mi"}, "duration": {"minutes": eta_minutes, "text": f"{eta_minutes} min"}, "steps": steps, "route_type": "fastest", "traffic": random.choice(["light", "moderate", "heavy"])}}


# ==================== WIDGETS ====================
@router.get("/widgets")
def get_widgets():
    return {"success": True, "data": widget_settings}


@router.post("/widgets/{widget_id}/toggle")
@router.put("/widgets/{widget_id}/toggle")
def toggle_widget(widget_id: str):
    if widget_id in widget_settings:
        widget_settings[widget_id]["visible"] = not widget_settings[widget_id]["visible"]
    return {"success": True, "data": widget_settings}


@router.post("/widgets/{widget_id}/collapse")
@router.put("/widgets/{widget_id}/collapse")
def collapse_widget(widget_id: str):
    if widget_id in widget_settings:
        widget_settings[widget_id]["collapsed"] = not widget_settings[widget_id]["collapsed"]
    return {"success": True, "data": widget_settings}


@router.put("/widgets/{widget_id}/position")
def update_widget_position(widget_id: str, body: dict):
    if widget_id in widget_settings:
        widget_settings[widget_id]["position"] = body.get("position", 0)
    return {"success": True, "data": widget_settings}


# ==================== MAP TRAFFIC ====================
# When integrating an external cameras/traffic API, use config.CAMERAS_API_KEY for auth (header or query param).
@router.get("/map/traffic")
def get_map_traffic(lat: Optional[float] = None, lng: Optional[float] = None, radius: float = 15):
    """Return road reports formatted as map overlay data for traffic layer rendering."""
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

    overlays = []
    for r in reports:
        rtype = r.get("type", "hazard")
        severity = "high" if rtype in ("accident", "police") else "medium" if rtype in ("construction", "hazard") else "low"
        overlays.append({
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
        })
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

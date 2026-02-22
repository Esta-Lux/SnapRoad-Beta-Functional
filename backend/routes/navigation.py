from fastapi import APIRouter, Query
from typing import Optional, List
from datetime import datetime
import random
from models.schemas import NavigationRequest, Location, Route, Widget
from services.mock_data import (
    saved_locations, saved_routes, widget_settings, MAP_LOCATIONS,
)

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


@router.post("/routes/{route_id}/toggle")
def toggle_route(route_id: int):
    route = next((r for r in saved_routes if r.get("id") == route_id), None)
    if not route:
        return {"success": False, "message": "Route not found"}
    route["active"] = not route.get("active", True)
    return {"success": True, "data": route}


@router.post("/routes/{route_id}/notifications")
def toggle_notifications(route_id: int):
    route = next((r for r in saved_routes if r.get("id") == route_id), None)
    if not route:
        return {"success": False, "message": "Route not found"}
    route["notifications"] = not route.get("notifications", True)
    return {"success": True, "data": route}


# ==================== NAVIGATION ====================
@router.post("/navigation/start")
def start_navigation(nav: NavigationRequest):
    return {"success": True, "data": {"destination": nav.destination, "eta": "15 min", "distance": "5.2 mi", "active": True}}


@router.post("/navigation/stop")
def stop_navigation():
    return {"success": True, "message": "Navigation stopped"}


@router.post("/navigation/voice-command")
def voice_command(command: str = ""):
    return {"success": True, "data": {"command": command, "response": f"Processing: {command}", "action": "navigate"}}


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
def toggle_widget(widget_id: str):
    if widget_id in widget_settings:
        widget_settings[widget_id]["visible"] = not widget_settings[widget_id]["visible"]
    return {"success": True, "data": widget_settings}


@router.post("/widgets/{widget_id}/collapse")
def collapse_widget(widget_id: str):
    if widget_id in widget_settings:
        widget_settings[widget_id]["collapsed"] = not widget_settings[widget_id]["collapsed"]
    return {"success": True, "data": widget_settings}

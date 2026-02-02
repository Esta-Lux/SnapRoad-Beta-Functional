from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import os

app = FastAPI(title="SnapRoad API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== MODELS ====================
class Location(BaseModel):
    id: Optional[int] = None
    name: str
    address: str
    category: str  # home, work, favorite, gym, school, etc.
    lat: Optional[float] = None
    lng: Optional[float] = None

class Route(BaseModel):
    id: Optional[int] = None
    name: str
    origin: str
    destination: str
    departure_time: str
    days_active: List[str]
    notifications: bool = True

class Offer(BaseModel):
    id: int
    name: str
    offer_type: str
    gems: int
    discount: str
    distance: str

class Widget(BaseModel):
    widget_id: str
    visible: bool
    collapsed: bool
    position: dict  # {x: int, y: int}

class ReportIncident(BaseModel):
    incident_type: str
    location: str
    description: Optional[str] = None

class NavigationRequest(BaseModel):
    destination: str
    origin: Optional[str] = "current_location"

# ==================== IN-MEMORY DATA ====================
saved_locations = [
    {"id": 1, "name": "Home", "address": "123 Oak Street", "category": "home", "lat": 30.2672, "lng": -97.7431},
    {"id": 2, "name": "Work", "address": "Downtown Office", "category": "work", "lat": 30.2700, "lng": -97.7400},
    {"id": 3, "name": "Gym", "address": "FitLife Center", "category": "gym", "lat": 30.2650, "lng": -97.7500},
    {"id": 4, "name": "School", "address": "Lincoln Elementary", "category": "school", "lat": 30.2680, "lng": -97.7380},
    {"id": 5, "name": "Grocery", "address": "Whole Foods Market", "category": "shopping", "lat": 30.2690, "lng": -97.7450},
]

saved_routes = [
    {"id": 1, "name": "Morning Commute", "origin": "Home", "destination": "Work", "departure_time": "07:30", "days_active": ["Mon", "Tue", "Wed", "Thu", "Fri"], "estimated_time": 25, "distance": 12.5, "is_active": True, "notifications": True},
    {"id": 2, "name": "School Pickup", "origin": "Work", "destination": "School", "departure_time": "15:00", "days_active": ["Mon", "Tue", "Wed", "Thu", "Fri"], "estimated_time": 18, "distance": 8.2, "is_active": True, "notifications": True},
]

widget_settings = {
    "score": {"visible": True, "collapsed": False, "position": {"x": 12, "y": 160}},
    "gems": {"visible": True, "collapsed": False, "position": {"x": 280, "y": 160}},
    "speed": {"visible": True, "collapsed": False, "position": {"x": 12, "y": 400}},
    "eta": {"visible": True, "collapsed": False, "position": {"x": 280, "y": 400}},
}

user_data = {
    "id": 1,
    "name": "Sarah Johnson",
    "email": "sarah@example.com",
    "gems": 12400,
    "level": 42,
    "safety_score": 87,
    "streak": 14,
    "total_miles": 2847,
    "total_trips": 156,
    "badges_earned": 11,
    "rank": 42,
    "is_premium": True,
    "member_since": "Jan 2025"
}

# ==================== HEALTH ====================
@app.get("/api/health")
def health():
    return {"status": "ok", "service": "snaproad-api", "timestamp": datetime.now().isoformat()}

@app.get("/")
def root():
    return {"message": "SnapRoad API - All endpoints ready"}

# ==================== USER ====================
@app.get("/api/user/profile")
def get_user_profile():
    return {"success": True, "data": user_data}

@app.put("/api/user/profile")
def update_user_profile(name: Optional[str] = None, email: Optional[str] = None):
    if name:
        user_data["name"] = name
    if email:
        user_data["email"] = email
    return {"success": True, "message": "Profile updated", "data": user_data}

@app.get("/api/user/stats")
def get_user_stats():
    return {
        "success": True,
        "data": {
            "gems": user_data["gems"],
            "safety_score": user_data["safety_score"],
            "level": user_data["level"],
            "streak": user_data["streak"],
            "rank": user_data["rank"],
            "total_miles": user_data["total_miles"],
            "total_trips": user_data["total_trips"]
        }
    }

# ==================== LOCATIONS ====================
@app.get("/api/locations")
def get_locations(category: Optional[str] = None):
    if category:
        filtered = [loc for loc in saved_locations if loc["category"] == category]
        return {"success": True, "data": filtered}
    return {"success": True, "data": saved_locations}

@app.post("/api/locations")
def add_location(location: Location):
    new_id = max([loc["id"] for loc in saved_locations], default=0) + 1
    new_location = {
        "id": new_id,
        "name": location.name,
        "address": location.address,
        "category": location.category,
        "lat": location.lat or 30.2672,
        "lng": location.lng or -97.7431
    }
    saved_locations.append(new_location)
    return {"success": True, "message": f"Location '{location.name}' added", "data": new_location}

@app.delete("/api/locations/{location_id}")
def delete_location(location_id: int):
    global saved_locations
    saved_locations = [loc for loc in saved_locations if loc["id"] != location_id]
    return {"success": True, "message": "Location deleted"}

@app.put("/api/locations/{location_id}")
def update_location(location_id: int, location: Location):
    for loc in saved_locations:
        if loc["id"] == location_id:
            loc["name"] = location.name
            loc["address"] = location.address
            loc["category"] = location.category
            return {"success": True, "message": "Location updated", "data": loc}
    raise HTTPException(status_code=404, detail="Location not found")

# ==================== ROUTES ====================
@app.get("/api/routes")
def get_routes():
    return {"success": True, "data": saved_routes, "total": len(saved_routes), "max": 20}

@app.post("/api/routes")
def add_route(route: Route):
    if len(saved_routes) >= 20:
        raise HTTPException(status_code=400, detail="Maximum 20 routes allowed")
    new_id = max([r["id"] for r in saved_routes], default=0) + 1
    new_route = {
        "id": new_id,
        "name": route.name,
        "origin": route.origin,
        "destination": route.destination,
        "departure_time": route.departure_time,
        "days_active": route.days_active,
        "estimated_time": 20,
        "distance": 10.0,
        "is_active": True,
        "notifications": route.notifications
    }
    saved_routes.append(new_route)
    return {"success": True, "message": f"Route '{route.name}' created", "data": new_route}

@app.delete("/api/routes/{route_id}")
def delete_route(route_id: int):
    global saved_routes
    saved_routes = [r for r in saved_routes if r["id"] != route_id]
    return {"success": True, "message": "Route deleted"}

@app.put("/api/routes/{route_id}/toggle")
def toggle_route(route_id: int):
    for route in saved_routes:
        if route["id"] == route_id:
            route["is_active"] = not route["is_active"]
            return {"success": True, "message": f"Route {'activated' if route['is_active'] else 'paused'}", "data": route}
    raise HTTPException(status_code=404, detail="Route not found")

@app.put("/api/routes/{route_id}/notifications")
def toggle_route_notifications(route_id: int):
    for route in saved_routes:
        if route["id"] == route_id:
            route["notifications"] = not route["notifications"]
            return {"success": True, "message": f"Notifications {'enabled' if route['notifications'] else 'disabled'}", "data": route}
    raise HTTPException(status_code=404, detail="Route not found")

# ==================== NAVIGATION ====================
@app.post("/api/navigation/start")
def start_navigation(nav: NavigationRequest):
    return {
        "success": True,
        "message": f"Navigation started to {nav.destination}",
        "data": {
            "destination": nav.destination,
            "origin": nav.origin,
            "eta": "25 min",
            "distance": "12.5 mi",
            "route_id": "nav_" + str(int(datetime.now().timestamp()))
        }
    }

@app.post("/api/navigation/stop")
def stop_navigation():
    return {"success": True, "message": "Navigation stopped"}

@app.post("/api/navigation/voice-command")
def voice_command():
    return {
        "success": True,
        "message": "Voice command processed",
        "data": {"command": "Navigate to Work", "action": "navigation_start"}
    }

# ==================== WIDGETS ====================
@app.get("/api/widgets")
def get_widget_settings():
    return {"success": True, "data": widget_settings}

@app.put("/api/widgets/{widget_id}")
def update_widget(widget_id: str, widget: Widget):
    if widget_id in widget_settings:
        widget_settings[widget_id] = {
            "visible": widget.visible,
            "collapsed": widget.collapsed,
            "position": widget.position
        }
        return {"success": True, "message": f"Widget '{widget_id}' updated", "data": widget_settings[widget_id]}
    raise HTTPException(status_code=404, detail="Widget not found")

@app.put("/api/widgets/{widget_id}/toggle")
def toggle_widget_visibility(widget_id: str):
    if widget_id in widget_settings:
        widget_settings[widget_id]["visible"] = not widget_settings[widget_id]["visible"]
        return {"success": True, "message": f"Widget visibility toggled", "data": widget_settings[widget_id]}
    raise HTTPException(status_code=404, detail="Widget not found")

@app.put("/api/widgets/{widget_id}/collapse")
def toggle_widget_collapse(widget_id: str):
    if widget_id in widget_settings:
        widget_settings[widget_id]["collapsed"] = not widget_settings[widget_id]["collapsed"]
        return {"success": True, "message": f"Widget collapse toggled", "data": widget_settings[widget_id]}
    raise HTTPException(status_code=404, detail="Widget not found")

@app.put("/api/widgets/{widget_id}/position")
def update_widget_position(widget_id: str, x: int, y: int):
    if widget_id in widget_settings:
        widget_settings[widget_id]["position"] = {"x": x, "y": y}
        return {"success": True, "message": "Widget position updated", "data": widget_settings[widget_id]}
    raise HTTPException(status_code=404, detail="Widget not found")

# ==================== OFFERS ====================
@app.get("/api/offers")
def get_offers(offer_type: Optional[str] = None):
    offers = [
        {"id": 1, "name": "Shell Gas", "type": "gas", "gems": 50, "discount": "10¢/gal off", "distance": "0.5 mi", "trending": True, "expires": "2h", "rating": 4.5},
        {"id": 2, "name": "Starbucks", "type": "cafe", "gems": 30, "discount": "20% off", "distance": "0.8 mi", "trending": False, "expires": "1d", "rating": 4.8},
        {"id": 3, "name": "QuickMart", "type": "gas", "gems": 45, "discount": "15¢/gal off", "distance": "1.2 mi", "trending": True, "expires": "5h", "rating": 4.2},
        {"id": 4, "name": "Dunkin", "type": "cafe", "gems": 25, "discount": "Free donut", "distance": "1.5 mi", "trending": False, "expires": "3d", "rating": 4.3},
    ]
    if offer_type:
        offers = [o for o in offers if o["type"] == offer_type]
    return {"success": True, "data": offers, "total_savings": "$127.50"}

@app.post("/api/offers/{offer_id}/redeem")
def redeem_offer(offer_id: int):
    return {
        "success": True,
        "message": "Offer redeemed successfully!",
        "data": {"offer_id": offer_id, "redemption_code": f"SNAP{offer_id}2025"}
    }

@app.post("/api/offers/{offer_id}/favorite")
def toggle_offer_favorite(offer_id: int):
    return {"success": True, "message": "Offer favorited"}

# ==================== INCIDENTS ====================
@app.post("/api/incidents/report")
def report_incident(report: ReportIncident):
    gems_reward = {"pothole": 15, "accident": 50, "construction": 10, "hazard": 25}.get(report.incident_type, 10)
    return {
        "success": True,
        "message": f"Incident reported! +{gems_reward} gems earned",
        "data": {
            "incident_id": int(datetime.now().timestamp()),
            "type": report.incident_type,
            "gems_earned": gems_reward,
            "status": "pending_verification"
        }
    }

@app.get("/api/incidents/my-reports")
def get_my_reports():
    reports = [
        {"id": 1, "type": "pothole", "location": "Main St & 5th Ave", "time": "2h ago", "gems": 15, "status": "verified", "upvotes": 12},
        {"id": 2, "type": "accident", "location": "Highway 71 Mile 42", "time": "5h ago", "gems": 50, "status": "active", "upvotes": 34},
    ]
    return {"success": True, "data": reports, "total_gems_earned": sum(r["gems"] for r in reports)}

# ==================== FAMILY ====================
@app.get("/api/family/members")
def get_family_members():
    members = [
        {"id": 1, "name": "Mom", "status": "driving", "location": "Highway 71 N", "battery": 78, "distance": "12 mi", "speed": 65, "eta": "15 min"},
        {"id": 2, "name": "Dad", "status": "parked", "location": "Work - Downtown", "battery": 45, "distance": "8 mi", "speed": 0, "eta": "-"},
        {"id": 3, "name": "Emma", "status": "offline", "location": "Last: School", "battery": 23, "distance": "3 mi", "last_seen": "2h ago"},
    ]
    return {"success": True, "data": members, "online_count": 2}

@app.post("/api/family/{member_id}/call")
def call_family_member(member_id: int):
    return {"success": True, "message": "Initiating call..."}

@app.post("/api/family/{member_id}/message")
def message_family_member(member_id: int):
    return {"success": True, "message": "Opening chat..."}

@app.post("/api/family/share-location")
def share_location():
    return {"success": True, "message": "Location shared with family"}

# ==================== BADGES & ENGAGEMENT ====================
@app.get("/api/badges")
def get_badges(filter_type: Optional[str] = None):
    badges = [
        {"id": 1, "name": "First Mile", "desc": "Drive your first mile", "progress": 100, "earned": True, "gems": 10, "category": "distance"},
        {"id": 2, "name": "Century Club", "desc": "Drive 100 miles total", "progress": 100, "earned": True, "gems": 50, "category": "distance"},
        {"id": 3, "name": "Safety First", "desc": "Achieve 95+ safety score", "progress": 92, "earned": False, "gems": 100, "category": "safety"},
        {"id": 4, "name": "Road Guardian", "desc": "Report 10 incidents", "progress": 70, "earned": False, "gems": 75, "category": "community"},
    ]
    if filter_type == "earned":
        badges = [b for b in badges if b["earned"]]
    elif filter_type == "locked":
        badges = [b for b in badges if not b["earned"]]
    return {"success": True, "data": badges, "total_earned": sum(1 for b in badges if b["earned"]), "total": len(badges)}

@app.get("/api/skins")
def get_skins():
    skins = [
        {"id": 1, "name": "Neon Pulse", "gradient": "from-emerald-400 to-blue-500", "owned": True, "equipped": True, "price": 0, "rarity": "common"},
        {"id": 2, "name": "Midnight", "gradient": "from-slate-700 to-slate-900", "owned": True, "equipped": False, "price": 0, "rarity": "common"},
        {"id": 3, "name": "Fire Storm", "gradient": "from-red-500 to-orange-400", "owned": False, "equipped": False, "price": 800, "rarity": "rare"},
    ]
    return {"success": True, "data": skins}

@app.post("/api/skins/{skin_id}/equip")
def equip_skin(skin_id: int):
    return {"success": True, "message": "Skin equipped!"}

@app.post("/api/skins/{skin_id}/purchase")
def purchase_skin(skin_id: int):
    return {"success": True, "message": "Skin purchased!"}

# ==================== SETTINGS ====================
@app.put("/api/settings/voice")
def toggle_voice(muted: bool):
    return {"success": True, "message": f"Voice {'muted' if muted else 'unmuted'}"}

@app.put("/api/settings/notifications")
def update_notification_settings(enabled: bool):
    return {"success": True, "message": f"Notifications {'enabled' if enabled else 'disabled'}"}

@app.get("/api/settings/all")
def get_all_settings():
    return {
        "success": True,
        "data": {
            "voice_muted": False,
            "notifications_enabled": True,
            "dark_mode": True,
            "traffic_layer": True,
            "3d_buildings": False
        }
    }

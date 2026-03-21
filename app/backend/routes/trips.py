from fastapi import APIRouter
from typing import Optional
from datetime import datetime, timedelta
from models.schemas import TripResult, FuelLog, ReportIncident
from pydantic import BaseModel
from uuid import uuid4
from services.mock_data import (
    users_db, current_user_id, trips_db, fuel_logs, fuel_stats, FUEL_PRICES, XP_CONFIG,
)
from routes.gamification import add_xp_to_user

router = APIRouter(prefix="/api", tags=["Trips"])


# ==================== TRIP HISTORY ====================

@router.get("/trips")
def get_trips(page: int = 1, limit: int = 20):
    
    start = (page - 1) * limit
    end = start + limit

    total = len(trips_db)
    trips = trips_db[start:end]

    return {
        "success": True,
        "data": {
            "items": trips,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "total_pages": (total + limit - 1) // limit
            }
        }
    }

@router.get("/trips/${id}")
def get_trip_by_id(trip_id: int):
    trip = next((t for t in trips_db if t[trip_id] == trip_id), None) # Consider switching to a dictionary system for Trips_db because this is O(n)

    if not trip:
        return {
            "success": False,
            "message": "Trip not found"
        }

    return {
        "success": True,
        "data": trip
    }

@router.post("/trips/start") # TODO: Determine how we're going to format trips ultimately
def start_trip(startLocation: str): # Consider Implementing BaseModel later, instead of raw strings/dicts
    new_id = str(uuid4())
    now = datetime.now()

    trip = {
        "id": new_id,
        "date": now.strftime("%Y-%m-%d"),
        "time": now.strftime("%I:%M %p"),
        "origin": startLocation,
        "destination": trip.destination or "End",
        "active": True,
        "events": [],
        
    }

    trips_db.append(trip)
    return {
        "success": True,
        "data": trip
    }


@router.get("/trips/history")
def get_trip_history():
    user = users_db.get(current_user_id, {})
    return {
        "success": True,
        "data": {
            "recent_trips": trips_db[:10],
            "total_trips": user.get("total_trips", 0),
            "total_miles": user.get("total_miles", 0),
        },
    }

@router.post("/trips/${tripId}/end")
def end_trip(trip_id: str, endLocation: str):
    user = users_db.get(current_user_id, {})
    user = users_db.get(current_user_id, {})

    #TODO: Calculate distance / implement
    #gems_earned = int(distance * 2)
    #xp_earned = int(distance * 100)
    #if current_user_id in users_db:
        #users_db[current_user_id]["total_trips"] = user.get("total_trips", 0) + 1
        #users_db[current_user_id]["total_miles"] = user.get("total_miles", 0) + distance
        #users_db[current_user_id]["gems"] = user.get("gems", 0) + gems_earned
    trip = next((t for t in trips_db if t["id"] == trip_id), None)
    if not trip:
        return {"success": False, "message": "Trip not found"}
    trip["active"] = False

    return {
        "success": True,
        "data": {
            "id": trip_id,
            "message": "Trip completed!",
        }
    }




@router.post("/trips/complete") # TODO: Unsure how to reconcile this with end trip, have replaced
def complete_trip(distance: float = 5.0, duration: int = 15):
    user = users_db.get(current_user_id, {})
    gems_earned = int(distance * 2)
    xp_earned = int(distance * 100)
    if current_user_id in users_db:
        users_db[current_user_id]["total_trips"] = user.get("total_trips", 0) + 1
        users_db[current_user_id]["total_miles"] = user.get("total_miles", 0) + distance
        users_db[current_user_id]["gems"] = user.get("gems", 0) + gems_earned
    return {"success": True, "data": {"gems_earned": gems_earned, "xp_earned": xp_earned, "total_miles": users_db.get(current_user_id, {}).get("total_miles", 0)}}


@router.post("/trips/complete-with-safety")
def complete_trip_with_safety(trip: TripResult):
    user = users_db.get(current_user_id, {})
    metrics = trip.safety_metrics or {}
    is_safe_drive = metrics.get("hard_brakes", 0) == 0 and metrics.get("speeding_incidents", 0) == 0 and metrics.get("phone_usage", 0) == 0
    old_safety_score = user.get("safety_score", 85)
    penalties = metrics.get("hard_brakes", 0) * 2 + metrics.get("speeding_incidents", 0) * 3 + metrics.get("phone_usage", 0) * 5
    new_safety_score = min(100, old_safety_score + 1) if is_safe_drive else max(0, old_safety_score - penalties)
    if trip.safety_score is not None:
        new_safety_score = round(float(trip.safety_score), 1)

    if current_user_id in users_db:
        users_db[current_user_id]["safety_score"] = new_safety_score
        users_db[current_user_id]["total_trips"] = user.get("total_trips", 0) + 1
        users_db[current_user_id]["total_miles"] = user.get("total_miles", 0) + trip.distance

    total_xp = 0
    xp_changes = []
    if is_safe_drive:
        total_xp += XP_CONFIG["safe_drive"]
        xp_changes.append({"type": "safe_drive", "xp": XP_CONFIG["safe_drive"]})
        old_streak = user.get("safe_drive_streak", 0)
        new_streak = old_streak + 1
        users_db[current_user_id]["safe_drive_streak"] = new_streak
        if new_streak % 3 == 0:
            total_xp += XP_CONFIG["consistent_driving"]
            xp_changes.append({"type": "consistent_bonus", "xp": XP_CONFIG["consistent_driving"]})
    else:
        users_db[current_user_id]["safe_drive_streak"] = 0
        if new_safety_score < old_safety_score:
            total_xp += XP_CONFIG["safety_score_penalty"]
            xp_changes.append({"type": "safety_penalty", "xp": XP_CONFIG["safety_score_penalty"]})

    xp_result = add_xp_to_user(current_user_id, total_xp) if total_xp != 0 else {}
    gem_multiplier = user.get("gem_multiplier", 1)
    gems_earned = 5 * gem_multiplier
    if current_user_id in users_db:
        users_db[current_user_id]["gems"] = user.get("gems", 0) + gems_earned

    # Record trip for real-time history and analytics (single source of truth for map, route history, trip analytics)
    now = datetime.now()
    route_coords = trip.route_coordinates
    if route_coords and isinstance(route_coords[0], dict):
        route_coords = [{"lat": float(c.get("lat", 0)), "lng": float(c.get("lng", 0))} for c in route_coords]
    else:
        route_coords = []
    duration_min = max(1, trip.duration)
    fuel_used = trip.distance / 30.0 if trip.distance else 0.1
    new_id = str(uuid4())
    trips_db.append({
        "id": new_id,
        "date": now.strftime("%Y-%m-%d"),
        "time": now.strftime("%I:%M %p"),
        "origin": trip.origin or "Start",
        "destination": trip.destination or "End",
        "distance_miles": round(trip.distance, 1),
        "duration_minutes": duration_min,
        "safety_score": new_safety_score,
        "gems_earned": gems_earned,
        "xp_earned": total_xp or int(trip.distance * 10),
        "fuel_used_gallons": round(fuel_used, 3),
        "avg_speed_mph": round(trip.distance / (duration_min / 60), 1) if duration_min else 0,
        "route_coordinates": route_coords,
        "events": [],
    })

    return {
        "success": True,
        "message": "Trip completed!",
        "data": {
            "is_safe_drive": is_safe_drive,
            "safety_score": {"old": old_safety_score, "new": new_safety_score, "change": new_safety_score - old_safety_score},
            "xp": {"changes": xp_changes, "total_earned": total_xp, "result": xp_result},
            "gems": {"earned": gems_earned, "multiplier": gem_multiplier},
            "safe_drive_streak": users_db[current_user_id].get("safe_drive_streak", 0),
            "trip_id": new_id,
        },
    }


@router.get("/trips/history/detailed")
def get_detailed_trip_history(days: int = 30, limit: int = 50, sort_by: str = "date"):
    cutoff_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
    filtered = [t for t in trips_db if t["date"] >= cutoff_date][:limit]
    total_distance = sum(t["distance_miles"] for t in filtered)
    total_fuel = sum(t["fuel_used_gallons"] for t in filtered)
    total_duration = sum(t["duration_minutes"] for t in filtered)
    avg_safety = sum(t["safety_score"] for t in filtered) / max(len(filtered), 1)
    total_gems = sum(t["gems_earned"] for t in filtered)
    baseline_fuel = total_distance / 25
    fuel_saved = baseline_fuel - total_fuel
    money_saved = fuel_saved * FUEL_PRICES["regular"]
    return {
        "success": True,
        "data": {
            "trips": filtered,
            "analytics": {
                "total_trips": len(filtered), "total_distance_miles": round(total_distance, 1),
                "total_fuel_gallons": round(total_fuel, 2), "total_duration_minutes": total_duration,
                "total_duration_hours": round(total_duration / 60, 1), "avg_safety_score": round(avg_safety, 1),
                "total_gems_earned": round(total_gems), "avg_mpg": round(total_distance / max(total_fuel, 0.1), 1),
                "fuel_saved_gallons": round(max(fuel_saved, 0), 2), "money_saved_dollars": round(max(money_saved, 0), 2),
                "co2_saved_lbs": round(max(fuel_saved, 0) * 19.6, 1),
            },
        },
    }


@router.post("/trips/{trip_id}/share")
def share_trip(trip_id: int): 
    trip = next((t for t in trips_db if t["id"] == trip_id), None)
    if not trip:
        return {"success": False, "message": "Trip not found"}
    share_url = f"https://snaproad.app/trip/{trip_id}"
    return {"success": True, "data": {"share_url": share_url, "trip_summary": f"I drove {trip['distance_miles']} miles with a {trip['safety_score']} safety score!"}}


# ==================== FUEL ====================
@router.get("/fuel/history")
def get_fuel_logs():
    return {"success": True, "data": fuel_logs}


@router.post("/fuel/logs")
def log_fuel(entry: FuelLog):
    new_id = str(uuid4())
    new_entry = {"id": new_id, "date": entry.date, "station": entry.station, "price_per_gallon": entry.price_per_gallon, "gallons": entry.gallons, "total": entry.total}
    fuel_logs.insert(0, new_entry)
    return {"success": True, "message": "Fuel log entry added", "data": new_entry}

@router.get("/fuel/logs")
def get_fuel_logs(page: int = 1, limit: int = 20):
    
    start = (page - 1) * limit
    end = start + limit

    total = len(trips_db)
    trips = trips_db[start:end]

    return {
        "success": True,
        "data": {
            "items": fuel_logs,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "total_pages": (total + limit - 1) // limit
            }
        }
    }


@router.get("/fuel/trends")
def get_fuel_trends():
    total_gallons = sum(f["gallons"] for f in fuel_logs)
    total_spent = sum(f["total"] for f in fuel_logs)
    avg_price = total_spent / total_gallons if total_gallons > 0 else 0
    return {"success": True, "data": {"total_gallons": round(total_gallons, 1), "total_spent": round(total_spent, 2), "avg_price_per_gallon": round(avg_price, 2), "entries": len(fuel_logs), "monthly_avg_gallons": round(total_gallons / 3, 1)}}


@router.get("/fuel/prices")
def get_fuel_prices(lat: float = 39.9612, lng: float = -82.9988):
    return {
        "success": True,
        "data": {
            "prices": FUEL_PRICES,
            "nearby_stations": [
                {"name": "Shell", "address": "123 Main St", "regular": 3.19, "distance_miles": 0.5},
                {"name": "BP", "address": "456 Oak Ave", "regular": 3.29, "distance_miles": 0.8},
                {"name": "Speedway", "address": "789 Elm Rd", "regular": 3.25, "distance_miles": 1.2},
            ],
            "location": {"lat": lat, "lng": lng},
        },
    }

@router.get("/api/fuel/stats")
def get_fuel_stats():
    return {
        "success": True,
        "data": fuel_stats
    }

@router.get("/fuel/analytics")
def get_fuel_analytics(months: int = 3):
    monthly_data = []
    for i in range(months):
        month_date = datetime.now() - timedelta(days=30 * i)
        month_trips = [t for t in trips_db if t["date"].startswith(month_date.strftime("%Y-%m"))]
        distance = sum(t["distance_miles"] for t in month_trips)
        fuel = sum(t["fuel_used_gallons"] for t in month_trips)
        monthly_data.append({"month": month_date.strftime("%B %Y"), "trips": len(month_trips), "distance_miles": round(distance, 1), "fuel_gallons": round(fuel, 2), "avg_mpg": round(distance / max(fuel, 0.1), 1), "cost_estimate": round(fuel * FUEL_PRICES["regular"], 2)})
    return {"success": True, "data": {"monthly_breakdown": monthly_data, "current_fuel_price": FUEL_PRICES["regular"], "vehicle_efficiency": {"your_avg_mpg": 31.2, "national_avg_mpg": 25.4, "efficiency_rating": "Excellent"}}}


# ==================== INCIDENTS ====================
@router.post("/incidents/report")
def report_incident(incident: ReportIncident):
    return {"success": True, "message": f"Incident '{incident.incident_type}' reported. Thank you for keeping roads safe!"}


# ==================== 3D ROUTE HISTORY ====================
@router.get("/routes/history-3d")
def get_route_history_3d(days: int = 90, limit: int = 100):
    cutoff_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
    filtered = [t for t in trips_db if t["date"] >= cutoff_date][:limit]
    route_groups = {}
    for trip in filtered:
        key = f"{trip['origin']}->{trip['destination']}"
        if key not in route_groups:
            route_groups[key] = {"route_name": key, "origin": trip["origin"], "destination": trip["destination"], "trips": [], "total_distance": 0, "total_trips": 0, "coordinates": trip.get("route_coordinates", [])}
        route_groups[key]["trips"].append(trip)
        route_groups[key]["total_distance"] += trip["distance_miles"]
        route_groups[key]["total_trips"] += 1
    routes_3d = []
    for key, data in route_groups.items():
        avg_safety = sum(t["safety_score"] for t in data["trips"]) / len(data["trips"])
        last_traveled = max(t.get("date", "") for t in data["trips"]) if data["trips"] else None
        routes_3d.append({
            "id": key, "route_name": data["route_name"], "origin": data["origin"], "destination": data["destination"],
            "total_trips": data["total_trips"], "total_distance_miles": round(data["total_distance"], 1),
            "avg_safety_score": round(avg_safety, 1), "coordinates": data["coordinates"],
            "color_intensity": min(data["total_trips"] / 10, 1), "last_traveled": last_traveled
        })
    routes_3d.sort(key=lambda x: x["total_trips"], reverse=True)
    total_distance = sum(r["total_distance_miles"] for r in routes_3d)
    return {"success": True, "data": {"routes": routes_3d, "center": {"lat": 39.9612, "lng": -82.9988}, "total_unique_routes": len(routes_3d), "total_trips": sum(r["total_trips"] for r in routes_3d), "total_distance": total_distance}}

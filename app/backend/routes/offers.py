from fastapi import APIRouter, Query
from typing import Optional
from datetime import datetime, timedelta
import random
from models.schemas import OfferCreate, BulkOfferUpload
from services.mock_data import (
    offers_db, users_db, current_user_id, OFFER_CONFIG,
    generated_images_db, driver_location_history,
)
from models.schemas import ImageGenerateRequest, LocationVisit
from services.supabase_service import _sb
import uuid

router = APIRouter(prefix="/api", tags=["Offers"])


@router.get("/offers")
def get_offers():
    """Get all active offers from database (both admin and partner offers)"""
    try:
        sb = _sb()
        # Fetch all active offers from the database
        result = sb.table("offers").select("*").eq("status", "active").execute()
        
        if result.data:
            # Format offers for driver app
            offers = []
            for offer in result.data:
                offers.append({
                    "id": offer.get("id"),
                    "business_name": offer.get("business_name", ""),
                    "business_type": offer.get("business_type", "retail"),
                    "description": offer.get("description", ""),
                    "discount_percent": offer.get("discount_percent", 0),
                    "gems_reward": offer.get("base_gems", 0),
                    "base_gems": offer.get("base_gems", 0),
                    "address": offer.get("address"),
                    "lat": offer.get("lat", 0),
                    "lng": offer.get("lng", 0),
                    "offer_url": offer.get("offer_url"),
                    "expires_at": offer.get("expires_at", ""),
                    "is_admin_offer": offer.get("is_admin_offer", False),
                    "created_by": offer.get("created_by", ""),
                    "redemption_count": offer.get("redemption_count", 0),
                    "views": offer.get("views", 0),
                    "redeemed": False,  # TODO: Track per-user redemptions
                })
            
            return {
                "success": True,
                "data": offers,
                "discount_info": {
                    "free_discount": OFFER_CONFIG["free_discount_percent"],
                    "premium_discount": OFFER_CONFIG["premium_discount_percent"]
                },
                "total_savings": sum(o.get("discount_percent", 0) for o in offers)
            }
        else:
            # Fallback to mock data if no database offers
            return {
                "success": True,
                "data": offers_db,
                "discount_info": {
                    "free_discount": OFFER_CONFIG["free_discount_percent"],
                    "premium_discount": OFFER_CONFIG["premium_discount_percent"]
                }
            }
    except Exception as e:
        # Fallback to mock data on error
        return {
            "success": True,
            "data": offers_db,
            "discount_info": {
                "free_discount": OFFER_CONFIG["free_discount_percent"],
                "premium_discount": OFFER_CONFIG["premium_discount_percent"]
            }
        }


@router.post("/offers")
def create_offer(offer: OfferCreate):
    new_id = max([o["id"] for o in offers_db], default=0) + 1
    new_offer = {
        "id": new_id,
        "business_name": offer.business_name,
        "business_type": offer.business_type,
        "description": offer.description,
        "base_gems": offer.base_gems,
        "address": offer.address,
        "lat": offer.lat,
        "lng": offer.lng,
        "offer_url": offer.offer_url,
        "is_admin_offer": offer.is_admin_offer,
        "created_at": datetime.now().isoformat(),
        "expires_at": (datetime.now() + timedelta(hours=offer.expires_hours)).isoformat(),
        "created_by": "admin" if offer.is_admin_offer else "business",
        "redemption_count": 0,
    }
    offers_db.append(new_offer)
    return {"success": True, "data": new_offer}


@router.post("/offers/{offer_id}/redeem")
def redeem_offer(offer_id: int):
    offer = next((o for o in offers_db if o["id"] == offer_id), None)
    if not offer:
        return {"success": False, "message": "Offer not found"}
    user = users_db.get(current_user_id, {})
    is_premium = user.get("is_premium", False)
    discount = OFFER_CONFIG["premium_discount_percent"] if is_premium else OFFER_CONFIG["free_discount_percent"]
    gem_reward = offer["base_gems"] * (2 if is_premium else 1)
    if current_user_id in users_db:
        users_db[current_user_id]["gems"] = user.get("gems", 0) + gem_reward
    offer["redemption_count"] = offer.get("redemption_count", 0) + 1
    return {
        "success": True,
        "data": {
            "discount_percent": discount,
            "gems_earned": gem_reward,
            "new_gem_total": users_db.get(current_user_id, {}).get("gems", 0),
        },
    }


@router.get("/offers/nearby")
def get_nearby_offers(lat: float = 39.9612, lng: float = -82.9988, radius: float = 10.0):
    nearby = []
    for offer in offers_db:
        dlat = abs(offer["lat"] - lat)
        dlng = abs(offer["lng"] - lng)
        dist_km = ((dlat * 111) ** 2 + (dlng * 111) ** 2) ** 0.5
        if dist_km <= radius:
            nearby.append({**offer, "distance_km": round(dist_km, 2)})
    nearby.sort(key=lambda x: x["distance_km"])
    return {"success": True, "data": nearby}


@router.get("/offers/on-route")
def get_offers_on_route(origin_lat: float = 39.9612, origin_lng: float = -82.9988, dest_lat: float = 40.0067, dest_lng: float = -83.0305):
    route_offers = []
    mid_lat = (origin_lat + dest_lat) / 2
    mid_lng = (origin_lng + dest_lng) / 2
    for offer in offers_db:
        dlat = abs(offer["lat"] - mid_lat)
        dlng = abs(offer["lng"] - mid_lng)
        dist = ((dlat * 111) ** 2 + (dlng * 111) ** 2) ** 0.5
        if dist <= 5:
            route_offers.append({**offer, "distance_km": round(dist, 2)})
    return {"success": True, "data": route_offers}


@router.get("/offers/personalized")
def get_personalized_offers(lat: float = 39.9612, lng: float = -82.9988, limit: int = 2):
    user = users_db.get(current_user_id, {})
    history = driver_location_history.get(current_user_id, [])
    visited_types = {}
    for visit in history:
        if visit.get("business_type"):
            visited_types[visit["business_type"]] = visited_types.get(visit["business_type"], 0) + 1
    scored = []
    for offer in offers_db:
        if datetime.fromisoformat(offer["expires_at"]) < datetime.now():
            continue
        dlat = abs(offer["lat"] - lat)
        dlng = abs(offer["lng"] - lng)
        dist = ((dlat * 111) ** 2 + (dlng * 111) ** 2) ** 0.5
        score = 100 - (dist * 10)
        if offer.get("business_type") in visited_types:
            score += visited_types[offer["business_type"]] * 5
        discount = OFFER_CONFIG["premium_discount_percent"] if user.get("is_premium") else OFFER_CONFIG["free_discount_percent"]
        scored.append({**offer, "score": score, "distance_km": round(dist, 2), "discount_percent": discount})
    scored.sort(key=lambda x: x["score"], reverse=True)
    return {"success": True, "data": scored[:limit], "voice_prompt": f"I found {min(limit, len(scored))} great offers for you nearby!"}


@router.post("/offers/{offer_id}/accept-voice")
def accept_offer_via_voice(offer_id: int, add_as_stop: bool = True):
    offer = next((o for o in offers_db if o["id"] == offer_id), None)
    if not offer:
        return {"success": False, "message": "Offer not found"}
    return {
        "success": True,
        "message": f"Great! I'll add {offer['business_name']} as a stop on your route.",
        "data": {"offer": offer, "navigation_action": "add_waypoint" if add_as_stop else "show_details", "waypoint": {"lat": offer["lat"], "lng": offer["lng"], "name": offer["business_name"]}},
    }


@router.post("/offers/{offer_id}/favorite")
def favorite_offer(offer_id: int):
    offer = next((o for o in offers_db if o["id"] == offer_id), None)
    if not offer:
        return {"success": False, "message": "Offer not found"}
    offer["favorited"] = not offer.get("favorited", False)
    return {"success": True, "data": {"offer_id": offer_id, "favorited": offer["favorited"]}}


@router.post("/driver/location-visit")
def record_location_visit(visit: LocationVisit):
    if current_user_id not in driver_location_history:
        driver_location_history[current_user_id] = []
    driver_location_history[current_user_id].append({"lat": visit.lat, "lng": visit.lng, "business_name": visit.business_name, "business_type": visit.business_type, "timestamp": visit.timestamp or datetime.now().isoformat()})
    driver_location_history[current_user_id] = driver_location_history[current_user_id][-100:]
    return {"success": True}


@router.post("/images/generate")
async def generate_offer_image(request: ImageGenerateRequest):
    image_id = str(uuid.uuid4())[:8]
    generated_images_db[image_id] = {"id": image_id, "data": None, "placeholder": True, "prompt": request.prompt, "created_at": datetime.now().isoformat()}
    return {"success": True, "data": {"image_id": image_id, "placeholder": True, "message": "Image generation endpoint ready."}}

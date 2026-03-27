from fastapi import APIRouter, Query, Depends, Request
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
from services.offer_utils import calculate_free_discount, calculate_redemption_fee
from services.cache import cache_get, cache_set
from middleware.auth import get_current_user
from limiter import limiter
from config import ENVIRONMENT
import uuid

router = APIRouter(prefix="/api", tags=["Offers"])


def _active_offers_source(limit: int = 500) -> list[dict]:
    try:
        rows = _sb().table("offers").select("*").eq("status", "active").limit(limit).execute()
        return rows.data or []
    except Exception:
        if ENVIRONMENT == "production":
            raise
        return offers_db


@router.get("/offers")
def get_offers(limit: int = Query(default=100, ge=1, le=100)):
    """Get all active offers from database (both admin and partner offers)"""
    try:
        sb = _sb()
        # Fetch all active offers from the database
        result = sb.table("offers").select("*").eq("status", "active").limit(limit).execute()
        
        if result.data:
            offers = []
            for offer in result.data:
                premium_disc = offer.get("premium_discount_percent") or offer.get("discount_percent", 0)
                free_disc = offer.get("free_discount_percent") or calculate_free_discount(premium_disc)
                offers.append({
                    "id": offer.get("id"),
                    "business_name": offer.get("business_name", ""),
                    "business_type": offer.get("business_type", "retail"),
                    "description": offer.get("description", ""),
                    "discount_percent": premium_disc,
                    "premium_discount_percent": premium_disc,
                    "free_discount_percent": free_disc,
                    "is_free_item": offer.get("is_free_item", False),
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
                    "redeemed": False,
                    "offer_source": offer.get("offer_source", "direct"),
                    "original_price": offer.get("original_price"),
                    "affiliate_tracking_url": offer.get("affiliate_tracking_url"),
                    "external_id": offer.get("external_id"),
                    "yelp_rating": offer.get("yelp_rating"),
                    "yelp_review_count": offer.get("yelp_review_count"),
                    "yelp_image_url": offer.get("yelp_image_url"),
                })
            
            return {
                "success": True,
                "data": offers,
                "discount_info": {
                    "free_discount": OFFER_CONFIG["free_discount_percent"],
                    "premium_discount": OFFER_CONFIG["premium_discount_percent"]
                },
                "total_savings": sum(o.get("discount_percent", 0) for o in offers),
                "count": len(offers),
            }
        else:
            # Fallback to mock data if no database offers
            if ENVIRONMENT == "production":
                raise RuntimeError("offers table unavailable")
            return {
                "success": True,
                "data": offers_db[:limit],
                "discount_info": {
                    "free_discount": OFFER_CONFIG["free_discount_percent"],
                    "premium_discount": OFFER_CONFIG["premium_discount_percent"]
                }
            }
    except Exception as e:
        # Fallback to mock data on error
        if ENVIRONMENT == "production":
            return {"success": False, "message": "Offer service unavailable"}
        return {
            "success": True,
            "data": offers_db[:limit],
            "discount_info": {
                "free_discount": OFFER_CONFIG["free_discount_percent"],
                "premium_discount": OFFER_CONFIG["premium_discount_percent"]
            }
        }


@router.post("/offers")
def create_offer(offer: OfferCreate):
    if ENVIRONMENT == "production":
        sb = _sb()
        payload = {
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
            "status": "active",
        }
        created = sb.table("offers").insert(payload).execute()
        if not created.data:
            raise RuntimeError("Failed to create offer")
        return {"success": True, "data": created.data[0]}
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
@limiter.limit("30/minute")
def redeem_offer(request: Request, offer_id: int, auth_user: dict = Depends(get_current_user)):
    import logging
    logger = logging.getLogger(__name__)

    # Try Supabase first for real offers
    try:
        sb = _sb()
        db_offer = sb.table("offers").select("*").eq("id", offer_id).maybe_single().execute()
        if db_offer and db_offer.data:
            odata = db_offer.data
            user_id = str(auth_user.get("id") or current_user_id)
            user = users_db.get(user_id, {})
            is_premium = user.get("is_premium", False)
            if odata.get("expires_at"):
                try:
                    if datetime.fromisoformat(str(odata["expires_at"]).replace("Z", "+00:00")) < datetime.now():
                        return {"success": False, "message": "Offer has expired"}
                except Exception:
                    pass

            # Idempotency guard: same user cannot redeem same offer twice.
            existing_redemption = (
                sb.table("redemptions")
                .select("id")
                .eq("offer_id", offer_id)
                .eq("user_id", user_id)
                .limit(1)
                .execute()
            )
            if existing_redemption.data:
                return {"success": False, "message": "Offer already redeemed"}

            premium_disc = odata.get("premium_discount_percent") or odata.get("discount_percent", 0)
            free_disc = odata.get("free_discount_percent") or calculate_free_discount(premium_disc)
            discount = premium_disc if is_premium else free_disc
            gem_reward = odata.get("base_gems", 25)

            # Update profile gems in DB first; keep in-memory cache in sync as fallback.
            try:
                p = sb.table("profiles").select("gems").eq("id", user_id).limit(1).execute()
                if p.data:
                    cur_gems = int(p.data[0].get("gems") or 0)
                    sb.table("profiles").update({"gems": cur_gems + gem_reward}).eq("id", user_id).execute()
            except Exception:
                pass
            if user_id in users_db:
                users_db[user_id]["gems"] = user.get("gems", 0) + gem_reward

            # Increment offer redemption_count
            new_count = (odata.get("redemption_count") or 0) + 1
            sb.table("offers").update({"redemption_count": new_count}).eq("id", offer_id).execute()

            # Track partner redemption fee
            partner_id = odata.get("partner_id")
            fee_amount = 0.0
            if partner_id:
                try:
                    partner = sb.table("partners").select("total_redemptions,total_fees_owed").eq("id", partner_id).maybe_single().execute()
                    if partner and partner.data:
                        p_total = (partner.data.get("total_redemptions") or 0) + 1
                        fee_amount = calculate_redemption_fee(p_total)
                        p_fees = (partner.data.get("total_fees_owed") or 0) + fee_amount
                        sb.table("partners").update({
                            "total_redemptions": p_total,
                            "total_fees_owed": round(p_fees, 2),
                        }).eq("id", partner_id).execute()
                except Exception as e:
                    logger.warning(f"Fee tracking error: {e}")

            # Record in redemptions table
            try:
                sb.table("redemptions").insert({
                    "offer_id": offer_id,
                    "user_id": user_id,
                    "partner_id": partner_id,
                    "gems_earned": gem_reward,
                    "discount_applied": discount,
                    "fee_amount": fee_amount,
                    "status": "verified",
                }).execute()
            except Exception as e:
                logger.warning(f"Redemption insert error: {e}")

            return {
                "success": True,
                "data": {
                    "discount_percent": discount,
                    "gems_earned": gem_reward,
                    "new_gem_total": users_db.get(user_id, {}).get("gems", 0),
                    "is_free_item": odata.get("is_free_item", False),
                },
            }
    except Exception as e:
        logger.warning(f"Supabase redeem fallback: {e}")
        if ENVIRONMENT == "production":
            return {"success": False, "message": "Offer redemption unavailable"}

    # Fallback to mock
    offer = next((o for o in offers_db if o["id"] == offer_id), None)
    if not offer:
        return {"success": False, "message": "Offer not found"}
    user_id = str(auth_user.get("id") or current_user_id)
    user = users_db.get(user_id, {})
    is_premium = user.get("is_premium", False)
    discount = OFFER_CONFIG["premium_discount_percent"] if is_premium else OFFER_CONFIG["free_discount_percent"]
    gem_reward = offer["base_gems"] * (2 if is_premium else 1)
    if user_id in users_db:
        users_db[user_id]["gems"] = user.get("gems", 0) + gem_reward
    offer["redemption_count"] = offer.get("redemption_count", 0) + 1
    return {
        "success": True,
        "data": {
            "discount_percent": discount,
            "gems_earned": gem_reward,
            "new_gem_total": users_db.get(user_id, {}).get("gems", 0),
        },
    }


@router.get("/offers/nearby")
def get_nearby_offers(
    lat: float = 39.9612,
    lng: float = -82.9988,
    radius: float = Query(default=10.0, ge=0.1, le=200),
    limit: int = Query(default=100, ge=1, le=100),
):
    cache_lat = round(lat, 2)
    cache_lng = round(lng, 2)
    key = f"offers_nearby:{cache_lat}:{cache_lng}:{radius}"
    cached = cache_get(key)
    if cached:
        return cached
    nearby = []
    source = _active_offers_source(limit=500)
    for offer in source:
        dlat = abs(offer["lat"] - lat)
        dlng = abs(offer["lng"] - lng)
        dist_km = ((dlat * 111) ** 2 + (dlng * 111) ** 2) ** 0.5
        if dist_km <= radius:
            nearby.append({**offer, "distance_km": round(dist_km, 2)})
    nearby.sort(key=lambda x: x["distance_km"])
    result = {"success": True, "data": nearby[:limit], "count": len(nearby[:limit])}
    cache_set(key, result, ttl=300)
    return result


@router.get("/offers/on-route")
def get_offers_on_route(origin_lat: float = 39.9612, origin_lng: float = -82.9988, dest_lat: float = 40.0067, dest_lng: float = -83.0305):
    route_offers = []
    mid_lat = (origin_lat + dest_lat) / 2
    mid_lng = (origin_lng + dest_lng) / 2
    source = _active_offers_source(limit=500)
    for offer in source:
        dlat = abs(offer["lat"] - mid_lat)
        dlng = abs(offer["lng"] - mid_lng)
        dist = ((dlat * 111) ** 2 + (dlng * 111) ** 2) ** 0.5
        if dist <= 5:
            route_offers.append({**offer, "distance_km": round(dist, 2)})
    return {"success": True, "data": route_offers}


@router.get("/offers/personalized")
def get_personalized_offers(
    lat: float = 39.9612,
    lng: float = -82.9988,
    limit: int = Query(default=20, ge=1, le=100),
):
    user = users_db.get(current_user_id, {})
    history = driver_location_history.get(current_user_id, [])
    visited_types = {}
    for visit in history:
        if visit.get("business_type"):
            visited_types[visit["business_type"]] = visited_types.get(visit["business_type"], 0) + 1
    scored = []
    source = _active_offers_source(limit=500)
    for offer in source:
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
    source = _active_offers_source(limit=500)
    offer = next((o for o in source if str(o.get("id")) == str(offer_id)), None)
    if not offer:
        return {"success": False, "message": "Offer not found"}
    return {
        "success": True,
        "message": f"Great! I'll add {offer['business_name']} as a stop on your route.",
        "data": {"offer": offer, "navigation_action": "add_waypoint" if add_as_stop else "show_details", "waypoint": {"lat": offer["lat"], "lng": offer["lng"], "name": offer["business_name"]}},
    }


@router.post("/offers/{offer_id}/favorite")
def favorite_offer(offer_id: int):
    if ENVIRONMENT == "production":
        return {"success": False, "message": "Favorites unavailable in production path"}
    offer = next((o for o in offers_db if o["id"] == offer_id), None)
    if not offer:
        return {"success": False, "message": "Offer not found"}
    offer["favorited"] = not offer.get("favorited", False)
    return {"success": True, "data": {"offer_id": offer_id, "favorited": offer["favorited"]}}


@router.post("/driver/location-visit")
def record_location_visit(visit: LocationVisit):
    if ENVIRONMENT == "production":
        return {"success": False, "message": "Location-visit history unavailable in production path"}
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


if ENVIRONMENT == "production":
    _LEGACY_PROD_DISABLED = {
        "/api/offers/{offer_id}/favorite",
        "/api/driver/location-visit",
    }
    router.routes = [r for r in router.routes if getattr(r, "path", "") not in _LEGACY_PROD_DISABLED]

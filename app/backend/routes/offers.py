from fastapi import APIRouter, HTTPException, Query, Depends
from starlette.requests import Request
from typing import Annotated, Optional
from datetime import datetime, timedelta, timezone
from models.schemas import OfferCreate, BulkOfferUpload
from services.mock_data import (
    offers_db, users_db, current_user_id, OFFER_CONFIG,
    generated_images_db, driver_location_history,
)
from models.schemas import ImageGenerateRequest, LocationVisit
from services.supabase_service import _sb
from services.offer_utils import calculate_free_discount
from services.cache import cache_get, cache_set, cache_delete
from services.fee_calculator import record_redemption_fee
from services.offer_analytics import record_offer_event
from middleware.auth import get_current_user
from limiter import limiter
from config import ENVIRONMENT
import uuid
import json
import logging
from jose import JWTError, jwt
from config import JWT_ALGORITHM, JWT_SECRET

router = APIRouter(prefix="/api", tags=["Offers"])

CurrentUser = Annotated[dict, Depends(get_current_user)]
logger = logging.getLogger(__name__)


def _distance_meters(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    import math

    r = 6371000.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lng2 - lng1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    return 2 * r * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _resolve_offer_by_id(offer_id: str) -> Optional[dict]:
    try:
        result = _sb().table("offers").select("*").eq("id", offer_id).maybe_single().execute()
        if result and result.data:
            return result.data
    except Exception:
        if ENVIRONMENT == "production":
            return None
    return next((o for o in offers_db if str(o.get("id")) == str(offer_id)), None)


def _offer_type(offer: dict) -> str:
    return str(offer.get("offer_type") or ("admin" if offer.get("is_admin_offer") else "partner")).lower()


def _get_profile_like(user_id: str) -> dict:
    try:
        result = _sb().table("profiles").select("*").eq("id", user_id).limit(1).execute()
        if result.data:
            return result.data[0]
    except Exception:
        if ENVIRONMENT == "production":
            return {}
    return users_db.get(user_id, {})


def _next_gem_total(user_id: str, gem_reward: int) -> int:
    try:
        result = _sb().table("profiles").select("gems").eq("id", user_id).limit(1).execute()
        if result.data:
            current = int(result.data[0].get("gems") or 0)
            return current + gem_reward
    except Exception:
        if ENVIRONMENT == "production":
            return gem_reward
    return int(users_db.get(user_id, {}).get("gems", 0)) + gem_reward


def _qr_nonce_key(nonce: str) -> str:
    return f"offer-qr-nonce:{nonce}"


def _sign_qr_token(payload: dict) -> str:
    secret = (JWT_SECRET or "").strip()
    if not secret:
        raise HTTPException(status_code=500, detail="JWT secret is not configured")
    return jwt.encode(payload, secret, algorithm=JWT_ALGORITHM)


def _decode_qr_token(token: str) -> dict:
    secret = (JWT_SECRET or "").strip()
    if not secret:
        raise HTTPException(status_code=500, detail="JWT secret is not configured")
    try:
        return jwt.decode(token, secret, algorithms=[JWT_ALGORITHM])
    except JWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired QR token") from exc


def validate_qr_token(raw_token: str, *, consume_nonce: bool) -> dict:
    token = str(raw_token or "").strip()
    if not token:
        raise HTTPException(status_code=400, detail="Missing QR token")

    payload = _decode_qr_token(token)
    nonce = str(payload.get("nonce") or "").strip()
    if not nonce:
        raise HTTPException(status_code=401, detail="QR token missing nonce")

    nonce_key = _qr_nonce_key(nonce)
    cached = cache_get(nonce_key)
    if not cached:
        raise HTTPException(status_code=401, detail="QR token is expired or has already been used")
    if consume_nonce:
        cache_delete(nonce_key)

    offer = _resolve_offer_by_id(str(payload.get("offer_id") or ""))
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    return {
        "payload": payload,
        "offer": offer,
        "nonce": nonce,
    }


def complete_offer_redemption(
    *,
    offer: dict,
    user_id: str,
    scanned_by_user_id: Optional[str] = None,
    qr_nonce: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
) -> dict:
    sb = _sb()
    existing_redemption = (
        sb.table("redemptions")
        .select("id")
        .eq("offer_id", offer.get("id"))
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if existing_redemption.data:
        return {"success": False, "message": "Offer already redeemed"}

    user_profile = _get_profile_like(user_id)
    is_premium = bool(user_profile.get("is_premium")) or str(user_profile.get("plan") or "").lower() in {"premium", "family"}
    premium_disc = offer.get("premium_discount_percent") or offer.get("discount_percent", 0)
    free_disc = offer.get("free_discount_percent") or calculate_free_discount(premium_disc)
    discount = premium_disc if is_premium else free_disc
    gem_reward = int(offer.get("base_gems") or offer.get("gems_reward") or 25)

    try:
        sb.rpc("increment_gems", {"uid": user_id, "amount": gem_reward}).execute()
    except Exception:
        try:
            current = int(user_profile.get("gems") or 0)
            sb.table("profiles").update({"gems": current + gem_reward}).eq("id", user_id).execute()
        except Exception as exc:
            logger.warning("Gem update failed for user %s: %s", user_id, exc)

    fee_record = record_redemption_fee(offer.get("partner_id"))
    redeemed_at = datetime.now(timezone.utc).isoformat()

    if offer.get("partner_id"):
        try:
            partner_res = sb.table("partners").select("total_redemptions,total_fees_owed").eq("id", offer.get("partner_id")).maybe_single().execute()
            partner_row = partner_res.data or {}
            sb.table("partners").update({
                "total_redemptions": int(partner_row.get("total_redemptions") or 0) + 1,
                "total_fees_owed": round(float(partner_row.get("total_fees_owed") or 0) + fee_record["fee_amount"], 2),
            }).eq("id", offer.get("partner_id")).execute()
        except Exception as exc:
            logger.warning("Partner fee aggregate update failed: %s", exc)

    redemption_payload = {
        "offer_id": offer.get("id"),
        "user_id": user_id,
        "partner_id": offer.get("partner_id"),
        "gems_earned": gem_reward,
        "discount_applied": discount,
        "fee_amount": fee_record["fee_amount"],
        "fee_cents": fee_record["fee_cents"],
        "fee_tier": fee_record["fee_tier"],
        "status": "verified",
        "scanned_by_user_id": scanned_by_user_id,
        "qr_nonce": qr_nonce,
        "redeemed_at": redeemed_at,
    }
    sb.table("redemptions").insert(redemption_payload).execute()

    try:
        sb.table("offers").update({"redemption_count": int(offer.get("redemption_count") or 0) + 1}).eq("id", offer.get("id")).execute()
    except Exception as exc:
        logger.warning("Offer redemption counter update failed: %s", exc)

    record_offer_event(
        offer=offer,
        event_type="redeem",
        partner_id=offer.get("partner_id"),
        user_id=user_id,
        lat=lat,
        lng=lng,
    )

    return {
        "success": True,
        "data": {
            "discount_percent": discount,
            "gems_earned": gem_reward,
            "new_gem_total": _next_gem_total(user_id, gem_reward),
            "is_free_item": offer.get("is_free_item", False),
            "fee_cents": fee_record["fee_cents"],
            "fee_tier": fee_record["fee_tier"],
            "redeemed_at": redeemed_at,
        },
    }


def _active_offers_source(limit: int = 500) -> list[dict]:
    try:
        rows = _sb().table("offers").select("*").eq("status", "active").limit(limit).execute()
        return rows.data or []
    except Exception:
        if ENVIRONMENT == "production":
            raise
        return offers_db


@router.get("/offers")
@limiter.limit("60/minute")
def get_offers(request: Request, limit: Annotated[int, Query(ge=1, le=100)] = 100):
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
    except Exception:
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
def create_offer(offer: OfferCreate, user: CurrentUser):
    user_role = (user.get("role") or "").lower()
    if user_role not in ("admin", "partner"):
        raise HTTPException(status_code=403, detail="Only admins or partners can create offers")
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
            "created_by": user.get("id", "admin") if offer.is_admin_offer else user.get("id", "business"),
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
def redeem_offer(request: Request, offer_id: str, auth_user: CurrentUser):
    from services.runtime_config import require_enabled

    require_enabled(
        "offer_redemptions_enabled",
        "Offer redemptions are temporarily disabled.",
    )
    require_enabled(
        "gems_rewards_enabled",
        "Gem rewards are temporarily paused.",
    )
    try:
        offer = _resolve_offer_by_id(offer_id)
        if offer:
            if offer.get("expires_at"):
                try:
                    expiry = datetime.fromisoformat(str(offer["expires_at"]).replace("Z", "+00:00"))
                    if expiry < datetime.now(timezone.utc):
                        return {"success": False, "message": "Offer has expired"}
                except Exception as exc:
                    logger.warning("failed to parse offer expiry: %s", exc)
            user_id = str(auth_user.get("user_id") or auth_user.get("id") or current_user_id)
            return complete_offer_redemption(
                offer=offer,
                user_id=user_id,
            )
    except Exception as exc:
        logger.warning("Supabase redeem fallback: %s", exc)
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


@router.get("/offers/{offer_id}")
def get_offer_by_id(offer_id: str):
    offer = _resolve_offer_by_id(offer_id)
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    return {"success": True, "data": offer}


@router.post("/offers/{offer_id}/generate-qr")
def generate_offer_qr(offer_id: str, body: dict, auth_user: CurrentUser):
    from services.runtime_config import require_enabled

    require_enabled(
        "partner_qr_redemption_enabled",
        "QR redemption is temporarily disabled.",
    )
    offer = _resolve_offer_by_id(offer_id)
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    user_id = str(auth_user.get("user_id") or auth_user.get("id") or current_user_id)
    lat = float(body.get("lat"))
    lng = float(body.get("lng"))
    offer_lat = float(offer.get("lat") or 0)
    offer_lng = float(offer.get("lng") or 0)
    distance = _distance_meters(lat, lng, offer_lat, offer_lng)
    if distance > 200:
        raise HTTPException(status_code=403, detail="You must be within 200 meters of the offer to generate a QR code")

    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
    nonce = str(uuid.uuid4())
    payload = {
        "offer_id": str(offer.get("id")),
        "user_id": user_id,
        "location_id": body.get("location_id"),
        "exp": int(expires_at.timestamp()),
        "expires_at": expires_at.isoformat(),
        "nonce": nonce,
    }
    token = _sign_qr_token(payload)
    cache_set(
        _qr_nonce_key(nonce),
        {
            "offer_id": str(offer.get("id")),
            "user_id": user_id,
            "expires_at": expires_at.isoformat(),
        },
        ttl=15 * 60,
    )
    return {
        "success": True,
        "data": {
            "qr_token": token,
            "expires_at": expires_at.isoformat(),
            "offer": {
                "id": offer.get("id"),
                "business_name": offer.get("business_name"),
                "description": offer.get("description"),
                "discount_percent": offer.get("discount_percent"),
            },
        },
    }


@router.post("/offers/validate-qr")
def validate_offer_qr(body: dict):
    validated = validate_qr_token(body.get("qr_token") or body.get("qr_data"), consume_nonce=False)
    payload = validated["payload"]
    offer = validated["offer"]
    user_profile = _get_profile_like(str(payload.get("user_id") or ""))
    name = str(user_profile.get("name") or user_profile.get("full_name") or user_profile.get("email") or "Driver").strip()
    parts = [p for p in name.split(" ") if p]
    user_display_name = parts[0] if parts else "Driver"
    return {
        "success": True,
        "data": {
            "valid": True,
            "offer_details": {
                "id": offer.get("id"),
                "title": offer.get("title") or offer.get("business_name"),
                "business_name": offer.get("business_name"),
                "discount_percent": offer.get("discount_percent"),
                "base_gems": offer.get("base_gems"),
            },
            "user_display_name": user_display_name,
            "nonce": validated["nonce"],
            "payload": payload,
        },
    }


@router.post("/offers/{offer_id}/view")
def track_offer_view(offer_id: str, body: dict, auth_user: CurrentUser):
    offer = _resolve_offer_by_id(offer_id)
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    user_id = str(auth_user.get("user_id") or auth_user.get("id") or current_user_id)
    event = record_offer_event(
        offer=offer,
        event_type="view",
        partner_id=offer.get("partner_id"),
        user_id=user_id,
        lat=body.get("lat"),
        lng=body.get("lng"),
        trip_id=body.get("trip_id"),
    )
    return {"success": True, "data": event}


@router.post("/offers/{offer_id}/visit")
def track_offer_visit(offer_id: str, body: dict, auth_user: CurrentUser):
    offer = _resolve_offer_by_id(offer_id)
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    lat = float(body.get("lat"))
    lng = float(body.get("lng"))
    offer_lat = float(offer.get("lat") or 0)
    offer_lng = float(offer.get("lng") or 0)
    if _distance_meters(lat, lng, offer_lat, offer_lng) > 500:
        raise HTTPException(status_code=403, detail="Visit tracking only applies within 500 meters")
    user_id = str(auth_user.get("user_id") or auth_user.get("id") or current_user_id)
    event = record_offer_event(
        offer=offer,
        event_type="visit",
        partner_id=offer.get("partner_id"),
        user_id=user_id,
        lat=lat,
        lng=lng,
        trip_id=body.get("trip_id"),
    )
    return {"success": True, "data": event}


@router.get("/offers/nearby")
def get_nearby_offers(
    lat: float = 39.9612,
    lng: float = -82.9988,
    radius: Annotated[float, Query(ge=0.1, le=200)] = 10.0,
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
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
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
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
def accept_offer_via_voice(offer_id: str, add_as_stop: bool = True):
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
def favorite_offer(offer_id: str):
    if ENVIRONMENT == "production":
        return {"success": False, "message": "Favorites unavailable in production path"}
    offer = next((o for o in offers_db if o["id"] == offer_id), None)
    if not offer:
        return {"success": False, "message": "Offer not found"}
    offer["favorited"] = not offer.get("favorited", False)
    return {"success": True, "data": {"offer_id": offer_id, "favorited": offer["favorited"]}}


@router.post("/driver/location-visit")
def record_location_visit(visit: LocationVisit, auth_user: CurrentUser):
    user_id = str(auth_user.get("user_id") or auth_user.get("id") or current_user_id)
    if user_id not in driver_location_history:
        driver_location_history[user_id] = []
    driver_location_history[user_id].append({
        "lat": visit.lat,
        "lng": visit.lng,
        "business_name": visit.business_name,
        "business_type": visit.business_type,
        "timestamp": visit.timestamp or datetime.now(timezone.utc).isoformat(),
    })
    driver_location_history[user_id] = driver_location_history[user_id][-100:]

    source = _active_offers_source(limit=500)
    tracked = 0
    for offer in source:
        offer_lat = float(offer.get("lat") or 0)
        offer_lng = float(offer.get("lng") or 0)
        if _distance_meters(visit.lat, visit.lng, offer_lat, offer_lng) <= 500:
            record_offer_event(
                offer=offer,
                event_type="visit",
                partner_id=offer.get("partner_id"),
                user_id=user_id,
                lat=visit.lat,
                lng=visit.lng,
            )
            tracked += 1
    return {"success": True, "tracked_visits": tracked}


@router.post("/images/generate")
async def generate_offer_image(request: ImageGenerateRequest):
    image_id = str(uuid.uuid4())[:8]
    generated_images_db[image_id] = {"id": image_id, "data": None, "placeholder": True, "prompt": request.prompt, "created_at": datetime.now().isoformat()}
    return {"success": True, "data": {"image_id": image_id, "placeholder": True, "message": "Image generation endpoint ready."}}


if ENVIRONMENT == "production":
    _LEGACY_PROD_DISABLED = {
        "/api/offers/{offer_id}/favorite",
    }
    router.routes = [r for r in router.routes if getattr(r, "path", "") not in _LEGACY_PROD_DISABLED]

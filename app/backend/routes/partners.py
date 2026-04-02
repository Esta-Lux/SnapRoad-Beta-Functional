import logging
import os
import re
import json
from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends, Query, Header, Request
from typing import Annotated, Optional
from datetime import datetime, timedelta, timezone
from models.schemas import (
    PartnerLocation, PartnerPlanUpdate, PartnerOfferCreate,
    PartnerLoginRequest, PartnerRegisterRequest,
    TeamInviteRequest, ReferralRequest,
    CreditUseRequest, QRRedemptionRequest, BoostRequest, BoostCreditsRequest,
)
from services.offer_utils import calculate_auto_gems, calculate_free_discount, get_fee_tier_info
from services.fee_calculator import get_monthly_fee_summary, get_partner_fee_history
from services.offer_analytics import summarize_offer_analytics
from services.supabase_service import (
    sb_get_partner, sb_get_partners, sb_update_partner, sb_create_partner,
    sb_get_partner_locations, sb_create_partner_location,
    sb_update_partner_location, sb_delete_partner_location,
    sb_set_primary_location,
    sb_get_offers_by_partner, sb_create_offer, sb_update_offer,
    sb_get_boosts, sb_create_boost, sb_cancel_boost,
    sb_get_redemptions_by_partner,
    sb_get_partner_referrals, sb_create_partner_referral,
    sb_login_user, sb_create_user, sb_get_user_by_email,
    _sb,
)
from services.mock_data import PARTNER_PLANS, BOOST_PRICING
from middleware.auth import create_access_token, require_partner
from config import PARTNER_PORTAL_ORIGIN
from limiter import limiter

logger = logging.getLogger(__name__)

MSG_PARTNER_NOT_FOUND = "Partner not found"
MSG_MEMBER_NOT_FOUND = "Member not found"
MSG_STRIPE_NOT_CONFIGURED = "Stripe not configured. Set STRIPE_SECRET_KEY in .env"
MSG_STRIPE_NOT_INSTALLED = "stripe package not installed. Run: pip install stripe"

CurrentPartner = Annotated[dict, Depends(require_partner)]

# Allow browser to pass ?portal_origin= so dev works on any local port; production uses PARTNER_PORTAL_ORIGIN.
_DEV_PORTAL_ORIGIN = re.compile(r"^https?://(localhost|127\.0\.0\.1)(:\d+)?/?$")


def _resolve_partner_portal_base(portal_origin: Optional[str]) -> str:
    configured = PARTNER_PORTAL_ORIGIN.rstrip("/")
    if not portal_origin:
        return configured
    o = portal_origin.strip().rstrip("/")
    if o == configured:
        return o
    if _DEV_PORTAL_ORIGIN.match(o):
        return o.rstrip("/")
    extra = [
        x.strip().rstrip("/")
        for x in (os.environ.get("PARTNER_PORTAL_ALLOWED_ORIGINS") or "").split(",")
        if x.strip()
    ]
    if o in extra:
        return o
    return configured


router = APIRouter(prefix="/api", tags=["Partners"])


PLAN_LOCATION_LIMITS = {
    "starter": 5,
    "growth": 25,
    "enterprise": 999999,
}


def _plan_info(plan_key: str) -> dict:
    return PARTNER_PLANS.get(plan_key, PARTNER_PLANS["starter"])


def _require_owned_partner_id(user: dict, partner_id: Optional[str] = None) -> str:
    token_partner_id = str(user.get("partner_id") or "").strip()
    if not token_partner_id:
        raise HTTPException(status_code=403, detail="No partner_id in token")
    if partner_id and str(partner_id) != token_partner_id:
        raise HTTPException(status_code=403, detail="Partner access denied")
    return token_partner_id


def _assert_partner_resource_owner(
    table: str,
    resource_id: str,
    partner_id: str,
    detail: str,
) -> dict:
    try:
        result = (
            _sb()
            .table(table)
            .select("id,partner_id")
            .eq("id", str(resource_id))
            .eq("partner_id", str(partner_id))
            .limit(1)
            .execute()
        )
    except Exception as exc:
        logger.warning("Resource ownership check failed for %s/%s: %s", table, resource_id, exc)
        raise HTTPException(status_code=503, detail="Unable to verify resource ownership") from exc
    if not result.data:
        raise HTTPException(status_code=403, detail=detail)
    return result.data[0]


# ==================== PARTNER PLANS ====================
@router.get("/partner/plans")
def get_partner_plans():
    return {"success": True, "data": {"plans": PARTNER_PLANS, "is_founders_active": True}}


# ==================== PARTNER PROFILE ====================
@router.get("/partner/profile", responses={403: {"description": "Partner access denied"}, 404: {"description": MSG_PARTNER_NOT_FOUND}})
def get_partner_profile(user: CurrentPartner, partner_id: str = "default_partner"):
    owned_partner_id = _require_owned_partner_id(user, partner_id)
    partner = sb_get_partner(owned_partner_id)
    if not partner:
        raise HTTPException(status_code=404, detail=MSG_PARTNER_NOT_FOUND)
    plan_key = partner.get("plan", "starter")
    plan = _plan_info(plan_key)
    locations = sb_get_partner_locations(owned_partner_id)
    max_locs = PLAN_LOCATION_LIMITS.get(plan_key, 5)
    return {
        "success": True,
        "data": {
            "id": partner["id"],
            "business_name": partner.get("business_name", ""),
            "email": partner.get("email", ""),
            "plan": plan_key,
            "plan_info": plan,
            "is_founders": partner.get("is_founders", False),
            "subscription_status": partner.get("subscription_status") or "active",
            "locations": locations,
            "location_count": len(locations),
            "max_locations": max_locs,
            "can_add_location": len(locations) < max_locs,
            "created_at": partner.get("created_at", ""),
        },
    }


@router.put("/partner/profile", responses={403: {"description": "Partner access denied"}})
def update_partner_profile(
    user: CurrentPartner,
    business_name: Optional[str] = None,
    email: Optional[str] = None,
    partner_id: str = "default_partner",
):
    owned_partner_id = _require_owned_partner_id(user, partner_id)
    updates = {}
    if business_name:
        updates["business_name"] = business_name
    if email:
        updates["email"] = email
    if not updates:
        return {"success": False, "message": "No fields to update"}
    sb_update_partner(owned_partner_id, updates)
    return {"success": True, "message": "Profile updated"}


@router.post("/partner/plan", responses={403: {"description": "Partner access denied"}})
def update_partner_plan(plan_update: PartnerPlanUpdate, user: CurrentPartner, partner_id: str = "default_partner"):
    owned_partner_id = _require_owned_partner_id(user, partner_id)
    if plan_update.plan not in PARTNER_PLANS:
        return {"success": False, "message": "Invalid plan"}
    sb_update_partner(owned_partner_id, {"plan": plan_update.plan})
    plan = _plan_info(plan_update.plan)
    return {
        "success": True,
        "message": f"Plan updated to {plan['name']}",
        "data": {
            "plan": plan_update.plan,
            "max_locations": PLAN_LOCATION_LIMITS.get(plan_update.plan, 5),
            "features": plan["features"],
        },
    }


# ==================== LOCATIONS ====================
@router.get("/partner/locations", responses={403: {"description": "Partner access denied"}})
def get_partner_locations(
    user: CurrentPartner,
    partner_id: str = "default_partner",
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
):
    owned_partner_id = _require_owned_partner_id(user, partner_id)
    partner = sb_get_partner(owned_partner_id)
    plan_key = partner.get("plan", "starter") if partner else "starter"
    max_locs = PLAN_LOCATION_LIMITS.get(plan_key, 5)
    locations = sb_get_partner_locations(owned_partner_id)[:limit]
    return {
        "success": True,
        "data": locations,
        "count": len(locations),
        "max_locations": max_locs,
        "can_add_more": len(locations) < max_locs,
    }


@router.post("/partner/locations", responses={403: {"description": "Partner access denied"}})
def add_partner_location(location: PartnerLocation, user: CurrentPartner, partner_id: str = "default_partner"):
    owned_partner_id = _require_owned_partner_id(user, partner_id)
    partner = sb_get_partner(owned_partner_id)
    plan_key = partner.get("plan", "starter") if partner else "starter"
    max_locs = PLAN_LOCATION_LIMITS.get(plan_key, 5)
    existing = sb_get_partner_locations(owned_partner_id)
    if len(existing) >= max_locs:
        return {"success": False, "message": f"Location limit reached ({max_locs}). Upgrade your plan."}

    if location.is_primary or len(existing) == 0:
        sb_set_primary_location(owned_partner_id, "")  # clear all first
        location.is_primary = True

    new_loc = sb_create_partner_location({
        "partner_id": owned_partner_id,
        "name": location.name,
        "address": location.address,
        "lat": location.lat,
        "lng": location.lng,
        "is_primary": location.is_primary,
    })
    if not new_loc:
        return {"success": False, "message": "Failed to create location"}
    return {"success": True, "message": f"Location '{location.name}' added successfully", "data": new_loc}


@router.put("/partner/locations/{location_id}", responses={403: {"description": "Partner access denied"}})
def update_partner_location(location_id: str, location: PartnerLocation, user: CurrentPartner, partner_id: str = "default_partner"):
    owned_partner_id = _require_owned_partner_id(user, partner_id)
    _assert_partner_resource_owner("partner_locations", location_id, owned_partner_id, "Not your location")
    updates = {
        "name": location.name,
        "address": location.address,
        "lat": location.lat,
        "lng": location.lng,
    }
    if location.is_primary:
        sb_set_primary_location(owned_partner_id, location_id)
    sb_update_partner_location(location_id, updates)
    return {"success": True, "message": "Location updated"}


@router.delete("/partner/locations/{location_id}", responses={403: {"description": "Partner access denied"}})
def delete_partner_location(location_id: str, user: CurrentPartner, partner_id: str = "default_partner"):
    owned_partner_id = _require_owned_partner_id(user, partner_id)
    _assert_partner_resource_owner("partner_locations", location_id, owned_partner_id, "Not your location")
    sb_delete_partner_location(location_id)
    remaining = sb_get_partner_locations(owned_partner_id)
    if remaining and not any(l.get("is_primary") for l in remaining):
        sb_update_partner_location(remaining[0]["id"], {"is_primary": True})
    return {"success": True, "message": "Location deleted"}


@router.post("/partner/locations/{location_id}/set-primary", responses={403: {"description": "Partner access denied"}})
def set_primary_location(location_id: str, user: CurrentPartner, partner_id: str = "default_partner"):
    owned_partner_id = _require_owned_partner_id(user, partner_id)
    _assert_partner_resource_owner("partner_locations", location_id, owned_partner_id, "Not your location")
    sb_set_primary_location(owned_partner_id, location_id)
    return {"success": True, "message": "Primary location updated"}


# ==================== PARTNER OFFERS ====================
@router.post("/partner/offers", responses={403: {"description": "Partner access denied"}})
def create_partner_offer(offer: PartnerOfferCreate, user: CurrentPartner, partner_id: str = "default_partner"):
    owned_partner_id = _require_owned_partner_id(user, partner_id)
    partner = sb_get_partner(owned_partner_id)
    if not partner:
        return {"success": False, "message": MSG_PARTNER_NOT_FOUND}

    locations = sb_get_partner_locations(owned_partner_id)
    location = next((l for l in locations if l["id"] == offer.location_id), None)
    if not location:
        return {"success": False, "message": "Location not found"}

    auto_gems = calculate_auto_gems(offer.discount_percent, offer.is_free_item)
    free_discount = calculate_free_discount(offer.discount_percent)

    new_offer = sb_create_offer({
        "partner_id": owned_partner_id,
        "location_id": location["id"],
        "title": offer.title,
        "description": offer.description,
        "discount_percent": offer.discount_percent,
        "base_gems": auto_gems,
        "premium_discount_percent": offer.discount_percent,
        "free_discount_percent": free_discount,
        "is_free_item": offer.is_free_item,
        "lat": location["lat"],
        "lng": location["lng"],
        "status": "active",
        "image_url": offer.image_url,
        "created_by": owned_partner_id,
        "expires_at": (datetime.now() + timedelta(hours=offer.expires_hours)).isoformat(),
    })
    if not new_offer:
        return {"success": False, "message": "Failed to create offer"}
    return {"success": True, "message": f"Offer created at {location['name']}", "data": new_offer}


@router.get("/partner/offers", responses={403: {"description": "Partner access denied"}})
def get_partner_offers(
    user: CurrentPartner,
    partner_id: str = "default_partner",
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
):
    owned_partner_id = _require_owned_partner_id(user, partner_id)
    offers = sb_get_offers_by_partner(owned_partner_id)[:limit]
    return {"success": True, "data": offers, "count": len(offers)}


@router.put("/partner/offers/{offer_id}", responses={403: {"description": "Partner access denied"}})
def update_partner_offer(offer_id: str, offer: PartnerOfferCreate, user: CurrentPartner, partner_id: str = "default_partner"):
    owned_partner_id = _require_owned_partner_id(user, partner_id)
    _assert_partner_resource_owner("offers", offer_id, owned_partner_id, "Not your offer")
    partner = sb_get_partner(owned_partner_id)
    if not partner:
        return {"success": False, "message": MSG_PARTNER_NOT_FOUND}
    
    locations = sb_get_partner_locations(owned_partner_id)
    location = next((l for l in locations if l["id"] == str(offer.location_id)), None)
    if not location:
        return {"success": False, "message": "Location not found"}
    
    auto_gems = calculate_auto_gems(offer.discount_percent, offer.is_free_item)
    premium_discount = offer.discount_percent
    free_discount = calculate_free_discount(premium_discount)

    updates = {
        "title": offer.title,
        "description": offer.description,
        "discount_percent": premium_discount,
        "premium_discount_percent": premium_discount,
        "free_discount_percent": free_discount,
        "is_free_item": offer.is_free_item,
        "base_gems": auto_gems,
        "image_url": offer.image_url,
        "expires_at": (datetime.now() + timedelta(hours=offer.expires_hours)).isoformat(),
    }
    sb_update_offer(offer_id, updates)
    return {"success": True, "message": "Offer updated successfully"}


@router.delete("/partner/offers/{offer_id}", responses={403: {"description": "Partner access denied"}})
def delete_partner_offer(offer_id: str, user: CurrentPartner, partner_id: str = "default_partner"):
    owned_partner_id = _require_owned_partner_id(user, partner_id)
    from services.supabase_service import _sb
    try:
        _sb().table("offers").delete().eq("id", offer_id).eq("partner_id", owned_partner_id).execute()
        return {"success": True, "message": "Offer deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting offer: {e}")
        return {"success": False, "message": "Failed to delete offer"}


# ==================== BOOST SYSTEM ====================
@router.get("/partner/boosts/pricing")
def get_boost_pricing():
    return {"success": True, "data": {"packages": BOOST_PRICING, "currency": "USD"}}


@router.post("/partner/boosts/create", responses={403: {"description": "Partner access denied"}})
def create_offer_boost(boost_req: BoostRequest, user: CurrentPartner, partner_id: str = "default_partner"):
    owned_partner_id = _require_owned_partner_id(user, partner_id)
    _assert_partner_resource_owner("offers", str(boost_req.offer_id), owned_partner_id, "Not your offer")
    if boost_req.boost_type not in BOOST_PRICING:
        return {"success": False, "message": "Invalid boost type"}
    config = BOOST_PRICING[boost_req.boost_type]
    partner = sb_get_partner(owned_partner_id)
    if not partner:
        return {"success": False, "message": MSG_PARTNER_NOT_FOUND}
    current_credits = float(partner.get("credits", 0) or 0)
    required_credits = float(config["price"])
    if current_credits < required_credits:
        return {
            "success": False,
            "message": f"Insufficient credits. {config['name']} requires {required_credits:.2f} credits.",
            "data": {
                "required_credits": required_credits,
                "current_credits": current_credits,
            },
        }
    ends_at = datetime.now() + timedelta(hours=config["duration_hours"])
    new_boost = sb_create_boost({
        "offer_id": str(boost_req.offer_id),
        "partner_id": owned_partner_id,
        "budget": required_credits,
        "duration_days": config["duration_hours"] // 24,
        "target_radius_miles": 10,
        "status": "active",
        "ends_at": ends_at.isoformat(),
    })
    if not new_boost:
        return {"success": False, "message": "Failed to create boost"}
    sb_update_partner(owned_partner_id, {
        "credits": round(current_credits - required_credits, 2),
        "credit_balance_updated_at": datetime.now(timezone.utc).isoformat(),
    })
    sb_update_offer(str(boost_req.offer_id), {
        "boost_multiplier": config["multiplier"],
        "boost_expiry": ends_at.isoformat(),
        "boost_budget_credits": required_credits,
    })
    return {
        "success": True,
        "message": f"{config['name']} applied using {required_credits:.2f} credits.",
        "data": {
            **new_boost,
            "credits_spent": required_credits,
            "remaining_credits": round(current_credits - required_credits, 2),
        },
    }


@router.get("/partner/boosts/active", responses={403: {"description": "Partner access denied"}})
def get_active_boosts(
    user: CurrentPartner,
    partner_id: str = "default_partner",
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
):
    owned_partner_id = _require_owned_partner_id(user, partner_id)
    boosts = sb_get_boosts(owned_partner_id)
    now = datetime.now()
    active = []
    for b in boosts[:limit]:
        ends = b.get("ends_at")
        is_active = False
        hours_remaining = 0
        if ends:
            try:
                ends_dt = datetime.fromisoformat(str(ends))
                is_active = ends_dt > now
                hours_remaining = max(0, (ends_dt - now).total_seconds() / 3600)
            except Exception as e:
                logger.warning("failed to parse boost ends_at: %s", e)
        active.append({**b, "is_active": is_active, "hours_remaining": round(hours_remaining, 1)})
    return {
        "success": True,
        "data": active,
        "active_count": sum(1 for a in active if a["is_active"]),
    }


@router.delete("/partner/boosts/{boost_id}", responses={403: {"description": "Partner access denied"}})
def cancel_boost(boost_id: str, user: CurrentPartner, partner_id: str = "default_partner"):
    owned_partner_id = _require_owned_partner_id(user, partner_id)
    _assert_partner_resource_owner("boosts", boost_id, owned_partner_id, "Not your boost")
    sb_cancel_boost(boost_id)
    return {"success": True, "message": "Boost cancelled"}


# ==================== CREDITS ====================
@router.get("/partner/credits", responses={403: {"description": "Partner access denied"}})
def get_partner_credits(user: CurrentPartner, partner_id: str = "default_partner"):
    owned_partner_id = _require_owned_partner_id(user, partner_id)
    partner = sb_get_partner(owned_partner_id)
    credits_val = 0
    if partner:
        credits_val = partner.get("credits", 0) or 0
    return {"success": True, "data": {"balance": credits_val, "currency": "USD"}}


@router.post("/partner/credits/add", responses={403: {"description": "Partner access denied"}})
def add_partner_credits(credits_req: BoostCreditsRequest, user: CurrentPartner, partner_id: str = "default_partner"):
    owned_partner_id = _require_owned_partner_id(user, partner_id)
    partner = sb_get_partner(owned_partner_id)
    if not partner:
        return {"success": False, "message": MSG_PARTNER_NOT_FOUND}
    current = partner.get("credits", 0) or 0
    # The partners table in the real schema doesn't have a credits column yet;
    # this will silently fail until the column is added. That's acceptable for now.
    new_balance = current + credits_req.amount
    sb_update_partner(owned_partner_id, {"credits": new_balance})
    return {
        "success": True,
        "message": f"Added ${credits_req.amount} in credits",
        "data": {"previous_balance": current, "added": credits_req.amount, "new_balance": new_balance},
    }


# ==================== PARTNER V2 ENDPOINTS ====================
@router.post("/partner/v2/login", responses={401: {"description": "Invalid email or password"}, 403: {"description": "No partner account linked"}})
@limiter.limit("10/minute")
def partner_login_v2(request: Request, body: PartnerLoginRequest):
    user, _login_err = sb_login_user(body.email, body.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Get all partners and find matching partner record
    partners = sb_get_partners(limit=200)
    match = next((p for p in partners if p.get("email") == body.email), None)
    
    # Check if user has partner role or if partner record exists
    role = user.get("role", "driver")
    if role not in ("partner", "admin") and not match:
        raise HTTPException(status_code=403, detail="No partner account linked to this email")
    
    # Use partner record ID if exists, otherwise use user ID
    partner_id = match["id"] if match else str(user.get("id", ""))
    business_name = match.get("business_name", "") if match else ""
    
    token = create_access_token({"sub": str(user["id"]), "email": body.email, "role": "partner", "partner_id": partner_id})
    return {"success": True, "token": token, "partner_id": partner_id, "business_name": business_name}


@router.post("/partner/v2/register", responses={400: {"description": "Email already registered"}})
@limiter.limit("5/minute")
def partner_register_v2(request: Request, body: PartnerRegisterRequest):
    existing = sb_get_user_by_email(body.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    full_name = f"{body.first_name} {body.last_name}"
    try:
        user = sb_create_user(body.email, body.password, full_name, "partner")
        # Match public.partners columns (see app/backend/sql/supabase_migration.sql).
        # Omit is_founders here so inserts work before optional migration 019; founders can be set in admin.
        partner_data = {
            "id": str(user["id"]),
            "business_name": body.business_name,
            "business_type": "retail",
            "email": body.email,
            "plan": "starter",
            "status": "active",
            "is_approved": True,
            "subscription_status": "pending",
        }
        created = sb_create_partner(partner_data)
        if not created:
            logger.error(
                "partner_register_v2: sb_create_partner returned no row for email=%s id=%s",
                body.email,
                user.get("id"),
            )
            raise HTTPException(
                status_code=503,
                detail="Could not create partner record. Please try again or contact support.",
            )
        new_partner_id = str(user["id"])
        ref_code = (body.referral_code or "").strip()
        if ref_code and ref_code != new_partner_id:
            referrer = sb_get_partner(ref_code)
            if referrer:
                sb_create_partner_referral(
                    {
                        "referrer_partner_id": ref_code,
                        "referred_partner_id": new_partner_id,
                        "credits_awarded": 0.0,
                    }
                )
        token = create_access_token(
            {"sub": str(user["id"]), "email": body.email, "role": "partner", "partner_id": new_partner_id}
        )
        return {"success": True, "token": token, "partner_id": new_partner_id, "business_name": body.business_name}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("partner_register_v2 failed: %s", e)
        raise HTTPException(
            status_code=503,
            detail="Registration failed. Please try again.",
        ) from e


@router.get("/partner/v2/profile/{partner_id}", responses={403: {"description": "Partner access denied"}, 404: {"description": MSG_PARTNER_NOT_FOUND}})
def get_partner_profile_v2(partner_id: str, user: CurrentPartner):
    _require_owned_partner_id(user, partner_id)
    partner = sb_get_partner(partner_id)
    if not partner:
        raise HTTPException(status_code=404, detail=MSG_PARTNER_NOT_FOUND)
    locations = sb_get_partner_locations(partner_id)
    primary_loc = next((l for l in locations if l.get("is_primary")), locations[0] if locations else None)
    return {
        "success": True,
        "data": {
            "id": partner["id"],
            "business_name": partner.get("business_name", ""),
            "email": partner.get("email", ""),
            "credits": partner.get("credits", 0) or 0,
            "subscription_plan": partner.get("plan", "starter"),
            "location": primary_loc,
        },
    }


@router.get("/partner/v2/team/{partner_id}", responses={403: {"description": "Partner access denied"}})
def get_team_members(
    partner_id: str,
    user: CurrentPartner,
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
):
    _require_owned_partner_id(user, partner_id)
    from services.partner_service import partner_service
    team = partner_service.get_team_members(partner_id)[:limit]
    return {"success": True, "data": team, "count": len(team)}


@router.post("/partner/v2/team/{partner_id}/invite", responses={403: {"description": "Partner access denied"}})
def invite_team_member(partner_id: str, request: TeamInviteRequest, user: CurrentPartner):
    _require_owned_partner_id(user, partner_id)
    from services.partner_service import partner_service
    result = partner_service.invite_team_member(
        partner_id=partner_id, email=request.email or "", role=request.role, method=request.method
    )
    return result


@router.put("/partner/v2/team/{member_id}/role", responses={403: {"description": "Partner access denied"}, 404: {"description": "Member not found"}})
def update_member_role(member_id: str, role: str, user: CurrentPartner):
    from services.partner_service import partner_service
    member = partner_service.get_team_member(member_id)
    if not member:
        raise HTTPException(status_code=404, detail=MSG_MEMBER_NOT_FOUND)
    _require_owned_partner_id(user, member.get("partner_id"))
    success = partner_service.update_team_member_role(member_id, role)
    if not success:
        raise HTTPException(status_code=404, detail=MSG_MEMBER_NOT_FOUND)
    return {"success": True}


@router.delete("/partner/v2/team/{member_id}", responses={403: {"description": "Partner access denied"}, 404: {"description": "Member not found"}})
def revoke_team_access(member_id: str, user: CurrentPartner):
    from services.partner_service import partner_service
    member = partner_service.get_team_member(member_id)
    if not member:
        raise HTTPException(status_code=404, detail=MSG_MEMBER_NOT_FOUND)
    _require_owned_partner_id(user, member.get("partner_id"))
    success = partner_service.revoke_team_access(member_id)
    if not success:
        raise HTTPException(status_code=404, detail=MSG_MEMBER_NOT_FOUND)
    return {"success": True}


@router.get("/partner/v2/referrals/{partner_id}", responses={403: {"description": "Partner access denied"}})
def get_referrals(
    partner_id: str,
    user: CurrentPartner,
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
):
    _require_owned_partner_id(user, partner_id)
    referrals = sb_get_partner_referrals(partner_id)[:limit]
    total = len(referrals)
    credits_earned = sum(float(r.get("credits_awarded", 0)) for r in referrals)
    return {
        "success": True,
        "data": referrals,
        "stats": {
            "total": total,
            "active": total,
            "pending": 0,
            "total_earned": credits_earned,
        },
    }


@router.post("/partner/v2/referrals/{partner_id}", responses={403: {"description": "Partner access denied"}})
def send_referral(partner_id: str, request: ReferralRequest, user: CurrentPartner):
    from services.runtime_config import require_enabled

    require_enabled(
        "partner_referrals_enabled",
        "Partner referrals are temporarily disabled.",
    )
    _require_owned_partner_id(user, partner_id)
    ref = sb_create_partner_referral({
        "referrer_partner_id": partner_id,
        "credits_awarded": 0,
    })
    if not ref:
        return {"success": False, "message": "Failed to create referral"}
    return {"success": True, "referral_id": ref.get("id")}


@router.post("/partner/v2/credits/{partner_id}/use", responses={400: {"description": "Insufficient credits or partner not found"}, 403: {"description": "Partner access denied"}})
def use_credits(partner_id: str, request: CreditUseRequest, user: CurrentPartner):
    _require_owned_partner_id(user, partner_id)
    partner = sb_get_partner(partner_id)
    if not partner:
        raise HTTPException(status_code=400, detail=MSG_PARTNER_NOT_FOUND)
    current = partner.get("credits", 0) or 0
    if current < request.amount:
        raise HTTPException(status_code=400, detail="Insufficient credits")
    sb_update_partner(partner_id, {"credits": current - request.amount})
    return {
        "success": True,
        "amount_used": request.amount,
        "purpose": request.purpose,
        "remaining_credits": current - request.amount,
    }


@router.post("/partner/v2/redeem", responses={403: {"description": "Partner access denied"}})
def redeem_offer(
    request: QRRedemptionRequest,
    background_tasks: BackgroundTasks,
    user: CurrentPartner,
):
    from services.websocket_manager import ws_manager
    from routes.offers import validate_qr_token, complete_offer_redemption

    partner_id = _require_owned_partner_id(user)
    qr_raw = request.qr_data
    if isinstance(qr_raw, dict):
        qr_raw = qr_raw.get("qr_token") or qr_raw.get("token") or json.dumps(qr_raw)
    validated = validate_qr_token(qr_raw, consume_nonce=True)
    payload = validated["payload"]
    offer = validated["offer"]
    if str(offer.get("partner_id") or "") != str(partner_id):
        raise HTTPException(status_code=403, detail="This QR code is not valid for your business")

    result = complete_offer_redemption(
        offer=offer,
        user_id=str(payload.get("user_id") or ""),
        scanned_by_user_id=request.staff_id,
        qr_nonce=validated["nonce"],
        lat=payload.get("lat"),
        lng=payload.get("lng"),
    )
    if result["success"]:
        background_tasks.add_task(ws_manager.notify_partner_redemption, partner_id, result)
        customer_id = str(payload.get("user_id") or "")
        if customer_id:
            background_tasks.add_task(ws_manager.notify_customer_redeemed, customer_id, result)
    return result


# ==================== TEAM LINKS ====================
@router.post("/partner/v2/team-link/generate", responses={403: {"description": "Partner access denied"}, 404: {"description": MSG_PARTNER_NOT_FOUND}})
def generate_team_link(partner_id: str, user: CurrentPartner, label: str = "Team Link"):
    """Generate a shareable QR scan link for partner team members."""
    _require_owned_partner_id(user, partner_id)
    import secrets
    from services.supabase_service import _sb

    partner = sb_get_partner(partner_id)
    if not partner:
        raise HTTPException(status_code=404, detail=MSG_PARTNER_NOT_FOUND)

    token = secrets.token_urlsafe(32)
    try:
        result = _sb().table("partner_team_links").insert({
            "partner_id": partner_id,
            "token": token,
            "label": label,
            "created_by": partner_id,
            "is_active": True,
        }).execute()
        link_data = result.data[0] if result.data else {"token": token}
    except Exception as e:
        logger.warning(f"Team link DB error (table may not exist yet): {e}")
        link_data = {"token": token, "partner_id": partner_id, "label": label}

    scan_url = f"/scan/{partner_id}/{token}"
    return {
        "success": True,
        "data": {
            **link_data,
            "scan_url": scan_url,
            "full_url": f"{{base_url}}{scan_url}",
        },
    }


@router.get("/partner/v2/team-links/{partner_id}", responses={403: {"description": "Partner access denied"}})
def list_team_links(
    partner_id: str,
    user: CurrentPartner,
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
):
    _require_owned_partner_id(user, partner_id)
    from services.supabase_service import _sb
    try:
        result = _sb().table("partner_team_links").select("*").eq("partner_id", partner_id).eq("is_active", True).execute()
        links = (result.data or [])[:limit]
    except Exception:
        links = []
    return {"success": True, "data": links, "count": len(links)}


@router.delete("/partner/v2/team-link/{link_id}", responses={403: {"description": "Partner access denied"}, 404: {"description": "Team link not found"}, 500: {"description": "Failed to revoke team link"}})
def revoke_team_link(link_id: str, user: CurrentPartner):
    from services.supabase_service import _sb
    _require_owned_partner_id(user)
    try:
        row = _sb().table("partner_team_links").select("id,partner_id").eq("id", link_id).maybe_single().execute()
        link = row.data if row else None
        if not link:
            raise HTTPException(status_code=404, detail="Team link not found")
        _require_owned_partner_id(user, link.get("partner_id"))
        _sb().table("partner_team_links").update({"is_active": False}).eq("id", link_id).execute()
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Revoke team link error: {e}")
        raise HTTPException(status_code=500, detail="Failed to revoke team link")
    return {"success": True, "message": "Team link revoked"}


def _extract_team_token(authorization: Optional[str], payload: dict) -> str:
    """Extract team token from Authorization header or payload, raise 403 if missing."""
    token: Optional[str] = None
    if authorization and authorization.lower().startswith("bearer "):
        candidate = authorization.split(" ", 1)[1].strip()
        if candidate:
            token = candidate
    if not token:
        candidate = str(payload.get("team_token") or "").strip()
        if candidate:
            token = candidate
    if not token:
        raise HTTPException(status_code=403, detail="Missing team token")
    return token


@router.post("/partner/v2/scan/validate", responses={403: {"description": "Missing or invalid team token"}, 500: {"description": "Unable to validate team link"}})
def validate_scan(payload: dict, authorization: Annotated[Optional[str], Header()] = None):
    """Validate a QR code scanned via a team link. Token auth instead of partner login."""
    from services.supabase_service import _sb
    from routes.offers import validate_qr_token

    token = _extract_team_token(authorization, payload)
    # Verify the team link token
    try:
        link = _sb().table("partner_team_links").select("*").eq("token", token).eq("is_active", True).maybe_single().execute()
        if not link or not link.data:
            raise HTTPException(status_code=403, detail="Invalid or expired team link")
    except HTTPException:
        raise
    except Exception as e:
        logger.error("validate_scan token validation error: %s", e)
        raise HTTPException(status_code=500, detail="Unable to validate team link")

    validated = validate_qr_token(payload.get("qr_data") or payload.get("qr_token"), consume_nonce=False)
    offer = validated["offer"]
    qr_payload = validated["payload"]
    if str(offer.get("partner_id") or "") != str(link.data.get("partner_id") or ""):
        return {"success": False, "message": "QR code belongs to a different partner"}

    profile = None
    try:
        profile = _sb().table("profiles").select("name,full_name,email").eq("id", qr_payload.get("user_id")).maybe_single().execute()
    except Exception:
        profile = None
    customer_name = ""
    if profile and profile.data:
        customer_name = str(profile.data.get("name") or profile.data.get("full_name") or profile.data.get("email") or "").strip()
    parts = [p for p in customer_name.split(" ") if p]
    user_display_name = parts[0] if parts else "Driver"

    return {
        "success": True,
        "message": "QR code validated",
        "data": {
            "offer": {
                "id": offer.get("id"),
                "title": offer.get("title", str(offer.get("description", ""))[:60]),
                "business_name": offer.get("business_name"),
                "discount_percent": offer.get("discount_percent", 0),
                "base_gems": offer.get("base_gems", 0),
            },
            "customer_id": qr_payload.get("user_id"),
            "user_display_name": user_display_name,
            "payload": qr_payload,
        },
    }


@router.get("/partner/v2/redemptions/{partner_id}", responses={403: {"description": "Partner access denied"}})
def get_recent_redemptions(
    partner_id: str,
    user: CurrentPartner,
    limit: Annotated[int, Query(ge=1, le=100)] = 10,
):
    _require_owned_partner_id(user, partner_id)
    redemptions = sb_get_redemptions_by_partner(partner_id, limit)
    return {"success": True, "data": redemptions, "count": len(redemptions)}


@router.get("/partner/v2/fees/{partner_id}", responses={403: {"description": "Partner access denied"}, 404: {"description": MSG_PARTNER_NOT_FOUND}})
def get_partner_fees(partner_id: str, user: CurrentPartner):
    _require_owned_partner_id(user, partner_id)
    partner = sb_get_partner(partner_id)
    if not partner:
        raise HTTPException(status_code=404, detail=MSG_PARTNER_NOT_FOUND)
    monthly = get_monthly_fee_summary(partner_id)
    total_owed = partner.get("total_fees_owed", 0) or 0
    total_paid = partner.get("total_fees_paid", 0) or 0
    tier_info = get_fee_tier_info(monthly.get("redemption_count", 0))
    return {
        "success": True,
        "data": {
            **tier_info,
            "month_year": monthly.get("month_year"),
            "total_owed": round(total_owed, 2),
            "total_paid": round(total_paid, 2),
            "balance_due": round(total_owed - total_paid, 2),
            "total_fees_cents": monthly.get("total_fees_cents", 0),
            "redemptions_until_next_tier": monthly.get("redemptions_until_next_tier", 0),
            "next_threshold": monthly.get("next_threshold"),
            "history": get_partner_fee_history(partner_id),
        },
    }


@router.get("/partner/v2/invoices/{partner_id}", responses={403: {"description": "Partner access denied"}})
def get_partner_invoices(
    partner_id: str,
    user: CurrentPartner,
    limit: Annotated[int, Query(ge=1, le=24)] = 12,
):
    _require_owned_partner_id(user, partner_id)
    try:
        result = (
            _sb()
            .table("partner_invoices")
            .select("*")
            .eq("partner_id", partner_id)
            .order("month_year", desc=True)
            .limit(limit)
            .execute()
        )
        invoices = result.data or []
    except Exception:
        invoices = []
    return {"success": True, "data": invoices}


@router.post("/partner/v2/invoices/{partner_id}/generate", responses={403: {"description": "Partner access denied"}})
def generate_partner_invoice(
    partner_id: str,
    user: CurrentPartner,
    month_year: Annotated[Optional[str], Query()] = None,
):
    _require_owned_partner_id(user, partner_id)
    summary = get_monthly_fee_summary(partner_id, month_year)
    month = summary.get("month_year")
    amount_cents = int(summary.get("total_fees_cents") or 0)
    generated_at = datetime.now(timezone.utc)
    due_date = (generated_at + timedelta(days=14)).date().isoformat()
    invoice_number = f"SR-{partner_id[:6]}-{str(month).replace('-', '')}"
    payload = {
        "partner_id": partner_id,
        "month_year": month,
        "invoice_number": invoice_number,
        "amount_cents": amount_cents,
        "status": "open",
        "due_date": due_date,
        "generated_at": generated_at.isoformat(),
        "line_items": [
            {
                "description": f"Redemption fees for {month}",
                "redemption_count": summary.get("redemption_count", 0),
                "amount_cents": amount_cents,
                "current_fee_cents": summary.get("current_fee_cents", 0),
            }
        ],
    }
    try:
        result = _sb().table("partner_invoices").upsert(payload, on_conflict="partner_id,month_year").execute()
        row = result.data[0] if result.data else payload
    except Exception:
        row = payload
    return {"success": True, "data": row}


@router.get("/partner/v2/analytics/{partner_id}", responses={403: {"description": "Partner access denied"}})
def get_partner_analytics(partner_id: str, user: CurrentPartner):
    _require_owned_partner_id(user, partner_id)
    offers = sb_get_offers_by_partner(partner_id)
    totals_by_offer = {str(row.get("offer_id")): row for row in summarize_offer_analytics(limit=500)}
    total_redemptions = 0
    total_views = 0
    total_visits = 0
    chart_data = []
    for offer in offers:
        stats = totals_by_offer.get(str(offer.get("id")), {})
        views = int(stats.get("views") or offer.get("view_count") or offer.get("views") or 0)
        visits = int(stats.get("visits") or offer.get("visit_count") or 0)
        redemptions = int(stats.get("redemptions") or offer.get("redemption_count") or 0)
        total_views += views
        total_visits += visits
        total_redemptions += redemptions
        chart_data.append({
            "date": offer.get("business_name") or f"Offer {offer.get('id')}",
            "revenue": redemptions,
            "views": views,
            "visits": visits,
            "redemptions": redemptions,
        })
    active_offers = len([o for o in offers if o.get("status") == "active"])
    return {
        "success": True,
        "data": {
            "total_views": total_views,
            "total_clicks": total_visits,
            "total_redemptions": total_redemptions,
            "today_redemptions": total_redemptions,
            "revenue": round(sum((int(row.get("redemptions") or 0) * 0.2) for row in totals_by_offer.values()), 2),
            "active_offers": active_offers,
            "team_members": 0,
            "conversion_rate": round((total_redemptions / max(total_views, 1)) * 100, 1),
            "chart_data": chart_data[:20],
        },
    }


@router.get("/partner/v2/credits/history/{partner_id}", responses={403: {"description": "Partner access denied"}})
def get_credit_history(
    partner_id: str,
    user: CurrentPartner,
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
):
    """Credit transaction history from boosts, referrals, and bonuses."""
    _require_owned_partner_id(user, partner_id)
    boosts = sb_get_boosts(partner_id)
    referrals = sb_get_partner_referrals(partner_id)
    history = []
    for b in boosts:
        history.append({
            "id": b.get("id"),
            "type": "debit",
            "description": f"Boost: {b.get('boost_type', 'standard')} on offer",
            "amount": -float(b.get("cost", 0) or 0),
            "date": b.get("created_at", ""),
        })
    for r in referrals:
        earned = float(r.get("credits_awarded", 0) or 0)
        if earned > 0:
            history.append({
                "id": r.get("id"),
                "type": "credit",
                "description": "Partner Referral Reward",
                "amount": earned,
                "date": r.get("created_at", ""),
            })
    history.sort(key=lambda x: x.get("date", ""), reverse=True)

    total_earned = sum(h["amount"] for h in history if h["amount"] > 0)
    total_spent = abs(sum(h["amount"] for h in history if h["amount"] < 0))
    history = history[:limit]
    return {
        "success": True,
        "data": {
            "history": history,
            "total_earned": total_earned,
            "total_spent": total_spent,
        },
    }


@router.get("/partner/v2/referrals/leaderboard")
def get_referral_leaderboard(limit: Annotated[int, Query(ge=1, le=100)] = 10):
    """Top referrers across all partners."""
    partners = sb_get_partners(limit=100)
    leaderboard = []
    for p in partners:
        refs = sb_get_partner_referrals(p["id"])
        total_credits = sum(float(r.get("credits_awarded", 0) or 0) for r in refs)
        if refs:
            leaderboard.append({
                "name": p.get("business_name", "Unknown"),
                "referrals": len(refs),
                "credits": total_credits,
                "partner_id": p["id"],
            })
    leaderboard.sort(key=lambda x: x["referrals"], reverse=True)
    for i, entry in enumerate(leaderboard[:limit]):
        entry["rank"] = i + 1
        badge = None
        if i == 0: badge = "gold"
        elif i == 1: badge = "silver"
        elif i == 2: badge = "bronze"
        entry["badge"] = badge
    return {"success": True, "data": leaderboard[:limit]}


# ==================== STRIPE PAYMENT ENDPOINTS ====================
@router.post("/partner/v2/subscribe", responses={400: {"description": "Invalid plan"}, 403: {"description": "Partner access denied"}, 500: {"description": "Unable to create checkout session"}})
def stripe_subscribe(
    user: CurrentPartner,
    partner_id: str = "default_partner",
    plan: str = "starter",
    portal_origin: Annotated[Optional[str], Query(description="Partner app origin for Stripe return URLs")] = None,
):
    """Create a Stripe Checkout session for plan subscription."""
    from services.runtime_config import require_enabled

    require_enabled(
        "partner_payments_enabled",
        "Partner billing and payments are temporarily disabled.",
    )
    from config import (
        STRIPE_SECRET_KEY,
        STRIPE_PARTNER_STARTER_PRICE_ID,
        STRIPE_PARTNER_GROWTH_PRICE_ID,
    )
    if not STRIPE_SECRET_KEY or STRIPE_SECRET_KEY.startswith("sk_test_your"):
        return {"success": False, "message": MSG_STRIPE_NOT_CONFIGURED}
    owned_partner_id = _require_owned_partner_id(user, partner_id)
    try:
        import stripe
        stripe.api_key = STRIPE_SECRET_KEY
        plan_info = PARTNER_PLANS.get(plan)
        if not plan_info:
            raise HTTPException(status_code=400, detail="Invalid plan")
        price = plan_info.get("price_founders") or plan_info.get("price_public")
        if not price:
            return {"success": False, "message": "Enterprise plans require contacting sales"}
        base = _resolve_partner_portal_base(portal_origin)
        catalog_price = ""
        if plan == "starter":
            catalog_price = (STRIPE_PARTNER_STARTER_PRICE_ID or "").strip()
        elif plan == "growth":
            catalog_price = (STRIPE_PARTNER_GROWTH_PRICE_ID or "").strip()
        if catalog_price:
            line_items = [{"price": catalog_price, "quantity": 1}]
        else:
            line_items = [{
                "price_data": {
                    "currency": "usd",
                    "unit_amount": int(price * 100),
                    "recurring": {"interval": "month"},
                    "product_data": {"name": f"SnapRoad {plan_info['name']} Plan"},
                },
                "quantity": 1,
            }]
        owned_partner_id = _require_owned_partner_id(user, partner_id)
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            mode="subscription",
            line_items=line_items,
            metadata={"partner_id": owned_partner_id, "plan": plan},
            success_url=f"{base}/portal/partner?payment=success",
            cancel_url=f"{base}/portal/partner?payment=cancelled",
        )
        return {"success": True, "checkout_url": session.url, "session_id": session.id}
    except ImportError:
        return {"success": False, "message": MSG_STRIPE_NOT_INSTALLED}
    except Exception as e:
        logger.error(f"Stripe subscribe error: {e}")
        raise HTTPException(status_code=500, detail="Unable to create subscription checkout session")


@router.post("/partner/v2/boosts/purchase", responses={400: {"description": "Invalid boost type"}, 403: {"description": "Partner access denied"}, 500: {"description": "Unable to create boost checkout session"}})
def stripe_boost_purchase(
    user: CurrentPartner,
    partner_id: str = "default_partner",
    offer_id: str = "",
    boost_type: str = "basic",
    portal_origin: Annotated[Optional[str], Query()] = None,
):
    """Create a Stripe payment intent for a boost purchase."""
    from services.runtime_config import require_enabled

    require_enabled(
        "partner_payments_enabled",
        "Partner payments are temporarily disabled.",
    )
    from config import STRIPE_SECRET_KEY
    if not STRIPE_SECRET_KEY or STRIPE_SECRET_KEY.startswith("sk_test_your"):
        return {"success": False, "message": MSG_STRIPE_NOT_CONFIGURED}
    owned_partner_id = _require_owned_partner_id(user, partner_id)
    try:
        import stripe
        stripe.api_key = STRIPE_SECRET_KEY
        boost_info = BOOST_PRICING.get(boost_type)
        if not boost_info:
            raise HTTPException(status_code=400, detail="Invalid boost type")
        base = _resolve_partner_portal_base(portal_origin)
        owned_partner_id = _require_owned_partner_id(user, partner_id)
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            mode="payment",
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "unit_amount": int(boost_info["price"] * 100),
                    "product_data": {"name": f"SnapRoad {boost_info['name']}"},
                },
                "quantity": 1,
            }],
            metadata={"partner_id": owned_partner_id, "offer_id": offer_id, "boost_type": boost_type},
            success_url=f"{base}/portal/partner?boost=success",
            cancel_url=f"{base}/portal/partner?boost=cancelled",
        )
        return {"success": True, "checkout_url": session.url, "session_id": session.id}
    except ImportError:
        return {"success": False, "message": MSG_STRIPE_NOT_INSTALLED}
    except Exception as e:
        logger.error(f"Stripe boost error: {e}")
        raise HTTPException(status_code=500, detail="Unable to create boost checkout session")


@router.post("/partner/v2/credits/purchase", responses={400: {"description": "Invalid credits amount"}, 403: {"description": "Partner access denied"}, 500: {"description": "Unable to create credits checkout session"}})
def stripe_credits_purchase(
    user: CurrentPartner,
    partner_id: str = "default_partner",
    amount: float = 50.0,
    portal_origin: Annotated[Optional[str], Query()] = None,
):
    """Create a Stripe Checkout session to buy credits."""
    from services.runtime_config import require_enabled

    require_enabled(
        "partner_payments_enabled",
        "Partner billing is temporarily disabled.",
    )
    from config import STRIPE_SECRET_KEY
    if not STRIPE_SECRET_KEY or STRIPE_SECRET_KEY.startswith("sk_test_your"):
        return {"success": False, "message": MSG_STRIPE_NOT_CONFIGURED}
    owned_partner_id = _require_owned_partner_id(user, partner_id)
    if amount <= 0 or amount > 10000:
        raise HTTPException(status_code=400, detail="Invalid credits amount")
    try:
        import stripe
        stripe.api_key = STRIPE_SECRET_KEY
        base = _resolve_partner_portal_base(portal_origin)
        owned_partner_id = _require_owned_partner_id(user, partner_id)
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            mode="payment",
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "unit_amount": int(amount * 100),
                    "product_data": {"name": f"SnapRoad Partner Credits (${amount:.2f})"},
                },
                "quantity": 1,
            }],
            metadata={"partner_id": owned_partner_id, "credits_amount": str(amount)},
            success_url=f"{base}/portal/partner?credits=success",
            cancel_url=f"{base}/portal/partner?credits=cancelled",
        )
        return {"success": True, "checkout_url": session.url, "session_id": session.id}
    except ImportError:
        return {"success": False, "message": MSG_STRIPE_NOT_INSTALLED}
    except Exception as e:
        logger.error(f"Stripe credits error: {e}")
        raise HTTPException(status_code=500, detail="Unable to create credits checkout session")

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, BackgroundTasks
from typing import Optional
from datetime import datetime, timedelta
from models.schemas import (
    PartnerLocation, PartnerPlanUpdate, PartnerOfferCreate,
    PartnerLoginRequest, TeamInviteRequest, ReferralRequest,
    CreditUseRequest, QRRedemptionRequest, BoostRequest, BoostCreditsRequest,
)
from services.mock_data import (
    offers_db, partners_db, PARTNER_PLANS, BOOST_PRICING, active_boosts,
)
import json

router = APIRouter(prefix="/api", tags=["Partners"])


# ==================== PARTNER PLANS ====================
@router.get("/partner/plans")
def get_partner_plans():
    return {"success": True, "data": {"plans": PARTNER_PLANS, "is_founders_active": True}}


@router.get("/partner/profile")
def get_partner_profile(partner_id: str = "default_partner"):
    partner = partners_db.get(partner_id)
    if not partner:
        partners_db[partner_id] = {
            "id": partner_id, "business_name": "New Business", "email": "",
            "plan": "starter", "is_founders": True, "locations": [],
            "created_at": datetime.now().isoformat(),
        }
        partner = partners_db[partner_id]
    plan_info = PARTNER_PLANS.get(partner["plan"], PARTNER_PLANS["starter"])
    return {
        "success": True,
        "data": {
            "id": partner["id"], "business_name": partner["business_name"],
            "email": partner.get("email", ""), "plan": partner["plan"],
            "plan_info": plan_info, "is_founders": partner.get("is_founders", True),
            "locations": partner["locations"], "location_count": len(partner["locations"]),
            "max_locations": plan_info["max_locations"],
            "can_add_location": len(partner["locations"]) < plan_info["max_locations"],
            "created_at": partner["created_at"],
        },
    }


@router.post("/partner/plan")
def update_partner_plan(plan_update: PartnerPlanUpdate, partner_id: str = "default_partner"):
    if plan_update.plan not in PARTNER_PLANS:
        return {"success": False, "message": "Invalid plan"}
    if partner_id not in partners_db:
        return {"success": False, "message": "Partner not found"}
    partners_db[partner_id]["plan"] = plan_update.plan
    plan_info = PARTNER_PLANS[plan_update.plan]
    return {"success": True, "message": f"Plan updated to {plan_info['name']}", "data": {"plan": plan_update.plan, "max_locations": plan_info["max_locations"], "features": plan_info["features"]}}


# ==================== LOCATIONS ====================
@router.get("/partner/locations")
def get_partner_locations(partner_id: str = "default_partner"):
    partner = partners_db.get(partner_id)
    if not partner:
        return {"success": False, "message": "Partner not found", "data": []}
    plan_info = PARTNER_PLANS.get(partner["plan"], PARTNER_PLANS["starter"])
    return {"success": True, "data": partner["locations"], "count": len(partner["locations"]), "max_locations": plan_info["max_locations"], "can_add_more": len(partner["locations"]) < plan_info["max_locations"]}


@router.post("/partner/locations")
def add_partner_location(location: PartnerLocation, partner_id: str = "default_partner"):
    if partner_id not in partners_db:
        partners_db[partner_id] = {"id": partner_id, "business_name": "New Business", "email": "", "plan": "starter", "is_founders": True, "locations": [], "created_at": datetime.now().isoformat()}
    partner = partners_db[partner_id]
    plan_info = PARTNER_PLANS.get(partner["plan"], PARTNER_PLANS["starter"])
    if len(partner["locations"]) >= plan_info["max_locations"]:
        return {"success": False, "message": f"Location limit reached ({plan_info['max_locations']}). Upgrade your plan."}
    new_id = max([loc["id"] for loc in partner["locations"]], default=0) + 1
    if location.is_primary or len(partner["locations"]) == 0:
        for loc in partner["locations"]:
            loc["is_primary"] = False
        location.is_primary = True
    new_location = {"id": new_id, "name": location.name, "address": location.address, "lat": location.lat, "lng": location.lng, "is_primary": location.is_primary, "created_at": datetime.now().isoformat()}
    partner["locations"].append(new_location)
    return {"success": True, "message": f"Location '{location.name}' added successfully", "data": new_location}


@router.put("/partner/locations/{location_id}")
def update_partner_location(location_id: int, location: PartnerLocation, partner_id: str = "default_partner"):
    partner = partners_db.get(partner_id)
    if not partner:
        return {"success": False, "message": "Partner not found"}
    loc = next((l for l in partner["locations"] if l["id"] == location_id), None)
    if not loc:
        return {"success": False, "message": "Location not found"}
    loc["name"] = location.name
    loc["address"] = location.address
    loc["lat"] = location.lat
    loc["lng"] = location.lng
    if location.is_primary:
        for l in partner["locations"]:
            l["is_primary"] = l["id"] == location_id
    return {"success": True, "message": "Location updated", "data": loc}


@router.delete("/partner/locations/{location_id}")
def delete_partner_location(location_id: int, partner_id: str = "default_partner"):
    partner = partners_db.get(partner_id)
    if not partner:
        return {"success": False, "message": "Partner not found"}
    loc = next((l for l in partner["locations"] if l["id"] == location_id), None)
    if not loc:
        return {"success": False, "message": "Location not found"}
    partner["locations"] = [l for l in partner["locations"] if l["id"] != location_id]
    if loc["is_primary"] and partner["locations"]:
        partner["locations"][0]["is_primary"] = True
    return {"success": True, "message": "Location deleted"}


@router.post("/partner/locations/{location_id}/set-primary")
def set_primary_location(location_id: int, partner_id: str = "default_partner"):
    partner = partners_db.get(partner_id)
    if not partner:
        return {"success": False, "message": "Partner not found"}
    found = False
    for loc in partner["locations"]:
        loc["is_primary"] = loc["id"] == location_id
        if loc["id"] == location_id:
            found = True
    if not found:
        return {"success": False, "message": "Location not found"}
    return {"success": True, "message": "Primary location updated"}


# ==================== PARTNER OFFERS ====================
@router.post("/partner/offers")
def create_partner_offer(offer: PartnerOfferCreate, partner_id: str = "default_partner"):
    partner = partners_db.get(partner_id)
    if not partner:
        return {"success": False, "message": "Partner not found"}
    location = next((l for l in partner["locations"] if l["id"] == offer.location_id), None)
    if not location:
        return {"success": False, "message": "Location not found"}
    new_id = max([o["id"] for o in offers_db], default=0) + 1
    new_offer = {
        "id": new_id, "business_name": partner["business_name"], "business_type": "retail",
        "title": offer.title, "description": offer.description, "discount_percent": offer.discount_percent,
        "base_gems": offer.gems_reward, "lat": location["lat"], "lng": location["lng"],
        "location_id": offer.location_id, "location_name": location["name"],
        "location_address": location["address"], "is_admin_offer": False,
        "created_at": datetime.now().isoformat(),
        "expires_at": (datetime.now() + timedelta(hours=offer.expires_hours)).isoformat(),
        "created_by": partner_id, "redemption_count": 0, "views": 0, "status": "active",
        "image_url": offer.image_url,
    }
    offers_db.append(new_offer)
    return {"success": True, "message": f"Offer created at {location['name']}", "data": new_offer}


@router.get("/partner/offers")
def get_partner_offers(partner_id: str = "default_partner"):
    partner_offers = [o for o in offers_db if o.get("created_by") == partner_id]
    return {"success": True, "data": partner_offers, "count": len(partner_offers)}


@router.put("/partner/profile")
def update_partner_profile(business_name: Optional[str] = None, email: Optional[str] = None, partner_id: str = "default_partner"):
    if partner_id not in partners_db:
        return {"success": False, "message": "Partner not found"}
    partner = partners_db[partner_id]
    if business_name:
        partner["business_name"] = business_name
    if email:
        partner["email"] = email
    return {"success": True, "message": "Profile updated", "data": partner}


# ==================== BOOST SYSTEM ====================
@router.get("/partner/boosts/pricing")
def get_boost_pricing():
    return {"success": True, "data": {"packages": BOOST_PRICING, "currency": "USD"}}


@router.post("/partner/boosts/create")
def create_offer_boost(boost_req: BoostRequest, partner_id: str = "default_partner"):
    partner = partners_db.get(partner_id)
    if not partner:
        return {"success": False, "message": "Partner not found"}
    if boost_req.boost_type not in BOOST_PRICING:
        return {"success": False, "message": "Invalid boost type"}
    boost_config = BOOST_PRICING[boost_req.boost_type]
    offer = next((o for o in offers_db if o["id"] == boost_req.offer_id), None)
    if not offer:
        return {"success": False, "message": "Offer not found"}
    boost_expires = datetime.now() + timedelta(hours=boost_config["duration_hours"])
    boost_record = {
        "id": f"boost_{boost_req.offer_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "offer_id": boost_req.offer_id, "boost_type": boost_req.boost_type,
        "boost_name": boost_config["name"], "multiplier": boost_config["multiplier"],
        "price_paid": boost_config["price"], "payment_method": "credits" if boost_req.use_credits else "card",
        "created_at": datetime.now().isoformat(), "expires_at": boost_expires.isoformat(),
        "partner_id": partner_id, "status": "active",
    }
    active_boosts[boost_req.offer_id] = boost_record
    offer["is_boosted"] = True
    offer["boost_multiplier"] = boost_config["multiplier"]
    offer["boost_expires"] = boost_expires.isoformat()
    return {"success": True, "message": f"{boost_config['name']} applied!", "data": boost_record}


@router.get("/partner/boosts/active")
def get_active_boosts(partner_id: str = "default_partner"):
    partner_boosts = []
    current_time = datetime.now()
    for offer_id, boost in active_boosts.items():
        if boost["partner_id"] == partner_id:
            is_active = datetime.fromisoformat(boost["expires_at"]) > current_time
            remaining = (datetime.fromisoformat(boost["expires_at"]) - current_time).total_seconds() / 3600 if is_active else 0
            partner_boosts.append({**boost, "is_active": is_active, "hours_remaining": remaining})
    return {"success": True, "data": partner_boosts, "active_count": sum(1 for b in partner_boosts if b.get("is_active"))}


@router.delete("/partner/boosts/{offer_id}")
def cancel_boost(offer_id: int, partner_id: str = "default_partner"):
    boost = active_boosts.get(offer_id)
    if not boost:
        return {"success": False, "message": "No active boost found"}
    boost["status"] = "cancelled"
    offer = next((o for o in offers_db if o["id"] == offer_id), None)
    if offer:
        offer["is_boosted"] = False
        offer.pop("boost_multiplier", None)
        offer.pop("boost_expires", None)
    return {"success": True, "message": "Boost cancelled"}


@router.get("/partner/credits")
def get_partner_credits(partner_id: str = "default_partner"):
    partner = partners_db.get(partner_id)
    if not partner:
        return {"success": False, "message": "Partner not found"}
    return {"success": True, "data": {"balance": partner.get("credits", 0), "currency": "USD"}}


@router.post("/partner/credits/add")
def add_partner_credits(credits_req: BoostCreditsRequest, partner_id: str = "default_partner"):
    if partner_id not in partners_db:
        return {"success": False, "message": "Partner not found"}
    partner = partners_db[partner_id]
    current = partner.get("credits", 0)
    partner["credits"] = current + credits_req.amount
    return {"success": True, "message": f"Added ${credits_req.amount} in credits", "data": {"previous_balance": current, "added": credits_req.amount, "new_balance": partner["credits"]}}


# ==================== PARTNER V2 ENDPOINTS ====================
@router.post("/partner/v2/login")
async def partner_login_v2(request: PartnerLoginRequest):
    from services.partner_service import partner_service
    result = partner_service.authenticate(request.email, request.password)
    if not result:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return result


@router.get("/partner/v2/profile/{partner_id}")
async def get_partner_profile_v2(partner_id: str):
    from services.partner_service import partner_service
    partner = partner_service.get_partner(partner_id)
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    return {"success": True, "data": {"id": partner["id"], "business_name": partner["business_name"], "email": partner["email"], "credits": partner["credits"], "subscription_plan": partner["subscription_plan"], "location": partner["location"]}}


@router.get("/partner/v2/team/{partner_id}")
async def get_team_members(partner_id: str):
    from services.partner_service import partner_service
    team = partner_service.get_team_members(partner_id)
    return {"success": True, "data": team, "count": len(team)}


@router.post("/partner/v2/team/{partner_id}/invite")
async def invite_team_member(partner_id: str, request: TeamInviteRequest):
    from services.partner_service import partner_service
    result = partner_service.invite_team_member(partner_id=partner_id, email=request.email or "", role=request.role, method=request.method)
    return result


@router.put("/partner/v2/team/{member_id}/role")
async def update_member_role(member_id: str, role: str):
    from services.partner_service import partner_service
    success = partner_service.update_team_member_role(member_id, role)
    if not success:
        raise HTTPException(status_code=404, detail="Member not found")
    return {"success": True}


@router.delete("/partner/v2/team/{member_id}")
async def revoke_team_access(member_id: str):
    from services.partner_service import partner_service
    success = partner_service.revoke_team_access(member_id)
    if not success:
        raise HTTPException(status_code=404, detail="Member not found")
    return {"success": True}


@router.get("/partner/v2/referrals/{partner_id}")
async def get_referrals(partner_id: str):
    from services.partner_service import partner_service
    referrals = partner_service.get_referrals(partner_id)
    stats = partner_service.get_referral_stats(partner_id)
    return {"success": True, "data": referrals, "stats": stats}


@router.post("/partner/v2/referrals/{partner_id}")
async def send_referral(partner_id: str, request: ReferralRequest):
    from services.partner_service import partner_service
    return partner_service.send_referral(partner_id, request.email, request.message)


@router.post("/partner/v2/credits/{partner_id}/use")
async def use_credits(partner_id: str, request: CreditUseRequest):
    from services.partner_service import partner_service
    result = partner_service.use_credits(partner_id, request.amount, request.purpose)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.post("/partner/v2/redeem")
async def redeem_offer(request: QRRedemptionRequest, background_tasks: BackgroundTasks):
    from services.partner_service import partner_service
    from services.websocket_manager import ws_manager
    result = partner_service.validate_redemption(request.qr_data, request.staff_id)
    if result["success"]:
        background_tasks.add_task(ws_manager.notify_partner_redemption, "partner_001", result)
        customer_id = request.qr_data.get("customerId")
        if customer_id:
            background_tasks.add_task(ws_manager.notify_customer_redeemed, customer_id, result)
    return result


@router.get("/partner/v2/redemptions/{partner_id}")
async def get_recent_redemptions(partner_id: str, limit: int = 10):
    from services.partner_service import partner_service
    redemptions = partner_service.get_recent_redemptions(partner_id, limit)
    return {"success": True, "data": redemptions, "count": len(redemptions)}


@router.get("/partner/v2/analytics/{partner_id}")
async def get_partner_analytics(partner_id: str):
    from services.partner_service import partner_service
    analytics = partner_service.get_analytics(partner_id)
    return {"success": True, "data": analytics}

"""
SnapRoad Admin API Routes
All endpoints use the Supabase DAO layer (supabase_service.py).
"""
from fastapi import APIRouter, Body
from typing import Optional
from datetime import datetime, timedelta
import logging

from models.schemas import (
    AdminOfferCreate, PricingUpdate, OfferImport, BulkOfferUpload,
    BoostCalculate, BoostCreate, AnalyticsEvent,
)
from services.supabase_service import (
    sb_list_profiles, sb_get_profile, sb_update_profile,
    sb_suspend_profile, sb_activate_profile, sb_delete_profile,
    sb_get_partners, sb_get_partner, sb_create_partner,
    sb_update_partner, sb_delete_partner,
    sb_get_partner_locations,
    sb_get_offers, sb_create_offer, sb_update_offer, sb_delete_offer,
    sb_get_boosts, sb_create_boost, sb_cancel_boost,
    sb_get_redemptions, sb_get_redemption_stats,
    sb_get_challenges,
    sb_get_badges,
    sb_get_incidents, sb_create_incident, sb_update_incident,
    sb_get_admin_notifications, sb_create_notification,
    sb_mark_notification_read,
    sb_get_campaigns, sb_create_campaign, sb_update_campaign, sb_delete_campaign,
    sb_get_rewards, sb_create_reward, sb_update_reward, sb_delete_reward,
    sb_get_audit_logs, sb_create_audit_log,
    sb_get_settings, sb_update_setting,
    sb_get_legal_documents, sb_update_legal_document,
    sb_get_referral_analytics,
    sb_get_finance_summary,
    sb_get_platform_stats, sb_get_trips_stats,
    test_connection,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["Admin"])

BOOST_PRICING_ADMIN = {
    "base_daily_cost": 25, "additional_day_cost": 20,
    "base_reach": 100, "base_reach_cost": 5,
    "reach_increment": 100, "reach_increment_cost": 10,
}


# ==================== PLATFORM STATS ====================

@router.get("/admin/stats")
def get_admin_stats():
    stats = sb_get_platform_stats()
    if stats:
        return {"success": True, "source": "supabase", "data": stats}
    return {"success": True, "source": "empty", "data": {
        "total_users": 0, "premium_users": 0, "total_partners": 0,
        "active_partners": 0, "total_offers": 0, "total_redemptions": 0,
        "total_trips": 0, "total_gems": 0,
    }}


# ==================== ANALYTICS ====================

@router.get("/admin/analytics")
def get_admin_analytics():
    stats = sb_get_platform_stats()
    trip_stats = sb_get_trips_stats()
    redemption_stats = sb_get_redemption_stats()
    finance = sb_get_finance_summary()

    incidents_pending = len(sb_get_incidents(status="pending", limit=200))
    incidents_approved = len(sb_get_incidents(status="approved", limit=200))

    return {
        "success": True,
        "data": {
            "summary": {
                "total_users": stats.get("total_users", 0),
                "premium_users": stats.get("premium_users", 0),
                "total_partners": stats.get("total_partners", 0),
                "active_partners": stats.get("active_partners", 0),
                "total_offers": stats.get("total_offers", 0),
                "total_trips": trip_stats.get("total_trips", 0),
                "total_redemptions": redemption_stats.get("total", 0),
                "total_gems": stats.get("total_gems", 0),
                "total_mrr": finance.get("total_mrr", 0),
            },
            "queues": {
                "incident_review": incidents_pending,
                "consent_pending": 0,
                "fraud_flags": 0,
            },
        },
    }


# ==================== REFERRAL ANALYTICS ====================

@router.get("/admin/referral-analytics")
def get_referral_analytics():
    data = sb_get_referral_analytics()
    return {"success": True, "data": data}


# ==================== FINANCE ====================

@router.get("/admin/finance")
def get_finance_data():
    summary = sb_get_finance_summary()
    return {"success": True, "data": {"summary": summary}}


# ==================== NOTIFICATIONS ====================

@router.get("/admin/notifications")
def get_notifications():
    data = sb_get_admin_notifications(limit=50)
    return {"success": True, "data": data}


@router.post("/admin/notifications")
def create_notification_endpoint(notification_data: dict):
    result = sb_create_notification(notification_data)
    if result:
        return {"success": True, "message": "Notification created", "data": result}
    return {"success": False, "message": "Failed to create notification"}


@router.patch("/admin/notifications/{notification_id}/read")
def mark_notification_read(notification_id: str):
    success = sb_mark_notification_read(notification_id)
    if success:
        return {"success": True, "message": "Notification marked as read"}
    return {"success": False, "message": "Failed to mark notification as read"}


# ==================== LEGAL DOCUMENTS ====================

@router.get("/admin/legal-documents")
def get_legal_documents():
    data = sb_get_legal_documents()
    return {"success": True, "data": data}


@router.put("/admin/legal-documents/{doc_id}")
def update_legal_document(doc_id: str, doc_data: dict):
    success = sb_update_legal_document(doc_id, doc_data)
    if success:
        sb_create_audit_log("LEGAL_DOC_UPDATED", "admin", doc_id, f"Updated legal document")
        return {"success": True, "message": "Document updated"}
    return {"success": False, "message": "Failed to update document"}


# ==================== SETTINGS ====================

@router.get("/admin/settings")
def get_settings():
    data = sb_get_settings()
    return {"success": True, "data": data}


@router.post("/admin/settings")
def update_settings(settings_data: dict):
    for key, value in settings_data.items():
        sb_update_setting(key, value)
    sb_create_audit_log("SETTINGS_UPDATED", "admin", "platform_settings", "Updated platform settings")
    return {"success": True, "message": "Settings updated successfully", "data": settings_data}


# ==================== AUDIT LOG ====================

@router.get("/admin/audit-log")
def get_audit_log(limit: int = 50):
    data = sb_get_audit_logs(limit=limit)
    return {"success": True, "data": data}


# ==================== INCIDENTS ====================

@router.get("/admin/incidents")
def get_incidents(status: Optional[str] = None):
    data = sb_get_incidents(status=status)
    return {"success": True, "data": data}


@router.post("/admin/incidents/{incident_id}/moderate")
async def moderate_incident(incident_id: str, outcome: str = Body(..., embed=True)):
    if outcome not in ["approved", "rejected"]:
        return {"success": False, "message": "Invalid outcome. Must be 'approved' or 'rejected'"}

    success = sb_update_incident(incident_id, {
        "status": outcome,
        "moderated_by": "admin",
        "moderated_at": datetime.now().isoformat(),
    })

    if success:
        sb_create_audit_log("INCIDENT_MODERATED", "admin", incident_id, f"Incident {outcome}")
        try:
            from services.websocket_manager import ws_manager
            await ws_manager.broadcast_moderation_update(incident_id, outcome)
        except Exception as e:
            logger.warning(f"Could not broadcast moderation update: {e}")
        return {"success": True, "message": f"Incident {incident_id} marked as {outcome}"}
    return {"success": False, "message": "Failed to moderate incident"}


@router.get("/admin/incidents/moderated")
def get_moderated_incidents():
    approved = sb_get_incidents(status="approved")
    rejected = sb_get_incidents(status="rejected")
    return {"success": True, "data": approved + rejected, "total": len(approved) + len(rejected)}


# ==================== OFFERS CRUD ====================

@router.get("/admin/offers")
def get_offers(status: str = "all"):
    data = sb_get_offers(status=status)
    return {"success": True, "data": data}


@router.post("/admin/offers")
def create_offer(offer_data: dict):
    offer_data.setdefault("status", "active")
    offer_data.setdefault("is_admin_offer", True)
    offer_data.setdefault("created_by", "admin")
    result = sb_create_offer(offer_data)
    if result:
        sb_create_audit_log("OFFER_CREATED", "admin", result.get("id", ""), f"Created offer: {offer_data.get('title', '')}")
        return {"success": True, "message": "Offer created successfully", "data": result}
    return {"success": False, "message": "Failed to create offer"}


@router.post("/admin/offers/create")
def admin_create_offer(offer: AdminOfferCreate):
    data = {
        "business_name": offer.business_name,
        "business_type": offer.business_type,
        "description": offer.description,
        "discount_percent": offer.discount_percent,
        "base_gems": offer.base_gems,
        "lat": offer.lat,
        "lng": offer.lng,
        "is_admin_offer": True,
        "created_by": "admin",
        "status": "active",
        "title": offer.description[:60] if offer.description else "Admin Offer",
    }
    if offer.image_id:
        data["image_url"] = offer.image_id
    if offer.expires_hours:
        data["expires_at"] = (datetime.now() + timedelta(hours=offer.expires_hours)).isoformat()

    result = sb_create_offer(data)
    if result:
        sb_create_audit_log("OFFER_CREATED", "admin", result.get("id", ""), f"Created offer for {offer.business_name}")
        return {"success": True, "message": f"Offer created for {offer.business_name}", "data": result}
    return {"success": False, "message": "Failed to create offer"}


@router.post("/admin/offers/bulk")
def admin_bulk_offers(data: BulkOfferUpload):
    created = []
    for item in data.offers:
        offer_data = {
            "business_name": item.business_name,
            "business_type": item.business_type,
            "description": item.description,
            "base_gems": item.base_gems,
            "address": item.address,
            "lat": item.lat or 39.9612,
            "lng": item.lng or -82.9988,
            "offer_url": item.offer_url,
            "is_admin_offer": True,
            "created_by": "admin",
            "status": "active",
            "title": item.description[:60] if item.description else "Bulk Offer",
            "expires_at": (datetime.now() + timedelta(days=item.expires_days)).isoformat() if item.expires_days else None,
        }
        result = sb_create_offer(offer_data)
        if result:
            created.append(result)
    return {"success": True, "message": f"Created {len(created)} offers", "data": {"created_count": len(created), "offers": created}}


@router.put("/admin/offers/{offer_id}")
def update_offer(offer_id: str, offer_data: dict):
    success = sb_update_offer(offer_id, offer_data)
    if success:
        return {"success": True, "message": "Offer updated successfully"}
    return {"success": False, "message": "Failed to update offer"}


@router.delete("/admin/offers/{offer_id}")
def delete_offer(offer_id: str):
    success = sb_delete_offer(offer_id)
    if success:
        sb_create_audit_log("OFFER_DELETED", "admin", offer_id, "Deleted offer")
        return {"success": True, "message": "Offer deleted successfully"}
    return {"success": False, "message": "Failed to delete offer"}


@router.get("/admin/export/offers")
def export_offers(format: str = "json"):
    offers = sb_get_offers(status="all")
    if format == "csv" and offers:
        headers = list(offers[0].keys())
        csv_lines = [",".join(headers)] + [",".join(str(o.get(h, "")) for h in headers) for o in offers]
        return {"success": True, "data": "\n".join(csv_lines), "format": "csv", "count": len(offers)}
    return {"success": True, "data": offers, "format": "json", "count": len(offers)}


@router.get("/admin/export/users")
def export_users(format: str = "json"):
    users = sb_list_profiles(limit=5000)
    if format == "csv" and users:
        headers = list(users[0].keys())
        csv_lines = [",".join(headers)] + [",".join(str(u.get(h, "")) for h in headers) for u in users]
        return {"success": True, "data": "\n".join(csv_lines), "format": "csv", "count": len(users)}
    return {"success": True, "data": users, "format": "json", "count": len(users)}


@router.post("/admin/import/offers")
def import_offers(import_data: OfferImport):
    imported = 0
    errors = []
    for offer_data in import_data.offers:
        try:
            data = {
                "business_name": offer_data.get("business_name", "Imported"),
                "business_type": offer_data.get("business_type", "retail"),
                "description": offer_data.get("description", ""),
                "title": offer_data.get("title", offer_data.get("description", "Import")[:60]),
                "base_gems": offer_data.get("base_gems", 25),
                "lat": offer_data.get("lat", 39.9612),
                "lng": offer_data.get("lng", -82.9988),
                "is_admin_offer": True,
                "created_by": "admin_import",
                "status": "active",
            }
            result = sb_create_offer(data)
            if result:
                imported += 1
        except Exception as e:
            errors.append(str(e))
    return {"success": True, "message": f"Imported {imported} offers", "data": {"imported": imported, "errors": errors}}


# ==================== PARTNERS CRUD ====================

@router.get("/admin/partners")
def get_partners():
    data = sb_get_partners()
    return {"success": True, "data": data}


@router.post("/admin/partners")
def create_partner(partner_data: dict):
    partner_data.setdefault("status", "pending")
    partner_data.setdefault("is_approved", False)
    result = sb_create_partner(partner_data)
    if result:
        sb_create_audit_log("PARTNER_CREATED", "admin", result.get("id", ""), f"Created partner: {partner_data.get('business_name', '')}")
        return {"success": True, "message": "Partner created successfully", "data": result}
    return {"success": False, "message": "Failed to create partner"}


@router.put("/admin/partners/{partner_id}")
def update_partner(partner_id: str, partner_data: dict):
    success = sb_update_partner(partner_id, partner_data)
    if success:
        return {"success": True, "message": "Partner updated successfully"}
    return {"success": False, "message": "Failed to update partner"}


@router.delete("/admin/partners/{partner_id}")
def delete_partner(partner_id: str):
    success = sb_delete_partner(partner_id)
    if success:
        sb_create_audit_log("PARTNER_DELETED", "admin", partner_id, "Deleted partner")
        return {"success": True, "message": "Partner deleted successfully"}
    return {"success": False, "message": "Failed to delete partner"}


@router.post("/admin/partners/{partner_id}/approve")
def approve_partner(partner_id: str):
    success = sb_update_partner(partner_id, {"status": "active", "is_approved": True})
    if success:
        sb_create_audit_log("PARTNER_APPROVED", "admin", partner_id, "Approved partner")
        return {"success": True, "message": "Partner approved successfully"}
    return {"success": False, "message": "Failed to approve partner"}


@router.post("/admin/partners/{partner_id}/suspend")
def suspend_partner(partner_id: str):
    success = sb_update_partner(partner_id, {"status": "suspended"})
    if success:
        sb_create_audit_log("PARTNER_SUSPENDED", "admin", partner_id, "Suspended partner")
        return {"success": True, "message": "Partner suspended successfully"}
    return {"success": False, "message": "Failed to suspend partner"}


# ==================== CAMPAIGNS CRUD ====================

@router.get("/admin/campaigns")
def get_campaigns():
    data = sb_get_campaigns()
    return {"success": True, "data": data}


@router.post("/admin/campaigns")
def create_campaign(campaign_data: dict):
    campaign_data.setdefault("status", "draft")
    result = sb_create_campaign(campaign_data)
    if result:
        return {"success": True, "message": "Campaign created successfully", "data": result}
    return {"success": False, "message": "Failed to create campaign"}


@router.put("/admin/campaigns/{campaign_id}")
def update_campaign(campaign_id: str, campaign_data: dict):
    success = sb_update_campaign(campaign_id, campaign_data)
    if success:
        return {"success": True, "message": "Campaign updated successfully"}
    return {"success": False, "message": "Failed to update campaign"}


@router.delete("/admin/campaigns/{campaign_id}")
def delete_campaign(campaign_id: str):
    success = sb_delete_campaign(campaign_id)
    if success:
        return {"success": True, "message": "Campaign deleted successfully"}
    return {"success": False, "message": "Failed to delete campaign"}


@router.post("/admin/campaigns/{campaign_id}/activate")
def activate_campaign(campaign_id: str):
    success = sb_update_campaign(campaign_id, {"status": "active"})
    if success:
        return {"success": True, "message": "Campaign activated successfully"}
    return {"success": False, "message": "Failed to activate campaign"}


# ==================== REWARDS CRUD ====================

@router.get("/admin/rewards")
def get_rewards():
    data = sb_get_rewards()
    return {"success": True, "data": data}


@router.post("/admin/rewards")
def create_reward(reward_data: dict):
    reward_data.setdefault("status", "active")
    result = sb_create_reward(reward_data)
    if result:
        return {"success": True, "message": "Reward created successfully", "data": result}
    return {"success": False, "message": "Failed to create reward"}


@router.put("/admin/rewards/{reward_id}")
def update_reward(reward_id: str, reward_data: dict):
    success = sb_update_reward(reward_id, reward_data)
    if success:
        return {"success": True, "message": "Reward updated successfully"}
    return {"success": False, "message": "Failed to update reward"}


@router.delete("/admin/rewards/{reward_id}")
def delete_reward(reward_id: str):
    success = sb_delete_reward(reward_id)
    if success:
        return {"success": True, "message": "Reward deleted successfully"}
    return {"success": False, "message": "Failed to delete reward"}


@router.post("/admin/rewards/{reward_id}/claim")
def claim_reward(reward_id: str, user_data: dict):
    rewards = sb_get_rewards()
    reward = next((r for r in rewards if r["id"] == reward_id), None)
    if not reward:
        return {"success": False, "message": "Reward not found"}
    if reward.get("claimed", 0) >= reward.get("total", 0):
        return {"success": False, "message": "Reward out of stock"}
    sb_update_reward(reward_id, {"claimed": reward.get("claimed", 0) + 1})
    return {"success": True, "message": "Reward claimed successfully"}


# ==================== USERS CRUD ====================

@router.get("/admin/users")
def get_users(limit: int = 100):
    data = sb_list_profiles(limit=limit)
    return {"success": True, "source": "supabase", "data": data, "total": len(data)}


@router.put("/admin/users/{user_id}")
def update_user(user_id: str, user_data: dict):
    success = sb_update_profile(user_id, user_data)
    if success:
        return {"success": True, "message": "User updated successfully"}
    return {"success": False, "message": "Failed to update user"}


@router.delete("/admin/users/{user_id}")
def delete_user(user_id: str):
    success = sb_delete_profile(user_id)
    if success:
        sb_create_audit_log("USER_DELETED", "admin", user_id, "Deleted user")
        return {"success": True, "message": "User deleted successfully"}
    return {"success": False, "message": "Failed to delete user"}


@router.post("/admin/users/{user_id}/suspend")
def suspend_user(user_id: str):
    success = sb_suspend_profile(user_id)
    if success:
        sb_create_audit_log("USER_SUSPENDED", "admin", user_id, "Suspended user")
        return {"success": True, "message": "User suspended successfully"}
    return {"success": False, "message": "Failed to suspend user"}


@router.post("/admin/users/{user_id}/activate")
def activate_user(user_id: str):
    success = sb_activate_profile(user_id)
    if success:
        return {"success": True, "message": "User activated successfully"}
    return {"success": False, "message": "Failed to activate user"}


# ==================== PRICING ====================

@router.get("/admin/pricing")
def get_admin_pricing():
    settings = sb_get_settings()
    pricing = settings.get("pricing", {
        "founders_price": 4.99,
        "public_price": 9.99,
        "is_founders_active": True,
    })
    return {"success": True, "data": pricing}


@router.post("/admin/pricing")
def update_admin_pricing(update: PricingUpdate):
    pricing = {}
    if update.founders_price is not None:
        pricing["founders_price"] = update.founders_price
    if update.public_price is not None:
        pricing["public_price"] = update.public_price
    if update.is_founders_active is not None:
        pricing["is_founders_active"] = update.is_founders_active
    sb_update_setting("pricing", pricing)
    return {"success": True, "message": "Pricing updated", "data": pricing}


# ==================== BOOSTS ====================

@router.post("/boosts/calculate")
def calculate_boost_cost(calc: BoostCalculate):
    duration_cost = BOOST_PRICING_ADMIN["base_daily_cost"] + max(0, calc.duration_days - 1) * BOOST_PRICING_ADMIN["additional_day_cost"]
    reach_increments = calc.reach_target // BOOST_PRICING_ADMIN["reach_increment"]
    reach_cost = BOOST_PRICING_ADMIN["base_reach_cost"] + max(0, reach_increments - 1) * BOOST_PRICING_ADMIN["reach_increment_cost"]
    return {"success": True, "data": {
        "duration_days": calc.duration_days,
        "reach_target": calc.reach_target,
        "duration_cost": duration_cost,
        "reach_cost": reach_cost,
        "total_cost": duration_cost + reach_cost,
    }}


@router.post("/boosts/create")
def create_boost(boost: BoostCreate):
    calc = calculate_boost_cost(BoostCalculate(duration_days=boost.duration_days, reach_target=boost.reach_target))
    data = {
        "offer_id": boost.offer_id,
        "partner_id": boost.business_id or None,
        "budget": calc["data"]["total_cost"],
        "duration_days": boost.duration_days,
        "target_radius_miles": boost.reach_target,
        "status": "active",
        "ends_at": (datetime.now() + timedelta(days=boost.duration_days)).isoformat(),
    }
    result = sb_create_boost(data)
    if result:
        return {"success": True, "message": f"Boost created! ${calc['data']['total_cost']} charged.", "data": result}
    return {"success": False, "message": "Failed to create boost"}


@router.get("/boosts")
def get_boosts(partner_id: Optional[str] = None):
    data = sb_get_boosts(partner_id=partner_id)
    return {"success": True, "data": data}


@router.get("/boosts/{boost_id}")
def get_boost(boost_id: str):
    boosts = sb_get_boosts()
    boost = next((b for b in boosts if b["id"] == boost_id), None)
    if not boost:
        return {"success": False, "message": "Boost not found"}
    return {"success": True, "data": boost}


@router.delete("/boosts/{boost_id}")
def cancel_boost(boost_id: str):
    success = sb_cancel_boost(boost_id)
    if success:
        return {"success": True, "message": "Boost cancelled"}
    return {"success": False, "message": "Failed to cancel boost"}


# ==================== ANALYTICS TRACKING ====================

@router.post("/analytics/track")
def track_analytics_event(event: AnalyticsEvent):
    return {"success": True, "message": "Event tracked"}


@router.get("/analytics/dashboard")
def get_analytics_dashboard(business_id: str = "default_business", days: int = 7):
    stats = sb_get_platform_stats()
    redemption_stats = sb_get_redemption_stats()
    return {
        "success": True,
        "data": {
            "summary": {
                "total_views": 0,
                "total_clicks": 0,
                "total_redemptions": redemption_stats.get("total", 0),
                "total_revenue": 0,
            },
        },
    }


# ==================== SUPABASE STATUS ====================

@router.get("/admin/supabase/status")
def get_supabase_status():
    status = test_connection()
    return {"success": True, "data": status}


@router.get("/admin/events")
def get_admin_events():
    challenges = sb_get_challenges()
    return {"success": True, "data": challenges}

from fastapi import APIRouter
from typing import Optional
from datetime import datetime, timedelta
import random
from models.schemas import AdminOfferCreate, PricingUpdate, OfferImport, BulkOfferUpload, BoostCalculate, BoostCreate, AnalyticsEvent
from services.mock_data import (
    offers_db, users_db, admin_offers_db, pricing_config, analytics_db,
    BOOST_PRICING as OLD_BOOST_PRICING, active_boosts,
)
from services.supabase_service import (
    sb_list_auth_users, sb_get_platform_stats, sb_get_events,
    sb_create_event, sb_get_offers, test_connection
)
import uuid

router = APIRouter(prefix="/api", tags=["Admin"])

BOOST_PRICING_ADMIN = {"base_daily_cost": 25, "additional_day_cost": 20, "base_reach": 100, "base_reach_cost": 5, "reach_increment": 100, "reach_increment_cost": 10}
boosts_db = []


# ==================== ADMIN OFFERS ====================
@router.post("/admin/offers/create")
def admin_create_offer(offer: AdminOfferCreate):
    new_id = max([o["id"] for o in offers_db], default=0) + 1
    new_offer = {
        "id": new_id, "business_name": offer.business_name, "business_id": offer.business_id or f"biz_{new_id}",
        "business_type": offer.business_type, "description": offer.description,
        "discount_percent": offer.discount_percent, "base_gems": offer.base_gems,
        "lat": offer.lat, "lng": offer.lng, "is_admin_offer": True,
        "created_at": datetime.now().isoformat(),
        "expires_at": (datetime.now() + timedelta(hours=offer.expires_hours)).isoformat(),
        "created_by": "admin", "redemption_count": 0, "image_id": offer.image_id,
    }
    offers_db.append(new_offer)
    admin_offers_db.append(new_offer)
    return {"success": True, "message": f"Offer created for {offer.business_name}", "data": new_offer}


@router.post("/admin/offers/bulk")
def admin_bulk_offers(data: BulkOfferUpload):
    created = []
    for item in data.offers:
        new_id = max([o["id"] for o in offers_db], default=0) + 1
        new_offer = {
            "id": new_id, "business_name": item.business_name, "business_type": item.business_type,
            "description": item.description, "base_gems": item.base_gems,
            "address": item.address, "lat": item.lat or 39.9612, "lng": item.lng or -82.9988,
            "offer_url": item.offer_url, "is_admin_offer": True,
            "created_at": datetime.now().isoformat(),
            "expires_at": (datetime.now() + timedelta(days=item.expires_days)).isoformat(),
            "created_by": "admin", "redemption_count": 0,
        }
        offers_db.append(new_offer)
        created.append(new_offer)
    return {"success": True, "message": f"Created {len(created)} offers", "data": {"created_count": len(created), "offers": created}}


@router.post("/admin/offers/bulk-csv")
def admin_bulk_csv(csv_text: str = ""):
    return {"success": True, "message": "CSV import ready. Send CSV data as text.", "data": {"format": "business_name,address,description,business_type,base_gems,lat,lng"}}


@router.get("/admin/export/offers")
def export_offers(format: str = "json"):
    export_data = [{"id": o["id"], "business_name": o["business_name"], "business_type": o.get("business_type", ""), "description": o.get("description", ""), "base_gems": o.get("base_gems", 0), "lat": o["lat"], "lng": o["lng"], "created_at": o["created_at"], "expires_at": o["expires_at"], "redemption_count": o.get("redemption_count", 0)} for o in offers_db]
    if format == "csv":
        if not export_data:
            return {"success": True, "data": "", "format": "csv"}
        headers = list(export_data[0].keys())
        csv_lines = [",".join(headers)] + [",".join(str(row.get(h, "")) for h in headers) for row in export_data]
        return {"success": True, "data": "\n".join(csv_lines), "format": "csv", "count": len(export_data)}
    return {"success": True, "data": export_data, "format": "json", "count": len(export_data)}


@router.get("/admin/export/users")
def export_users(format: str = "json"):
    export_data = [{"id": u["id"], "name": u["name"], "plan": u.get("plan", "basic"), "gems": u.get("gems", 0), "level": u.get("level", 1), "safety_score": u.get("safety_score", 0), "total_miles": u.get("total_miles", 0), "state": u.get("state", "")} for u in users_db.values()]
    if format == "csv":
        if not export_data:
            return {"success": True, "data": "", "format": "csv"}
        headers = list(export_data[0].keys())
        csv_lines = [",".join(headers)] + [",".join(str(row.get(h, "")) for h in headers) for row in export_data]
        return {"success": True, "data": "\n".join(csv_lines), "format": "csv", "count": len(export_data)}
    return {"success": True, "data": export_data, "format": "json", "count": len(export_data)}


@router.post("/admin/import/offers")
def import_offers(import_data: OfferImport):
    imported = 0
    errors = []
    for offer_data in import_data.offers:
        try:
            new_id = max([o["id"] for o in offers_db], default=0) + 1
            new_offer = {"id": new_id, "business_name": offer_data.get("business_name", "Imported"), "business_type": offer_data.get("business_type", "retail"), "description": offer_data.get("description", ""), "base_gems": offer_data.get("base_gems", 25), "lat": offer_data.get("lat", 39.9612), "lng": offer_data.get("lng", -82.9988), "is_admin_offer": True, "created_at": datetime.now().isoformat(), "expires_at": (datetime.now() + timedelta(hours=offer_data.get("expires_hours", 24))).isoformat(), "created_by": "admin_import", "redemption_count": 0}
            offers_db.append(new_offer)
            imported += 1
        except Exception as e:
            errors.append(str(e))
    return {"success": True, "message": f"Imported {imported} offers", "data": {"imported": imported, "errors": errors}}


# ==================== ADMIN ANALYTICS ====================
@router.get("/admin/analytics")
def get_admin_analytics():
    total_users = len(users_db)
    premium_users = sum(1 for u in users_db.values() if u.get("is_premium", False))
    total_offers = len(offers_db)
    total_redemptions = sum(o.get("redemption_count", 0) for o in offers_db)
    chart_data = [{"date": (datetime.now() - timedelta(days=29 - i)).strftime("%b %d"), "new_users": random.randint(50, 200), "active_users": random.randint(500, 2000), "redemptions": random.randint(100, 500), "revenue": random.randint(5000, 20000)} for i in range(30)]
    return {
        "success": True,
        "data": {
            "summary": {"total_users": total_users, "premium_users": premium_users, "total_offers": total_offers, "total_redemptions": total_redemptions, "total_revenue": sum(d["revenue"] for d in chart_data), "avg_safety_score": round(sum(u.get("safety_score", 0) for u in users_db.values()) / total_users, 1) if total_users > 0 else 0},
            "chart_data": chart_data,
            "user_growth": {"today": random.randint(100, 300), "this_week": random.randint(700, 1500), "this_month": random.randint(3000, 6000)},
            "top_partners": [{"name": "Shell Gas Station", "redemptions": random.randint(500, 1500)}, {"name": "Starbucks Downtown", "redemptions": random.randint(400, 1200)}, {"name": "Quick Shine Car Wash", "redemptions": random.randint(300, 800)}],
        },
    }


@router.get("/admin/pricing")
def get_admin_pricing():
    return {"success": True, "data": pricing_config}


@router.post("/admin/pricing")
def update_admin_pricing(update: PricingUpdate):
    if update.founders_price is not None:
        pricing_config["founders_price"] = update.founders_price
    if update.public_price is not None:
        pricing_config["public_price"] = update.public_price
    if update.is_founders_active is not None:
        pricing_config["is_founders_active"] = update.is_founders_active
    return {"success": True, "message": "Pricing updated", "data": pricing_config}


@router.post("/admin/boosts/create")
def admin_create_boost(offer_id: int, boost_type: str = "premium"):
    from services.mock_data import BOOST_PRICING
    if boost_type not in BOOST_PRICING:
        return {"success": False, "message": "Invalid boost type"}
    offer = next((o for o in offers_db if o["id"] == offer_id), None)
    if not offer:
        return {"success": False, "message": "Offer not found"}
    config = BOOST_PRICING[boost_type]
    expires = datetime.now() + timedelta(hours=config["duration_hours"])
    record = {"id": f"admin_boost_{offer_id}", "offer_id": offer_id, "boost_type": boost_type, "multiplier": config["multiplier"], "price_paid": 0, "payment_method": "admin", "created_at": datetime.now().isoformat(), "expires_at": expires.isoformat(), "partner_id": "admin", "status": "active"}
    active_boosts[offer_id] = record
    offer["is_boosted"] = True
    offer["boost_multiplier"] = config["multiplier"]
    offer["boost_expires"] = expires.isoformat()
    return {"success": True, "message": f"Admin boost applied", "data": record}


# ==================== BOOST CALCULATOR ====================
@router.post("/boosts/calculate")
def calculate_boost_cost(calc: BoostCalculate):
    duration_cost = BOOST_PRICING_ADMIN["base_daily_cost"] + max(0, calc.duration_days - 1) * BOOST_PRICING_ADMIN["additional_day_cost"]
    reach_increments = calc.reach_target // BOOST_PRICING_ADMIN["reach_increment"]
    reach_cost = BOOST_PRICING_ADMIN["base_reach_cost"] + max(0, reach_increments - 1) * BOOST_PRICING_ADMIN["reach_increment_cost"]
    return {"success": True, "data": {"duration_days": calc.duration_days, "reach_target": calc.reach_target, "duration_cost": duration_cost, "reach_cost": reach_cost, "total_cost": duration_cost + reach_cost}}


@router.post("/boosts/create")
def create_boost(boost: BoostCreate):
    calc = calculate_boost_cost(BoostCalculate(duration_days=boost.duration_days, reach_target=boost.reach_target))
    new_boost = {"id": str(uuid.uuid4())[:8], "offer_id": boost.offer_id, "business_id": boost.business_id or "default_business", "duration_days": boost.duration_days, "reach_target": boost.reach_target, "total_cost": calc["data"]["total_cost"], "status": "active", "created_at": datetime.now().isoformat(), "expires_at": (datetime.now() + timedelta(days=boost.duration_days)).isoformat(), "current_reach": 0, "impressions": 0, "clicks": 0}
    boosts_db.append(new_boost)
    return {"success": True, "message": f"Boost created! ${calc['data']['total_cost']} charged.", "data": new_boost}


@router.get("/boosts")
def get_boosts(business_id: Optional[str] = None):
    if business_id:
        filtered = [b for b in boosts_db if b["business_id"] == business_id]
        return {"success": True, "data": filtered}
    return {"success": True, "data": boosts_db}


@router.get("/boosts/{boost_id}")
def get_boost(boost_id: str):
    boost = next((b for b in boosts_db if b["id"] == boost_id), None)
    if not boost:
        return {"success": False, "message": "Boost not found"}
    return {"success": True, "data": boost}


@router.delete("/boosts/{boost_id}")
def cancel_boost(boost_id: str):
    boost = next((b for b in boosts_db if b["id"] == boost_id), None)
    if not boost:
        return {"success": False, "message": "Boost not found"}
    boost["status"] = "cancelled"
    return {"success": True, "message": "Boost cancelled"}


# ==================== ANALYTICS TRACKING ====================
@router.post("/analytics/track")
def track_analytics_event(event: AnalyticsEvent):
    if event.business_id not in analytics_db:
        analytics_db[event.business_id] = {"views": [], "redemptions": [], "clicks": [], "revenue": 0, "total_savings": 0}
    event_data = {"offer_id": event.offer_id, "timestamp": datetime.now().isoformat(), "location": event.user_location}
    if event.event_type == "view":
        analytics_db[event.business_id]["views"].append(event_data)
    elif event.event_type == "click":
        analytics_db[event.business_id]["clicks"].append(event_data)
    elif event.event_type == "redemption":
        analytics_db[event.business_id]["redemptions"].append(event_data)
        analytics_db[event.business_id]["revenue"] += random.randint(10, 50)
    return {"success": True, "message": "Event tracked"}


@router.get("/analytics/dashboard")
def get_analytics_dashboard(business_id: str = "default_business", days: int = 7):
    chart_data = [{"date": (datetime.now() - timedelta(days=days - 1 - i)).strftime("%b %d"), "views": random.randint(50, 200), "clicks": random.randint(20, 80), "redemptions": random.randint(5, 30), "revenue": random.randint(100, 500)} for i in range(days)]
    total_views = sum(d["views"] for d in chart_data)
    total_clicks = sum(d["clicks"] for d in chart_data)
    total_redemptions = sum(d["redemptions"] for d in chart_data)
    total_revenue = sum(d["revenue"] for d in chart_data)
    return {
        "success": True,
        "data": {
            "summary": {"total_views": total_views, "total_clicks": total_clicks, "total_redemptions": total_redemptions, "total_revenue": total_revenue, "ctr": round(total_clicks / total_views * 100, 1) if total_views > 0 else 0, "conversion_rate": round(total_redemptions / total_clicks * 100, 1) if total_clicks > 0 else 0},
            "chart_data": chart_data,
            "geo_data": [{"city": "Columbus", "lat": 39.9612, "lng": -82.9988, "redemptions": random.randint(20, 50)}, {"city": "Dublin", "lat": 40.0992, "lng": -83.1141, "redemptions": random.randint(10, 30)}],
            "top_offers": [{"name": "15% Off First Visit", "redemptions": random.randint(50, 150), "revenue": random.randint(500, 1500)}],
        },
    }

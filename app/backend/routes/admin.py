from fastapi import APIRouter, Body
from typing import Optional
from datetime import datetime, timedelta
import random, os, logging
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

logger = logging.getLogger(__name__)

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
    total_partners = 156  # Mock partner count
    active_offers = 847  # Mock active offers count
    total_trips = 89420  # Mock total trips
    total_gems = 156780  # Mock total gems
    chart_data = [{"date": (datetime.now() - timedelta(days=29 - i)).strftime("%b %d"), "new_users": random.randint(50, 200), "active_users": random.randint(500, 2000), "redemptions": random.randint(100, 500), "revenue": random.randint(5000, 20000)} for i in range(30)]
    return {
        "success": True,
        "data": {
            "summary": {
                "total_users": total_users, 
                "premium_users": premium_users, 
                "total_offers": total_offers, 
                "total_redemptions": total_redemptions, 
                "total_revenue": sum(d["revenue"] for d in chart_data), 
                "avg_safety_score": round(sum(u.get("safety_score", 0) for u in users_db.values()) / total_users, 1) if total_users > 0 else 0,
                "total_partners": total_partners,
                "active_offers": active_offers,
                "total_trips": total_trips,
                "total_gems": total_gems
            },
            "chart_data": chart_data,
            "user_growth": {"today": random.randint(100, 300), "this_week": random.randint(700, 1500), "this_month": random.randint(3000, 6000)},
            "top_partners": [{"name": "Shell Gas Station", "redemptions": random.randint(500, 1500)}, {"name": "Starbucks Downtown", "redemptions": random.randint(400, 1200)}, {"name": "Quick Shine Car Wash", "redemptions": random.randint(300, 800)}],
        },
    }


# ==================== REFERRAL ANALYTICS ====================
@router.get("/admin/referral-analytics")
def get_referral_analytics():
    return {
        "success": True,
        "data": {
            "summary": {
                "total_referrals": 1247,
                "active_partners": 156,
                "conversion_rate": 23.5,
                "total_revenue": 45680,
                "avg_referral_value": 36.60
            },
            "chart_data": [
                {"date": "Jan 1", "referrals": 45, "conversions": 12, "revenue": 1800},
                {"date": "Jan 8", "referrals": 52, "conversions": 15, "revenue": 2250},
                {"date": "Jan 15", "referrals": 48, "conversions": 11, "revenue": 1650},
                {"date": "Jan 22", "referrals": 61, "conversions": 18, "revenue": 2700},
                {"date": "Jan 29", "referrals": 58, "conversions": 14, "revenue": 2100},
                {"date": "Feb 5", "referrals": 67, "conversions": 16, "revenue": 2400},
                {"date": "Feb 12", "referrals": 72, "conversions": 17, "revenue": 2550},
            ],
            "top_partners": [
                {"name": "Shell Gas Station", "referrals": 156, "conversions": 45, "revenue": 6750},
                {"name": "Starbucks Coffee", "referrals": 134, "conversions": 38, "revenue": 5700},
                {"name": "McDonald's", "referrals": 98, "conversions": 28, "revenue": 4200},
                {"name": "Walmart", "referrals": 87, "conversions": 25, "revenue": 3750},
                {"name": "Quick Lube", "referrals": 76, "conversions": 22, "revenue": 3300},
            ],
            "partner_types": [
                {"name": "Fuel Stations", "value": 35, "color": "#8b5cf6"},
                {"name": "Restaurants", "value": 25, "color": "#3b82f6"},
                {"name": "Retail", "value": 15, "color": "#10b981"},
                {"name": "Services", "value": 10, "color": "#f59e0b"},
                {"name": "Entertainment", "value": 5, "color": "#ef4444"},
            ]
        }
    }


# ==================== FINANCE & REVENUE ====================
@router.get("/admin/finance")
def get_finance_data():
    return {
        "success": True,
        "data": {
            "summary": {
                "total_revenue": 125680,
                "net_profit": 45240,
                "total_transactions": 3420,
                "avg_transaction_value": 36.75,
                "monthly_growth": 12.5,
                "profit_margin": 36.0
            },
            "revenue_trend": [
                {"date": "Jan 1", "revenue": 8500, "profit": 3200, "transactions": 245},
                {"date": "Jan 8", "revenue": 9200, "profit": 3480, "transactions": 267},
                {"date": "Jan 15", "revenue": 8900, "profit": 3360, "transactions": 258},
                {"date": "Jan 22", "revenue": 9800, "profit": 3720, "transactions": 284},
                {"date": "Jan 29", "revenue": 10200, "profit": 3870, "transactions": 296},
                {"date": "Feb 5", "revenue": 10800, "profit": 4100, "transactions": 313},
                {"date": "Feb 12", "revenue": 11200, "profit": 4250, "transactions": 325},
                {"date": "Feb 19", "revenue": 11800, "profit": 4480, "transactions": 342},
            ],
            "revenue_sources": [
                {"name": "Premium Subscriptions", "value": 45, "color": "#8b5cf6"},
                {"name": "Partner Commissions", "value": 25, "color": "#3b82f6"},
                {"name": "Boost Services", "value": 20, "color": "#10b981"},
                {"name": "Transaction Fees", "value": 10, "color": "#f59e0b"},
            ],
            "top_transactions": [
                {"id": "TXN001", "type": "Premium Subscription", "amount": 29.99, "user": "John Smith", "date": "2024-02-19", "status": "completed"},
                {"id": "TXN002", "type": "Partner Commission", "amount": 45.00, "user": "Shell Gas Station", "date": "2024-02-19", "status": "completed"},
                {"id": "TXN003", "type": "Boost Purchase", "amount": 75.00, "user": "Sarah Wilson", "date": "2024-02-19", "status": "completed"},
                {"id": "TXN004", "type": "Transaction Fee", "amount": 2.50, "user": "Mike Johnson", "date": "2024-02-19", "status": "completed"},
                {"id": "TXN005", "type": "Premium Subscription", "amount": 29.99, "user": "Emily Davis", "date": "2024-02-18", "status": "completed"},
            ]
        }
    }


# ==================== NOTIFICATIONS ====================
@router.get("/admin/notifications")
def get_notifications():
    return {
        "success": True,
        "data": [
            {"id": 1, "type": "system", "title": "System Update", "message": "Platform will undergo maintenance tonight at 2 AM EST", "status": "unread", "priority": "high", "timestamp": "2024-02-19 15:30:00", "recipients": "all_users"},
            {"id": 2, "type": "security", "title": "Security Alert", "message": "Unusual login activity detected from IP 192.168.1.200", "status": "unread", "priority": "high", "timestamp": "2024-02-19 14:45:00", "recipients": "admins"},
            {"id": 3, "type": "marketing", "title": "New Feature Launch", "message": "AI Moderation system is now live for all partners", "status": "read", "priority": "medium", "timestamp": "2024-02-19 13:20:00", "recipients": "all_users"},
            {"id": 4, "type": "alert", "title": "Partner Registration", "message": "New partner \"Quick Lube Car Wash\" awaiting approval", "status": "unread", "priority": "medium", "timestamp": "2024-02-19 12:15:00", "recipients": "admins"},
            {"id": 5, "type": "info", "title": "Weekly Report", "message": "Your weekly analytics report is ready for review", "status": "read", "priority": "low", "timestamp": "2024-02-19 11:00:00", "recipients": "all_users"},
            {"id": 6, "type": "system", "title": "Backup Completed", "message": "Daily system backup completed successfully", "status": "read", "priority": "low", "timestamp": "2024-02-19 06:00:00", "recipients": "admins"},
        ]
    }


# ==================== LEGAL & COMPLIANCE ====================
@router.get("/admin/legal-documents")
def get_legal_documents():
    return {
        "success": True,
        "data": [
            {"id": 1, "name": "Privacy Policy", "type": "privacy", "status": "active", "version": "2.1", "lastUpdated": "2024-02-15", "required": True, "description": "How we collect and use user data"},
            {"id": 2, "name": "Terms of Service", "type": "terms", "status": "active", "version": "3.0", "lastUpdated": "2024-02-10", "required": True, "description": "Rules and guidelines for platform usage"},
            {"id": 3, "name": "GDPR Compliance", "type": "compliance", "status": "active", "version": "1.0", "lastUpdated": "2024-01-20", "required": True, "description": "EU data protection compliance"},
            {"id": 4, "name": "Cookie Policy", "type": "privacy", "status": "active", "version": "1.5", "lastUpdated": "2024-02-01", "required": False, "description": "How we use cookies and tracking"},
            {"id": 5, "name": "Partner Agreement", "type": "agreement", "status": "active", "version": "2.0", "lastUpdated": "2024-02-05", "required": True, "description": "Terms for business partners"},
            {"id": 6, "name": "Data Processing Addendum", "type": "compliance", "status": "draft", "version": "1.0", "lastUpdated": "2024-02-18", "required": True, "description": "Data processing agreement"},
            {"id": 7, "name": "Security Policy", "type": "security", "status": "active", "version": "1.2", "lastUpdated": "2024-01-15", "required": False, "description": "Security measures and protocols"},
            {"id": 8, "name": "API Terms", "type": "terms", "status": "active", "version": "1.0", "lastUpdated": "2024-01-10", "required": False, "description": "API usage terms and conditions"},
        ]
    }


# ==================== SETTINGS ====================
@router.get("/admin/settings")
def get_settings():
    return {
        "success": True,
        "data": {
            "general": {
                "platform_name": "SnapRoad",
                "platform_version": "2.0.1",
                "maintenance_mode": False,
                "debug_mode": False,
                "max_users": 50000,
                "default_language": "en"
            },
            "security": {
                "jwt_expiry_hours": 24,
                "password_min_length": 8,
                "require_2fa": False,
                "session_timeout_minutes": 30,
                "max_login_attempts": 5,
                "ip_whitelist_enabled": False
            },
            "notifications": {
                "email_notifications": True,
                "push_notifications": True,
                "sms_notifications": False,
                "marketing_emails": False,
                "system_alerts": True,
                "weekly_reports": True
            },
            "api": {
                "rate_limit_per_minute": 100,
                "max_file_size_mb": 10,
                "enable_cors": True,
                "api_version": "v1",
                "webhook_timeout_seconds": 30
            },
            "database": {
                "connection_pool_size": 20,
                "query_timeout_seconds": 30,
                "backup_frequency_hours": 6,
                "retention_days": 90,
                "enable_query_cache": True
            },
            "features": {
                "ai_moderation": True,
                "real_time_analytics": True,
                "partner_referrals": True,
                "boost_services": True,
                "premium_features": True,
                "beta_features": False
            }
        }
    }


@router.post("/admin/settings")
def update_settings(settings_data: dict):
    # Mock update - in real app, this would update the settings
    return {"success": True, "message": "Settings updated successfully", "data": settings_data}


# ==================== AUDIT LOG ====================
@router.get("/admin/audit-log")
def get_audit_log():
    return {
        "success": True,
        "data": [
            {"id": 1, "action": "USER_CREATED", "user": "admin@snaproad.com", "target": "john@example.com", "ip": "192.168.1.100", "timestamp": "2024-02-19 14:30:22", "status": "success", "details": "Created new user account"},
            {"id": 2, "action": "PARTNER_APPROVED", "user": "admin@snaproad.com", "target": "Shell Gas Station", "ip": "192.168.1.100", "timestamp": "2024-02-19 13:45:10", "status": "success", "details": "Approved partner registration"},
            {"id": 3, "action": "SETTINGS_UPDATED", "user": "admin@snaproad.com", "target": "System Settings", "ip": "192.168.1.100", "timestamp": "2024-02-19 12:20:05", "status": "success", "details": "Updated security settings"},
            {"id": 4, "action": "LOGIN_FAILED", "user": "unknown", "target": "admin@snaproad.com", "ip": "192.168.1.200", "timestamp": "2024-02-19 11:15:33", "status": "error", "details": "Failed login attempt - invalid password"},
            {"id": 5, "action": "OFFER_CREATED", "user": "admin@snaproad.com", "target": "McDonald's Offer", "ip": "192.168.1.100", "timestamp": "2024-02-19 10:30:15", "status": "success", "details": "Created new promotional offer"},
            {"id": 6, "action": "USER_SUSPENDED", "user": "admin@snaproad.com", "target": "emily@example.com", "ip": "192.168.1.100", "timestamp": "2024-02-19 09:45:22", "status": "success", "details": "Suspended user account for policy violation"},
            {"id": 7, "action": "DATA_EXPORTED", "user": "admin@snaproad.com", "target": "User Database", "ip": "192.168.1.100", "timestamp": "2024-02-19 08:20:10", "status": "success", "details": "Exported 1,250 user records to CSV"},
            {"id": 8, "action": "SYSTEM_BACKUP", "user": "system", "target": "Database", "ip": "127.0.0.1", "timestamp": "2024-02-19 06:00:00", "status": "success", "details": "Automated daily backup completed"},
        ]
    }


# ==================== INCIDENTS ====================
@router.get("/admin/incidents")
def get_incidents():
    return {
        "success": True,
        "data": [
            {"id": 1, "type": "Content Violation", "location": "Downtown Columbus", "severity": "high", "status": "open", "confidence": 0.92, "reportedAt": "2024-02-19 14:30:00", "description": "Inappropriate content detected in user post"},
            {"id": 2, "type": "Spam Report", "location": "OSU Campus", "severity": "medium", "status": "investigating", "confidence": 0.78, "reportedAt": "2024-02-19 13:45:00", "description": "Multiple spam reports from same user"},
            {"id": 3, "type": "Harassment", "location": "Short North", "severity": "high", "status": "resolved", "confidence": 0.95, "reportedAt": "2024-02-19 12:20:00", "description": "User harassment report - action taken"},
            {"id": 4, "type": "Fake Account", "location": "Arena District", "severity": "medium", "status": "open", "confidence": 0.67, "reportedAt": "2024-02-19 11:15:00", "description": "Suspicious account activity detected"},
            {"id": 5, "type": "Content Violation", "location": "German Village", "severity": "low", "status": "resolved", "confidence": 0.45, "reportedAt": "2024-02-19 10:30:00", "description": "Minor content violation - warning issued"},
        ]
    }


# ==================== OFFERS CRUD ====================
@router.post("/admin/offers")
def create_offer(offer_data: dict):
    """Create a new offer"""
    try:
        new_id = max([o["id"] for o in offers_db], default=0) + 1
        new_offer = {
            "id": new_id,
            "business_name": offer_data.get("business_name", "New Business"),
            "business_type": offer_data.get("business_type", "General"),
            "description": offer_data.get("description", ""),
            "discount_percent": offer_data.get("discount_percent", 0),
            "base_gems": offer_data.get("base_gems", 0),
            "lat": offer_data.get("lat", 39.9612),
            "lng": offer_data.get("lng", -82.9988),
            "address": offer_data.get("address", ""),
            "created_at": datetime.now().isoformat(),
            "expires_at": (datetime.now() + timedelta(days=30)).isoformat(),
            "is_admin_offer": True,
            "redemption_count": 0,
            "status": "active"
        }
        offers_db.append(new_offer)
        return {"success": True, "message": "Offer created successfully", "data": new_offer}
    except Exception as e:
        return {"success": False, "message": f"Failed to create offer: {str(e)}"}

@router.put("/admin/offers/{offer_id}")
def update_offer(offer_id: int, offer_data: dict):
    """Update an existing offer"""
    try:
        for offer in offers_db:
            if offer["id"] == offer_id:
                offer.update(offer_data)
                offer["updated_at"] = datetime.now().isoformat()
                return {"success": True, "message": "Offer updated successfully", "data": offer}
        return {"success": False, "message": "Offer not found"}
    except Exception as e:
        return {"success": False, "message": f"Failed to update offer: {str(e)}"}

@router.delete("/admin/offers/{offer_id}")
def delete_offer(offer_id: int):
    """Delete an offer"""
    try:
        global offers_db
        offers_db = [o for o in offers_db if o["id"] != offer_id]
        return {"success": True, "message": "Offer deleted successfully"}
    except Exception as e:
        return {"success": False, "message": f"Failed to delete offer: {str(e)}"}

@router.get("/admin/offers")
def get_offers():
    """Get all offers"""
    return {"success": True, "data": offers_db}


# ==================== PARTNERS CRUD ====================
partners_db = []

@router.post("/admin/partners")
def create_partner(partner_data: dict):
    """Create a new partner"""
    try:
        new_id = str(max([int(p["id"]) for p in partners_db], default=0) + 1)
        new_partner = {
            "id": new_id,
            "business_name": partner_data.get("business_name", ""),
            "email": partner_data.get("email", ""),
            "business_type": partner_data.get("business_type", ""),
            "address": partner_data.get("address", ""),
            "lat": partner_data.get("lat", 39.9612),
            "lng": partner_data.get("lng", -82.9988),
            "phone": partner_data.get("phone", ""),
            "status": "pending",
            "created_at": datetime.now().isoformat(),
            "campaigns": []
        }
        partners_db.append(new_partner)
        return {"success": True, "message": "Partner created successfully", "data": new_partner}
    except Exception as e:
        return {"success": False, "message": f"Failed to create partner: {str(e)}"}

@router.put("/admin/partners/{partner_id}")
def update_partner(partner_id: str, partner_data: dict):
    """Update an existing partner"""
    try:
        for partner in partners_db:
            if partner["id"] == partner_id:
                partner.update(partner_data)
                partner["updated_at"] = datetime.now().isoformat()
                return {"success": True, "message": "Partner updated successfully", "data": partner}
        return {"success": False, "message": "Partner not found"}
    except Exception as e:
        return {"success": False, "message": f"Failed to update partner: {str(e)}"}

@router.delete("/admin/partners/{partner_id}")
def delete_partner(partner_id: str):
    """Delete a partner"""
    try:
        global partners_db
        partners_db = [p for p in partners_db if p["id"] != partner_id]
        return {"success": True, "message": "Partner deleted successfully"}
    except Exception as e:
        return {"success": False, "message": f"Failed to delete partner: {str(e)}"}

@router.get("/admin/partners")
def get_partners():
    """Get all partners"""
    return {"success": True, "data": partners_db}

@router.post("/admin/partners/{partner_id}/approve")
def approve_partner(partner_id: str):
    """Approve a partner"""
    try:
        for partner in partners_db:
            if partner["id"] == partner_id:
                partner["status"] = "active"
                partner["approved_at"] = datetime.now().isoformat()
                return {"success": True, "message": "Partner approved successfully", "data": partner}
        return {"success": False, "message": "Partner not found"}
    except Exception as e:
        return {"success": False, "message": f"Failed to approve partner: {str(e)}"}

@router.post("/admin/partners/{partner_id}/suspend")
def suspend_partner(partner_id: str):
    """Suspend a partner"""
    try:
        for partner in partners_db:
            if partner["id"] == partner_id:
                partner["status"] = "suspended"
                partner["suspended_at"] = datetime.now().isoformat()
                return {"success": True, "message": "Partner suspended successfully", "data": partner}
        return {"success": False, "message": "Partner not found"}
    except Exception as e:
        return {"success": False, "message": f"Failed to suspend partner: {str(e)}"}


# ==================== CAMPAIGNS CRUD ====================
campaigns_db = []

@router.post("/admin/campaigns")
def create_campaign(campaign_data: dict):
    """Create a new campaign"""
    try:
        new_id = max([c["id"] for c in campaigns_db], default=0) + 1
        new_campaign = {
            "id": new_id,
            "name": campaign_data.get("name", ""),
            "description": campaign_data.get("description", ""),
            "partner_id": campaign_data.get("partner_id"),
            "type": campaign_data.get("type", "promotion"),
            "budget": campaign_data.get("budget", 0),
            "start_date": campaign_data.get("start_date"),
            "end_date": campaign_data.get("end_date"),
            "status": "draft",
            "created_at": datetime.now().isoformat(),
            "metrics": {
                "impressions": 0,
                "clicks": 0,
                "conversions": 0,
                "revenue": 0
            }
        }
        campaigns_db.append(new_campaign)
        return {"success": True, "message": "Campaign created successfully", "data": new_campaign}
    except Exception as e:
        return {"success": False, "message": f"Failed to create campaign: {str(e)}"}

@router.put("/admin/campaigns/{campaign_id}")
def update_campaign(campaign_id: int, campaign_data: dict):
    """Update an existing campaign"""
    try:
        for campaign in campaigns_db:
            if campaign["id"] == campaign_id:
                campaign.update(campaign_data)
                campaign["updated_at"] = datetime.now().isoformat()
                return {"success": True, "message": "Campaign updated successfully", "data": campaign}
        return {"success": False, "message": "Campaign not found"}
    except Exception as e:
        return {"success": False, "message": f"Failed to update campaign: {str(e)}"}

@router.delete("/admin/campaigns/{campaign_id}")
def delete_campaign(campaign_id: int):
    """Delete a campaign"""
    try:
        global campaigns_db
        campaigns_db = [c for c in campaigns_db if c["id"] != campaign_id]
        return {"success": True, "message": "Campaign deleted successfully"}
    except Exception as e:
        return {"success": False, "message": f"Failed to delete campaign: {str(e)}"}

@router.get("/admin/campaigns")
def get_campaigns():
    """Get all campaigns"""
    return {"success": True, "data": campaigns_db}

@router.post("/admin/campaigns/{campaign_id}/activate")
def activate_campaign(campaign_id: int):
    """Activate a campaign"""
    try:
        for campaign in campaigns_db:
            if campaign["id"] == campaign_id:
                campaign["status"] = "active"
                campaign["activated_at"] = datetime.now().isoformat()
                return {"success": True, "message": "Campaign activated successfully", "data": campaign}
        return {"success": False, "message": "Campaign not found"}
    except Exception as e:
        return {"success": False, "message": f"Failed to activate campaign: {str(e)}"}


# ==================== REWARDS CRUD ====================
rewards_db = []

@router.post("/admin/rewards")
def create_reward(reward_data: dict):
    """Create a new reward"""
    try:
        new_id = max([r["id"] for r in rewards_db], default=0) + 1
        new_reward = {
            "id": new_id,
            "name": reward_data.get("name", ""),
            "type": reward_data.get("type", "voucher"),
            "value": reward_data.get("value", 0),
            "gems": reward_data.get("gems", 0),
            "description": reward_data.get("description", ""),
            "claimed": 0,
            "total": reward_data.get("total", 100),
            "status": "active",
            "expires_at": reward_data.get("expires_at"),
            "created_at": datetime.now().isoformat()
        }
        rewards_db.append(new_reward)
        return {"success": True, "message": "Reward created successfully", "data": new_reward}
    except Exception as e:
        return {"success": False, "message": f"Failed to create reward: {str(e)}"}

@router.put("/admin/rewards/{reward_id}")
def update_reward(reward_id: int, reward_data: dict):
    """Update an existing reward"""
    try:
        for reward in rewards_db:
            if reward["id"] == reward_id:
                reward.update(reward_data)
                reward["updated_at"] = datetime.now().isoformat()
                return {"success": True, "message": "Reward updated successfully", "data": reward}
        return {"success": False, "message": "Reward not found"}
    except Exception as e:
        return {"success": False, "message": f"Failed to update reward: {str(e)}"}

@router.delete("/admin/rewards/{reward_id}")
def delete_reward(reward_id: int):
    """Delete a reward"""
    try:
        global rewards_db
        rewards_db = [r for r in rewards_db if r["id"] != reward_id]
        return {"success": True, "message": "Reward deleted successfully"}
    except Exception as e:
        return {"success": False, "message": f"Failed to delete reward: {str(e)}"}

@router.get("/admin/rewards")
def get_rewards():
    """Get all rewards"""
    return {"success": True, "data": rewards_db}

@router.post("/admin/rewards/{reward_id}/claim")
def claim_reward(reward_id: int, user_data: dict):
    """Claim a reward"""
    try:
        for reward in rewards_db:
            if reward["id"] == reward_id:
                if reward["claimed"] < reward["total"]:
                    reward["claimed"] += 1
                    return {"success": True, "message": "Reward claimed successfully", "data": reward}
                else:
                    return {"success": False, "message": "Reward out of stock"}
        return {"success": False, "message": "Reward not found"}
    except Exception as e:
        return {"success": False, "message": f"Failed to claim reward: {str(e)}"}


# ==================== USERS CRUD ====================
@router.get("/admin/users")
def get_users():
    """Get all users"""
    return {"success": True, "data": list(users_db.values())}

@router.put("/admin/users/{user_id}")
def update_user(user_id: str, user_data: dict):
    """Update a user"""
    try:
        if user_id in users_db:
            users_db[user_id].update(user_data)
            users_db[user_id]["updated_at"] = datetime.now().isoformat()
            return {"success": True, "message": "User updated successfully", "data": users_db[user_id]}
        return {"success": False, "message": "User not found"}
    except Exception as e:
        return {"success": False, "message": f"Failed to update user: {str(e)}"}

@router.post("/admin/users/{user_id}/suspend")
def suspend_user(user_id: str):
    """Suspend a user"""
    try:
        if user_id in users_db:
            users_db[user_id]["status"] = "suspended"
            users_db[user_id]["suspended_at"] = datetime.now().isoformat()
            return {"success": True, "message": "User suspended successfully", "data": users_db[user_id]}
        return {"success": False, "message": "User not found"}
    except Exception as e:
        return {"success": False, "message": f"Failed to suspend user: {str(e)}"}

@router.post("/admin/users/{user_id}/activate")
def activate_user(user_id: str):
    """Activate a user"""
    try:
        if user_id in users_db:
            users_db[user_id]["status"] = "active"
            users_db[user_id]["activated_at"] = datetime.now().isoformat()
            return {"success": True, "message": "User activated successfully", "data": users_db[user_id]}
        return {"success": False, "message": "User not found"}
    except Exception as e:
        return {"success": False, "message": f"Failed to activate user: {str(e)}"}


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


# ==================== INCIDENT MODERATION ====================

# In-memory store for moderated incidents
_moderated_incidents: dict = {}

@router.post("/admin/incidents/{incident_id}/moderate")
async def moderate_incident(incident_id: int, outcome: str = Body(..., embed=True)):
    """Moderate an incident - approve or reject."""
    from services.websocket_manager import ws_manager
    
    if outcome not in ['approved', 'rejected']:
        return {"success": False, "message": "Invalid outcome. Must be 'approved' or 'rejected'"}
    
    # Store moderation decision
    _moderated_incidents[incident_id] = {
        "incident_id": incident_id,
        "outcome": outcome,
        "moderated_at": datetime.now().isoformat(),
        "moderated_by": "admin"
    }
    
    # Broadcast to all connected admins
    try:
        await ws_manager.broadcast_moderation_update(incident_id, outcome)
    except Exception as e:
        logger.warning(f"Could not broadcast moderation update: {e}")
    
    return {
        "success": True,
        "message": f"Incident {incident_id} marked as {outcome}",
        "data": _moderated_incidents[incident_id]
    }


@router.get("/admin/incidents/moderated")
def get_moderated_incidents():
    """Get list of all moderated incidents."""
    return {
        "success": True,
        "data": list(_moderated_incidents.values()),
        "total": len(_moderated_incidents)
    }


# ==================== SUPABASE-POWERED ENDPOINTS ====================

@router.get("/admin/users")
def get_admin_users(limit: int = 100):
    """Get users from Supabase Auth (falls back to mock data)."""
    # Try Supabase first
    sb_users = sb_list_auth_users(limit)
    if sb_users:
        return {
            "success": True,
            "source": "supabase",
            "data": sb_users,
            "total": len(sb_users),
        }
    # Fallback to mock
    mock_users = [
        {
            "id": k,
            "email": v.get("email", ""),
            "name": v.get("name", ""),
            "plan": v.get("plan", "basic"),
            "gems": v.get("gems", 0),
"level": v.get("level", 1),
            "safety_score": v.get("safety_score", 85),
            "total_trips": v.get("total_trips", 0),
            "is_premium": v.get("is_premium", False),
            "status": "active" if not v.get("suspended") else "suspended",
            "family_members": v.get("family_members", 1),
            "created_at": v.get("member_since", ""),
        }
        for k, v in users_db.items()
    ]
    return {"success": True, "source": "mock", "data": mock_users, "total": len(mock_users)}


@router.get("/admin/stats")
def get_admin_stats():
    """Get platform stats combining Supabase + mock data."""
    sb_stats = sb_get_platform_stats()
    if sb_stats.get("total_users", 0) > 0:
        return {"success": True, "source": "supabase", "data": sb_stats}
    # Mock fallback
    total_users = len(users_db)
    premium_users = sum(1 for u in users_db.values() if u.get("is_premium", False))
    total_offers = len(offers_db)
    total_redemptions = sum(o.get("redemption_count", 0) for o in offers_db)
    
    # Get incidents count from road_reports_db
    from services.mock_data import road_reports_db
    incidents_today = len([r for r in road_reports_db if r.get("type") in ["hazard", "accident", "police", "construction"]])
    return {
        "success": True,
        "source": "mock",
        "data": {
            "total_users": total_users,
            "premium_users": premium_users,
            "total_offers": total_offers,
            "total_redemptions": total_redemptions,
            "total_partners": 156,
            "active_offers": 847,
            "total_trips": 89420,
            "total_gems": 156780,
            "incidents_today": incidents_today,
            "revenue": 4523000,  # $45,230 in cents
        },
    }


@router.get("/admin/supabase/status")
def get_supabase_status():
    """Test Supabase connectivity and migration status."""
    status = test_connection()
    return {
        "success": True,
        "data": {
            **status,
            "migration_file": "/app/backend/sql/supabase_migration.sql",
            "instructions": "Run supabase_migration.sql in your Supabase SQL Editor to enable live data",
        },
    }


@router.get("/admin/events")
def get_admin_events():
    """Get events from Supabase or mock data."""
    sb_events = sb_get_events()
    if sb_events:
        return {"success": True, "source": "supabase", "data": sb_events}
    # Mock fallback
    from services.mock_data import events_db
    return {"success": True, "source": "mock", "data": events_db}


@router.post("/admin/supabase/migrate")
def run_supabase_migration(db_password: str = Body(..., embed=True)):
    """
    Run the Supabase migration SQL using a direct PostgreSQL connection.
    Provide your Supabase database password from:
    Supabase Dashboard → Project Settings → Database → Database password
    """
    import psycopg2
    from config import SUPABASE_URL

    # Extract project ref from URL
    # https://cuseezsdaqlbwlxnjsyr.supabase.co -> cuseezsdaqlbwlxnjsyr
    project_ref = SUPABASE_URL.replace("https://", "").split(".")[0] if SUPABASE_URL else ""
    if not project_ref:
        return {"success": False, "error": "SUPABASE_URL not configured"}

    # Read migration SQL
    migration_file = "/app/backend/sql/supabase_migration.sql"
    try:
        with open(migration_file) as f:
            sql = f.read()
    except FileNotFoundError:
        return {"success": False, "error": "Migration file not found"}

    # Try connection formats
    conn_strings = [
        f"postgresql://postgres.{project_ref}:{db_password}@aws-0-us-east-1.pooler.supabase.com:5432/postgres",
        f"postgresql://postgres.{project_ref}:{db_password}@aws-0-us-east-1.pooler.supabase.com:6543/postgres",
        f"postgresql://postgres:{db_password}@db.{project_ref}.supabase.co:5432/postgres",
    ]

    last_error = None
    for conn_str in conn_strings:
        try:
            conn = psycopg2.connect(conn_str, connect_timeout=10)
            conn.autocommit = True
            cursor = conn.cursor()
            # Run migration in parts (split on -- ===)
            statements = [s.strip() for s in sql.split(";") if s.strip() and not s.strip().startswith("--")]
            executed = 0
            errors = []
            for stmt in statements:
                try:
                    cursor.execute(stmt)
                    executed += 1
                except Exception as e:
                    err = str(e)
                    if "already exists" not in err.lower():
                        errors.append(err[:100])
            cursor.close()
            conn.close()
            logger.info(f"Migration completed: {executed} statements, {len(errors)} errors")
            return {
                "success": True,
                "message": f"Migration completed: {executed} statements executed",
                "warnings": errors[:5] if errors else [],
            }
        except Exception as e:
            last_error = str(e)[:200]
            continue

    return {
        "success": False,
        "error": f"Could not connect to database: {last_error}",
        "help": (
            "Get your database password from: "
            f"https://supabase.com/dashboard/project/{project_ref}/settings/database "
            "→ Database password section → Reset or copy your password"
        ),
    }

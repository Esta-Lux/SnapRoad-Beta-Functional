"""
SnapRoad Admin API Routes
All endpoints use the Supabase DAO layer (supabase_service.py).
"""
from fastapi import APIRouter, Body, Depends, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from typing import Optional
from datetime import datetime, timedelta, timezone
import logging
import io
from middleware.auth import require_admin

from models.schemas import (
    AdminOfferCreate, PricingUpdate, OfferImport, BulkOfferUpload,
    BoostCalculate, BoostCreate, AnalyticsEvent,
)
from services.offer_utils import calculate_auto_gems, calculate_free_discount
from services.cache import cache_delete
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
    sb_get_legal_documents, sb_create_legal_document, sb_update_legal_document,
    sb_get_referral_analytics,
    sb_get_finance_summary,
    sb_get_platform_stats, sb_get_trips_stats,
    test_connection,
    sb_get_concerns, sb_update_concern_status, sb_get_concerns_count_by_status,
    sb_get_app_config, sb_update_app_config,
    sb_get_live_users,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["Admin"], dependencies=[Depends(require_admin)])

BOOST_PRICING_ADMIN = {
    "base_daily_cost": 25, "additional_day_cost": 20,
    "base_reach": 100, "base_reach_cost": 5,
    "reach_increment": 100, "reach_increment_cost": 10,
}


# ==================== PLATFORM STATS ====================

@router.get("/admin/stats")
def get_admin_stats():
    stats = sb_get_platform_stats()
    trip_stats = sb_get_trips_stats()
    redemption_stats = sb_get_redemption_stats()
    finance = sb_get_finance_summary()
    open_concerns = sb_get_concerns_count_by_status("open")
    if not stats:
        stats = {}
    data = {
        **stats,
        "active_today": stats.get("active_today", len(sb_get_live_users())),
        "trips_today": stats.get("trips_today", trip_stats.get("total_trips", 0)),
        "total_miles": stats.get("total_miles", 0),
        "open_concerns": open_concerns,
        "offers_redeemed": stats.get("total_redemptions", redemption_stats.get("total", 0)),
        "revenue": finance.get("total_mrr", 0),
        "user_growth": stats.get("user_growth", "+0%"),
    }
    return {"success": True, "source": "supabase", "data": data}


# ==================== CONCERNS (admin) ====================

@router.get("/admin/concerns")
def get_admin_concerns(
    limit: int = Query(default=50, ge=1, le=100),
    severity: Optional[str] = None,
    status: Optional[str] = None,
):
    concerns = sb_get_concerns(limit=limit, severity=severity, status=status)
    return {"success": True, "data": {"concerns": concerns, "total": len(concerns)}}


@router.post("/admin/concerns/{concern_id}/status")
def update_concern_status(concern_id: str, body: dict = Body(..., embed=True)):
    status = body.get("status")
    if status not in ("open", "in_progress", "resolved", "closed"):
        return {"success": False, "message": "Invalid status"}
    ok = sb_update_concern_status(concern_id, status)
    if ok:
        return {"success": True, "message": "Updated"}
    return {"success": False, "message": "Update failed"}


# ==================== LIVE USERS ====================

@router.get("/admin/live-users")
def get_live_users():
    users = sb_get_live_users()
    return {"success": True, "data": {"users": users}}


# ==================== HEALTH ====================

@router.get("/admin/health")
async def get_admin_health():
    import time
    import httpx
    from database import get_supabase
    import os

    results = {}
    results["api"] = "healthy"

    # Supabase DB
    try:
        start = time.time()
        supabase = get_supabase()
        supabase.table("app_config").select("key").limit(1).execute()
        results["database"] = "healthy"
        results["db_latency"] = round((time.time() - start) * 1000)
    except Exception as e:
        results["database"] = "down"
        results["db_error"] = str(e)

    # Google Maps
    GOOGLE_MAPS_API_KEY = os.environ.get("GOOGLE_MAPS_API_KEY") or os.environ.get("GOOGLE_PLACES_API_KEY")
    try:
        start = time.time()
        async with httpx.AsyncClient(timeout=5) as client:
            r = await client.get(
                "https://maps.googleapis.com/maps/api/geocode/json",
                params={"address": "Columbus OH", "key": GOOGLE_MAPS_API_KEY or ""},
            )
        results["google_maps"] = "healthy" if r.status_code == 200 else "degraded"
        results["maps_latency"] = round((time.time() - start) * 1000)
    except Exception:
        results["google_maps"] = "down"

    # OHGO
    OHGO_API_KEY = os.environ.get("VITE_OHGO_API_KEY") or os.environ.get("OHGO_API_KEY")
    try:
        start = time.time()
        async with httpx.AsyncClient(timeout=5) as client:
            r = await client.get(
                "https://publicapi.ohgo.com/api/v1/cameras",
                params={"api-key": OHGO_API_KEY or "", "page-size": "1"},
            )
        results["ohgo"] = "healthy" if r.status_code == 200 else "degraded"
        results["ohgo_latency"] = round((time.time() - start) * 1000)
    except Exception:
        results["ohgo"] = "down"

    # OpenAI
    OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
    try:
        start = time.time()
        async with httpx.AsyncClient(timeout=5) as client:
            r = await client.get(
                "https://api.openai.com/v1/models",
                headers={"Authorization": f"Bearer {OPENAI_API_KEY or ''}"},
            )
        results["openai"] = "healthy" if r.status_code == 200 else "degraded"
        results["openai_latency"] = round((time.time() - start) * 1000)
    except Exception:
        results["openai"] = "down"

    # Supabase Realtime
    SUPABASE_URL = os.environ.get("SUPABASE_URL")
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            r = await client.get(f"{SUPABASE_URL or ''}/rest/v1/")
        results["realtime"] = "healthy" if r.status_code < 500 else "degraded"
    except Exception:
        results["realtime"] = "down"

    return {"success": True, "data": results}


# ==================== APP CONFIG (admin) ====================

@router.get("/admin/config")
def get_admin_config():
    config = sb_get_app_config()
    return {"success": True, "data": config}


@router.post("/admin/config")
def update_admin_config(config: dict, user: dict = Depends(require_admin)):
    updated_by = user.get("user_id") if user else None
    for key, value in config.items():
        sb_update_app_config(key, value, updated_by=updated_by)
    cache_delete("app_config_public")
    return {"success": True, "data": sb_get_app_config()}


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
def get_notifications(limit: int = Query(default=50, ge=1, le=100)):
    data = sb_get_admin_notifications(limit=limit)
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


_LEGAL_DOC_KEYS = frozenset(
    {"name", "type", "status", "version", "description", "content", "is_required"}
)


@router.post("/admin/legal-documents")
def create_legal_document(doc_data: dict):
    body = {k: v for k, v in doc_data.items() if k in _LEGAL_DOC_KEYS}
    created = sb_create_legal_document(body)
    if created:
        sb_create_audit_log(
            "LEGAL_DOC_CREATED",
            "admin",
            str(created.get("id", "")),
            "Created legal document",
        )
        return {"success": True, "data": created, "message": "Document created"}
    return {
        "success": False,
        "message": "Failed to create document (name and type are required)",
    }


@router.put("/admin/legal-documents/{doc_id}")
def update_legal_document(doc_id: str, doc_data: dict):
    body = {k: v for k, v in doc_data.items() if k in _LEGAL_DOC_KEYS}
    body["last_updated"] = datetime.now(timezone.utc).isoformat()
    success = sb_update_legal_document(doc_id, body)
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
def get_audit_log(limit: int = Query(default=50, ge=1, le=100)):
    data = sb_get_audit_logs(limit=limit)
    return {"success": True, "data": data}


# ==================== INCIDENTS ====================

@router.get("/admin/incidents")
def get_incidents(
    status: Optional[str] = None,
    limit: int = Query(default=100, ge=1, le=100),
):
    data = sb_get_incidents(status=status, limit=limit)
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
def get_moderated_incidents(limit: int = Query(default=100, ge=1, le=100)):
    approved = sb_get_incidents(status="approved", limit=limit)
    rejected = sb_get_incidents(status="rejected", limit=limit)
    return {"success": True, "data": approved + rejected, "total": len(approved) + len(rejected)}


# ==================== OFFERS CRUD ====================

@router.get("/admin/offers")
def get_offers(
    status: str = "all",
    limit: int = Query(default=100, ge=1, le=100),
):
    data = sb_get_offers(status=status, limit=limit)
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
    auto_gems = offer.base_gems if offer.base_gems is not None else calculate_auto_gems(offer.discount_percent, offer.is_free_item)
    premium_discount = offer.discount_percent
    free_discount = calculate_free_discount(premium_discount)

    data = {
        "business_name": offer.business_name,
        "business_type": offer.business_type,
        "description": offer.description,
        "discount_percent": premium_discount,
        "premium_discount_percent": premium_discount,
        "free_discount_percent": free_discount,
        "is_free_item": offer.is_free_item,
        "base_gems": auto_gems,
        "lat": offer.lat,
        "lng": offer.lng,
        "is_admin_offer": True,
        "created_by": "admin",
        "status": "active",
        "title": offer.description[:60] if offer.description else "Admin Offer",
        "offer_source": offer.offer_source,
    }
    if offer.offer_url:
        data["offer_url"] = offer.offer_url
    if offer.original_price is not None:
        data["original_price"] = offer.original_price
    if offer.affiliate_tracking_url:
        data["affiliate_tracking_url"] = offer.affiliate_tracking_url
    if offer.external_id:
        data["external_id"] = offer.external_id
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
        auto_gems = item.base_gems if item.base_gems is not None else calculate_auto_gems(item.discount_percent, item.is_free_item)
        premium_discount = item.discount_percent
        free_discount = calculate_free_discount(premium_discount)

        offer_data = {
            "business_name": item.business_name,
            "business_type": item.business_type,
            "description": item.description,
            "discount_percent": premium_discount,
            "premium_discount_percent": premium_discount,
            "free_discount_percent": free_discount,
            "is_free_item": item.is_free_item,
            "base_gems": auto_gems,
            "address": item.address,
            "lat": item.lat or 39.9612,
            "lng": item.lng or -82.9988,
            "offer_url": item.offer_url,
            "is_admin_offer": True,
            "created_by": "admin",
            "status": "active",
            "title": item.description[:60] if item.description else "Bulk Offer",
            "expires_at": (datetime.now() + timedelta(days=item.expires_days)).isoformat() if item.expires_days else None,
            "offer_source": item.offer_source,
        }
        if item.original_price is not None:
            offer_data["original_price"] = item.original_price
        if item.affiliate_tracking_url:
            offer_data["affiliate_tracking_url"] = item.affiliate_tracking_url
        if item.external_id:
            offer_data["external_id"] = item.external_id
        result = sb_create_offer(offer_data)
        if result:
            created.append(result)
    return {"success": True, "message": f"Created {len(created)} offers", "data": {"created_count": len(created), "offers": created}}


@router.post("/admin/offers/upload-excel")
async def upload_excel_offers(file: UploadFile = File(...)):
    """Parse an Excel (.xlsx) file and create offers. Auto-calculates gems and discounts."""
    if not file.filename or not file.filename.endswith((".xlsx", ".xls")):
        return {"success": False, "message": "Please upload an .xlsx file"}

    try:
        import openpyxl
    except ImportError:
        return {"success": False, "message": "openpyxl not installed. Run: pip install openpyxl"}

    contents = await file.read()
    wb = openpyxl.load_workbook(io.BytesIO(contents), read_only=True)
    ws = wb.active

    rows = list(ws.iter_rows(values_only=True))
    if len(rows) < 2:
        return {"success": False, "message": "File is empty or has no data rows"}

    header = [str(h).strip().lower().replace(" ", "_") if h else "" for h in rows[0]]
    col_map = {name: i for i, name in enumerate(header)}

    required = ["business_name"]
    for req in required:
        if req not in col_map:
            return {"success": False, "message": f"Missing required column: {req}. Found: {', '.join(header)}"}

    created = []
    errors = []
    for row_idx, row in enumerate(rows[1:], start=2):
        try:
            def get(col: str, default=""):
                idx = col_map.get(col)
                if idx is None or idx >= len(row) or row[idx] is None:
                    return default
                return row[idx]

            biz_name = str(get("business_name", "")).strip()
            if not biz_name:
                errors.append(f"Row {row_idx}: missing business_name")
                continue

            disc = int(float(get("discount_percent", 0)))
            is_free = str(get("is_free_item", "")).lower() in ("true", "yes", "1")
            auto_gems = calculate_auto_gems(disc, is_free)
            free_disc = calculate_free_discount(disc)

            source = str(get("source", get("offer_source", "direct"))).strip().lower() or "direct"
            if source not in ("direct", "groupon", "affiliate", "yelp", "manual"):
                source = "direct"

            offer_data = {
                "business_name": biz_name,
                "business_type": str(get("business_type", "retail")),
                "description": str(get("description", "")),
                "title": str(get("title", ""))[:60] or str(get("description", ""))[:60] or "Uploaded Offer",
                "discount_percent": disc,
                "premium_discount_percent": disc,
                "free_discount_percent": free_disc,
                "is_free_item": is_free,
                "base_gems": auto_gems,
                "address": str(get("address", "")),
                "offer_url": str(get("offer_url", "")) or None,
                "lat": float(get("lat", 39.9612)),
                "lng": float(get("lng", -82.9988)),
                "is_admin_offer": True,
                "created_by": "admin_excel",
                "status": "active",
                "expires_at": (datetime.now() + timedelta(days=int(float(get("expires_days", 30))))).isoformat(),
                "offer_source": source,
            }
            orig_price = get("original_price", "")
            if orig_price:
                try:
                    offer_data["original_price"] = float(orig_price)
                except (ValueError, TypeError):
                    pass
            aff_url = str(get("affiliate_tracking_url", "")).strip()
            if aff_url:
                offer_data["affiliate_tracking_url"] = aff_url
            ext_id = str(get("external_id", "")).strip()
            if ext_id:
                offer_data["external_id"] = ext_id
            result = sb_create_offer(offer_data)
            if result:
                created.append(result)
            else:
                errors.append(f"Row {row_idx}: DB insert failed")
        except Exception as e:
            errors.append(f"Row {row_idx}: {str(e)}")

    sb_create_audit_log("BULK_EXCEL_UPLOAD", "admin", "", f"Uploaded {len(created)} offers from {file.filename}")

    return {
        "success": True,
        "message": f"Created {len(created)} offers from {file.filename}",
        "data": {
            "created_count": len(created),
            "error_count": len(errors),
            "errors": errors[:20],
            "total_rows": len(rows) - 1,
        },
    }


@router.get("/admin/offers/upload-template")
def download_upload_template():
    """Download a sample .xlsx template for bulk offer upload."""
    try:
        import openpyxl
    except ImportError:
        return {"success": False, "message": "openpyxl not installed"}

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Offers"
    headers = [
        "business_name", "title", "description", "business_type",
        "discount_percent", "is_free_item", "address", "offer_url",
        "lat", "lng", "expires_days",
        "source", "original_price", "affiliate_tracking_url", "external_id",
    ]
    ws.append(headers)
    ws.append([
        "Coffee House", "15% off drinks", "Get 15% off any beverage", "cafe",
        15, "no", "123 Main St, Columbus OH", "https://coffeehouse.com/snap",
        39.9612, -82.9988, 30,
        "direct", "", "", "",
    ])
    ws.append([
        "Auto Spa", "Free car wash", "Complimentary full wash", "service",
        100, "yes", "456 Oak Ave, Columbus OH", "",
        39.97, -83.00, 14,
        "direct", "", "", "",
    ])
    ws.append([
        "Groupon Pizza", "50% off large pizza", "Half price large pizza deal", "restaurant",
        50, "no", "789 Elm St, Columbus OH", "https://groupon.com/deals/pizza",
        39.98, -82.99, 60,
        "groupon", 24.99, "https://cj.com/track/pizza123", "GRP-12345",
    ])

    for col in ws.columns:
        max_len = max(len(str(cell.value or "")) for cell in col)
        ws.column_dimensions[col[0].column_letter].width = min(max_len + 2, 30)

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=snaproad_offers_template.xlsx"},
    )


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


# ==================== GROUPON / CJ AFFILIATE IMPORT ====================

@router.post("/admin/offers/import-groupon")
async def import_groupon_deals(
    area: str = "Columbus, OH",
    category: Optional[str] = None,
    limit: int = Query(default=20, ge=1, le=100),
):
    """Fetch deals from Groupon via CJ Affiliate API and return a preview list."""
    from services.groupon_service import fetch_groupon_deals, import_deals_to_offers

    raw_deals = await fetch_groupon_deals(area=area, category=category, limit=limit)
    if not raw_deals:
        return {
            "success": True,
            "message": "No deals found (CJ_API_KEY may not be configured yet)",
            "data": {"deals": [], "count": 0},
        }

    offer_previews = import_deals_to_offers(raw_deals)
    return {
        "success": True,
        "message": f"Fetched {len(offer_previews)} deals from Groupon",
        "data": {"deals": offer_previews, "count": len(offer_previews)},
    }


@router.post("/admin/offers/approve-imports")
def approve_imported_deals(deals: list[dict]):
    """
    Receive a list of pre-normalised deal dicts (from import-groupon preview)
    and insert them as active offers.
    """
    created = []
    errors = []
    for idx, deal in enumerate(deals):
        try:
            deal["status"] = "active"
            result = sb_create_offer(deal)
            if result:
                created.append(result)
            else:
                errors.append(f"Deal {idx}: DB insert failed")
        except Exception as e:
            errors.append(f"Deal {idx}: {e}")

    if created:
        sb_create_audit_log(
            "GROUPON_IMPORT_APPROVED", "admin", "",
            f"Approved {len(created)} Groupon deals",
        )

    return {
        "success": True,
        "message": f"Approved {len(created)} of {len(deals)} deals",
        "data": {"created_count": len(created), "error_count": len(errors), "errors": errors[:20]},
    }


# ==================== YELP ENRICHMENT ====================

@router.post("/admin/offers/{offer_id}/enrich-yelp")
async def enrich_offer_with_yelp(offer_id: str):
    """Fetch Yelp rating, reviews and photo for an offer and update it."""
    from services.yelp_service import enrich_offer

    offers = sb_get_offers(status="all")
    offer = next((o for o in offers if str(o.get("id")) == offer_id), None)
    if not offer:
        return {"success": False, "message": "Offer not found"}

    enrichment = await enrich_offer(
        business_name=offer.get("business_name", ""),
        lat=offer.get("lat"),
        lng=offer.get("lng"),
    )
    if not enrichment:
        return {"success": False, "message": "No Yelp data found for this business"}

    success = sb_update_offer(offer_id, enrichment)
    if success:
        sb_create_audit_log("OFFER_YELP_ENRICHED", "admin", offer_id, f"Enriched with Yelp: {enrichment.get('yelp_rating')}★")
        return {"success": True, "message": "Offer enriched with Yelp data", "data": enrichment}
    return {"success": False, "message": "Failed to update offer with Yelp data"}


# ==================== PARTNERS CRUD ====================

@router.get("/admin/partners")
def get_partners(limit: int = Query(default=100, ge=1, le=100)):
    data = sb_get_partners(limit=limit)
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
def get_campaigns(limit: int = Query(default=100, ge=1, le=100)):
    data = sb_get_campaigns(limit=limit)
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
def get_rewards(limit: int = Query(default=100, ge=1, le=100)):
    data = sb_get_rewards(limit=limit)
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
def get_users(limit: int = Query(default=100, ge=1, le=100)):
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
def get_boosts(
    partner_id: Optional[str] = None,
    limit: int = Query(default=100, ge=1, le=100),
):
    data = sb_get_boosts(partner_id=partner_id)[:limit]
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
def get_admin_events(limit: int = Query(default=100, ge=1, le=100)):
    challenges = sb_get_challenges()[:limit]
    return {"success": True, "data": challenges}

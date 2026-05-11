"""
Admin endpoints for the "paste a product link → offer" workflow.

Three surfaces:

  1. `POST /api/admin/offers/unfurl` — given a URL, return a metadata preview
     the admin form can pre-fill (title, image, regular/sale price, merchant).
     No DB write.
  2. `POST /api/admin/offers/from-link` — admin clicks Publish; based on the
     `destination` field we either insert into `online_offers` (e-commerce
     pane on the mobile Offers tab) or `offers` (local geo offers).
  3. `GET / PATCH / DELETE /api/admin/online-offers[/{id}]` — full CRUD over
     the online offers table.

The parent `router` in `routes/admin.py` already applies `require_admin`, so
these routes inherit admin gating when included on it.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Annotated, Any, Optional

from fastapi import APIRouter, HTTPException, Query

from models.schemas import (
    AdminOfferCreate,
    OfferFromLinkCreate,
    OnlineOfferPatch,
    OnlineOfferUpsert,
    UnfurlRequest,
)
from services.online_offers_db import (
    _domain_from_url,
    _looks_like_amazon_domain,
    create_online_offer,
    delete_online_offer,
    get_online_offer,
    list_online_offers,
    update_online_offer,
)
from services.supabase_service import sb_create_audit_log, sb_create_offer
from services.url_unfurl import (
    UnfurlError,
    amazon_paapi_configured,
    extract_amazon_asin,
    unfurl_product_url,
)

logger = logging.getLogger(__name__)

admin_link_offers_router = APIRouter()


# ─── Preview ─────────────────────────────────────────────────────────────────


@admin_link_offers_router.post("/admin/offers/unfurl")
def admin_unfurl_offer_link(body: UnfurlRequest):
    """
    Fetch the URL server-side and return whatever metadata we can extract.

    The response is shaped so the admin's "publish" form can use it directly:
    `title`, `image_url`, `regular_price`, `sale_price`, `currency`, plus a
    `notes` array surfacing things the UI should warn about (e.g. Amazon link
    pasted while PA-API isn't configured).
    """
    try:
        result = unfurl_product_url(body.url)
    except UnfurlError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover (defensive)
        logger.exception("unfurl: unexpected failure for %s", body.url)
        raise HTTPException(status_code=500, detail="Could not unfurl URL") from exc

    notes: list[str] = []
    is_amazon = bool(_looks_like_amazon_domain(result.merchant_domain) or extract_amazon_asin(result.final_url))
    if is_amazon and not amazon_paapi_configured():
        notes.append(
            "Amazon link detected. Title and image come from the public page; "
            "for live regular/sale prices, set AMAZON_PAAPI_* env vars to enable Product Advertising API."
        )
    if not result.title:
        notes.append("No title was found on the page — set one before publishing.")
    if not result.image_url:
        notes.append("No image was found on the page — paste an image URL or upload one.")

    payload = result.to_dict()
    payload["notes"] = notes
    payload["amazon_paapi_configured"] = amazon_paapi_configured()
    return {"success": True, "data": payload}


# ─── Universal create-from-link ──────────────────────────────────────────────


def _publish_local_from_link(local: AdminOfferCreate, source_url: Optional[str]) -> dict[str, Any]:
    """
    Insert a row into `public.offers` mirroring the AdminOfferCreate path used
    elsewhere, plus the new `source_url` / `sale_price` columns.
    """
    title_val = (local.title or "").strip() or (local.description[:60] if local.description else "Admin Offer")
    image_url = (local.image_url or "").strip() or None
    expires_at = (
        datetime.now(timezone.utc) + timedelta(hours=local.expires_hours)
    ).isoformat() if local.expires_hours else None

    optional = {
        "offer_url": local.offer_url,
        "original_price": local.original_price,
        "sale_price": local.sale_price,
        "affiliate_tracking_url": local.affiliate_tracking_url,
        "external_id": local.external_id,
        "source_url": source_url or local.source_url,
    }
    optional = {k: v for k, v in optional.items() if v is not None and v != ""}

    payload: dict[str, Any] = {
        "business_name": local.business_name,
        "business_type": local.business_type,
        "description": local.description,
        "discount_percent": local.discount_percent,
        "is_free_item": local.is_free_item,
        "base_gems": local.base_gems,
        "lat": local.lat,
        "lng": local.lng,
        "is_admin_offer": True,
        "created_by": "admin",
        "status": "active",
        "title": title_val,
        "offer_source": local.offer_source or "direct",
        **optional,
    }
    if image_url:
        payload["image_url"] = image_url
    if expires_at:
        payload["expires_at"] = expires_at

    result = sb_create_offer(payload)
    if not result:
        raise HTTPException(status_code=503, detail="Failed to create local offer")
    sb_create_audit_log(
        "OFFER_CREATED",
        "admin",
        result.get("id", ""),
        f"Local offer from link: {title_val}",
    )
    return result


def _publish_online_from_link(online: OnlineOfferUpsert) -> dict[str, Any]:
    payload = online.model_dump()
    if not payload.get("merchant_domain") and payload.get("source_url"):
        payload["merchant_domain"] = _domain_from_url(payload["source_url"])
    if not payload.get("affiliate_url"):
        payload["affiliate_url"] = payload.get("source_url")

    result = create_online_offer(payload, created_by="admin")
    if not result:
        raise HTTPException(status_code=503, detail="Failed to create online offer")
    sb_create_audit_log(
        "ONLINE_OFFER_CREATED",
        "admin",
        result.get("id", ""),
        f"Online offer from link: {online.title}",
    )
    return result


@admin_link_offers_router.post("/admin/offers/from-link")
def admin_publish_offer_from_link(body: OfferFromLinkCreate):
    """
    Single endpoint that publishes a paste-link preview as either an online or
    a local offer, depending on `body.destination`.
    """
    dest = (body.destination or "").strip().lower()
    if dest == "online":
        if not body.online:
            raise HTTPException(status_code=400, detail="`online` payload required when destination='online'")
        row = _publish_online_from_link(body.online)
        return {"success": True, "destination": "online", "data": row}

    if dest == "local":
        if not body.local:
            raise HTTPException(status_code=400, detail="`local` payload required when destination='local'")
        row = _publish_local_from_link(body.local, source_url=body.local.source_url)
        return {"success": True, "destination": "local", "data": row}

    raise HTTPException(status_code=400, detail="destination must be 'online' or 'local'")


# ─── Online-offer CRUD ───────────────────────────────────────────────────────


@admin_link_offers_router.get("/admin/online-offers")
def admin_list_online_offers(
    status: Annotated[str, Query()] = "all",
    category_slug: Annotated[Optional[str], Query()] = None,
    limit: Annotated[int, Query(ge=1, le=500)] = 200,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    rows = list_online_offers(
        status=None if status == "all" else status,
        category_slug=category_slug,
        limit=limit,
        offset=offset,
    )
    return {"success": True, "data": rows, "count": len(rows)}


@admin_link_offers_router.post("/admin/online-offers")
def admin_create_online_offer(body: OnlineOfferUpsert):
    payload = body.model_dump()
    if not payload.get("merchant_domain") and payload.get("source_url"):
        payload["merchant_domain"] = _domain_from_url(payload["source_url"])
    if not payload.get("affiliate_url"):
        payload["affiliate_url"] = payload.get("source_url")
    result = create_online_offer(payload, created_by="admin")
    if not result:
        raise HTTPException(status_code=503, detail="Failed to create online offer")
    sb_create_audit_log(
        "ONLINE_OFFER_CREATED",
        "admin",
        result.get("id", ""),
        f"Online offer: {body.title}",
    )
    return {"success": True, "data": result}


@admin_link_offers_router.get("/admin/online-offers/{offer_id}")
def admin_get_online_offer(offer_id: str):
    row = get_online_offer(offer_id)
    if not row:
        raise HTTPException(status_code=404, detail="Online offer not found")
    return {"success": True, "data": row}


@admin_link_offers_router.patch("/admin/online-offers/{offer_id}")
def admin_update_online_offer(offer_id: str, patch: OnlineOfferPatch):
    fields = {k: v for k, v in patch.model_dump().items() if v is not None}
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    row = update_online_offer(offer_id, fields)
    if not row:
        raise HTTPException(status_code=404, detail="Online offer not found")
    sb_create_audit_log("ONLINE_OFFER_UPDATED", "admin", offer_id, f"Updated fields: {list(fields.keys())}")
    return {"success": True, "data": row}


@admin_link_offers_router.delete("/admin/online-offers/{offer_id}")
def admin_delete_online_offer(offer_id: str):
    ok = delete_online_offer(offer_id)
    if not ok:
        raise HTTPException(status_code=503, detail="Failed to delete online offer")
    sb_create_audit_log("ONLINE_OFFER_DELETED", "admin", offer_id, "Deleted online offer")
    return {"success": True}


__all__ = ["admin_link_offers_router"]

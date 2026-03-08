"""
Groupon / CJ Affiliate Integration Service
Fetches deals via CJ Affiliate Product Search API and converts them to SnapRoad offers.
"""
import os
import logging
from typing import Optional
import httpx

logger = logging.getLogger(__name__)

CJ_API_BASE = "https://ads.api.cj.com/query"
CJ_API_KEY = os.getenv("CJ_API_KEY", "")
CJ_WEBSITE_ID = os.getenv("CJ_WEBSITE_ID", "")


async def fetch_groupon_deals(
    area: str = "Columbus, OH",
    category: Optional[str] = None,
    limit: int = 20,
) -> list[dict]:
    """
    Fetch deals from CJ Affiliate (Groupon advertiser).
    Returns a list of normalised deal dicts ready for preview/approval.

    When CJ_API_KEY is not set this returns an empty list so callers degrade
    gracefully.
    """
    if not CJ_API_KEY:
        logger.warning("CJ_API_KEY not configured – returning empty deal list")
        return []

    headers = {
        "Authorization": f"Bearer {CJ_API_KEY}",
        "Accept": "application/json",
    }

    params: dict = {
        "website-id": CJ_WEBSITE_ID,
        "keywords": area,
        "records-per-page": str(limit),
    }
    if category:
        params["advertiser-category"] = category

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(CJ_API_BASE, headers=headers, params=params)
            resp.raise_for_status()
            data = resp.json()
    except Exception as e:
        logger.error(f"CJ API request failed: {e}")
        return []

    products = data.get("products", data.get("data", []))
    return [_normalise_cj_product(p) for p in products]


def _normalise_cj_product(p: dict) -> dict:
    """Convert a raw CJ product/deal object into SnapRoad's import schema."""
    price = _safe_float(p.get("price", p.get("sale-price", 0)))
    retail = _safe_float(p.get("retail-price", 0))
    discount = 0
    if retail and price and retail > price:
        discount = round((1 - price / retail) * 100)

    return {
        "business_name": p.get("advertiser-name", p.get("manufacturer-name", "Groupon Deal")),
        "title": (p.get("name", "") or p.get("title", ""))[:120],
        "description": (p.get("description", ""))[:500],
        "discount_percent": discount,
        "original_price": retail or price,
        "offer_url": p.get("buy-url", p.get("link", "")),
        "affiliate_tracking_url": p.get("buy-url", ""),
        "external_id": str(p.get("ad-id", p.get("id", ""))),
        "image_url": p.get("image-url", ""),
        "category": p.get("advertiser-category", ""),
        "offer_source": "groupon",
    }


def import_deals_to_offers(deals: list[dict]) -> list[dict]:
    """
    Convert a list of normalised deals into offer dicts ready for
    ``sb_create_offer``. Caller is responsible for the actual DB insert.
    """
    from services.offer_utils import calculate_auto_gems, calculate_free_discount

    offers = []
    for d in deals:
        disc = d.get("discount_percent", 0)
        is_free = disc >= 100
        offers.append({
            "business_name": d["business_name"],
            "business_type": "retail",
            "description": d.get("description", d.get("title", "")),
            "title": d.get("title", d.get("description", ""))[:60] or "Groupon Deal",
            "discount_percent": disc,
            "premium_discount_percent": disc,
            "free_discount_percent": calculate_free_discount(disc),
            "is_free_item": is_free,
            "base_gems": calculate_auto_gems(disc, is_free),
            "offer_url": d.get("offer_url", ""),
            "affiliate_tracking_url": d.get("affiliate_tracking_url", ""),
            "external_id": d.get("external_id", ""),
            "original_price": d.get("original_price"),
            "offer_source": "groupon",
            "is_admin_offer": True,
            "created_by": "admin_groupon_import",
            "status": "pending_review",
        })
    return offers


def _safe_float(v) -> float:
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0.0

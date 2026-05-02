"""
Online / affiliate-style offers feed for the driver app Offers tab.

Phase 1: `ONLINE_OFFERS_PROVIDER=placeholder` returns a rich deterministic catalog.
Later: set `ONLINE_OFFERS_PROVIDER=http_json` plus `ONLINE_OFFERS_API_BASE_URL` and
`ONLINE_OFFERS_API_KEY` to proxy a partner JSON API without changing the mobile contract.
"""

from __future__ import annotations

import base64
import json
import logging
import os
from typing import Any, Optional

import httpx

logger = logging.getLogger(__name__)

ONLINE_OFFERS_PROVIDER = (os.environ.get("ONLINE_OFFERS_PROVIDER") or "placeholder").strip().lower()
ONLINE_OFFERS_API_KEY = (os.environ.get("ONLINE_OFFERS_API_KEY") or "").strip()
ONLINE_OFFERS_API_BASE_URL = (os.environ.get("ONLINE_OFFERS_API_BASE_URL") or "").strip().rstrip("/")

PAGE_SIZE = 12

# Rich placeholder catalog — categories cover typical e-commerce / cashback use cases.
_PLACEHOLDER_ITEMS: list[dict[str, Any]] = [
    {
        "id": "online-ph-fashion-1",
        "title": "Winter layers sale",
        "description": "Warm coats and knits from top brands — limited window.",
        "merchant_name": "Northline Apparel",
        "merchant_domain": "northline.example",
        "category_slug": "fashion",
        "category_label": "Fashion",
        "discount_label": "25% off",
        "image_url": "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&q=80",
        "expires_at": "2026-12-31T23:59:59Z",
        "affiliate_url": "https://example.com/aff/fashion-winter",
        "featured": True,
    },
    {
        "id": "online-ph-fashion-2",
        "title": "Premium denim drop",
        "description": "Selvedge jeans and everyday fits with free returns.",
        "merchant_name": "Blue Loom",
        "merchant_domain": "blueloom.example",
        "category_slug": "fashion",
        "category_label": "Fashion",
        "discount_label": "15% cashback",
        "image_url": "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800&q=80",
        "expires_at": "2026-08-15T23:59:59Z",
        "affiliate_url": "https://example.com/aff/denim",
        "featured": False,
    },
    {
        "id": "online-ph-electronics-1",
        "title": "Premium earbuds flash sale",
        "description": "Flagship earbuds with multipoint and long battery life.",
        "merchant_name": "Circuit Valley",
        "merchant_domain": "circuitvalley.example",
        "category_slug": "electronics",
        "category_label": "Electronics",
        "discount_label": "12% off",
        "image_url": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80",
        "expires_at": "2026-09-01T23:59:59Z",
        "affiliate_url": "https://example.com/aff/headphones",
        "featured": True,
    },
    {
        "id": "online-ph-electronics-2",
        "title": "Gaming peripherals bundle",
        "description": "Keyboard, mouse, and mousepad — synced RGB.",
        "merchant_name": "Pixel Forge",
        "merchant_domain": "pixelforge.example",
        "category_slug": "electronics",
        "category_label": "Electronics",
        "discount_label": "Free shipping",
        "image_url": "https://images.unsplash.com/photo-1527814050087-3793815479db?w=800&q=80",
        "expires_at": "2026-07-20T23:59:59Z",
        "affiliate_url": "https://example.com/aff/gaming",
        "featured": False,
    },
    {
        "id": "online-ph-travel-1",
        "title": "Weekend hotel flash",
        "description": "Boutique stays in major metros — refundable rates.",
        "merchant_name": "StayGrid",
        "merchant_domain": "staygrid.example",
        "category_slug": "travel",
        "category_label": "Travel",
        "discount_label": "18% off",
        "image_url": "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80",
        "expires_at": "2026-10-31T23:59:59Z",
        "affiliate_url": "https://example.com/aff/hotels",
        "featured": True,
    },
    {
        "id": "online-ph-beauty-1",
        "title": "Skincare restock event",
        "description": "Dermatologist-loved serums and sun care.",
        "merchant_name": "Glowsmith",
        "merchant_domain": "glowsmith.example",
        "category_slug": "beauty",
        "category_label": "Beauty",
        "discount_label": "20% off",
        "image_url": "https://images.unsplash.com/photo-1556228578-0d3086fd6c4d?w=800&q=80",
        "expires_at": "2026-06-30T23:59:59Z",
        "affiliate_url": "https://example.com/aff/skincare",
        "featured": False,
    },
    {
        "id": "online-ph-home-1",
        "title": "Smart home starter",
        "description": "Lights, sensors, and voice hub — works with major platforms.",
        "merchant_name": "Homewise",
        "merchant_domain": "homewise.example",
        "category_slug": "home",
        "category_label": "Home",
        "discount_label": "Bundle save $40",
        "image_url": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
        "expires_at": "2026-11-22T23:59:59Z",
        "affiliate_url": "https://example.com/aff/smarthome",
        "featured": True,
    },
    {
        "id": "online-ph-food-1",
        "title": "Gourmet pantry box",
        "description": "Olive oils, spices, and small-batch snacks shipped monthly.",
        "merchant_name": "Pantry Lane",
        "merchant_domain": "pantrylane.example",
        "category_slug": "food_kit",
        "category_label": "Food & pantry",
        "discount_label": "First box −30%",
        "image_url": "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80",
        "expires_at": "2026-05-31T23:59:59Z",
        "affiliate_url": "https://example.com/aff/pantry",
        "featured": False,
    },
    {
        "id": "online-ph-sports-1",
        "title": "Outdoor run gear",
        "description": "Weather-ready layers and reflective packs.",
        "merchant_name": "Trailbound",
        "merchant_domain": "trailbound.example",
        "category_slug": "sports",
        "category_label": "Sports",
        "discount_label": "10% cashback",
        "image_url": "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&q=80",
        "expires_at": "2026-08-08T23:59:59Z",
        "affiliate_url": "https://example.com/aff/run",
        "featured": False,
    },
]


def _decode_cursor(cursor: Optional[str]) -> int:
    if not cursor:
        return 0
    try:
        raw = base64.urlsafe_b64decode(cursor.encode("ascii") + b"===")
        j = json.loads(raw.decode("utf-8"))
        off = int(j.get("offset", 0))
        return max(0, off)
    except Exception:
        return 0


def _encode_cursor(offset: int) -> Optional[str]:
    if offset <= 0:
        return None
    raw = json.dumps({"offset": offset}).encode("utf-8")
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def _category_summary(items: list[dict[str, Any]]) -> list[dict[str, str]]:
    buckets: dict[str, dict[str, str]] = {}
    for it in items:
        slug = str(it.get("category_slug") or "other")
        lbl = str(it.get("category_label") or slug)
        if slug not in buckets:
            buckets[slug] = {"slug": slug, "label": lbl, "count": "0"}
        buckets[slug]["count"] = str(int(buckets[slug]["count"]) + 1)
    return sorted(buckets.values(), key=lambda x: x["label"].lower())


def _placeholder_catalog(
    *,
    category_slug: Optional[str],
    cursor: Optional[str],
) -> dict[str, Any]:
    base = list(_PLACEHOLDER_ITEMS)
    if category_slug:
        cs = category_slug.strip().lower()
        base = [x for x in base if str(x.get("category_slug")) == cs]
    start = _decode_cursor(cursor)
    end = min(len(base), start + PAGE_SIZE)
    page = base[start:end]
    next_cursor = _encode_cursor(end) if end < len(base) else None
    return {
        "items": page,
        "categories": _category_summary(_PLACEHOLDER_ITEMS),
        "next_cursor": next_cursor,
        "provider": "placeholder",
    }


def _http_json_catalog(*, category_slug: Optional[str], cursor: Optional[str]) -> dict[str, Any]:
    if not ONLINE_OFFERS_API_BASE_URL:
        logger.warning("ONLINE_OFFERS_PROVIDER=http_json but ONLINE_OFFERS_API_BASE_URL is empty; returning placeholder")
        return _placeholder_catalog(category_slug=category_slug, cursor=cursor)
    headers: dict[str, str] = {"Accept": "application/json"}
    if ONLINE_OFFERS_API_KEY:
        headers["Authorization"] = f"Bearer {ONLINE_OFFERS_API_KEY}"
    params: dict[str, str] = {}
    if category_slug:
        params["category"] = category_slug
    if cursor:
        params["cursor"] = cursor
    url = f"{ONLINE_OFFERS_API_BASE_URL}/offers"
    try:
        with httpx.Client(timeout=12.0) as client:
            r = client.get(url, headers=headers, params=params or None)
            r.raise_for_status()
            payload = r.json()
    except Exception as exc:
        logger.warning("online offers http_json fetch failed: %s", exc, exc_info=True)
        return _placeholder_catalog(category_slug=category_slug, cursor=cursor)

    if isinstance(payload, dict) and payload.get("items") is not None:
        return payload
    if isinstance(payload, dict) and isinstance(payload.get("data"), dict):
        inner = payload["data"]
        if isinstance(inner, dict) and inner.get("items") is not None:
            inner.setdefault("provider", "http_json")
            return inner
    logger.warning("online offers http_json: unexpected shape, falling back to placeholder")
    return _placeholder_catalog(category_slug=category_slug, cursor=cursor)


def fetch_online_catalog(*, category_slug: Optional[str] = None, cursor: Optional[str] = None) -> dict[str, Any]:
    """
    Returns a dict:
      items: list[offer-like dict]
      categories: [{slug, label, count}]
      next_cursor: str | None
      provider: str
    """
    prov = ONLINE_OFFERS_PROVIDER
    if prov in ("placeholder", "mock", "static", ""):
        out = _placeholder_catalog(category_slug=category_slug, cursor=cursor)
        return out
    if prov == "http_json":
        return _http_json_catalog(category_slug=category_slug, cursor=cursor)
    logger.warning("unknown ONLINE_OFFERS_PROVIDER=%r; using placeholder", prov)
    return _placeholder_catalog(category_slug=category_slug, cursor=cursor)

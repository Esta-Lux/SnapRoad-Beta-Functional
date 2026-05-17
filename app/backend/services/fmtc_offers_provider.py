"""FMTC affiliate deal ingestion for SnapRoad offers.

The feed token is intentionally read from environment (`FMTC_API_TOKEN`) so
credentials never need to live in the repo. FMTC deals with physical locations
are exposed to the local Offers pane; the rest are exposed to Online offers.
"""

from __future__ import annotations

import base64
import json
import logging
import os
import time
from datetime import datetime, timezone
from typing import Any, Optional
from urllib.parse import urlparse

import httpx

logger = logging.getLogger(__name__)

FMTC_API_BASE_URL = (os.environ.get("FMTC_API_BASE_URL") or "https://s3.fmtc.co/api/v3").strip().rstrip("/")
FMTC_API_TOKEN = (os.environ.get("FMTC_API_TOKEN") or os.environ.get("ONLINE_OFFERS_API_KEY") or "").strip()
FMTC_CACHE_SECONDS = max(60, int(os.environ.get("FMTC_OFFERS_CACHE_SECONDS") or "900"))
PAGE_SIZE = 12

_RESTRICTED_CATEGORY_PARTS = {
    "adult",
    "alcohol",
    "betting",
    "cannabis",
    "cbd",
    "cigars",
    "erotic",
    "gambling",
    "guns",
    "tobacco",
    "vape",
    "weapons",
}

_cache: dict[str, Any] = {"expires": 0.0, "deals": [], "merchants": {}}


def _decode_cursor(cursor: Optional[str]) -> int:
    if not cursor:
        return 0
    try:
        raw = base64.urlsafe_b64decode(cursor.encode("ascii") + b"===")
        return max(0, int(json.loads(raw.decode("utf-8")).get("offset", 0)))
    except Exception:
        return 0


def _encode_cursor(offset: int) -> Optional[str]:
    if offset <= 0:
        return None
    raw = json.dumps({"offset": offset}).encode("utf-8")
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def _parse_dt(value: Any) -> Optional[datetime]:
    if not value:
        return None
    try:
        s = str(value).strip()
        if not s:
            return None
        d = datetime.fromisoformat(s.replace("Z", "+00:00"))
        if d.tzinfo is None:
            d = d.replace(tzinfo=timezone.utc)
        return d.astimezone(timezone.utc)
    except Exception:
        return None


def _is_active_deal(deal: dict[str, Any], *, now: Optional[datetime] = None) -> bool:
    now = now or datetime.now(timezone.utc)
    if str(deal.get("status") or "").lower() not in {"", "active"}:
        return False
    start = _parse_dt(deal.get("start_date"))
    if start and start > now:
        return False
    end = _parse_dt(deal.get("end_date"))
    if end and end <= now:
        return False
    return not _has_restricted_category(deal)


def _has_restricted_category(deal: dict[str, Any]) -> bool:
    cats = deal.get("categories") or []
    for raw in cats if isinstance(cats, list) else []:
        slug = str(raw or "").lower()
        if any(part in slug for part in _RESTRICTED_CATEGORY_PARTS):
            return True
    return False


def _humanize_slug(slug: Optional[str]) -> str:
    s = (slug or "other").strip().lower()
    if not s:
        return "Other"
    return s.replace("local-deals-", "").replace("local-deals", "local").replace("-", " ").replace("_", " ").title()


def _best_category(deal: dict[str, Any], *, local: bool = False) -> tuple[str, str]:
    cats = [str(c or "").strip().lower() for c in (deal.get("categories") or []) if str(c or "").strip()]
    if local:
        for cat in cats:
            if cat.startswith("local-deals-"):
                slug = cat.replace("local-deals-", "", 1)
                return slug, _humanize_slug(slug)
        if "local-deals" in cats:
            return "local", "Local"
    for cat in cats:
        if not cat.startswith("local-deals"):
            return cat, _humanize_slug(cat)
    return "other", "Other"


def _float_or_none(value: Any) -> Optional[float]:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _money_or_none(value: Any) -> Optional[float]:
    v = _float_or_none(value)
    return v if v is not None and v > 0 else None


def _domain_from_url(url: Optional[str]) -> Optional[str]:
    if not url:
        return None
    try:
        host = (urlparse(url).hostname or "").lower()
    except Exception:
        return None
    if not host:
        return None
    return host[4:] if host.startswith("www.") else host


def _valid_http_url(value: Any) -> Optional[str]:
    url = str(value or "").strip()
    return url if url.startswith(("http://", "https://")) else None


def _deal_destination_url(deal: dict[str, Any], merchant: Optional[dict[str, Any]] = None) -> Optional[str]:
    """Customer-facing page for the actual offer/merchant experience."""
    for key in ("cascading_full_url", "source_url", "url"):
        url = _valid_http_url(deal.get(key))
        if url:
            return url
    if merchant:
        return _valid_http_url(merchant.get("homepage"))
    return None


def _deal_tracking_url(deal: dict[str, Any]) -> Optional[str]:
    """Network/FMT tracking URL retained for attribution, but not used as display URL."""
    for key in ("affiliate_url", "subaffiliate_url", "freshreach_url", "skimlinks_url", "fmtc_url"):
        value = str(deal.get(key) or "").strip()
        if value.startswith(("http://", "https://")):
            return value
    return None


def _best_logo(
    merchant: Optional[dict[str, Any]],
    *,
    prefer_screenshots: bool = False,
) -> Optional[str]:
    """Pick the largest merchant logo image.

    FMTC merchant `logos` often include auto-generated ``/screenshots/`` URLs that look like
    generic website captures. For **offer hero art** we deprioritize those unless nothing else exists.
    """
    if not merchant:
        return None
    logos = merchant.get("logos")
    if not isinstance(logos, list):
        return None
    best: tuple[float, str] | None = None
    for logo in logos:
        if not isinstance(logo, dict):
            continue
        url = str(logo.get("image_url") or "").strip()
        if not url.startswith(("http://", "https://")):
            continue
        width = int(_float_or_none(logo.get("width")) or 0)
        height = int(_float_or_none(logo.get("height")) or 0)
        if (width <= 0 or height <= 0) and logo.get("size"):
            parts = str(logo.get("size") or "").lower().replace("×", "x").split("x", 1)
            if len(parts) == 2:
                width = int(_float_or_none(parts[0]) or 0)
                height = int(_float_or_none(parts[1]) or 0)
        score = float(width * height)
        lower = url.lower()
        is_shot = "/screenshots/" in lower or "screenshot" in lower
        if prefer_screenshots:
            if is_shot:
                score += 1_000_000.0
        else:
            if is_shot:
                score *= 0.01
        if best is None or score > best[0]:
            best = (score, url)
    return best[1] if best else None


def _append_unique_urls(bucket: list[str], raw: Any) -> None:
    if isinstance(raw, str):
        u = raw.strip()
        if u.startswith(("http://", "https://")) and u not in bucket:
            bucket.append(u)
        return
    if isinstance(raw, list):
        for x in raw:
            _append_unique_urls(bucket, x)
        return
    if isinstance(raw, dict):
        for key in (
            "image_url",
            "url",
            "src",
            "href",
            "large",
            "medium",
            "small",
            "thumbnail",
            "banner",
            "full",
        ):
            _append_unique_urls(bucket, raw.get(key))


def _deal_media_urls(deal: dict[str, Any]) -> list[str]:
    """Collect explicit creative / photo URLs from the deal payload (FMTC varies by advertiser)."""
    out: list[str] = []
    for key in (
        "image",
        "images",
        "coupon_image",
        "banner_image",
        "thumbnail_url",
        "creative_image",
        "secondary_image",
        "picture",
        "pictures",
        "photos",
        "gallery",
        "deal_images",
        "creative_images",
        "creatives",
    ):
        _append_unique_urls(out, deal.get(key))
    meta = deal.get("metadata")
    if isinstance(meta, dict):
        for mk in ("image", "images", "banner", "creative_url", "photo"):
            _append_unique_urls(out, meta.get(mk))
    return out


def _visual_for_deal(deal: dict[str, Any], merchant: Optional[dict[str, Any]]) -> tuple[Optional[str], list[str]]:
    """Primary hero URL plus ordered gallery (deal creatives first, then merchant logo fallback)."""
    media = _deal_media_urls(deal)
    primary = media[0] if media else None
    if not primary:
        primary = _best_logo(merchant, prefer_screenshots=False)
        return primary, ([primary] if primary else [])
    return primary, media[:12]


def _image_for_deal(deal: dict[str, Any], merchant: Optional[dict[str, Any]]) -> Optional[str]:
    hero, _gallery = _visual_for_deal(deal, merchant)
    return hero


def _discount_label(deal: dict[str, Any]) -> str:
    percent = _float_or_none(deal.get("percent")) or 0
    if percent > 0:
        return f"{round(percent):g}% off"
    discount = _money_or_none(deal.get("discount"))
    if discount:
        return f"${discount:g} off"
    code = str(deal.get("code") or "").strip()
    if code:
        return f"Code {code}"
    types = " ".join(str(t or "").lower() for t in (deal.get("types") or []))
    if "shipping" in types:
        return "Shipping offer"
    sale = _money_or_none(deal.get("sale_price"))
    if sale:
        return f"From ${sale:g}"
    return "Online deal"


def _fetch_json(client: httpx.Client, path: str) -> dict[str, Any]:
    r = client.get(f"{FMTC_API_BASE_URL}/{path.lstrip('/')}", params={"api_token": FMTC_API_TOKEN})
    r.raise_for_status()
    payload = r.json()
    return payload if isinstance(payload, dict) else {}


def _load_feed() -> tuple[list[dict[str, Any]], dict[str, dict[str, Any]]]:
    if not FMTC_API_TOKEN:
        return [], {}
    now = time.time()
    if now < float(_cache.get("expires") or 0):
        return list(_cache.get("deals") or []), dict(_cache.get("merchants") or {})
    try:
        with httpx.Client(timeout=18.0, headers={"Accept": "application/json"}) as client:
            deals_payload = _fetch_json(client, "deals")
            merchants_payload = _fetch_json(client, "deals-merchants")
    except Exception as exc:
        logger.warning("FMTC feed fetch failed: %s", exc, exc_info=True)
        return list(_cache.get("deals") or []), dict(_cache.get("merchants") or {})

    deals = [d for d in (deals_payload.get("data") or []) if isinstance(d, dict)]
    merchants: dict[str, dict[str, Any]] = {}
    for row in (merchants_payload.get("data") or []):
        if not isinstance(row, dict):
            continue
        mid = str(row.get("id") or row.get("merchant_id") or "").strip()
        if mid:
            merchants[mid] = row
    _cache.update({"expires": now + FMTC_CACHE_SECONDS, "deals": deals, "merchants": merchants})
    return deals, merchants


def _merchant_for_deal(deal: dict[str, Any], merchants: dict[str, dict[str, Any]]) -> Optional[dict[str, Any]]:
    mid = str(deal.get("merchant_id") or "").strip()
    return merchants.get(mid)


def _normalized_domain_and_description(item: dict[str, Any]) -> tuple[str, str]:
    domain = str(item.get("merchant_domain") or item.get("merchant_name") or "").strip().lower()
    desc_src = str(item.get("description") or "").strip().lower()
    if not desc_src:
        desc_src = str(item.get("title") or "").strip().lower()
    return domain, " ".join(desc_src.split())


def _dedupe_online_items(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """One listing per retailer when copy matches; distinct descriptions stay separate."""

    def rank(it: dict[str, Any]) -> tuple[float, float, int, float]:
        featured = 1.0 if it.get("featured") else 0.0
        sale = float(_money_or_none(it.get("sale_price")) or 0)
        regular = float(_money_or_none(it.get("regular_price")) or 0)
        savings = regular - sale if regular > 0 and sale > 0 and regular > sale else 0.0
        imgs = it.get("image_urls") if isinstance(it.get("image_urls"), list) else []
        img_ct = len(imgs)
        return (featured, savings, float(img_ct), sale)

    scored = sorted(items, key=rank, reverse=True)
    seen: set[tuple[str, str]] = set()
    out: list[dict[str, Any]] = []
    for it in scored:
        dom, desc = _normalized_domain_and_description(it)
        site_key = dom or str(it.get("id") or "")
        fingerprint = (site_key, desc)
        if fingerprint in seen:
            continue
        seen.add(fingerprint)
        out.append(it)
    return out


def _deal_to_online_item(deal: dict[str, Any], merchant: Optional[dict[str, Any]]) -> dict[str, Any]:
    category_slug, category_label = _best_category(deal)
    source_url = _deal_destination_url(deal, merchant)
    tracking_url = _deal_tracking_url(deal)
    merchant_domain = _domain_from_url(source_url) or _domain_from_url(str(merchant.get("homepage") or "") if merchant else None)
    sale = _money_or_none(deal.get("sale_price"))
    regular = _money_or_none(deal.get("was_price"))
    percent = _float_or_none(deal.get("percent")) or 0
    hero, gallery = _visual_for_deal(deal, merchant)
    return {
        "id": f"fmtc_{deal.get('id')}",
        "title": str(deal.get("label") or deal.get("merchant_name") or "Online deal").strip(),
        "description": str(deal.get("description") or "").strip() or None,
        "merchant_name": str(deal.get("merchant_name") or (merchant or {}).get("name") or "").strip() or None,
        "merchant_domain": merchant_domain,
        "category_slug": category_slug,
        "category_label": category_label,
        "discount_label": _discount_label(deal),
        "image_url": hero,
        "image_urls": gallery,
        "expires_at": deal.get("end_date"),
        "affiliate_url": source_url,
        "affiliate_tracking_url": tracking_url,
        "source_url": source_url,
        "regular_price": regular,
        "sale_price": sale,
        "currency": "USD",
        "asin": None,
        "featured": bool(percent >= 20 or sale or hero),
    }


def _address_from_location(loc: dict[str, Any]) -> Optional[str]:
    direct = str(loc.get("address") or loc.get("formatted_address") or "").strip()
    if direct:
        return direct
    parts = [
        loc.get("address1") or loc.get("street") or loc.get("street_address"),
        loc.get("address2"),
        loc.get("city"),
        loc.get("state") or loc.get("region"),
        loc.get("zip") or loc.get("postal_code"),
        loc.get("country"),
    ]
    joined = ", ".join(str(p).strip() for p in parts if str(p or "").strip())
    return joined or None


def _locations_for_deal(deal: dict[str, Any]) -> list[dict[str, Any]]:
    locations = deal.get("locations") or []
    return [loc for loc in locations if isinstance(loc, dict)] if isinstance(locations, list) else []


def _deal_to_local_offers(deal: dict[str, Any], merchant: Optional[dict[str, Any]]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    category_slug, category_label = _best_category(deal, local=True)
    percent = int(round(_float_or_none(deal.get("percent")) or 0))
    destination_url = _deal_destination_url(deal, merchant)
    tracking_url = _deal_tracking_url(deal)
    for idx, loc in enumerate(_locations_for_deal(deal)):
        lat = _float_or_none(loc.get("lat") or loc.get("latitude"))
        lng = _float_or_none(loc.get("lng") or loc.get("lon") or loc.get("longitude"))
        address = _address_from_location(loc)
        if lat is None or lng is None or not address:
            continue
        loc_id = str(loc.get("id") or loc.get("location_id") or idx)
        out.append(
            {
                "id": f"fmtc_{deal.get('id')}_{loc_id}",
                "business_name": str(deal.get("merchant_name") or (merchant or {}).get("name") or "Partner").strip(),
                "title": str(deal.get("label") or "Local deal").strip(),
                "description": str(deal.get("description") or deal.get("label") or "").strip(),
                "discount_percent": percent,
                "premium_discount_percent": percent,
                "free_discount_percent": percent,
                "gem_cost": 0,
                "gems_reward": 0,
                "base_gems": 0,
                "address": address,
                "image_url": _image_for_deal(deal, merchant),
                "lat": lat,
                "lng": lng,
                "business_type": category_slug,
                "category_label": category_label,
                "offer_url": destination_url,
                "affiliate_tracking_url": tracking_url,
                "expires_at": deal.get("end_date"),
                "is_admin_offer": True,
                "created_by": "fmtc",
                "redemption_count": 0,
                "views": 0,
                "redeemed": False,
                "favorited": False,
                "offer_source": "fmtc",
                "offer_type": "admin",
                "external_id": str(deal.get("id") or ""),
            }
        )
    return out


def fetch_fmtc_online_catalog(*, category_slug: Optional[str] = None, cursor: Optional[str] = None) -> dict[str, Any]:
    deals, merchants = _load_feed()
    active = [d for d in deals if _is_active_deal(d)]
    items = [_deal_to_online_item(d, _merchant_for_deal(d, merchants)) for d in active]
    items = _dedupe_online_items(items)
    if category_slug:
        items = [it for it in items if str(it.get("category_slug") or "") == category_slug]
    offset = _decode_cursor(cursor)
    page = items[offset : offset + PAGE_SIZE]
    next_offset = offset + len(page)
    categories = _category_summary(items)
    return {
        "items": page,
        "categories": categories,
        "next_cursor": _encode_cursor(next_offset) if next_offset < len(items) else None,
        "provider": "fmtc",
    }


def fetch_fmtc_local_offers(*, limit: int = 500) -> list[dict[str, Any]]:
    deals, merchants = _load_feed()
    out: list[dict[str, Any]] = []
    for deal in deals:
        if not _is_active_deal(deal):
            continue
        out.extend(_deal_to_local_offers(deal, _merchant_for_deal(deal, merchants)))
        if len(out) >= limit:
            break
    return out[:limit]


def resolve_fmtc_local_offer(offer_id: str) -> Optional[dict[str, Any]]:
    if not str(offer_id).startswith("fmtc_"):
        return None
    for offer in fetch_fmtc_local_offers(limit=1000):
        if str(offer.get("id")) == str(offer_id):
            return offer
    return None


def _category_summary(items: list[dict[str, Any]]) -> list[dict[str, str]]:
    buckets: dict[str, dict[str, str]] = {}
    for item in items:
        slug = str(item.get("category_slug") or "other")
        label = str(item.get("category_label") or _humanize_slug(slug))
        if slug not in buckets:
            buckets[slug] = {"slug": slug, "label": label, "count": "0"}
        buckets[slug]["count"] = str(int(buckets[slug]["count"]) + 1)
    return sorted(buckets.values(), key=lambda row: row["label"].lower())


__all__ = [
    "fetch_fmtc_local_offers",
    "fetch_fmtc_online_catalog",
    "resolve_fmtc_local_offer",
]

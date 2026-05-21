"""
Supabase DAO for the `online_offers` table.

Kept separate from `services/supabase_service.py` so the new admin paste-link
flow doesn't bloat the central DAO. Mirrors the conventions there:
`_sb()` returns a Supabase client, errors are logged and swallowed so route
handlers can decide whether to 5xx or fall back to placeholder data.
"""

from __future__ import annotations

import logging
import re
from datetime import datetime, timezone
from typing import Any, Optional
from urllib.parse import urlparse

from services.supabase_service import _sb, _table_missing

logger = logging.getLogger(__name__)


_VALID_STATUSES = {"active", "inactive", "draft"}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _parse_dt(value: Any) -> Optional[datetime]:
    if not value:
        return None
    try:
        d = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        if d.tzinfo is None:
            d = d.replace(tzinfo=timezone.utc)
        return d.astimezone(timezone.utc)
    except Exception:
        return None


def _row_is_unexpired(row: dict[str, Any]) -> bool:
    exp = _parse_dt(row.get("expires_at"))
    return exp is None or exp > datetime.now(timezone.utc)


def _coerce_price(v: Any) -> Optional[float]:
    if v is None or v == "":
        return None
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    return f if f >= 0 else None


def _normalise_status(value: Optional[str]) -> str:
    if not value:
        return "active"
    s = value.strip().lower()
    return s if s in _VALID_STATUSES else "active"


def _category_label_for_slug(slug: Optional[str], fallback: Optional[str]) -> Optional[str]:
    if fallback:
        return fallback
    if not slug:
        return None
    return slug.replace("_", " ").replace("-", " ").title()


def _autodetect_discount_label(regular: Optional[float], sale: Optional[float]) -> Optional[str]:
    if regular is None or sale is None:
        return None
    if regular <= 0 or sale <= 0 or sale >= regular:
        return None
    pct = round((1.0 - (sale / regular)) * 100.0)
    if pct <= 0:
        return None
    return f"{pct}% off"


def _normalize_image_urls(value: Any, hero: Optional[str] = None) -> list[str]:
    out: list[str] = []
    if isinstance(value, list):
        for u in value:
            s = str(u or "").strip()
            if s.startswith(("http://", "https://")) and s not in out:
                out.append(s)
    hero_s = str(hero or "").strip()
    if hero_s.startswith(("http://", "https://")) and hero_s not in out:
        out.insert(0, hero_s)
    return out[:12]


def _image_urls_from_row(row: dict[str, Any]) -> list[str]:
    raw = row.get("image_urls")
    if isinstance(raw, list):
        return _normalize_image_urls(raw, row.get("image_url"))
    meta = row.get("raw_metadata")
    if isinstance(meta, dict) and isinstance(meta.get("image_urls"), list):
        return _normalize_image_urls(meta.get("image_urls"), row.get("image_url"))
    hero = row.get("image_url")
    hero_s = str(hero).strip() if hero else ""
    return [hero_s] if hero_s.startswith(("http://", "https://")) else []


def _row_to_item(row: dict[str, Any]) -> dict[str, Any]:
    """
    Translate a `online_offers` DB row into the `OnlineOfferItem` shape the
    mobile app already parses (`app/mobile/src/api/dto/offers.ts`). New fields
    (`regular_price`, `sale_price`, `currency`, `source_url`) are additive and
    older clients ignore them safely.
    """
    regular = _coerce_price(row.get("regular_price"))
    sale = _coerce_price(row.get("sale_price"))
    discount_label = (row.get("discount_label") or "").strip() or _autodetect_discount_label(regular, sale)
    affiliate_url = (row.get("affiliate_url") or "").strip() or (row.get("source_url") or "").strip() or None
    hero = row.get("image_url")
    hero_s = str(hero).strip() if hero else ""
    gallery = _image_urls_from_row(row)
    if hero_s.startswith(("http://", "https://")) and hero_s not in gallery:
        gallery.insert(0, hero_s)
    elif not hero_s and gallery:
        hero_s = gallery[0]
    return {
        "id": str(row.get("id") or ""),
        "title": row.get("title") or "Offer",
        "description": row.get("description"),
        "merchant_name": row.get("merchant_name"),
        "merchant_domain": row.get("merchant_domain"),
        "category_slug": row.get("category_slug"),
        "category_label": _category_label_for_slug(row.get("category_slug"), row.get("category_label")),
        "discount_label": discount_label,
        "image_url": hero_s or None,
        "image_urls": gallery if gallery else [],
        "expires_at": row.get("expires_at"),
        "affiliate_url": affiliate_url,
        "source_url": row.get("source_url"),
        "regular_price": regular,
        "sale_price": sale,
        "currency": row.get("currency") or "USD",
        "asin": row.get("asin"),
        "featured": bool(row.get("featured")),
    }


_AMAZON_DOMAIN_RE = re.compile(r"(?:^|\.)amazon\.[a-z.]{2,8}$", re.IGNORECASE)


def _looks_like_amazon_domain(domain: Optional[str]) -> bool:
    if not domain:
        return False
    d = domain.lower()
    if d in {"amzn.to", "a.co", "amzn.com"}:
        return True
    return bool(_AMAZON_DOMAIN_RE.search(d))


def _domain_from_url(url: Optional[str]) -> Optional[str]:
    if not url:
        return None
    try:
        h = (urlparse(url).hostname or "").lower()
    except Exception:
        return None
    if not h:
        return None
    return h[4:] if h.startswith("www.") else h


def _row_payload_from_upsert(payload: dict[str, Any], created_by: str = "admin") -> dict[str, Any]:
    """
    Whitelisted insert payload. Untrusted fields (e.g. `id`, `created_at`) are
    dropped so admin clients can't override server-managed columns.
    """
    domain = (payload.get("merchant_domain") or "").strip() or _domain_from_url(payload.get("source_url"))
    return {
        "source_url": (payload.get("source_url") or "").strip(),
        "affiliate_url": (payload.get("affiliate_url") or "").strip() or None,
        "asin": (payload.get("asin") or "").strip().upper() or None,
        "title": (payload.get("title") or "").strip() or "Offer",
        "description": (payload.get("description") or "").strip() or None,
        "merchant_name": (payload.get("merchant_name") or "").strip() or None,
        "merchant_domain": domain or None,
        "image_url": (payload.get("image_url") or "").strip() or None,
        "image_urls": _normalize_image_urls(payload.get("image_urls"), payload.get("image_url")),
        "regular_price": _coerce_price(payload.get("regular_price")),
        "sale_price": _coerce_price(payload.get("sale_price")),
        "currency": (payload.get("currency") or "USD").strip().upper() or "USD",
        "discount_label": (payload.get("discount_label") or "").strip() or None,
        "category_slug": (payload.get("category_slug") or "").strip() or None,
        "category_label": (payload.get("category_label") or "").strip() or None,
        "featured": bool(payload.get("featured")),
        "status": _normalise_status(payload.get("status")),
        "expires_at": payload.get("expires_at"),
        "raw_metadata": payload.get("raw_metadata"),
        "created_by": created_by,
        "updated_at": _now_iso(),
    }


def create_online_offer(payload: dict[str, Any], *, created_by: str = "admin") -> Optional[dict[str, Any]]:
    row = _row_payload_from_upsert(payload, created_by=created_by)
    if not row["source_url"]:
        logger.warning("create_online_offer: source_url required")
        return None
    try:
        sb = _sb()
        ins = sb.table("online_offers").insert(row).execute()
        rows = ins.data or []
        return rows[0] if rows else None
    except Exception as e:
        if not _table_missing(e):
            logger.error("create_online_offer: %s", e, exc_info=True)
        return None


def list_online_offers(
    *,
    status: Optional[str] = "active",
    category_slug: Optional[str] = None,
    limit: int = 200,
    offset: int = 0,
) -> list[dict[str, Any]]:
    try:
        q = _sb().table("online_offers").select("*")
        if status and status != "all":
            q = q.eq("status", status)
        if category_slug:
            q = q.eq("category_slug", category_slug)
        # Featured first, then newest. Supabase Python builder chains `.order(...)`.
        q = q.order("featured", desc=True).order("created_at", desc=True)
        fetch_limit = min(1000, max(limit, offset + limit + 200))
        q = q.range(0, max(0, fetch_limit - 1))
        rows = q.execute().data or []
        active_rows = [r for r in rows if _row_is_unexpired(r)]
        return active_rows[offset : offset + limit]
    except Exception as e:
        if not _table_missing(e):
            logger.error("list_online_offers: %s", e, exc_info=True)
        return []


def count_online_offers(*, status: Optional[str] = "active", category_slug: Optional[str] = None) -> int:
    try:
        q = _sb().table("online_offers").select("id, expires_at")
        if status and status != "all":
            q = q.eq("status", status)
        if category_slug:
            q = q.eq("category_slug", category_slug)
        res = q.execute()
        return len([r for r in (res.data or []) if _row_is_unexpired(r)])
    except Exception as e:
        if not _table_missing(e):
            logger.warning("count_online_offers: %s", e)
        return 0


def get_online_offer(offer_id: str) -> Optional[dict[str, Any]]:
    try:
        res = _sb().table("online_offers").select("*").eq("id", offer_id).limit(1).execute()
        rows = res.data or []
        return rows[0] if rows else None
    except Exception as e:
        if not _table_missing(e):
            logger.error("get_online_offer: %s", e, exc_info=True)
        return None


def update_online_offer(offer_id: str, patch: dict[str, Any]) -> Optional[dict[str, Any]]:
    fields: dict[str, Any] = {}
    allowed = {
        "affiliate_url", "title", "description", "merchant_name", "merchant_domain",
        "image_url", "image_urls", "regular_price", "sale_price", "currency", "discount_label",
        "category_slug", "category_label", "featured", "status", "expires_at",
    }
    for k, v in (patch or {}).items():
        if k not in allowed:
            continue
        if k == "image_urls":
            fields[k] = _normalize_image_urls(v, patch.get("image_url"))
            continue
        if k in {"regular_price", "sale_price"}:
            fields[k] = _coerce_price(v)
        elif k == "status":
            fields[k] = _normalise_status(v)
        elif isinstance(v, str):
            fields[k] = v.strip() or None
        else:
            fields[k] = v
    if not fields:
        return get_online_offer(offer_id)
    fields["updated_at"] = _now_iso()
    try:
        res = _sb().table("online_offers").update(fields).eq("id", offer_id).execute()
        rows = res.data or []
        return rows[0] if rows else get_online_offer(offer_id)
    except Exception as e:
        if not _table_missing(e):
            logger.error("update_online_offer: %s", e, exc_info=True)
        return None


def delete_online_offer(offer_id: str) -> bool:
    try:
        _sb().table("online_offers").delete().eq("id", offer_id).execute()
        return True
    except Exception as e:
        if not _table_missing(e):
            logger.error("delete_online_offer: %s", e, exc_info=True)
        return False


def resync_online_offer_images(
    offer_id: str,
    *,
    scraped: dict[str, Any],
) -> Optional[dict[str, Any]]:
    """Persist scraper output (hero + gallery + optional prices) for one offer."""
    patch: dict[str, Any] = {}
    hero = scraped.get("image_url")
    gallery = scraped.get("image_urls") if isinstance(scraped.get("image_urls"), list) else []
    if hero:
        patch["image_url"] = hero
    if gallery:
        patch["image_urls"] = _normalize_image_urls(gallery, hero)
    for key in ("title", "description", "regular_price", "sale_price", "currency"):
        if scraped.get(key) is not None:
            patch[key] = scraped[key]
    if not patch:
        return get_online_offer(offer_id)
    return update_online_offer(offer_id, patch)


def resync_all_online_offer_images(*, limit: int = 200) -> dict[str, int]:
    """Scrape every active admin offer and persist improved product imagery."""
    from services.offer_product_scraper import item_needs_image_rescrape, scrape_product_page

    rows = list_online_offers(status="active", limit=min(limit, 500), offset=0)
    updated = 0
    skipped = 0
    failed = 0
    for row in rows:
        item = _row_to_item(row)
        if not item_needs_image_rescrape(item):
            skipped += 1
            continue
        url = (row.get("source_url") or row.get("affiliate_url") or "").strip()
        if not url:
            failed += 1
            continue
        scraped = scrape_product_page(url)
        if not scraped or not scraped.get("image_url"):
            failed += 1
            continue
        oid = str(row.get("id") or "")
        if oid and resync_online_offer_images(oid, scraped=scraped):
            updated += 1
        else:
            failed += 1
    return {"updated": updated, "skipped": skipped, "failed": failed, "total": len(rows)}


__all__ = [
    "create_online_offer",
    "list_online_offers",
    "count_online_offers",
    "get_online_offer",
    "update_online_offer",
    "delete_online_offer",
    "resync_online_offer_images",
    "resync_all_online_offer_images",
    "_row_to_item",
    "_looks_like_amazon_domain",
    "_domain_from_url",
]

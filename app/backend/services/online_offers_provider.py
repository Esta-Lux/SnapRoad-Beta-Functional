"""
Online / affiliate-style offers feed for the driver app Offers tab.

The mobile app should only show admin-published offers from `online_offers`, or
an explicitly configured partner JSON feed. Empty catalogs stay empty so launch
builds never leak mock merchant content.
"""

from __future__ import annotations

import base64
import json
import logging
import os
from typing import Any, Optional

import httpx

logger = logging.getLogger(__name__)

ONLINE_OFFERS_PROVIDER = (os.environ.get("ONLINE_OFFERS_PROVIDER") or "admin").strip().lower()
ONLINE_OFFERS_API_KEY = (os.environ.get("ONLINE_OFFERS_API_KEY") or "").strip()
ONLINE_OFFERS_API_BASE_URL = (os.environ.get("ONLINE_OFFERS_API_BASE_URL") or "").strip().rstrip("/")
FMTC_API_TOKEN = (os.environ.get("FMTC_API_TOKEN") or "").strip()

PAGE_SIZE = 12


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


def _empty_catalog(*, provider: str) -> dict[str, Any]:
    return {
        "items": [],
        "categories": [],
        "next_cursor": None,
        "provider": provider,
    }


def _http_json_catalog(*, category_slug: Optional[str], cursor: Optional[str]) -> dict[str, Any]:
    if not ONLINE_OFFERS_API_BASE_URL:
        logger.warning("ONLINE_OFFERS_PROVIDER=http_json but ONLINE_OFFERS_API_BASE_URL is empty; returning empty catalog")
        return _empty_catalog(provider="http_json_unconfigured")

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
        return _empty_catalog(provider="http_json_error")

    if isinstance(payload, dict) and payload.get("items") is not None:
        payload.setdefault("provider", "http_json")
        return payload
    if isinstance(payload, dict) and isinstance(payload.get("data"), dict):
        inner = payload["data"]
        if isinstance(inner, dict) and inner.get("items") is not None:
            inner.setdefault("provider", "http_json")
            return inner

    logger.warning("online offers http_json: unexpected shape; returning empty catalog")
    return _empty_catalog(provider="http_json_invalid")


def _db_catalog(*, category_slug: Optional[str], cursor: Optional[str]) -> Optional[dict[str, Any]]:
    """
    Read admin-published offers from `online_offers`. Returns None if there are
    no rows so an explicitly configured partner feed can still serve content.
    """
    try:
        from services.online_offers_db import list_online_offers, count_online_offers, _row_to_item
    except Exception as exc:
        logger.debug("online_offers_db import failed: %s", exc)
        return None

    try:
        total = count_online_offers(status="active", category_slug=category_slug)
    except Exception:
        total = 0
    if not total:
        return None

    offset = _decode_cursor(cursor)
    rows = list_online_offers(status="active", category_slug=category_slug, limit=PAGE_SIZE, offset=offset)
    if not rows and offset > 0:
        offset = 0
        rows = list_online_offers(status="active", category_slug=category_slug, limit=PAGE_SIZE, offset=offset)
    items = [_row_to_item(r) for r in rows]
    end = offset + len(items)
    next_cursor = _encode_cursor(end) if end < total else None

    try:
        all_active = list_online_offers(status="active", limit=500, offset=0)
        cats = _category_summary([_row_to_item(r) for r in all_active])
    except Exception:
        cats = []

    return {
        "items": items,
        "categories": cats,
        "next_cursor": next_cursor,
        "provider": "supabase_online_offers",
    }


def fetch_online_catalog(*, category_slug: Optional[str] = None, cursor: Optional[str] = None) -> dict[str, Any]:
    """
    Returns a dict:
      items: list[offer-like dict]
      categories: [{slug, label, count}]
      next_cursor: str | None
      provider: str

    Resolution order:
      1. `online_offers` Supabase table (admin paste-link publishes go here).
      2. FMTC, when `ONLINE_OFFERS_PROVIDER=fmtc` or `FMTC_API_TOKEN` is set.
      3. `ONLINE_OFFERS_PROVIDER=http_json` partner JSON proxy.
      4. Empty catalog.
    """
    db = _db_catalog(category_slug=category_slug, cursor=cursor)
    if db is not None:
        return db

    prov = ONLINE_OFFERS_PROVIDER
    if prov == "fmtc" or FMTC_API_TOKEN:
        try:
            from services.fmtc_offers_provider import fetch_fmtc_online_catalog

            return fetch_fmtc_online_catalog(category_slug=category_slug, cursor=cursor)
        except Exception as exc:
            logger.warning("FMTC online offers provider failed: %s", exc, exc_info=True)
            return _empty_catalog(provider="fmtc_error")

    if prov == "http_json":
        return _http_json_catalog(category_slug=category_slug, cursor=cursor)
    if prov in ("", "admin", "supabase", "disabled", "none", "placeholder", "mock", "static"):
        return _empty_catalog(provider="admin_online_offers")

    logger.warning("unknown ONLINE_OFFERS_PROVIDER=%r; returning empty catalog", prov)
    return _empty_catalog(provider="admin_online_offers")

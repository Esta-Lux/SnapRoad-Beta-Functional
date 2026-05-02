"""
Best-effort enrichment of offer rows with Google Places photo references.

Uses GOOGLE_PLACES_API_KEY server-side. Clients should load images via
GET /api/places/photo?ref=... so the key stays off the device.
"""

from __future__ import annotations

import logging
import os
import threading
from typing import Any, Optional

import httpx

logger = logging.getLogger(__name__)

_BASE = "https://maps.googleapis.com/maps/api/place"
_DETAILS_FIELDS = "photos"

_memory_lock = threading.Lock()
_photo_ref_cache: dict[str, Optional[str]] = {}


def _key() -> str:
    return (os.environ.get("GOOGLE_PLACES_API_KEY") or "").strip()


def sync_first_photo_reference(place_id: str) -> Optional[str]:
    pid = (place_id or "").strip()
    if not pid:
        return None
    key = _key()
    if not key:
        return None

    with _memory_lock:
        if pid in _photo_ref_cache:
            return _photo_ref_cache[pid]

    url = f"{_BASE}/details/json"
    params = {"place_id": pid, "fields": _DETAILS_FIELDS, "key": key, "language": "en"}
    try:
        with httpx.Client(timeout=8.0) as client:
            r = client.get(url, params=params)
            data = r.json()
    except Exception as exc:
        logger.debug("place details for photo failed: %s", exc, exc_info=True)
        with _memory_lock:
            _photo_ref_cache[pid] = None
        return None

    if data.get("status") != "OK":
        with _memory_lock:
            _photo_ref_cache[pid] = None
        return None
    result = data.get("result") or {}
    photos = result.get("photos") or []
    ref = None
    if photos and isinstance(photos[0], dict):
        ref = photos[0].get("photo_reference")
    ref_s = str(ref).strip() if ref else ""
    out: Optional[str] = ref_s if ref_s else None

    with _memory_lock:
        _photo_ref_cache[pid] = out
    return out


def enrich_offers_with_place_photo_references(offers: list[dict[str, Any]], *, max_calls: int = 24) -> None:
    """
    Mutates each offer dict with `place_photo_reference` when `google_place_id` is present.
    Caps outbound Google calls per request to protect latency and quotas.
    """
    if not _key():
        return
    used = 0
    for o in offers:
        if used >= max_calls:
            break
        pid = o.get("google_place_id")
        if not pid or not isinstance(pid, str) or not pid.strip():
            continue
        if o.get("place_photo_reference"):
            continue
        ref = sync_first_photo_reference(pid.strip())
        used += 1
        if ref:
            o["place_photo_reference"] = ref

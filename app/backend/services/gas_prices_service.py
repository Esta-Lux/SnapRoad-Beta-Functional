"""
CollectAPI US average gas prices by state — cached server-side (key never exposed to clients).
Docs: GET https://api.collectapi.com/gasPrice/allUsaPrice — header authorization: apikey <token>
"""
from __future__ import annotations

import logging
import threading
import time
from typing import Any

import httpx

from config import COLLECTAPI_KEY
from services.us_state_centroids import centroid_for_state_name

logger = logging.getLogger(__name__)

_COLLECT_URL = "https://api.collectapi.com/gasPrice/allUsaPrice"
_CACHE_LOCK = threading.Lock()
_cache_mono_until: float = 0.0
_cached_rows: list[dict[str, Any]] = []
_DEFAULT_TTL_SEC = 6 * 3600
_ERROR_COOLDOWN_SEC = 120


def _as_price_str(v: Any) -> str | None:
    if v is None:
        return None
    s = str(v).strip()
    return s or None


def fetch_us_state_gas_prices() -> tuple[list[dict[str, Any]], str | None]:
    """
    Return (rows, error_hint). Rows are map-ready: id, state, lat, lng, currency, regular, midGrade, premium, diesel.
    """
    global _cache_mono_until, _cached_rows

    now = time.monotonic()
    with _CACHE_LOCK:
        if COLLECTAPI_KEY and _cache_mono_until > now and _cached_rows:
            return list(_cached_rows), None

    key = (COLLECTAPI_KEY or "").strip()
    if not key:
        with _CACHE_LOCK:
            _cache_mono_until = now + 300
            _cached_rows = []
        return [], "gas_prices_unconfigured"

    headers = {
        "authorization": f"apikey {key}",
        "content-type": "application/json",
    }
    try:
        with httpx.Client(timeout=15.0) as client:
            resp = client.get(_COLLECT_URL, headers=headers)
            resp.raise_for_status()
            body = resp.json()
    except Exception as exc:
        logger.warning("CollectAPI gas prices request failed: %s", exc)
        with _CACHE_LOCK:
            _cache_mono_until = now + _ERROR_COOLDOWN_SEC
        return [], "gas_prices_upstream_error"

    if not isinstance(body, dict) or not body.get("success"):
        logger.warning("CollectAPI gas prices bad envelope: %s", body)
        with _CACHE_LOCK:
            _cache_mono_until = now + _ERROR_COOLDOWN_SEC
        return [], "gas_prices_upstream_error"

    raw_list = body.get("result")
    if not isinstance(raw_list, list):
        with _CACHE_LOCK:
            _cache_mono_until = now + _ERROR_COOLDOWN_SEC
        return [], "gas_prices_bad_shape"

    out: list[dict[str, Any]] = []
    for idx, row in enumerate(raw_list):
        if not isinstance(row, dict):
            continue
        nm = row.get("name") or row.get("state")
        if not nm:
            continue
        name_str = str(nm).strip()
        coord = centroid_for_state_name(name_str)
        if not coord:
            continue
        lat, lng = coord
        sid = name_str.lower().replace(" ", "-")
        out.append(
            {
                "id": f"gas-{sid}",
                "state": name_str,
                "lat": lat,
                "lng": lng,
                "currency": str(row.get("currency") or "usd").lower(),
                "regular": _as_price_str(row.get("regular")),
                "midGrade": _as_price_str(row.get("midGrade")),
                "premium": _as_price_str(row.get("premium")),
                "diesel": _as_price_str(row.get("diesel")),
            }
        )

    with _CACHE_LOCK:
        _cached_rows = out
        _cache_mono_until = now + _DEFAULT_TTL_SEC

    return out, None

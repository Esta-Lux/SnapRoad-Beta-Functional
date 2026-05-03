"""
CollectAPI US average gas prices by state — cached server-side (key never exposed to clients).
Docs: GET https://api.collectapi.com/gasPrice/allUsaPrice — header authorization: apikey <token>
"""
from __future__ import annotations

import logging
import re
import threading
import time
from typing import Any

from config import COLLECTAPI_KEY
from services.gas_collectapi_http import get_collect_gas_json
from services.us_state_centroids import canonical_state_name_for_centroid, centroid_for_state_name

logger = logging.getLogger(__name__)

_CACHE_LOCK = threading.Lock()
_cache_mono_until: float = 0.0
_cached_rows: list[dict[str, Any]] = []
_cached_error: str | None = None
_DEFAULT_TTL_SEC = 6 * 3600
_ERROR_COOLDOWN_SEC = 120
_MISMATCH_COOLDOWN_SEC = 15 * 60
_EMPTY_BODY_TTL_SEC = 3600


def _normalize_collectapi_key(raw: str) -> str:
    key = (raw or "").strip()
    lower = key.lower()
    if lower.startswith("authorization:"):
        key = key.split(":", 1)[1].strip()
        lower = key.lower()
    for prefix in ("apikey ", "bearer "):
        if lower.startswith(prefix):
            return key.split(" ", 1)[1].strip()
    return key


def _as_price_str(v: Any) -> str | None:
    if v is None:
        return None
    s = str(v).strip()
    return s or None


def _row_lower_keys(row: dict[str, Any]) -> dict[str, Any]:
    return {str(k).lower(): v for k, v in row.items()}


def _pick_field(row_lk: dict[str, Any], *names: str) -> Any:
    for nm in names:
        if nm.lower() in row_lk:
            return row_lk[nm.lower()]
    return None


def _truthy_collect_success(body: dict[str, Any]) -> bool:
    raw = body.get("success")
    if raw is True or raw == 1:
        return True
    if isinstance(raw, str) and raw.strip().lower() in ("true", "1", "yes"):
        return True
    return False


def _extract_raw_list(body: dict[str, Any]) -> list[Any] | None:
    for key in ("result", "data", "records"):
        v = body.get(key)
        if isinstance(v, list):
            return v
    nested = body.get("data")
    if isinstance(nested, dict):
        inner = nested.get("result")
        if isinstance(inner, list):
            return inner
    return None


def _candidate_state_labels(row: dict[str, Any]) -> list[str]:
    row_lk = _row_lower_keys(row)
    values: list[Any] = []
    for k in (
        "name",
        "state",
        "statename",
        "state_name",
        "region",
        "title",
    ):
        v = _pick_field(row_lk, k)
        if v is not None:
            values.append(v)
    out: list[str] = []
    for v in values:
        s = str(v).strip()
        if s:
            out.append(s)
    return out


def _resolve_label_to_coord(labels: list[str]) -> tuple[float, float] | None:
    for label in labels:
        coord = centroid_for_state_name(label)
        if coord:
            return coord
        alnum = re.sub(r"[^A-Za-z]", "", label)
        if len(alnum) == 2:
            coord = centroid_for_state_name(alnum.upper())
            if coord:
                return coord
    return None


def fetch_us_state_gas_prices() -> tuple[list[dict[str, Any]], str | None]:
    """
    Return (rows, error_hint). Rows are map-ready: id, state, lat, lng, currency, regular, midGrade, premium, diesel.
    """
    global _cache_mono_until, _cached_rows, _cached_error

    now = time.monotonic()
    with _CACHE_LOCK:
        if _cache_mono_until > now:
            return list(_cached_rows), _cached_error

    key = _normalize_collectapi_key(COLLECTAPI_KEY or "")
    if not key:
        with _CACHE_LOCK:
            _cache_mono_until = now + 300
            _cached_rows = []
            _cached_error = "gas_prices_unconfigured"
        return [], _cached_error

    body, http_err, status = get_collect_gas_json(15.0, key)

    if http_err or body is None:
        if http_err:
            logger.warning(
                "CollectAPI gas prices unavailable (%s)%s",
                http_err,
                f" HTTP {status}" if status is not None else "",
            )
        with _CACHE_LOCK:
            _cache_mono_until = now + _ERROR_COOLDOWN_SEC
            _cached_rows = []
            _cached_error = http_err or "gas_prices_upstream_error"
        return [], _cached_error

    if not _truthy_collect_success(body):
        logger.warning(
            "CollectAPI gas prices bad envelope (keys=%s)",
            list(body.keys())[:20],
        )
        with _CACHE_LOCK:
            _cache_mono_until = now + _ERROR_COOLDOWN_SEC
            _cached_rows = []
            _cached_error = "gas_prices_upstream_error"
        return [], _cached_error

    raw_list = _extract_raw_list(body)
    if raw_list is None:
        with _CACHE_LOCK:
            _cache_mono_until = now + _ERROR_COOLDOWN_SEC
            _cached_rows = []
            _cached_error = "gas_prices_bad_shape"
        return [], _cached_error

    out: list[dict[str, Any]] = []
    for row in raw_list:
        if not isinstance(row, dict):
            continue
        row_lk = _row_lower_keys(row)
        labels = _candidate_state_labels(row)
        coord = _resolve_label_to_coord(labels)
        if not coord:
            continue
        lat, lng = coord
        state_name = canonical_state_name_for_centroid(lat, lng) or (labels[0] if labels else "Unknown")
        sid = state_name.lower().replace(" ", "-")

        currency_v = _pick_field(row_lk, "currency")
        mid_v = _pick_field(row_lk, "midgrade", "mid_grade", "midGrade", "mid")

        out.append(
            {
                "id": f"gas-{sid}",
                "state": state_name,
                "lat": lat,
                "lng": lng,
                "currency": str(currency_v or "usd").lower(),
                "regular": _as_price_str(_pick_field(row_lk, "regular")),
                "midGrade": _as_price_str(mid_v),
                "premium": _as_price_str(_pick_field(row_lk, "premium")),
                "diesel": _as_price_str(_pick_field(row_lk, "diesel")),
            },
        )
    out = list(
        {
            str(row["state"]): row
            for row in out
        }.values(),
    )

    raw_len = len(raw_list)
    out_len = len(out)

    if raw_len > 0 and out_len == 0:
        sample = raw_list[0]
        logger.warning(
            "CollectAPI gas: %s upstream rows produced 0 mapped states (centroid/name mismatch?). sample=%s",
            raw_len,
            sample if isinstance(sample, dict) else type(sample).__name__,
        )
        hint = "gas_prices_centroid_resolve"
        with _CACHE_LOCK:
            _cached_rows = []
            _cached_error = hint
            _cache_mono_until = now + _MISMATCH_COOLDOWN_SEC
        return [], hint

    hint: str | None = None if out_len > 0 else ("gas_prices_empty_upstream" if raw_len == 0 else None)
    ttl = _DEFAULT_TTL_SEC if out_len > 0 else _EMPTY_BODY_TTL_SEC

    with _CACHE_LOCK:
        _cached_rows = out
        _cached_error = hint
        _cache_mono_until = now + ttl

    return out, hint

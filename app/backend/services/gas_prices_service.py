"""
CollectAPI US average gas prices by state — cached server-side (key never exposed to clients).
Docs:
- Preferred legacy/all-states path when account supports it:
  GET https://api.collectapi.com/gasPrice/allUsaPrice
- Documented state path fallback:
  GET https://api.collectapi.com/gasPrice/stateUsaPrice?state=WA
"""
from __future__ import annotations

import logging
import re
import threading
import time
from typing import Any

from config import get_collectapi_key
from services.gas_collectapi_http import get_collect_gas_json, get_collect_state_gas_json
from services.us_state_abbr import US_STATE_ABBREV_TO_NAME
from services.us_state_centroids import canonical_state_name_for_centroid, centroid_for_state_name

logger = logging.getLogger(__name__)

_CACHE_LOCK = threading.Lock()
_cache_mono_until: float = 0.0
_cached_rows: list[dict[str, Any]] = []
_cached_error: str | None = None
_DEFAULT_TTL_SEC = 6 * 3600
_ERROR_COOLDOWN_SEC = 120
# CollectAPI free tiers 429 easily; do not retry the whole pipeline for a long beat.
_RATE_LIMIT_COOLDOWN_SEC = 30 * 60
_MISMATCH_COOLDOWN_SEC = 15 * 60
_EMPTY_BODY_TTL_SEC = 3600
_STATE_ENDPOINT_TIMEOUT_SEC = 8.0
_AUTH_ERRORS = {
    "gas_prices_collectapi_unauthorized",
    "gas_prices_collectapi_forbidden",
}
# Never chain more HTTP after these — e.g. 429 + 50-state fallback was hundreds of calls.
_ERR_RATE_LIMITED = "gas_prices_collectapi_rate_limited"
_STOP_UPSTREAM_ERRORS = frozenset({_ERR_RATE_LIMITED})


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
        if isinstance(v, dict):
            state = v.get("state")
            if isinstance(state, dict):
                return [state]
    nested = body.get("data")
    if isinstance(nested, dict):
        inner = nested.get("result")
        if isinstance(inner, list):
            return inner
        if isinstance(inner, dict):
            state = inner.get("state")
            if isinstance(state, dict):
                return [state]
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


def _state_codes_ordered_for_fallback() -> list[str]:
    """Ohio first so fallback mirrors documented `state=OH`-style probes and surfaces OH early."""
    codes = sorted(US_STATE_ABBREV_TO_NAME)
    if "OH" in codes:
        return ["OH"] + [c for c in codes if c != "OH"]
    return codes


def _fetch_collectapi_state_endpoint_rows(key: str) -> tuple[list[dict[str, Any]], str | None]:
    """
    Fallback for CollectAPI accounts/docs that expose only `stateUsaPrice`.

    We abort immediately on auth/plan errors. Non-auth per-state misses are
    tolerated so one unsupported code (for example DC) does not blank the map.
    """
    rows: list[dict[str, Any]] = []
    first_err: str | None = None
    for state_code in _state_codes_ordered_for_fallback():
        body, err, status = get_collect_state_gas_json(_STATE_ENDPOINT_TIMEOUT_SEC, key, state_code)
        if err or body is None:
            if err in _STOP_UPSTREAM_ERRORS:
                return [], err
            if err in _AUTH_ERRORS:
                return [], err
            if first_err is None:
                first_err = err or (
                    f"gas_prices_collectapi_http_{status}" if status else "gas_prices_upstream_error"
                )
            continue
        if not _truthy_collect_success(body):
            if first_err is None:
                first_err = "gas_prices_upstream_error"
            continue
        raw = _extract_raw_list(body)
        if raw:
            for item in raw:
                if isinstance(item, dict):
                    rows.append(item)
    if rows:
        return rows, None
    return [], first_err or "gas_prices_empty_upstream"


def _fetch_collectapi_raw_rows(key: str) -> tuple[list[Any], str | None]:
    """Try all-states endpoint first, then documented per-state endpoint."""
    body, http_err, status = get_collect_gas_json(15.0, key)

    # Critical: do not run the 50-state fallback after 429 — that was hundreds of
    # extra CollectAPI calls and kept accounts permanently throttled.
    if http_err in _STOP_UPSTREAM_ERRORS:
        return [], http_err

    if http_err or body is None:
        if http_err:
            logger.warning(
                "CollectAPI all-state gas prices unavailable (%s)%s; trying stateUsaPrice fallback",
                http_err,
                f" HTTP {status}" if status is not None else "",
            )
        state_rows, state_err = _fetch_collectapi_state_endpoint_rows(key)
        return state_rows, state_err or http_err

    if not _truthy_collect_success(body):
        logger.warning(
            "CollectAPI all-state gas prices bad envelope (keys=%s); trying stateUsaPrice fallback",
            list(body.keys())[:20],
        )
        state_rows, state_err = _fetch_collectapi_state_endpoint_rows(key)
        return state_rows, state_err or "gas_prices_upstream_error"

    raw_list = _extract_raw_list(body)
    if raw_list is not None:
        if raw_list:
            return raw_list, None
        state_rows, state_err = _fetch_collectapi_state_endpoint_rows(key)
        return state_rows, state_err or "gas_prices_empty_upstream"

    state_rows, state_err = _fetch_collectapi_state_endpoint_rows(key)
    return state_rows, state_err or "gas_prices_bad_shape"


def fetch_us_state_gas_prices() -> tuple[list[dict[str, Any]], str | None]:
    """
    Return (rows, error_hint). Rows are map-ready: id, state, lat, lng, currency, regular, midGrade, premium, diesel.
    """
    global _cache_mono_until, _cached_rows, _cached_error

    now = time.monotonic()
    with _CACHE_LOCK:
        if _cache_mono_until > now:
            return list(_cached_rows), _cached_error

    key = _normalize_collectapi_key(get_collectapi_key() or "")
    if not key:
        with _CACHE_LOCK:
            _cache_mono_until = now + 300
            _cached_rows = []
            _cached_error = "gas_prices_unconfigured"
        return [], _cached_error

    raw_list, upstream_err = _fetch_collectapi_raw_rows(key)
    if upstream_err and not raw_list:
        if upstream_err == _ERR_RATE_LIMITED:
            cooldown = _RATE_LIMIT_COOLDOWN_SEC
        else:
            cooldown = _ERROR_COOLDOWN_SEC
        with _CACHE_LOCK:
            _cache_mono_until = now + cooldown
            _cached_rows = []
            _cached_error = upstream_err
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
                "regular": _as_price_str(_pick_field(row_lk, "regular", "gasoline", "gas")),
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

"""
HTTP helpers for CollectAPI Gas Price — retries alternate auth schemes and safe JSON decode.

Official Python examples use lowercase `authorization: apikey <token>` plus `content-type: application/json`
for `/gasPrice/stateUsaPrice?state=…`. Some curl snippets use bare `Authorization: <token>`.
We try several shapes per request cycle.

401 responses are often plaintext `Unauthorized` (not JSON) — decoding must never hard-fail routes.
"""
from __future__ import annotations

from typing import Any

import httpx

_COLLECT_ALL_USA_URL = "https://api.collectapi.com/gasPrice/allUsaPrice"
_COLLECT_STATE_USA_URL = "https://api.collectapi.com/gasPrice/stateUsaPrice"


def _header_sets(key: str) -> list[dict[str, str]]:
    k = key.strip()
    base = {
        "content-type": "application/json",
        "accept": "application/json",
        "User-Agent": "SnapRoad-backend/1.0 (+https://snaproad.app)",
    }
    return [
        {**base, "authorization": f"apikey {k}"},
        {**base, "Authorization": k},
        {**base, "Authorization": f"apikey {k}"},
        {**base, "Authorization": f"Bearer {k}"},
    ]


def _get_collect_json(
    timeout_sec: float,
    key: str,
    url: str,
    params: dict[str, str] | None = None,
) -> tuple[dict[str, Any] | None, str | None, int | None]:
    """
    Return (parsed_body_or_none, error_hint, http_status_when_available).
    error_hint classification helps operators distinguish bad key vs shape vs outage.
    """
    last_status: int | None = None
    last_problem: str | None = None
    headers_variants = _header_sets(key)
    try:
        with httpx.Client(timeout=timeout_sec) as client:
            for hdrs in headers_variants:
                resp = client.get(url, headers=hdrs, params=params)
                last_status = resp.status_code

                ct = (resp.headers.get("content-type") or "").lower()
                if resp.status_code == 429:
                    return None, "gas_prices_collectapi_rate_limited", last_status

                if resp.status_code == 403:
                    return None, "gas_prices_collectapi_forbidden", last_status

                if resp.status_code == 401:
                    last_problem = "gas_prices_collectapi_unauthorized"
                    continue

                body_text = resp.text.strip()
                if not body_text:
                    last_problem = "gas_prices_collectapi_empty_body"
                    continue

                if resp.status_code >= 400:
                    snippet = body_text.replace("\n", " ")[:200]
                    last_problem = f"gas_prices_collectapi_http_{resp.status_code}:{snippet}"
                    continue

                looks_json = "application/json" in ct or body_text.startswith("{")
                if not looks_json:
                    last_problem = "gas_prices_collectapi_non_json"
                    continue

                try:
                    parsed_any: Any = resp.json()
                except Exception:
                    last_problem = "gas_prices_collectapi_invalid_json"
                    continue

                if isinstance(parsed_any, dict):
                    return parsed_any, None, last_status
                last_problem = "gas_prices_collectapi_json_not_object"
            return None, last_problem or "gas_prices_upstream_error", last_status
    except httpx.TransportError:
        return None, "gas_prices_collectapi_transport_error", None
    except Exception:
        return None, "gas_prices_upstream_error", None


def get_collect_gas_json(timeout_sec: float, key: str) -> tuple[dict[str, Any] | None, str | None, int | None]:
    """Legacy/all-state CollectAPI endpoint used by older SnapRoad builds."""
    return _get_collect_json(timeout_sec, key, _COLLECT_ALL_USA_URL)


def get_collect_state_gas_json(
    timeout_sec: float,
    key: str,
    state_code: str,
) -> tuple[dict[str, Any] | None, str | None, int | None]:
    """Documented CollectAPI endpoint: `/gasPrice/stateUsaPrice?state=WA`."""
    return _get_collect_json(timeout_sec, key, _COLLECT_STATE_USA_URL, {"state": state_code.upper()})

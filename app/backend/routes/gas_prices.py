"""Map gas price overlay — proxied CollectAPI averages by US state."""
from __future__ import annotations

from fastapi import APIRouter, Request

from limiter import limiter
from config import get_collectapi_key
from services.gas_prices_service import fetch_us_state_gas_prices

router = APIRouter(prefix="/api", tags=["Gas prices"])


@router.get("/map/gas-prices")
@limiter.limit("45/minute")
def get_map_gas_prices(request: Request):
    """
    US statewide average gasoline prices for map markers.
    Requires COLLECTAPI_KEY on the server; returns an empty list when unset.
    """
    items, err = fetch_us_state_gas_prices()
    # Safe operator hint (never the secret): false means Railway/env missing COLLECTAPI_KEY.
    configured = bool((get_collectapi_key() or "").strip())
    payload: dict = {
        "success": True,
        "data": items,
        "total": len(items),
        "collectapi_configured": configured,
    }
    if err:
        payload["detail"] = err
    return payload

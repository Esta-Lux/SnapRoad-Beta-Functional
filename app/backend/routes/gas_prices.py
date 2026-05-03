"""Map gas price overlay — proxied CollectAPI averages by US state."""
from __future__ import annotations

from fastapi import APIRouter, Request

from limiter import limiter
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
    payload: dict = {"success": True, "data": items, "total": len(items)}
    if err:
        payload["detail"] = err
    return payload

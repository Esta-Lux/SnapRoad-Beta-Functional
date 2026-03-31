"""
Public app config (no auth) for driver app: maintenance_mode, announcement_banner, gems_multiplier, etc.
"""
from fastapi import APIRouter
from services.cache import cache_get, cache_set
from services.supabase_service import sb_get_app_config

router = APIRouter(prefix="/api", tags=["Config"])


@router.get("/config")
def get_public_config():
    cached = cache_get("app_config_public")
    if cached:
        return {"success": True, "data": cached}
    config = sb_get_app_config()
    cache_set("app_config_public", config, ttl=60)
    return {"success": True, "data": config}

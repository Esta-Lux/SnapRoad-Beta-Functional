"""
Public app config (no auth) for driver app: maintenance_mode, announcement_banner, gems_multiplier, etc.
"""
from urllib.parse import urlparse

from fastapi import APIRouter

from config import SUPABASE_URL
from services.cache import cache_get, cache_set
from services.supabase_service import sb_get_app_config

router = APIRouter(prefix="/api", tags=["Config"])


@router.get("/config/supabase")
def get_supabase_project_hint():
    """
    Non-secret hint so you can verify Vercel (VITE_SUPABASE_URL) matches Railway (SUPABASE_URL).
    """
    url = (SUPABASE_URL or "").strip()
    host = urlparse(url).hostname or ""
    ref = ""
    if host.endswith(".supabase.co") and "." in host:
        ref = host.split(".")[0]
    return {"success": True, "data": {"supabase_api_host": host, "project_ref": ref}}


@router.get("/config")
def get_public_config():
    cached = cache_get("app_config_public")
    if cached:
        return {"success": True, "data": cached}
    config = sb_get_app_config()
    cache_set("app_config_public", config, ttl=60)
    return {"success": True, "data": config}

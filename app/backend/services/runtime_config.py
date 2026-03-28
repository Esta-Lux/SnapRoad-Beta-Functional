"""
Cached read of app_config for server-side kill switches (low latency per request).
Invalidated when admin updates config via sb_update_app_config path.
"""
from __future__ import annotations

import time
from typing import Any, Dict, Optional, Tuple

_CACHE: Tuple[Optional[Dict[str, Any]], float] = (None, 0.0)
_TTL_SEC = 12.0


def invalidate_runtime_config_cache() -> None:
    global _CACHE
    _CACHE = (None, 0.0)


def get_runtime_config() -> Dict[str, Any]:
    """Return flat app_config key -> value (bool, number, str, etc.)."""
    global _CACHE
    now = time.monotonic()
    data, ts = _CACHE
    if data is not None and (now - ts) < _TTL_SEC:
        return data
    from services.supabase_service import sb_get_app_config

    fresh = sb_get_app_config() or {}
    _CACHE = (fresh, now)
    return fresh


def cfg_enabled(config: Dict[str, Any], key: str, default: bool = True) -> bool:
    """True = feature allowed. Missing key uses default (usually True = normal ops)."""
    if key not in config:
        return default
    v = config.get(key)
    if isinstance(v, bool):
        return v
    if isinstance(v, (int, float)):
        return bool(v)
    if isinstance(v, str):
        s = v.strip().lower()
        if s in ("true", "1", "yes", "on"):
            return True
        if s in ("false", "0", "no", "off", ""):
            return False
    return default


def require_enabled(key: str, detail: str, default: bool = True) -> None:
    from fastapi import HTTPException

    if not cfg_enabled(get_runtime_config(), key, default):
        raise HTTPException(status_code=503, detail=detail)

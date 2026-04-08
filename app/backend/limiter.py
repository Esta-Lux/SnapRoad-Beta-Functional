"""Shared rate limiter for SnapRoad API (slowapi)."""
import logging
import os
from typing import Optional
from urllib.parse import urlparse

from jose import jwt as jose_jwt
from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request

# Doc/template hostnames that are not real Redis endpoints — using them makes every @limiter route 500.
_REDIS_PLACEHOLDER_HOSTS = frozenset(
    {
        "endpoint",
        "your-redis-host",
        "redis-host",
        "redis.example",
    }
)


def _limiter_storage_uri() -> Optional[str]:
    """
    Use Redis for rate-limit state only when URL looks usable.
    Otherwise slowapi falls back to in-memory storage (fine for single-process dev).
    """
    if (os.environ.get("RATE_LIMIT_USE_REDIS") or "").strip().lower() in ("0", "false", "no", "off"):
        return None
    raw = (os.environ.get("REDIS_URL") or "").strip()
    if not raw:
        return None
    try:
        parsed = urlparse(raw)
        host = (parsed.hostname or "").strip().lower()
    except ValueError:
        return None
    if not host or host in _REDIS_PLACEHOLDER_HOSTS:
        return None
    return raw


def get_mapbox_rate_limit_key(request: Request) -> str:
    """
    Per-user key when Bearer token present (verified SnapRoad JWT or unverified sub for Supabase tokens).
    Falls through to IP only if no usable subject (before auth dependency rejects unauthenticated).
    """
    ip = get_remote_address(request)
    auth = (request.headers.get("authorization") or "").strip()
    if not auth.lower().startswith("bearer "):
        return f"mapbox:ip:{ip}"
    raw = auth[7:].strip()
    if not raw:
        return f"mapbox:ip:{ip}"
    try:
        from middleware.auth import _decode_snaproad_access_token

        snap = _decode_snaproad_access_token(raw)
        if snap and snap.get("id"):
            return f"mapbox:uid:{snap['id']}"
    except Exception:
        pass
    try:
        claims = jose_jwt.get_unverified_claims(raw)
        sub = claims.get("sub")
        if sub:
            return f"mapbox:uid:{sub}"
    except Exception:
        pass
    return f"mapbox:ip:{ip}"


limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=_limiter_storage_uri(),
)

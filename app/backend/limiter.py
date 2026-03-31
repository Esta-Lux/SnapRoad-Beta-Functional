"""Shared rate limiter for SnapRoad API (slowapi)."""
import logging
import os
from typing import Optional
from urllib.parse import urlparse

from slowapi import Limiter
from slowapi.util import get_remote_address

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


limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=_limiter_storage_uri(),
)

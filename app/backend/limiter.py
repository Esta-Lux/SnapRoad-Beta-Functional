"""Shared rate limiter for SnapRoad API (slowapi)."""
import logging
import os

from slowapi import Limiter
from slowapi.util import get_remote_address

logger = logging.getLogger(__name__)


def _storage_uri() -> str | None:
    """
    Use Redis when REDIS_URL is set *and* reachable.

    Local dev often copies Docker-style URLs (e.g. redis://endpoint:6379) that do not
    resolve on the host; slowapi would then 500 on every limited route and browsers
    report a CORS error because no success headers are returned.
    """
    raw = (os.environ.get("REDIS_URL") or "").strip()
    if not raw:
        return None
    try:
        import redis

        client = redis.from_url(raw, socket_connect_timeout=2)
        client.ping()
        return raw
    except Exception as e:
        logger.warning(
            "REDIS_URL is set but Redis is not reachable (%s). "
            "Using in-memory rate limits for this process.",
            e,
        )
        return None


limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=_storage_uri(),
)

import json
import logging
import os
from typing import Any, Optional

import redis

logger = logging.getLogger(__name__)

_client = None


def get_redis():
    global _client
    if _client is None:
        url = os.getenv("REDIS_URL")
        if url:
            _client = redis.from_url(url, decode_responses=True, socket_connect_timeout=2)
    return _client


def cache_get(key: str) -> Optional[Any]:
    r = get_redis()
    if not r:
        return None
    try:
        val = r.get(key)
        return json.loads(val) if val else None
    except Exception:
        return None


def cache_set(key: str, value: Any, ttl: int = 300):
    r = get_redis()
    if not r:
        return
    try:
        r.setex(key, ttl, json.dumps(value, default=str))
    except Exception as e:
        logger.warning("failed to set cache key %s: %s", key, e)


def cache_delete(key: str):
    r = get_redis()
    if not r:
        return
    try:
        r.delete(key)
    except Exception as e:
        logger.warning("failed to delete cache key %s: %s", key, e)

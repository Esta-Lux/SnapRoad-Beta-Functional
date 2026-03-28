from typing import Any

import httpx

from config import SUPABASE_URL, SUPABASE_SECRET_KEY

_client: Any = None
_shared_httpx: httpx.Client | None = None


def get_supabase():
    global _client, _shared_httpx
    if _client is None:
        if not SUPABASE_URL or not SUPABASE_SECRET_KEY:
            raise RuntimeError("SUPABASE_URL and SUPABASE_SECRET_KEY must be set")
        try:
            from supabase import ClientOptions, create_client
            from supabase_auth import SyncMemoryStorage
        except ImportError:
            raise RuntimeError(
                "Supabase is not installed. Run: pip install supabase (or use app/backend/.venv)"
            ) from None
        # Windows + httpx HTTP/2 can raise WinError 10035 during reads; PostgREST uses sync httpx.
        _shared_httpx = httpx.Client(
            http2=False,
            timeout=httpx.Timeout(120.0, connect=30.0),
        )
        opts = ClientOptions(
            storage=SyncMemoryStorage(),
            httpx_client=_shared_httpx,
        )
        _client = create_client(SUPABASE_URL, SUPABASE_SECRET_KEY, options=opts)
    return _client


def reset_supabase_client():
    """Reset the cached Supabase client to handle stale connections"""
    global _client, _shared_httpx
    if _shared_httpx is not None:
        try:
            _shared_httpx.close()
        except Exception:
            pass
        _shared_httpx = None
    _client = None

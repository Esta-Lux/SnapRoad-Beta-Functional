import base64
import json
from typing import Any, Optional

import httpx

from config import SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL

_client: Any = None
_shared_httpx: Optional[httpx.Client] = None


def _reject_if_supabase_key_is_anon(key: str) -> None:
    """Reject publishable/anon keys; backend needs service_role / secret server key."""
    k = (key or "").strip()
    if k.startswith("sb_publishable_"):
        raise RuntimeError(
            "SUPABASE_SERVICE_ROLE_KEY looks like a publishable (anon) key (sb_publishable_…). "
            "Use the secret server key from Supabase Dashboard → Settings → API (sb_secret_… or legacy service_role JWT)."
        )
    try:
        parts = k.split(".")
        if len(parts) < 2:
            return
        pad = "=" * (-len(parts[1]) % 4)
        payload = json.loads(base64.urlsafe_b64decode(parts[1] + pad))
        if payload.get("role") == "anon":
            raise RuntimeError(
                "Supabase backend key is the anon JWT (legacy). "
                "Set SUPABASE_SERVICE_ROLE_KEY to the service_role secret "
                "(Dashboard → Project Settings → API). Keep the anon key in "
                "SUPABASE_PUBLISHABLE_KEY / frontend only."
            )
    except RuntimeError:
        raise
    except Exception:
        pass


def get_supabase():
    global _client, _shared_httpx
    if _client is None:
        if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
            raise RuntimeError(
                "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or legacy SUPABASE_SECRET_KEY) must be set"
            )
        _reject_if_supabase_key_is_anon(SUPABASE_SERVICE_ROLE_KEY)
        try:
            from supabase import ClientOptions, create_client
            from supabase_auth import SyncMemoryStorage
        except ImportError:
            raise RuntimeError(
                "Supabase is not installed. Run: pip install supabase (or use app/backend/.venv)"
            ) from None
        # Windows + httpx HTTP/2 can raise WinError 10035 during reads; PostgREST uses sync httpx.
        # Keep auth/data calls responsive; long hangs cause frontend request timeouts.
        _shared_httpx = httpx.Client(
            http2=False,
            timeout=httpx.Timeout(10.0, connect=5.0),
        )
        opts = ClientOptions(
            storage=SyncMemoryStorage(),
            httpx_client=_shared_httpx,
        )
        _client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, options=opts)
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

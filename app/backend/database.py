from typing import Any

from config import SUPABASE_URL, SUPABASE_SECRET_KEY

_client: Any = None


def get_supabase():
    global _client
    if _client is None:
        if not SUPABASE_URL or not SUPABASE_SECRET_KEY:
            raise RuntimeError("SUPABASE_URL and SUPABASE_SECRET_KEY must be set")
        try:
            from supabase import create_client, Client
        except ImportError:
            raise RuntimeError(
                "Supabase is not installed. Run: pip install supabase (or use app/backend/.venv)"
            ) from None
        _client = create_client(SUPABASE_URL, SUPABASE_SECRET_KEY)
    return _client


def reset_supabase_client():
    """Reset the cached Supabase client to handle stale connections"""
    global _client
    _client = None

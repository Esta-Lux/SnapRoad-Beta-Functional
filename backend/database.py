from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_SECRET_KEY

_client: Client = None


def get_supabase() -> Client:
    global _client
    if _client is None:
        if not SUPABASE_URL or not SUPABASE_SECRET_KEY:
            raise RuntimeError("SUPABASE_URL and SUPABASE_SECRET_KEY must be set")
        _client = create_client(SUPABASE_URL, SUPABASE_SECRET_KEY)
    return _client

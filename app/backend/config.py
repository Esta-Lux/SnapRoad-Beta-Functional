import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from the backend directory so it works regardless of CWD
_BACKEND_DIR = Path(__file__).resolve().parent
_env_path = _BACKEND_DIR / ".env"
load_dotenv(_env_path)

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SECRET_KEY = os.environ.get("SUPABASE_SECRET_KEY")
SUPABASE_PUBLISHABLE_KEY = os.environ.get("SUPABASE_PUBLISHABLE_KEY")
SUPABASE_DB_PASSWORD = os.environ.get("SUPABASE_DB_PASSWORD")  # Optional: DB password for direct connection

_raw_jwt = (os.environ.get("JWT_SECRET") or "").strip()
JWT_SECRET = _raw_jwt if _raw_jwt else "snaproad-jwt-secret-change-in-prod"
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24

# OpenAI API Key for AI features (Orion Coach, Photo Analysis)
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
OPENAI_VISION_MODEL = os.environ.get("OPENAI_VISION_MODEL", "gpt-4o-mini")

STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET")

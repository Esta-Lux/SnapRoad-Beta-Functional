import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SECRET_KEY = os.environ.get("SUPABASE_SECRET_KEY")
SUPABASE_PUBLISHABLE_KEY = os.environ.get("SUPABASE_PUBLISHABLE_KEY")
SUPABASE_DB_PASSWORD = os.environ.get("SUPABASE_DB_PASSWORD")  # Optional: DB password for direct connection

JWT_SECRET = os.environ.get("JWT_SECRET", "snaproad-jwt-secret-change-in-prod")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24

# OpenAI API Key for AI features (Orion Coach, Photo Analysis)
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
OPENAI_VISION_MODEL = os.environ.get("OPENAI_VISION_MODEL", "gpt-4o-mini")

STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET")

# Cameras / Traffic API - used for auth when calling external cameras or traffic APIs (e.g. /api/map/traffic)
CAMERAS_API_KEY = os.environ.get("CAMERAS_API_KEY")

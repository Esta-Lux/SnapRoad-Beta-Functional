import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SECRET_KEY = os.environ.get("SUPABASE_SECRET_KEY")
SUPABASE_PUBLISHABLE_KEY = os.environ.get("SUPABASE_PUBLISHABLE_KEY")
SUPABASE_DB_PASSWORD = os.environ.get("SUPABASE_DB_PASSWORD")  # Optional: DB password for direct connection

JWT_SECRET_DEFAULT = "snaproad-jwt-secret-change-in-prod"
JWT_SECRET = os.environ.get("JWT_SECRET", JWT_SECRET_DEFAULT)
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24


def validate_runtime_config() -> None:
    """Fail fast on insecure production authentication configuration."""
    if ENVIRONMENT != "production":
        return
    secret = (JWT_SECRET or "").strip()
    if (
        not secret
        or secret == JWT_SECRET_DEFAULT
        or len(secret) < 32
        or "change-in-prod" in secret
    ):
        raise RuntimeError("Invalid JWT_SECRET for production; set a strong secret (>=32 chars)")

# OpenAI API Key for AI features (Orion Coach, Photo Analysis)
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
OPENAI_VISION_MODEL = os.environ.get("OPENAI_VISION_MODEL", "gpt-4o-mini")

STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET")
# Optional: Stripe Dashboard → Developers → Webhooks → endpoint id (for your notes / scripts only)
STRIPE_WEBHOOK_ENDPOINT_ID = os.environ.get("STRIPE_WEBHOOK_ENDPOINT_ID", "")

# Driver app subscription catalog (used by routes/payments.py checkout)
# Prefer *_PRICE_ID so Checkout uses your Stripe Product catalog prices.
STRIPE_PREMIUM_PRODUCT_ID = os.environ.get("STRIPE_PREMIUM_PRODUCT_ID", "")
STRIPE_PREMIUM_PRICE_ID = os.environ.get("STRIPE_PREMIUM_PRICE_ID", "")
STRIPE_PREMIUM_BETA_PRICE_ID = os.environ.get("STRIPE_PREMIUM_BETA_PRICE_ID", "")
STRIPE_FAMILY_PRODUCT_ID = os.environ.get("STRIPE_FAMILY_PRODUCT_ID", "")
STRIPE_FAMILY_PRICE_ID = os.environ.get("STRIPE_FAMILY_PRICE_ID", "")
STRIPE_FAMILY_FOUNDERS_PRODUCT_ID = os.environ.get("STRIPE_FAMILY_FOUNDERS_PRODUCT_ID", "")
STRIPE_FAMILY_FOUNDERS_PRICE_ID = os.environ.get("STRIPE_FAMILY_FOUNDERS_PRICE_ID", "")

# Optional partner portal: use catalog recurring prices instead of ad-hoc price_data
STRIPE_PARTNER_STARTER_PRICE_ID = os.environ.get("STRIPE_PARTNER_STARTER_PRICE_ID", "")
STRIPE_PARTNER_GROWTH_PRICE_ID = os.environ.get("STRIPE_PARTNER_GROWTH_PRICE_ID", "")

# Where Stripe Checkout sends users after pay/cancel (partner portal). No trailing slash.
# Dev default matches Vite in app/frontend/vite.config.ts (port 3000).
PARTNER_PORTAL_ORIGIN = (os.environ.get("PARTNER_PORTAL_ORIGIN") or "http://localhost:3000").rstrip("/")

# Cameras / Traffic API - used for auth when calling external cameras or traffic APIs (e.g. /api/map/traffic)
CAMERAS_API_KEY = os.environ.get("CAMERAS_API_KEY")
# Optional: base URL for cameras API. If set, GET /api/map/traffic calls it with lat, lng, radius and the key.
CAMERAS_API_URL = (os.environ.get("CAMERAS_API_URL") or "").strip().rstrip("/")
# If set to "true" or "1", send API key in X-API-Key header instead of query param "key".
CAMERAS_API_KEY_AS_HEADER = (os.environ.get("CAMERAS_API_KEY_AS_HEADER") or "").strip().lower() in ("1", "true", "yes")

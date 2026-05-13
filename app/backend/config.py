import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
# Server-side PostgREST/Auth admin operations MUST use the service_role JWT from
# Supabase Dashboard → Project Settings → API ("service_role" secret).
# Do NOT put the anon / publishable key here — RLS will block inserts/updates (e.g. profiles).
SUPABASE_SERVICE_ROLE_KEY = (
    (os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_SECRET_KEY") or "").strip()
)
# Backward-compatible name; same value as SUPABASE_SERVICE_ROLE_KEY (not the anon key).
SUPABASE_SECRET_KEY = SUPABASE_SERVICE_ROLE_KEY
SUPABASE_PUBLISHABLE_KEY = os.environ.get("SUPABASE_PUBLISHABLE_KEY")
SUPABASE_DB_PASSWORD = os.environ.get("SUPABASE_DB_PASSWORD")  # Optional: DB password for direct connection

JWT_SECRET = os.environ.get("JWT_SECRET")
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
IS_PRODUCTION = ENVIRONMENT.lower() == "production"


def _truthy_env(name: str) -> bool:
    return os.environ.get(name, "").strip().lower() in ("1", "true", "yes", "on")


# When true, POST /api/incidents/* returns 503 detail including str(exc) for Supabase failures (debug prod only).
# Overridden to False in production at import time (see below).
_EXPOSE_INCIDENT_ENV = _truthy_env("EXPOSE_INCIDENT_BACKEND_ERRORS")
EXPOSE_INCIDENT_BACKEND_ERRORS = False if IS_PRODUCTION else _EXPOSE_INCIDENT_ENV
if IS_PRODUCTION and _EXPOSE_INCIDENT_ENV:
    import logging

    logging.getLogger(__name__).warning(
        "EXPOSE_INCIDENT_BACKEND_ERRORS is disabled in production regardless of env (details stay in logs only)."
    )
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24

# Orion / photo AI: prefer NVIDIA (OpenAI-compatible endpoint); else OpenAI.
# See https://build.nvidia.com — API key typically starts with nvapi-.
NVIDIA_API_KEY = (os.environ.get("NVIDIA_API_KEY") or "").strip()
NVIDIA_API_BASE = (os.environ.get("NVIDIA_API_BASE") or "https://integrate.api.nvidia.com/v1").strip().rstrip("/")
NVIDIA_CHAT_MODEL = os.environ.get("NVIDIA_CHAT_MODEL", "meta/llama-3.1-8b-instruct")
NVIDIA_VISION_MODEL = os.environ.get("NVIDIA_VISION_MODEL", "meta/llama-3.2-11b-vision-instruct")

# OpenAI fallback when NVIDIA_API_KEY is unset (legacy / local)
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

# OHGO (ODOT) traffic cameras — Ohio. Same key as web VITE_OHGO_API_KEY; Expo uses backend proxy only.
OHGO_API_KEY = (os.environ.get("OHGO_API_KEY") or os.environ.get("VITE_OHGO_API_KEY") or "").strip()
# Optional base URL (no trailing path). Default is the public OHGO host.
OHGO_API_BASE = (os.environ.get("OHGO_API_URL") or "https://publicapi.ohgo.com").strip().rstrip("/")

# CollectAPI — statewide US gas averages (mobile map layer via GET /api/map/gas-prices).
# Prefer COLLECTAPI_KEY; hosting configs sometimes rename (support common aliases).
def _pick_collectapi_key() -> str:
    for k in (
        "COLLECTAPI_KEY",
        "COLLECT_API_KEY",
        "COLLECTAPI_TOKEN",
        "COLLECT_TOKEN",
        "NEXT_PUBLIC_COLLECTAPI_KEY",
    ):
        raw = (os.environ.get(k) or "").strip()
        if raw:
            return raw.strip().strip("\"'").strip()
    return ""


COLLECTAPI_KEY = _pick_collectapi_key()

# TomTom — nearby fuel stations + Fuel Prices API (GET /api/fuel/prices when configured).
# Use the API key from TomTom Developer → dashboard (not the Map Tiles URL alone).
# Optional TOMTOM_CLIENT_ID: product / app UUID from the dashboard (for support only; not sent on standard REST calls).
TOMTOM_API_KEY = (os.environ.get("TOMTOM_API_KEY") or "").strip().strip("\"'")
TOMTOM_CLIENT_ID = (os.environ.get("TOMTOM_CLIENT_ID") or "").strip()

# Apple In-App Purchase — consumer subscriptions on iOS (App Store Connect → Users and Access → Integrations → In-App Purchase).
# Required on the API host for POST /api/payments/apple/sync: APPLE_IAP_PRIVATE_KEY_PEM (.p8 contents; use \\n in one-line env),
# APPLE_IAP_KEY_ID, APPLE_IAP_ISSUER_ID, APPLE_IAP_PREMIUM_PRODUCT_ID, APPLE_IAP_BUNDLE_ID (defaults com.snaproad.app).
# Strongly set APPLE_APP_APPLE_ID (numeric ASC App Id) for production JWS verification. Optional: APPLE_IAP_FAMILY_PRODUCT_ID.
# GET /api/payments/apple/status returns which pieces are missing (no secrets).
# App Store Server Notifications URL in ASC is optional for /apple/sync until you add a webhook receiver.
APPLE_IAP_PRIVATE_KEY_PEM = (os.environ.get("APPLE_IAP_PRIVATE_KEY_PEM") or "").strip()
APPLE_IAP_KEY_ID = (os.environ.get("APPLE_IAP_KEY_ID") or "").strip()
APPLE_IAP_ISSUER_ID = (os.environ.get("APPLE_IAP_ISSUER_ID") or "").strip()
APPLE_IAP_BUNDLE_ID = (os.environ.get("APPLE_IAP_BUNDLE_ID") or "com.snaproad.app").strip()
APPLE_APP_APPLE_ID_RAW = (os.environ.get("APPLE_APP_APPLE_ID") or "").strip()


def _parse_app_apple_id() -> int | None:
    raw = (APPLE_APP_APPLE_ID_RAW or "").strip()
    if not raw:
        return None
    try:
        return int(raw)
    except ValueError:
        return None


APPLE_APP_APPLE_ID = _parse_app_apple_id()
APPLE_IAP_PREMIUM_PRODUCT_ID = (os.environ.get("APPLE_IAP_PREMIUM_PRODUCT_ID") or "").strip()
APPLE_IAP_FAMILY_PRODUCT_ID = (os.environ.get("APPLE_IAP_FAMILY_PRODUCT_ID") or "").strip()


def get_collectapi_key() -> str:
    """Latest CollectAPI token from env (aliases in `_pick_collectapi_key`).

    Prefer this in request paths over the module-level `COLLECTAPI_KEY` snapshot
    so hosting reloads / tests that patch this function behave predictably. The
    OS still only updates `os.environ` on process start — add the var in Railway
    then redeploy or restart the service.
    """
    return _pick_collectapi_key()

_WEAK_JWT_SECRETS = {
    "",
    "changeme",
    "change-me",
    "secret",
    "password",
    "snaproad-jwt-secret-change-in-prod",
}


def mapbox_token_from_env() -> str:
    """
    Server-side Mapbox token for Directions proxy and health checks.
    Prefer explicit names; MAPBOX_TOKEN is a common hosting alias (e.g. Railway).
    """
    return (
        (os.environ.get("MAPBOX_ACCESS_TOKEN") or "").strip()
        or (os.environ.get("MAPBOX_SECRET_TOKEN") or "").strip()
        or (os.environ.get("MAPBOX_PUBLIC_TOKEN") or "").strip()
        or (os.environ.get("MAPBOX_TOKEN") or "").strip()
    )


def validate_production_env() -> None:
    """Fail fast for unsafe or missing production secrets/config."""
    if not IS_PRODUCTION:
        return

    missing = []
    for key, value in (
        ("JWT_SECRET", JWT_SECRET),
        ("SUPABASE_URL", SUPABASE_URL),
        ("SUPABASE_SECRET_KEY", SUPABASE_SECRET_KEY),
        ("STRIPE_SECRET_KEY", STRIPE_SECRET_KEY),
        ("STRIPE_WEBHOOK_SECRET", STRIPE_WEBHOOK_SECRET),
    ):
        if not (value or "").strip():
            missing.append(key)
    if not mapbox_token_from_env():
        missing.append(
            "MAPBOX_ACCESS_TOKEN (or MAPBOX_SECRET_TOKEN / MAPBOX_PUBLIC_TOKEN / MAPBOX_TOKEN)"
        )
    if missing:
        raise RuntimeError(f"Missing required production env vars: {', '.join(missing)}")

    jwt_secret = (JWT_SECRET or "").strip()
    if len(jwt_secret) < 32 or jwt_secret.lower() in _WEAK_JWT_SECRETS:
        raise RuntimeError("JWT_SECRET is weak. Use a strong secret with at least 32 characters.")

    cors_origins = (os.getenv("CORS_ORIGINS") or "").strip()
    if not cors_origins:
        raise RuntimeError("CORS_ORIGINS must be explicitly set in production.")

    if _truthy_env("ENABLE_MOCK_BEARER_AUTH") or _truthy_env("ALLOW_MOCK_AUTH"):
        raise RuntimeError(
            "Mock bearer auth is forbidden in production: unset ENABLE_MOCK_BEARER_AUTH and ALLOW_MOCK_AUTH."
        )

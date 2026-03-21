"""
SnapRoad API - Main Application Assembly
All routes are organized into modular files under /routes.
Mock data is used as fallback; Supabase is the target database.
"""
import os
from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent / ".env")

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

sentry_sdk.init(
    dsn=os.getenv("SENTRY_DSN", ""),
    integrations=[FastApiIntegration()],
    traces_sample_rate=0.2,
    environment=os.getenv("ENVIRONMENT", "development"),
)
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from limiter import limiter

from routes.auth import router as auth_router
from routes.users import router as users_router
from routes.offers import router as offers_router
from routes.partners import router as partners_router
from routes.gamification import router as gamification_router
from routes.trips import router as trips_router
from routes.admin import router as admin_router
from routes.social import router as social_router
from routes.navigation import router as navigation_router
from routes.directions import router as directions_router
from routes.places import router as places_router
from routes.mapkit import router as mapkit_router
from routes.ai import router as ai_router
from routes.incidents import router as incidents_router
from routes.concerns import router as concerns_router
from routes.config_public import router as config_public_router
from routes.osm import router as osm_router
from routes.webhooks import router as webhooks_router
from routes.payments import router as payments_router
from routes.family import router as family_router
from routes.photo_reports import router as photo_reports_router
from config import JWT_SECRET, SUPABASE_URL, SUPABASE_SECRET_KEY, OPENAI_API_KEY


def create_app() -> FastAPI:
    app = FastAPI(title="SnapRoad API")
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    @app.get("/")
    def root():
        return {"message": "SnapRoad API", "docs": "/docs", "redoc": "/redoc"}

    @app.get("/api/env-check")
    def env_check():
        """Verify .env is loaded and key vars are set (no secrets returned)."""
        key_path = os.environ.get("MAPKIT_PRIVATE_KEY_PATH", "")
        key_path_abs = key_path if (key_path and os.path.isabs(key_path)) else str(Path(__file__).resolve().parent / (key_path or ""))
        return {
            "env_file_path": str(Path(__file__).resolve().parent / ".env"),
            "env_file_exists": (Path(__file__).resolve().parent / ".env").is_file(),
            "jwt_configured": bool(JWT_SECRET),
            "supabase_configured": bool((SUPABASE_URL or "").strip() and (SUPABASE_SECRET_KEY or "").strip()),
            "mapkit_configured": bool(
                (os.environ.get("MAPKIT_KEY_ID") or "").strip()
                and (os.environ.get("MAPKIT_TEAM_ID") or "").strip()
                and key_path
                and os.path.isfile(key_path_abs)
            ),
            "google_maps_configured": bool(
                (os.environ.get("GOOGLE_PLACES_API_KEY") or os.environ.get("GOOGLE_MAPS_API_KEY") or "").strip()
            ),
            "openai_configured": bool((OPENAI_API_KEY or "").strip()),
        }

    # Parse CORS origins from env (comma-separated)
    _env = os.getenv("ENVIRONMENT", "development")
    _cors_origins_raw = os.getenv("CORS_ORIGINS", "")

    if _cors_origins_raw:
        cors_origins = [o.strip() for o in _cors_origins_raw.split(",") if o.strip()]
    elif _env == "production":
        cors_origins = []  # Force explicit configuration in production
    else:
        cors_origins = [
            "http://localhost:5173",
            "http://localhost:3000",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:3000",
            "http://localhost:8001",
            "http://127.0.0.1:8001",
        ]

    # Keep regex support for dev tunnels; gate it off by default in production.
    _origin_regex = None if _env == "production" else os.environ.get("CORS_ORIGIN_REGEX", r"^https?://.*\.tunnelmole\.net$")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_origin_regex=_origin_regex,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register all route modules
    app.include_router(auth_router)
    app.include_router(users_router)
    app.include_router(offers_router)
    app.include_router(partners_router)
    app.include_router(gamification_router)
    app.include_router(trips_router)
    app.include_router(admin_router)
    app.include_router(social_router)
    app.include_router(navigation_router)
    app.include_router(directions_router)
    app.include_router(places_router)
    app.include_router(mapkit_router)
    app.include_router(ai_router)
    app.include_router(incidents_router)
    app.include_router(concerns_router)
    app.include_router(config_public_router)
    app.include_router(osm_router)
    app.include_router(webhooks_router)
    app.include_router(payments_router)
    app.include_router(family_router)
    app.include_router(photo_reports_router)

    return app

# Create app instance for uvicorn
app = create_app()

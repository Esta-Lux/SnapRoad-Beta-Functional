"""
SnapRoad API - Main Application Assembly
All routes are organized into modular files under /routes.
Mock data is used as fallback; Supabase is the target database.
"""
import os
from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent / ".env")
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.auth import router as auth_router
from routes.users import router as users_router
from routes.offers import router as offers_router
from routes.partners import router as partners_router
from routes.gamification import router as gamification_router
from routes.trips import router as trips_router
from routes.admin import router as admin_router
from routes.social import router as social_router
from routes.navigation import router as navigation_router
from routes.mapkit import router as mapkit_router
from routes.ai import router as ai_router
from routes.webhooks import router as webhooks_router
from routes.payments import router as payments_router
from routes.places import router as places_router
from config import SUPABASE_URL, SUPABASE_SECRET_KEY, JWT_SECRET


def create_app() -> FastAPI:
    app = FastAPI(title="SnapRoad API")

    @app.get("/")
    def root():
        return {"message": "SnapRoad API", "docs": "/docs", "redoc": "/redoc"}

    @app.get("/api/env-check")
    def env_check():
        """Verify .env is loaded and key vars are set (no secrets returned)."""
        return {
            "env_file_path": str(Path(__file__).resolve().parent / ".env"),
            "env_file_exists": (Path(__file__).resolve().parent / ".env").is_file(),
            "jwt_configured": bool(JWT_SECRET),
            "supabase_configured": bool((SUPABASE_URL or "").strip() and (SUPABASE_SECRET_KEY or "").strip()),
        }

    # When using credentials, browsers require explicit origins (not "*").
    # Set CORS_ORIGINS env to e.g. "http://localhost:3000,https://app.example.com" for production.
    _origins = os.environ.get(
        "CORS_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001,http://localhost:3007,http://127.0.0.1:3007,capacitor://localhost"
    ).split(",")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[o.strip() for o in _origins if o.strip()],
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
    app.include_router(mapkit_router)
    app.include_router(ai_router)
    app.include_router(webhooks_router)
    app.include_router(payments_router)
    app.include_router(places_router)

    return app

# Create app instance for uvicorn
app = create_app()

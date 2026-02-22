"""
SnapRoad API - Main Application Assembly
All routes are organized into modular files under /routes.
Mock data is used as fallback; Supabase is the target database.
"""
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
from routes.ai import router as ai_router
from routes.webhooks import router as webhooks_router


def create_app() -> FastAPI:
    app = FastAPI(title="SnapRoad API")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
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
    app.include_router(ai_router)
    app.include_router(webhooks_router)

    return app

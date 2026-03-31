"""
SnapRoad API - Main Application Assembly
All routes are organized in modular files under /routes.
Mock data is used as fallback; Supabase is the target database.
"""
import os
import traceback
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
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.base import BaseHTTPMiddleware
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
from routes.traffic_safety import router as traffic_safety_router
from routes.webhooks import router as webhooks_router
from routes.payments import router as payments_router
from routes.family import router as family_router
from routes.photo_reports import router as photo_reports_router
from routes.place_alerts import router as place_alerts_router
from routes.legal import router as legal_router
from config import (
    JWT_SECRET,
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    OPENAI_API_KEY,
    IS_PRODUCTION,
    OHGO_API_KEY,
    validate_production_env,
)
from services.telemetry_service import telemetry_service
from database import get_supabase


def create_app() -> FastAPI:
    _env = os.getenv("ENVIRONMENT", "development")
    validate_production_env()
    app = FastAPI(title="SnapRoad API")
    class SecurityHeadersMiddleware(BaseHTTPMiddleware):
        async def dispatch(self, request: Request, call_next):
            response = await call_next(request)
            response.headers["X-Content-Type-Options"] = "nosniff"
            response.headers["X-Frame-Options"] = "DENY"
            response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
            response.headers["X-XSS-Protection"] = "1; mode=block"
            return response

    app.add_middleware(SecurityHeadersMiddleware)
    if _env == "production":
        app.add_middleware(HTTPSRedirectMiddleware)

    # Starlette matches handlers by walking the exception MRO. FastAPI's HTTPException subclasses
    # starlette.exceptions.HTTPException; registering only fastapi.HTTPException can miss cases where
    # the base Starlette type wins and falls through to Exception → generic 500.
    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
            headers=dict(exc.headers) if exc.headers else {},
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        return JSONResponse(status_code=422, content={"detail": exc.errors()})

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        # Fallback if anything still reaches the broad handler (MRO edge cases).
        if isinstance(exc, StarletteHTTPException):
            return JSONResponse(
                status_code=exc.status_code,
                content={"detail": exc.detail},
                headers=dict(exc.headers) if exc.headers else {},
            )
        if isinstance(exc, RequestValidationError):
            return JSONResponse(status_code=422, content={"detail": exc.errors()})
        if isinstance(exc, RateLimitExceeded):
            return await _rate_limit_exceeded_handler(request, exc)
        # Never leak stack traces to clients.
        telemetry_service.publish_fire_and_forget(
            {
                "id": f"err_{telemetry_service.now_iso()}_{request.method}_{request.url.path}",
                "timestamp": telemetry_service.now_iso(),
                "severity": "error",
                "path": request.url.path,
                "method": request.method,
                "error": str(exc),
            }
        )
        return JSONResponse(status_code=500, content={"detail": "An internal error occurred"})

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    @app.middleware("http")
    async def telemetry_middleware(request: Request, call_next):
        start = telemetry_service.start_timer()
        method = request.method
        path = request.url.path
        status_code = 500
        error = None
        error_stack = None
        try:
            response = await call_next(request)
            status_code = response.status_code
            return response
        except Exception as exc:
            error = str(exc)
            error_stack = traceback.format_exc(limit=8)
            raise
        finally:
            duration_ms = telemetry_service.elapsed_ms(start)
            severity = (
                "error"
                if status_code >= 500 or error
                else "warn"
                if status_code >= 400
                else "info"
            )
            event = {
                "id": f"evt_{telemetry_service.now_iso()}_{method}_{path}",
                "timestamp": telemetry_service.now_iso(),
                "method": method,
                "path": path,
                "status_code": status_code,
                "duration_ms": duration_ms,
                "severity": severity,
                "error": error,
                "error_stack": error_stack,
            }
            # Never block request completion on runtime-config DB reads.
            # Telemetry publish already runs fire-and-forget.
            telemetry_service.publish_fire_and_forget(event)

    @app.get("/")
    def root():
        return {"message": "SnapRoad API", "docs": "/docs", "redoc": "/redoc"}

    @app.get("/health")
    def health():
        checks = {"database": "ok", "cache": "unknown"}
        try:
            sb = get_supabase()
            sb.table("profiles").select("id").limit(1).execute()
        except Exception:
            checks["database"] = "error"

        try:
            import redis
            redis_url = (os.environ.get("REDIS_URL") or "").strip()
            if redis_url:
                client = redis.from_url(redis_url)
                client.ping()
                checks["cache"] = "ok"
            else:
                checks["cache"] = "disabled"
        except Exception:
            checks["cache"] = "degraded"

        status = "ok" if checks["database"] == "ok" else "degraded"
        return {"status": status, "checks": checks}

    @app.get("/api/env-check")
    def env_check():
        """Verify .env is loaded and key vars are set (no secrets returned)."""
        if IS_PRODUCTION:
            return {"ok": False, "message": "Not available in production"}
        key_path = os.environ.get("MAPKIT_PRIVATE_KEY_PATH", "")
        key_path_abs = (
            key_path
            if (key_path and os.path.isabs(key_path))
            else str(Path(__file__).resolve().parent / (key_path or ""))
        )
        return {
            "env_file_path": str(Path(__file__).resolve().parent / ".env"),
            "env_file_exists": (Path(__file__).resolve().parent / ".env").is_file(),
            "jwt_configured": bool(JWT_SECRET),
            "supabase_configured": bool(
                (SUPABASE_URL or "").strip() and (SUPABASE_SERVICE_ROLE_KEY or "").strip()
            ),
            "mapkit_configured": bool(
                (os.environ.get("MAPKIT_KEY_ID") or "").strip()
                and (os.environ.get("MAPKIT_TEAM_ID") or "").strip()
                and key_path
                and os.path.isfile(key_path_abs)
            ),
            "google_maps_configured": bool(
                (
                    os.environ.get("GOOGLE_PLACES_API_KEY")
                    or os.environ.get("GOOGLE_MAPS_API_KEY")
                    or ""
                ).strip()
            ),
            "openai_configured": bool((OPENAI_API_KEY or "").strip()),
            "ohgo_cameras_configured": bool((OHGO_API_KEY or "").strip()),
        }

    # Parse CORS origins from env (comma-separated)
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
    _origin_regex = (
        None
        if _env == "production"
        else os.environ.get(
            "CORS_ORIGIN_REGEX",
            r"^https?://.*\.(tunnelmole\.net|trycloudflare\.com|loca\.lt)$",
        )
    )
    _cors_headers = (
        ["*"]
        if _env != "production"
        else ["Authorization", "Content-Type", "Bypass-Tunnel-Reminder", "X-Requested-With", "Accept"]
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_origin_regex=_origin_regex,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=_cors_headers,
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
    app.include_router(traffic_safety_router)
    app.include_router(webhooks_router)
    app.include_router(payments_router)
    app.include_router(family_router)
    app.include_router(photo_reports_router)
    app.include_router(place_alerts_router)
    app.include_router(legal_router)

    return app


# Create app instance for uvicorn
app = create_app()

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)

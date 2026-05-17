"""
SnapRoad API - Main Application Assembly
All routes are organized in modular files under /routes.
Mock data is used as fallback; Supabase is the target database.
"""
import os
import logging
import asyncio
import traceback
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")

logger = logging.getLogger(__name__)

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

_sentry_dsn = (os.getenv("SENTRY_DSN") or "").strip()
if _sentry_dsn:
    sentry_sdk.init(
        dsn=_sentry_dsn,
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
from routes.mapbox_directions import router as mapbox_directions_router
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
from routes.apple_iap_routes import router as apple_iap_payments_router
from routes.family import router as family_router
from routes.photo_reports import router as photo_reports_router
from routes.place_alerts import router as place_alerts_router
from routes.commute_routes import router as commute_routes_router
from routes.legal import router as legal_router
from routes.weather import router as weather_router
from routes.gas_prices import router as gas_prices_router
from routes.referrals import router as referrals_router
from routes.orion_voice import router as orion_voice_router
from config import (
    JWT_SECRET,
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    OPENAI_API_KEY,
    NVIDIA_API_KEY,
    IS_PRODUCTION,
    OHGO_API_KEY,
    mapbox_token_from_env,
    validate_production_env,
)
from services.llm_client import is_llm_configured
from services.telemetry_service import telemetry_service
from database import get_supabase

API_TITLE = "SnapRoad API"


def _supabase_env_health_hint() -> dict:
    """
    Non-secret hints for operators. Backend uses SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY
    (service_role from Dashboard), not SUPABASE_ANON_KEY — that env name is ignored here.
    """
    has_url = bool((SUPABASE_URL or "").strip())
    has_service = bool((SUPABASE_SERVICE_ROLE_KEY or "").strip())
    has_anon_var = bool(os.environ.get("SUPABASE_ANON_KEY", "").strip())
    return {
        "supabase_url_configured": has_url,
        "service_role_key_configured": has_service,
        "railway_has_supabase_anon_key": has_anon_var,
        "misconfiguration": (
            "Railway has SUPABASE_ANON_KEY but the API requires SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) "
            "with the service_role secret from Supabase → Settings → API. Copy anon to Vercel as VITE_SUPABASE_ANON_KEY only."
        )
        if has_anon_var and not has_service
        else "",
    }


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        return response

def _register_exception_handlers(app: FastAPI) -> None:
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
        # Ensure unhandled errors reach Sentry even though we return a generic 500 to clients.
        try:
            sentry_sdk.capture_exception(exc)
        except Exception as sentry_error:
            logger.debug("Sentry capture failed in global exception handler: %s", sentry_error)
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


def _maybe_add_https_redirect(app: FastAPI, env: str) -> None:
    _railway = bool(os.getenv("RAILWAY_ENVIRONMENT") or os.getenv("RAILWAY_PROJECT_ID"))
    _skip_https_redirect = (os.getenv("SKIP_HTTPS_REDIRECT") or "").strip().lower() in ("1", "true", "yes")
    if env == "production" and not (_railway or _skip_https_redirect):
        app.add_middleware(HTTPSRedirectMiddleware)


def _telemetry_severity(status_code: int, error: Optional[str]) -> str:
    """Classify request outcome for fire-and-forget telemetry (not security-sensitive)."""
    if error is not None:
        return "error"
    if status_code >= 500:
        return "error"
    if status_code >= 400:
        return "warning"
    return "info"


def _add_telemetry_middleware(app: FastAPI) -> None:
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
            severity = _telemetry_severity(status_code, error)
            event = {
                "id": f"evt_{telemetry_service.now_iso()}_{method}_{path}",
                "timestamp": telemetry_service.now_iso(),
                "method": method,
                "path": path,
                "guest_id": request.headers.get("x-snaproad-guest-id"),
                "status_code": status_code,
                "duration_ms": duration_ms,
                "severity": severity,
                "error": error,
                "error_stack": error_stack,
            }
            telemetry_service.publish_fire_and_forget(event)

def _cors_settings(env: str) -> tuple[list[str], Optional[str], list[str]]:
    raw = os.getenv("CORS_ORIGINS", "")
    if raw:
        origins = [o.strip() for o in raw.split(",") if o.strip()]
    elif env == "production":
        origins = []
    else:
        origins = [
            "http://localhost:5173",
            "http://localhost:3000",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:3000",
            "http://localhost:8001",
            "http://127.0.0.1:8001",
        ]
    origin_regex = (
        None
        if env == "production"
        else os.environ.get(
            "CORS_ORIGIN_REGEX",
            r"^https?://.*\.(tunnelmole\.net|trycloudflare\.com|loca\.lt)$",
        )
    )
    headers = (
        ["*"]
        if env != "production"
        else ["Authorization", "Content-Type", "Bypass-Tunnel-Reminder", "X-Requested-With", "Accept"]
    )
    return origins, origin_regex, headers


def _register_routes(app: FastAPI) -> None:
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
    app.include_router(mapbox_directions_router)
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
    app.include_router(apple_iap_payments_router)
    app.include_router(family_router)
    app.include_router(photo_reports_router)
    app.include_router(place_alerts_router)
    app.include_router(commute_routes_router)
    app.include_router(legal_router)
    app.include_router(weather_router)
    app.include_router(gas_prices_router)
    app.include_router(referrals_router)
    app.include_router(orion_voice_router)

def _production_supabase_readiness() -> dict:
    """Supabase connectivity check — can block on network; use /health/ready, not /health."""
    try:
        sb = get_supabase()
        sb.table("profiles").select("id").limit(1).execute()
        return {"status": "ok", "ready": True}
    except Exception:
        return {"status": "degraded", "ready": False}


def _build_health_response() -> dict:
    mapbox_ok = bool(mapbox_token_from_env())
    checks = {
        "database": "ok",
        "cache": "unknown",
        "supabase_env": _supabase_env_health_hint(),
        "mapbox_routes_configured": bool(mapbox_ok),
    }
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


def _build_env_check_response() -> dict:
    """Verify .env is loaded and key vars are set (no secrets returned)."""
    if IS_PRODUCTION:
        return {"ok": False, "message": "Not available in production"}

    key_path = os.environ.get("MAPKIT_PRIVATE_KEY_PATH", "")
    key_path_abs = (
        key_path
        if (key_path and os.path.isabs(key_path))
        else str(Path(__file__).resolve().parent / (key_path or ""))
    )

    mapkit_key_id = (os.environ.get("MAPKIT_KEY_ID") or "").strip()
    mapkit_team_id = (os.environ.get("MAPKIT_TEAM_ID") or "").strip()
    google_key = (
        os.environ.get("GOOGLE_PLACES_API_KEY")
        or os.environ.get("GOOGLE_MAPS_API_KEY")
        or ""
    ).strip()

    return {
        "env_file_path": str(Path(__file__).resolve().parent / ".env"),
        "env_file_exists": (Path(__file__).resolve().parent / ".env").is_file(),
        "jwt_configured": bool(JWT_SECRET),
        "supabase_configured": bool(
            (SUPABASE_URL or "").strip() and (SUPABASE_SERVICE_ROLE_KEY or "").strip()
        ),
        "mapkit_configured": bool(
            mapkit_key_id and mapkit_team_id and key_path and os.path.isfile(key_path_abs)
        ),
        "google_maps_configured": bool(google_key),
        "orion_llm_configured": is_llm_configured(),
        "nvidia_configured": bool(NVIDIA_API_KEY),
        "openai_configured": bool((OPENAI_API_KEY or "").strip()),
        "elevenlabs_configured": bool((os.environ.get("ELEVENLABS_API_KEY") or "").strip()),
        "ohgo_cameras_configured": bool((OHGO_API_KEY or "").strip()),
        "mapbox_routes_configured": bool(mapbox_token_from_env()),
    }


def _truthy_env(name: str) -> bool:
    return (os.getenv(name) or "").strip().lower() in ("1", "true", "yes")


def _non_negative_int_env(name: str, default: int = 0) -> int:
    raw = (os.getenv(name) or "").strip()
    if not raw:
        return default
    try:
        return max(0, int(raw))
    except ValueError:
        return default


@asynccontextmanager
async def _commute_embedded_lifespan(app: FastAPI):
    tasks: list[asyncio.Task] = []
    try:
        scan_iv = _non_negative_int_env("COMMUTE_EMBEDDED_SCAN_INTERVAL_SEC", 0)
        traffic_iv = _non_negative_int_env("COMMUTE_EMBEDDED_TRAFFIC_INTERVAL_SEC", 0)
        if _truthy_env("COMMUTE_EMBEDDED_DISPATCH"):
            if scan_iv <= 0:
                scan_iv = 180
            if traffic_iv <= 0:
                traffic_iv = 600

        if scan_iv <= 0 and traffic_iv <= 0:
            yield
            return

        from routes.commute_routes import run_commute_scan_dispatch_tick
        from routes.commute_routes import run_commute_traffic_dispatch_tick

        async def _tick_loop(label: str, interval_sec: int, fn):
            await asyncio.sleep(min(12, max(1, interval_sec)))
            while True:
                try:
                    await asyncio.to_thread(fn)
                except asyncio.CancelledError:
                    raise
                except Exception as exc:
                    logger.warning("commute embedded %s dispatch failed: %s", label, exc)
                await asyncio.sleep(interval_sec)

        if scan_iv > 0:
            tasks.append(asyncio.create_task(_tick_loop("scan", scan_iv, run_commute_scan_dispatch_tick)))
        if traffic_iv > 0:
            tasks.append(asyncio.create_task(_tick_loop("traffic", traffic_iv, run_commute_traffic_dispatch_tick)))

        logger.info(
            "commute embedded ticker enabled (scan every %ss, traffic every %ss)",
            scan_iv if scan_iv > 0 else "off",
            traffic_iv if traffic_iv > 0 else "off",
        )
        yield
    finally:
        for t in tasks:
            t.cancel()
            try:
                await t
            except asyncio.CancelledError:
                pass
            except Exception as exc:
                logger.debug("commute embedded task cancel: %s", exc)


def create_app() -> FastAPI:
    env = os.getenv("ENVIRONMENT", "development")
    is_prod = env.strip().lower() == "production"
    validate_production_env()
    app = FastAPI(
        title=API_TITLE,
        docs_url=None if is_prod else "/docs",
        redoc_url=None if is_prod else "/redoc",
        openapi_url=None if is_prod else "/openapi.json",
        lifespan=_commute_embedded_lifespan,
    )

    app.add_middleware(SecurityHeadersMiddleware)
    _maybe_add_https_redirect(app, env)
    _register_exception_handlers(app)

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    _add_telemetry_middleware(app)

    @app.get("/")
    def root():
        if is_prod:
            return {"message": API_TITLE}
        return {"message": API_TITLE, "docs": "/docs", "redoc": "/redoc"}

    @app.get("/health")
    def health():
        # Liveness for Railway/load balancers: must answer immediately. Production used to ping
        # Supabase here; stalls/timeouts caused deploy healthchecks to return 503 ("service unavailable").
        if IS_PRODUCTION:
            return {"status": "ok", "live": True}
        return _build_health_response()

    @app.get("/health/ready")
    def health_ready():
        """Readiness — includes Supabase round-trip (may be slow). Prefer /health for probes."""
        if IS_PRODUCTION:
            return _production_supabase_readiness()
        return _build_health_response()

    @app.get("/api/health")
    def api_health():
        """Public, unauthenticated SLO-driven health for uptime probes / load
        balancers. ok / degraded / down derived from the in-memory telemetry
        buffer (no DB hit on every probe). Returns 200 in all cases — the
        body's `status` field is the signal."""
        from services import slo

        events = telemetry_service.snapshot(limit=500)
        api = slo.compute_api_rates_from_telemetry(events)
        return {
            "status": slo.health_status(api["success_rate"]),
            "api_success_rate": api["success_rate"],
            "error_rate": api["error_rate"],
            "samples": api["total"],
            "timestamp": telemetry_service.now_iso(),
        }

    @app.get("/api/env-check")
    def env_check():
        return _build_env_check_response()

    origins, origin_regex, cors_headers = _cors_settings(env)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_origin_regex=origin_regex,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=cors_headers,
    )

    _register_routes(app)
    return app


# Create app instance for uvicorn
app = create_app()

if __name__ == "__main__":
    import uvicorn

    # Bind loopback by default (Sonar/security). Containers use docker-entrypoint / explicit --host 0.0.0.0.
    _host = (os.environ.get("UVICORN_HOST") or "127.0.0.1").strip()
    uvicorn.run("main:app", host=_host, port=8001, reload=True)

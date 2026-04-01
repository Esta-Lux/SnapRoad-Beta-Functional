import base64
import json
import logging
import os
from datetime import date
from typing import Optional
from urllib.parse import urlparse

from fastapi import APIRouter, HTTPException
from starlette.requests import Request
from models.schemas import SignupRequest, LoginRequest, ForgotPasswordRequest, ResendVerificationRequest
from middleware.auth import create_access_token
from config import SUPABASE_URL
from database import get_supabase
from services.supabase_service import (
    sb_create_user,
    sb_get_user_by_email,
    sb_login_user,
    sb_get_auth_user_from_access_token,
    sb_update_profile,
)
from limiter import limiter

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth", tags=["Authentication"])
IS_PRODUCTION = os.getenv("ENVIRONMENT", "development").strip().lower() == "production"
ALLOW_MOCK_AUTH = (
    not IS_PRODUCTION
    and os.getenv("ALLOW_MOCK_AUTH", "false").strip().lower() in ("1", "true", "yes")
)


def _jwt_payload_unverified(token: str) -> dict:
    """Decode JWT payload without verification (read iss only)."""
    parts = (token or "").strip().split(".")
    if len(parts) < 2:
        return {}
    pad = "=" * (-len(parts[1]) % 4)
    try:
        return json.loads(base64.urlsafe_b64decode(parts[1] + pad))
    except Exception:
        return {}


def _host_from_http_url(url: str) -> str:
    try:
        return (urlparse(url or "").hostname or "").lower()
    except Exception:
        return ""


def _build_token(user_dict: dict) -> str:
    return create_access_token({
        "sub": str(user_dict.get("id", "")),
        "email": str(user_dict.get("email", "")),
        "role": str(user_dict.get("role", "user")),
    })


def _parse_and_validate_dob(raw_value: Optional[str]) -> date:
    value = str(raw_value or "").strip()
    if not value:
        raise HTTPException(status_code=400, detail="Date of birth is required")
    try:
        dob = date.fromisoformat(value)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="date_of_birth must use YYYY-MM-DD format") from exc
    today = date.today()
    age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    if age < 16:
        raise HTTPException(
            status_code=400,
            detail="You must be at least 16 years old to use SnapRoad",
        )
    return dob


def _clean(user: dict) -> dict:
    """Return a JSON-serializable user dict (no secrets, no UUIDs)."""
    out = {}
    for k, v in user.items():
        if k in ("password_hash", "password"):
            continue
        if hasattr(v, "__str__") and not isinstance(v, (str, int, float, bool, list, dict, type(None))):
            out[k] = str(v)
        else:
            out[k] = v
    return out


@router.post("/signup")
@limiter.limit("5/minute")
def signup(request: Request, body: SignupRequest):
    # Supabase only (no mock fallback)
    email = (body.email or "").strip().lower()
    name = (body.name or body.full_name or "").strip()
    dob = _parse_and_validate_dob(body.date_of_birth)
    if not name:
        raise HTTPException(status_code=400, detail="Name is required")
    try:
        existing = sb_get_user_by_email(email)
        if existing:
            raise HTTPException(
                status_code=409,
                detail="This email is already registered. Use Sign in instead.",
            )
        user = sb_create_user(email, body.password, name, "driver")
        sb_update_profile(str(user.get("id") or ""), {"date_of_birth": dob.isoformat()})
        token = _build_token(user)
        logger.info(f"Supabase signup: {email}")
        return {"success": True, "data": {"user": _clean(user), "token": token}}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Supabase signup failed: %s", e)
        raise HTTPException(status_code=503, detail="Authentication service unavailable")


@router.post("/login")
@limiter.limit("10/minute")
def login(request: Request, body: LoginRequest):
    sb_error: Optional[str] = None
    email = (body.email or "").strip().lower()

    # Supabase only (no mock fallback)
    try:
        sb_user, sb_error = sb_login_user(email, body.password)
        if sb_user:
            # Double-check the role by fetching profile again to avoid RLS issues
            profile = sb_get_user_by_email(email)
            if profile:
                sb_user = profile
                logger.info(f"Supabase login: {email}, role={profile.get('role')}")
            token = _build_token(sb_user)
            return {"success": True, "data": {"user": _clean(sb_user), "token": token}}
        if sb_error:
            logger.warning(f"Supabase login failed for {email}: {sb_error}")
    except Exception as e:
        logger.warning(f"Supabase login error: {e}")
        sb_error = str(e)

    detail = "Invalid email or password"
    if sb_error and "invalid email or password" not in sb_error.lower():
        raise HTTPException(status_code=503, detail="Authentication service unavailable")
    raise HTTPException(status_code=401, detail=detail)


@router.post("/oauth/supabase")
@limiter.limit("10/minute")
def oauth_supabase(request: Request, payload: dict):
    """
    Exchange a Supabase access token (OAuth session) for a SnapRoad JWT.
    Frontend uses Supabase OAuth (Google/Apple), then calls this endpoint.
    """
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Invalid payload")

    # Accept multiple common frontend shapes:
    # { access_token }, { accessToken }, { token }, { session: { access_token } }
    session = payload.get("session") if isinstance(payload.get("session"), dict) else {}
    access_token = str(
        payload.get("access_token")
        or payload.get("accessToken")
        or payload.get("token")
        or session.get("access_token")
        or ""
    ).strip()
    if not access_token:
        raise HTTPException(status_code=400, detail="Missing access_token")

    # 1. Validate token with Supabase Auth and fetch identity
    try:
        auth_user = sb_get_auth_user_from_access_token(access_token)
    except Exception as e:
        logger.warning("oauth_supabase token validation error: %s", e)
        auth_user = None
    if not auth_user or not auth_user.get("email"):
        pl = _jwt_payload_unverified(access_token)
        iss = str(pl.get("iss") or "")
        api_host = _host_from_http_url(SUPABASE_URL or "")
        iss_host = _host_from_http_url(iss) if iss.startswith("http") else ""
        if api_host and iss_host and api_host != iss_host:
            logger.warning(
                "oauth_supabase project mismatch: jwt_host=%s api_host=%s",
                iss_host,
                api_host,
            )
            raise HTTPException(
                status_code=401,
                detail=(
                    "Invalid Supabase session: the browser signed in to a different Supabase project than this API. "
                    "Set Vercel VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to the same project as Railway SUPABASE_URL "
                    "(compare project ref with GET /api/config/supabase)."
                ),
            )
        raise HTTPException(
            status_code=401,
            detail=(
                "Invalid Supabase session (expired or invalid token). "
                "Retry sign-in; if OAuth keeps failing while email login works, align Supabase env vars across Vercel and Railway."
            ),
        )

    email = str(auth_user["email"])
    uid = str(auth_user.get("id") or "")
    meta = auth_user.get("user_metadata") or {}
    name = (
        str(meta.get("full_name") or meta.get("name") or meta.get("preferred_username") or "").strip()
        or email.split("@")[0]
    )

    # 2. Ensure we have a profile row. Prefer id match, fallback to email.
    try:
        profile = sb_get_user_by_email(email) or {}
        if not profile:
            raise HTTPException(
                status_code=403,
                detail=(
                    "OAuth sign-up is not available yet. Create your account with email and password first, "
                    "including date of birth verification, then you can sign in."
                ),
            )

        status = str(profile.get("status") or "active").strip().lower()
        if status in {"deleted", "deactivated", "suspended", "disabled"}:
            raise HTTPException(status_code=403, detail="This account is unavailable")

        # Ensure id is present for JWT.
        if not profile.get("id") and uid:
            profile["id"] = uid

        token = _build_token(profile)
        return {"success": True, "data": {"user": _clean(profile), "token": token}}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("oauth_supabase profile sync failed: %s", e)
        raise HTTPException(status_code=503, detail="Authentication service unavailable")


@router.post("/forgot-password")
@limiter.limit("5/minute")
def forgot_password(request: Request, body: ForgotPasswordRequest):
    email = (body.email or "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    # Keep response generic to avoid account enumeration.
    generic_ok = {
        "success": True,
        "data": {"message": "If an account exists, a reset email has been sent."},
    }

    try:
        sb = get_supabase()
        options = {"redirect_to": "snaproad://reset-password"}
        # Prefer reset_password_for_email (recovery). Older reset_password_email can mis-route templates.
        if hasattr(sb.auth, "reset_password_for_email"):
            sb.auth.reset_password_for_email(email, options)
        elif hasattr(sb.auth, "reset_password_email"):
            sb.auth.reset_password_email(email, options)
        else:
            logger.warning("Supabase client missing password reset method")
        return generic_ok
    except Exception as e:
        logger.warning("forgot_password failed for %s: %s", email, e)
        # Return generic success to avoid leaking account existence/system state.
        return generic_ok


@router.post("/resend-verification")
@limiter.limit("5/minute")
def resend_verification(request: Request, body: ResendVerificationRequest):
    email = (body.email or "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    generic_ok = {
        "success": True,
        "data": {"message": "If an account exists, a verification email has been sent."},
    }

    try:
        sb = get_supabase()
        # Support multiple supabase-py versions.
        if hasattr(sb.auth, "resend"):
            sb.auth.resend({"type": "signup", "email": email, "options": {"email_redirect_to": "snaproad://auth"}})
        elif hasattr(sb.auth, "resend_signup_confirmation"):
            sb.auth.resend_signup_confirmation(email)
        else:
            logger.warning("Supabase client missing resend verification method")
        return generic_ok
    except Exception as e:
        logger.warning("resend_verification failed for %s: %s", email, e)
        return generic_ok

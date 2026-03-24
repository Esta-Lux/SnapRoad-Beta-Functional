import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
from models.schemas import SignupRequest, LoginRequest
from middleware.auth import create_access_token
from database import get_supabase
from services.supabase_service import (
    sb_create_user,
    sb_get_user_by_email,
    sb_login_user,
    sb_get_auth_user_from_access_token,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth", tags=["Authentication"])


def _build_token(user_dict: dict) -> str:
    return create_access_token({
        "sub": str(user_dict.get("id", "")),
        "email": str(user_dict.get("email", "")),
        "role": str(user_dict.get("role", "user")),
    })


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
def signup(request: SignupRequest):
    # Supabase only (no mock fallback)
    try:
        existing = sb_get_user_by_email(request.email)
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        user = sb_create_user(request.email, request.password, request.name, "driver")
        token = _build_token(user)
        logger.info(f"Supabase signup: {request.email}")
        return {"success": True, "data": {"user": _clean(user), "token": token}}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Supabase signup failed: %s", e)
        raise HTTPException(status_code=503, detail="Authentication service unavailable")


@router.post("/login")
def login(request: LoginRequest):
    sb_error: Optional[str] = None

    # Supabase only (no mock fallback)
    try:
        sb_user, sb_error = sb_login_user(request.email, request.password)
        if sb_user:
            # Double-check the role by fetching profile again to avoid RLS issues
            profile = sb_get_user_by_email(request.email)
            if profile:
                sb_user = profile
                logger.info(f"Supabase login: {request.email}, role={profile.get('role')}")
            token = _build_token(sb_user)
            return {"success": True, "data": {"user": _clean(sb_user), "token": token}}
        if sb_error:
            logger.warning(f"Supabase login failed for {request.email}: {sb_error}")
    except Exception as e:
        logger.warning(f"Supabase login error: {e}")
        sb_error = str(e)

    detail = "Invalid email or password"
    if sb_error and "invalid email or password" not in sb_error.lower():
        raise HTTPException(status_code=503, detail="Authentication service unavailable")
    raise HTTPException(status_code=401, detail=detail)


@router.post("/oauth/supabase")
def oauth_supabase(payload: dict):
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
        raise HTTPException(status_code=401, detail="Invalid Supabase session")

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
            # Create a minimal profile. We don't store a password hash for OAuth.
            sb = get_supabase()
            profile = {
                "id": uid or None,
                "email": email,
                "name": name,
                "role": "driver",
                "status": "active",
                "xp": 0,
                "level": 1,
                "gems": 0,
            }
            sb.table("profiles").upsert(profile).execute()
            profile = sb_get_user_by_email(email) or profile

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

from datetime import datetime, timedelta, timezone
import logging
import os
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRY_HOURS
from services.supabase_service import sb_get_auth_user_from_access_token, sb_get_profile
from services.premium_access import profile_row_is_premium

logger = logging.getLogger(__name__)
ALLOW_MOCK_AUTH = os.getenv("ALLOW_MOCK_AUTH", "false").strip().lower() in ("1", "true", "yes")
ENABLE_MOCK_BEARER_AUTH = os.getenv("ENABLE_MOCK_BEARER_AUTH", "false").strip().lower() in (
    "1",
    "true",
    "yes",
)


def _mock_bearer_allowed() -> bool:
    """mock_token_* accepted only when explicitly enabled (and never in production — guarded at startup)."""
    return ENABLE_MOCK_BEARER_AUTH or ALLOW_MOCK_AUTH

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    if not (JWT_SECRET or "").strip():
        raise HTTPException(
            status_code=503,
            detail="Server JWT_SECRET is not set. Add it to app/backend/.env (not EAS; the API runs locally).",
        )
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(hours=JWT_EXPIRY_HOURS))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )


def _decode_snaproad_access_token(token: str) -> Optional[dict]:
    """
    HS256 JWT issued by /api/auth/login|signup (not a Supabase access token).
    Checked first so we do not send SnapRoad tokens to Supabase Auth on every request.
    """
    if not (JWT_SECRET or "").strip():
        return None
    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM],
            options={"verify_exp": True},
        )
    except JWTError:
        return None
    user_id = payload.get("sub")
    if user_id is None or not str(user_id).strip():
        return None
    return {
        "id": str(user_id),
        "user_id": str(user_id),
        "email": payload.get("email"),
        "role": payload.get("role", "user"),
        "partner_id": payload.get("partner_id"),
    }


def _user_from_bearer_token(token: str) -> Optional[dict]:
    """Resolve SnapRoad JWT, Supabase session, or dev mock token. Returns None if invalid."""
    if not token or not str(token).strip():
        return None
    token = str(token).strip()

    snaproad = _decode_snaproad_access_token(token)
    if snaproad:
        return snaproad

    supabase_user = sb_get_auth_user_from_access_token(token)
    if supabase_user and supabase_user.get("id"):
        user_id = str(supabase_user.get("id"))
        profile = sb_get_profile(user_id) or {}
        plan = str(profile.get("plan") or "basic").strip().lower()
        return {
            "id": user_id,
            "user_id": user_id,
            "email": supabase_user.get("email") or profile.get("email"),
            "role": profile.get("role", "user"),
            "partner_id": profile.get("partner_id"),
            "plan": plan,
            "is_premium": profile_row_is_premium(profile),
        }

    if os.getenv("ENVIRONMENT", "development").strip().lower() != "production" and _mock_bearer_allowed():
        if token.startswith("mock_token_"):
            logger.warning("Mock token used in development mode")
            user_id = token.replace("mock_token_", "")
            return {"id": user_id, "user_id": user_id, "role": "user"}
    return None


def merge_profile_entitlements_into_user(user: dict) -> dict:
    """
    SnapRoad JWT and mock tokens omit plan / is_premium. Merge from Supabase profiles
    so routes using _is_premium(token user) match GET /api/user/profile.
    """
    uid = str(user.get("user_id") or user.get("id") or "").strip()
    if not uid:
        return user
    try:
        prof = sb_get_profile(uid)
        if not prof:
            return user
        out = {**user}
        plan = str(prof.get("plan") or "basic").strip().lower()
        out["plan"] = plan
        out["is_premium"] = profile_row_is_premium(prof)
        # Authoritative privileged claims (JWT may be stale after role changes).
        r = prof.get("role")
        if r is not None and str(r).strip():
            out["role"] = str(r).strip()
        if "partner_id" in prof:
            out["partner_id"] = prof.get("partner_id")
        return out
    except Exception:
        logger.debug("merge_profile_entitlements_into_user skipped", exc_info=True)
        return user


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Authentication required")
    user = _user_from_bearer_token(credentials.credentials)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return merge_profile_entitlements_into_user(user)


async def get_current_user_optional(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Same resolution as get_current_user but returns None when unauthenticated or invalid."""
    if not credentials or not credentials.credentials:
        return None
    u = _user_from_bearer_token(credentials.credentials)
    return merge_profile_entitlements_into_user(u) if u else None


def user_id_from_payload(payload: dict) -> str:
    return str(payload.get("sub") or payload.get("user_id") or payload.get("id") or "").strip()


def db_user_has_admin_role(user_id: str) -> bool:
    if not user_id:
        return False
    prof = sb_get_profile(user_id)
    if not prof:
        return False
    role = str(prof.get("role") or "").strip().lower()
    return role in ("admin", "super_admin")


def db_user_is_partner_for(user_id: str, partner_id: str) -> bool:
    if not user_id or not partner_id:
        return False
    prof = sb_get_profile(user_id)
    if not prof:
        return False
    if str(prof.get("role") or "").strip().lower() != "partner":
        return False
    return str(prof.get("partner_id") or "") == str(partner_id)


async def require_admin(user: dict = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    uid = str(user.get("user_id") or user.get("id") or "").strip()
    if not db_user_has_admin_role(uid):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


async def require_partner(user: dict = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    uid = str(user.get("user_id") or user.get("id") or "").strip()
    partner_id = user.get("partner_id")
    if not partner_id:
        raise HTTPException(status_code=403, detail="No partner_id in profile")
    if not db_user_is_partner_for(uid, str(partner_id)):
        raise HTTPException(status_code=403, detail="Partner access required")
    return user

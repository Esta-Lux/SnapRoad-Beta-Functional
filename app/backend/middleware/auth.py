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

logger = logging.getLogger(__name__)
ALLOW_MOCK_AUTH = os.getenv("ALLOW_MOCK_AUTH", "false").strip().lower() in ("1", "true", "yes")

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


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Authentication required")
    token = credentials.credentials.strip()

    snaproad = _decode_snaproad_access_token(token)
    if snaproad:
        return snaproad

    # Supabase access token (OAuth / mobile Supabase session)
    supabase_user = sb_get_auth_user_from_access_token(token)
    if supabase_user and supabase_user.get("id"):
        user_id = str(supabase_user.get("id"))
        profile = sb_get_profile(user_id) or {}
        return {
            "id": user_id,
            "user_id": user_id,
            "email": supabase_user.get("email") or profile.get("email"),
            "role": profile.get("role", "user"),
            "partner_id": profile.get("partner_id"),
        }

    # Optional development-only mock token support.
    if os.getenv("ENVIRONMENT") != "production" and ALLOW_MOCK_AUTH:
        if token and token.startswith("mock_token_"):
            logger.warning("Mock token used in development mode")
            user_id = token.replace("mock_token_", "")
            return {"id": user_id, "user_id": user_id, "role": "user"}
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def require_admin(user: dict = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    role = user.get("role")
    if role not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


async def require_partner(user: dict = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    if user.get("role") != "partner":
        raise HTTPException(status_code=403, detail="Partner access required")
    if not user.get("partner_id"):
        raise HTTPException(status_code=403, detail="No partner_id in token")
    return user

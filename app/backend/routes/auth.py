import logging
from fastapi import APIRouter, HTTPException
from models.schemas import SignupRequest, LoginRequest
from services.mock_data import users_db, user_credentials, create_new_user
from middleware.auth import create_access_token
from services.supabase_service import sb_create_user, sb_get_user_by_email, sb_login_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth", tags=["Authentication"])


def _build_token(user_dict: dict) -> str:
    return create_access_token({
        "sub": str(user_dict.get("id", "")),
        "email": user_dict.get("email", ""),
        "role": user_dict.get("role", "user"),
    })


def _clean(user: dict) -> dict:
    return {k: v for k, v in user.items() if k not in ("password_hash", "password")}


@router.post("/signup")
def signup(request: SignupRequest):
    # 1. Try Supabase first
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
        logger.warning(f"Supabase signup failed, using mock: {e}")

    # 2. Mock fallback
    if request.email in user_credentials:
        raise HTTPException(status_code=400, detail="Email already registered")
    from services.mock_data import next_user_id
    new_id = str(next_user_id)
    user_credentials[request.email] = {"password": request.password, "user_id": new_id}
    users_db[new_id] = create_new_user(new_id, request.name, request.email)
    token = create_access_token({"sub": new_id, "email": request.email, "role": "user"})
    return {"success": True, "data": {"user": _clean(users_db[new_id]), "token": token}}


@router.post("/login")
def login(request: LoginRequest):
    sb_error: str | None = None

    # 1. Try Supabase auth
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

    # 2. Mock fallback
    cred = user_credentials.get(request.email)
    if not cred or cred["password"] != request.password:
        detail = "Invalid email or password"
        if sb_error:
            logger.info(f"Both Supabase and mock failed for {request.email}. Supabase reason: {sb_error}")
        raise HTTPException(status_code=401, detail=detail)

    uid = cred["user_id"]
    user = users_db.get(uid, {})
    token = create_access_token({"sub": uid, "email": request.email, "role": "user"})
    return {"success": True, "data": {"user": _clean(user), "token": token}}

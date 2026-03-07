import logging
from fastapi import APIRouter, HTTPException
from models.schemas import SignupRequest, LoginRequest
from services.mock_data import users_db, user_credentials, create_new_user
from middleware.auth import create_access_token
from config import SUPABASE_URL, SUPABASE_SECRET_KEY
from services.supabase_service import sb_create_user, sb_get_user_by_email, sb_login_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth", tags=["Authentication"])

def _supabase_configured() -> bool:
    return bool((SUPABASE_URL or "").strip() and (SUPABASE_SECRET_KEY or "").strip())


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
    try:
        # 1. Try Supabase first (only when configured)
        if _supabase_configured():
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
                logger.warning("Supabase signup failed, using mock: %s", e)

        # 2. Mock fallback
        if request.email in user_credentials:
            raise HTTPException(status_code=400, detail="Email already registered")
        import services.mock_data as mock_data
        new_id = str(mock_data.next_user_id)
        mock_data.next_user_id += 1
        user_credentials[request.email] = {"password": request.password, "user_id": new_id}
        users_db[new_id] = create_new_user(new_id, request.name, request.email)
        token = create_access_token({"sub": new_id, "email": request.email, "role": "user"})
        return {"success": True, "data": {"user": _clean(users_db[new_id]), "token": token}}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Signup failed: %s", e)
        raise HTTPException(status_code=500, detail="Signup failed. Please try again.")


@router.post("/login")
def login(request: LoginRequest):
    try:
        # 1. Try Supabase auth (only when configured)
        if _supabase_configured():
            try:
                sb_user = sb_login_user(request.email, request.password)
                if sb_user:
                    token = _build_token(sb_user)
                    logger.info("Supabase login: %s", request.email)
                    return {"success": True, "data": {"user": _clean(sb_user), "token": token}}
            except Exception as e:
                logger.warning("Supabase login error: %s", e)

        # 2. Mock fallback
        cred = user_credentials.get(request.email)
        if not cred or cred["password"] != request.password:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        uid = cred["user_id"]
        user = users_db.get(uid, {})
        token = create_access_token({"sub": uid, "email": request.email, "role": "user"})
        return {"success": True, "data": {"user": _clean(user), "token": token}}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Login failed: %s", e)
        raise HTTPException(status_code=500, detail="Login failed. Please try again.")

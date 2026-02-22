from fastapi import APIRouter, HTTPException
from models.schemas import SignupRequest, LoginRequest
from services.mock_data import users_db, user_credentials, current_user_id, create_new_user, next_user_id
from middleware.auth import get_password_hash, verify_password, create_access_token

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/signup")
def signup(request: SignupRequest):
    global next_user_id
    from services.mock_data import next_user_id as nuid
    if request.email in user_credentials:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_id = str(nuid)
    nuid += 1

    user_credentials[request.email] = {
        "password": request.password,
        "user_id": new_id,
    }
    users_db[new_id] = create_new_user(new_id, request.name, request.email)

    token = create_access_token({"sub": new_id, "email": request.email, "role": "user"})
    return {
        "success": True,
        "data": {
            "user": {k: v for k, v in users_db[new_id].items() if k != "password_hash"},
            "token": token,
        },
    }


@router.post("/login")
def login(request: LoginRequest):
    cred = user_credentials.get(request.email)
    if not cred or cred["password"] != request.password:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    uid = cred["user_id"]
    user = users_db.get(uid, {})
    token = create_access_token({"sub": uid, "email": request.email, "role": "user"})
    return {
        "success": True,
        "data": {
            "user": {k: v for k, v in user.items() if k != "password_hash"},
            "token": token,
        },
    }

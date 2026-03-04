"""
MapKit JS token endpoint. Returns a JWT signed with your Apple MapKit private key.
The key is read from env or file only — never committed to the repo.
"""
import os
import time
from typing import Optional

from fastapi import APIRouter, Query

router = APIRouter(prefix="/api", tags=["MapKit"])


def _get_private_key() -> Optional[str]:
    path = os.environ.get("MAPKIT_PRIVATE_KEY_PATH")
    if path and os.path.isfile(path):
        with open(path, "r") as f:
            return f.read()
    raw = os.environ.get("MAPKIT_PRIVATE_KEY")
    if raw:
        return raw.replace("\\n", "\n")
    return None


@router.get("/mapkit/token")
def get_mapkit_token(origin: str = Query(..., description="Allowed origin, e.g. http://localhost:3000 or https://yourapp.com")):
    """
    Returns a JWT for MapKit JS. Frontend calls this and passes the token to mapkit.init().
    Requires env: MAPKIT_KEY_ID, MAPKIT_TEAM_ID, and either MAPKIT_PRIVATE_KEY or MAPKIT_PRIVATE_KEY_PATH.
    """
    key_id = os.environ.get("MAPKIT_KEY_ID")
    team_id = os.environ.get("MAPKIT_TEAM_ID")
    private_key = _get_private_key()

    if not key_id or not team_id or not private_key:
        return {
            "success": False,
            "error": "MapKit not configured. Set MAPKIT_KEY_ID, MAPKIT_TEAM_ID, and MAPKIT_PRIVATE_KEY (or MAPKIT_PRIVATE_KEY_PATH) in .env",
        }

    try:
        import jwt
        now = int(time.time())
        payload = {
            "iss": team_id,
            "iat": now,
            "exp": now + 3600 * 12,
            "origin": origin.strip(),
        }
        token = jwt.encode(
            payload,
            private_key,
            algorithm="ES256",
            headers={"kid": key_id},
        )
        if hasattr(token, "decode"):
            token = token.decode("utf-8")
        return {"success": True, "token": token}
    except Exception as e:
        return {"success": False, "error": str(e)}

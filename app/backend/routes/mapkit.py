"""
MapKit JS token endpoint. Returns a JWT signed with your Apple MapKit private key.
The key is read from env or file only — never committed to the repo.
"""
import os
import re
import textwrap
import time
import logging
from typing import Optional

from fastapi import APIRouter, Query

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["MapKit"])


def _get_private_key() -> Optional[str]:
    path = os.environ.get("MAPKIT_PRIVATE_KEY_PATH")
    if path and os.path.isfile(path):
        with open(path, "r") as f:
            return f.read()

    raw = os.environ.get("MAPKIT_PRIVATE_KEY")
    if not raw:
        return None

    if "\n" in raw and "\\n" not in raw:
        key = raw
    else:
        key = raw.replace("\\n", "\n")

    key = key.strip()

    m = re.match(
        r"(-----BEGIN [A-Z ]+-----)\s*(.*?)\s*(-----END [A-Z ]+-----)",
        key,
        re.DOTALL,
    )
    if m:
        header, body_raw, footer = m.group(1), m.group(2), m.group(3)
        body = re.sub(r"\s+", "", body_raw)
        wrapped = "\n".join(textwrap.wrap(body, 64))
        key = f"{header}\n{wrapped}\n{footer}\n"

    return key


@router.get("/mapkit/token")
def get_mapkit_token(origin: str = Query(..., description="Allowed origin, e.g. http://localhost:3000 or https://yourapp.com")):
    """
    Returns a JWT for MapKit JS. Frontend calls this and passes the token to mapkit.init().
    Requires env: MAPKIT_KEY_ID, MAPKIT_TEAM_ID, and either MAPKIT_PRIVATE_KEY or MAPKIT_PRIVATE_KEY_PATH.
    """
    key_id = os.environ.get("MAPKIT_KEY_ID")
    team_id = os.environ.get("MAPKIT_TEAM_ID")
    private_key = _get_private_key()

    missing = []
    if not key_id:
        missing.append("MAPKIT_KEY_ID")
    if not team_id:
        missing.append("MAPKIT_TEAM_ID")
    if not private_key:
        missing.append("MAPKIT_PRIVATE_KEY")

    if missing:
        msg = f"MapKit not configured. Missing env vars: {', '.join(missing)}"
        logger.warning(msg)
        return {"success": False, "error": msg}

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
        logger.info(f"MapKit token generated for origin={origin.strip()}")
        return {"success": True, "token": token}
    except Exception as e:
        logger.error(f"MapKit JWT signing failed: {e}", exc_info=True)
        return {"success": False, "error": f"JWT signing failed: {e}"}

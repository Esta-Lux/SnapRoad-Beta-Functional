"""Supabase Auth Admin: invite user with redirect_to (dashboard invite cannot)."""
import logging
from typing import Any, Optional, Tuple

import httpx

from config import SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL

logger = logging.getLogger(__name__)


def supabase_auth_invite_user(email: str, redirect_to: str) -> Tuple[bool, str, Optional[dict[str, Any]]]:
    """
    POST /auth/v1/invite with service role.
    Returns (ok, message_for_client, raw_json_or_none).
    """
    url = (SUPABASE_URL or "").strip().rstrip("/")
    key = (SUPABASE_SERVICE_ROLE_KEY or "").strip()
    if not url or not key:
        return False, "Supabase service credentials are not configured on the API", None

    invite_url = f"{url}/auth/v1/invite"
    payload = {"email": (email or "").strip().lower(), "redirect_to": (redirect_to or "").strip()}

    try:
        with httpx.Client(timeout=30.0) as client:
            r = client.post(
                invite_url,
                headers={
                    "apikey": key,
                    "Authorization": f"Bearer {key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
    except Exception as e:
        logger.warning("supabase invite request failed: %s", e)
        return False, "Could not reach authentication service", None

    try:
        data = r.json() if r.content else {}
    except Exception:
        data = {}

    if r.status_code < 400:
        return True, "Invite sent", data if isinstance(data, dict) else None

    # Common: user already registered
    msg = data.get("msg") or data.get("message") or data.get("error_description") or r.text or "Invite failed"
    if isinstance(msg, dict):
        msg = str(msg)
    logger.info("supabase invite rejected (%s): %s", r.status_code, str(msg)[:200])
    return False, str(msg), data if isinstance(data, dict) else None

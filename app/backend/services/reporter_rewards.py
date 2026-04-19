"""Gems + XP for users whose road/photo reports are confirmed by others."""
from __future__ import annotations

import logging
from typing import Any, Optional

from config import ENVIRONMENT
from services.mock_data import users_db
from services.supabase_service import sb_get_profile, sb_update_profile

logger = logging.getLogger(__name__)

REPORT_CONFIRMATION_GEMS = 15
REPORT_CONFIRMATION_XP = 15


def award_reporter_on_peer_confirmation(*, owner_id: Optional[str], voter_id: str) -> dict[str, Any]:
    """When another user upvotes/confirms a report, reward the original reporter."""
    oid = str(owner_id or "").strip()
    vid = str(voter_id or "").strip()
    if not oid or oid == vid:
        return {"awarded": False, "gems_awarded": 0, "reason": "own_report_or_missing_owner"}

    prof = sb_get_profile(oid) or {}
    try:
        current = int((prof.get("gems") if prof else 0) or 0)
    except (TypeError, ValueError):
        current = 0

    if ENVIRONMENT != "production":
        users_db.setdefault(oid, {"id": oid})
        try:
            current = int(users_db[oid].get("gems") or current)
        except (TypeError, ValueError):
            pass

    new_gems = current + REPORT_CONFIRMATION_GEMS
    ok = sb_update_profile(oid, {"gems": new_gems})
    if ENVIRONMENT != "production":
        users_db[oid]["gems"] = new_gems

    xp_result: dict = {}
    try:
        from routes.gamification import add_xp_to_user

        xp_result = add_xp_to_user(oid, REPORT_CONFIRMATION_XP)
    except Exception as e:
        logger.warning("reporter XP award failed for %s: %s", oid, e)

    if ENVIRONMENT == "production" and not ok:
        logger.warning("reporter gem award failed to persist for %s", oid)

    return {
        "awarded": True,
        "gems_awarded": REPORT_CONFIRMATION_GEMS,
        "reporter_new_gems": new_gems,
        "xp_awarded": REPORT_CONFIRMATION_XP,
        "xp_result": xp_result,
    }

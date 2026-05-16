"""
Driver Referral (beta) API.

Endpoints:
- GET  /api/referrals/me        -> dashboard payload (code, invite_url, counts, achievements, recent)
- GET  /api/referrals/recent    -> recent referral list (masked emails)
- POST /api/referrals/apply     -> attach a pending referral to the current user (deferred deep link)
- POST /api/referrals/verify    -> admin/server-side hook to mark a referral verified + award gems

All routes return `{"success": True, "data": ...}` for consistency with the rest of the API.
"""
from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from database import get_supabase
from middleware.auth import get_current_user, require_admin
from services.driver_referrals import (
    apply_referral,
    build_dashboard,
    list_recent_referrals,
    verify_referral,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/referrals", tags=["Referrals"])


class ApplyReferralBody(BaseModel):
    code: str = Field(..., min_length=1, max_length=64)


class VerifyReferralBody(BaseModel):
    referred_user_id: str = Field(..., min_length=8, max_length=64)


def _require_user_id(user: dict) -> str:
    uid = str(user.get("user_id") or user.get("id") or "").strip()
    if not uid:
        raise HTTPException(status_code=401, detail="Invalid token")
    return uid


@router.get("/me")
def get_my_referrals(user: dict = Depends(get_current_user)):
    uid = _require_user_id(user)
    try:
        sb = get_supabase()
        data = build_dashboard(sb, user_id=uid, recent_limit=10)
        return {"success": True, "data": data}
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("get_my_referrals failed: %s", exc)
        raise HTTPException(status_code=503, detail="Referral service unavailable")


@router.get("/recent")
def get_recent_referrals(
    limit: int = Query(20, ge=1, le=50),
    user: dict = Depends(get_current_user),
):
    uid = _require_user_id(user)
    try:
        sb = get_supabase()
        items = list_recent_referrals(sb, referrer_id=uid, limit=limit)
        return {"success": True, "data": items, "count": len(items)}
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("get_recent_referrals failed: %s", exc)
        raise HTTPException(status_code=503, detail="Referral service unavailable")


@router.post("/apply")
def apply_referral_endpoint(
    body: ApplyReferralBody,
    user: dict = Depends(get_current_user),
):
    """
    Attach the current authenticated user as the referred user of `code`. Used for
    deferred deep-link flows where the user was already signed up before the code
    was captured. Self-referrals, unknown codes, and duplicates return 400 with a
    descriptive reason but never throw.
    """
    uid = _require_user_id(user)
    email = str(user.get("email") or "").strip()
    code = (body.code or "").strip()
    if not code:
        raise HTTPException(status_code=422, detail="code is required")
    try:
        sb = get_supabase()
        result = apply_referral(
            sb,
            referred_user_id=uid,
            referred_email=email,
            code=code,
        )
        status = str(result.get("status") or "").lower()
        if status == "declined":
            reason = str(result.get("reason") or "invalid")
            return {
                "success": False,
                "error": reason,
                "message": _reason_message(reason),
            }
        # Apply implies the user just finished signing up (deferred deep-link
        # flow). Verify immediately — verify_referral is idempotent.
        verified = verify_referral(sb, referred_user_id=uid)
        return {
            "success": True,
            "data": {
                "status": status,
                "referral_id": (result.get("referral") or {}).get("id"),
                "verified": bool(verified),
                "gems_awarded": int((verified or {}).get("gems_awarded") or 0),
            },
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("apply_referral_endpoint failed: %s", exc)
        raise HTTPException(status_code=503, detail="Referral service unavailable")


@router.post("/verify")
def verify_referral_endpoint(
    body: VerifyReferralBody,
    _admin: dict = Depends(require_admin),
):
    """Admin-only manual verification. Idempotent — no double-award."""
    try:
        sb = get_supabase()
        result = verify_referral(sb, referred_user_id=body.referred_user_id)
        if not result:
            return {"success": True, "data": {"status": "noop", "message": "Nothing to verify"}}
        return {
            "success": True,
            "data": {
                "status": str(result.get("status") or "verified"),
                "gems_awarded": int(result.get("gems_awarded") or 0),
            },
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("verify_referral_endpoint failed: %s", exc)
        raise HTTPException(status_code=503, detail="Referral service unavailable")


def _reason_message(reason: str) -> str:
    return {
        "invalid_code": "That referral code isn't valid.",
        "self_referral": "You can't refer yourself.",
        "missing_referred_user_id": "Sign in to apply a referral code.",
        "insert_failed": "Could not apply the referral right now. Try again later.",
    }.get(reason, "Referral could not be applied.")

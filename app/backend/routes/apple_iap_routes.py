"""Apple In-App Purchase sync for consumer Premium / Family (iOS). Partner / B2B billing stays on Stripe."""

from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from limiter import limiter
from middleware.auth import get_current_user
from services.apple_iap_verify import (
    AppleIapConfigError,
    apple_iap_env_diagnostics,
    apply_profile_patch_for_apple,
    is_apple_iap_configured,
    verify_transaction,
)
from services.referral_rewards import apply_driver_subscription_referral_rewards
from services.runtime_config import require_enabled
from services.supabase_service import sb_update_profile

logger = logging.getLogger(__name__)

try:
    from appstoreserverlibrary.api_client import APIException
except ModuleNotFoundError:  # Local/dev envs may not install Apple verification deps.
    class APIException(Exception):  # type: ignore[no-redef]
        http_status_code = None
        error_message = "App Store Server library is not installed."

CurrentUser = Annotated[dict, Depends(get_current_user)]

router = APIRouter(prefix="/api/payments", tags=["Payments"])

_MSG_AUTH = "Authentication required"


class AppleSyncBody(BaseModel):
    transaction_id: str = Field(..., min_length=3, max_length=128)


@router.get("/apple/status")
def apple_iap_status():
    """
    Whether the API can verify App Store transactions (no secrets in response).

    The iOS app reads `data.configured`. If false, set the listed env vars on api.snaproad.app — this is different
    from App Store Server Notifications (webhook URL); those are optional for client-driven /apple/sync.
    """
    diag = apple_iap_env_diagnostics()
    return {
        "success": True,
        "data": {
            "configured": diag["configured"],
            "missing_environment_variables": diag["missing_environment_variables"],
            "warnings": diag["warnings"],
            "hints": diag["hints"],
            "has_premium_product_id": diag["has_premium_product_id"],
            "has_family_product_id": diag["has_family_product_id"],
        },
    }


@router.post("/apple/sync")
@limiter.limit("20/minute")
def apple_sync_transaction(
    request: Request,
    body: AppleSyncBody,
    auth_user: CurrentUser,
):
    """
    Called by the iOS app after a successful StoreKit purchase.
    Server verifies the transaction with Apple, then upgrades the profile.
    """
    require_enabled(
        "premium_purchases_enabled",
        "Premium purchases are temporarily disabled.",
    )
    if not auth_user:
        raise HTTPException(status_code=401, detail=_MSG_AUTH)
    uid = str(auth_user.get("user_id") or auth_user.get("id") or "").strip()
    if not uid:
        raise HTTPException(status_code=401, detail="Invalid auth context")

    if not is_apple_iap_configured():
        raise HTTPException(
            status_code=503,
            detail="Apple In-App Purchase is not configured on the server.",
        )

    try:
        summary = verify_transaction(body.transaction_id, expected_user_id=uid)
    except AppleIapConfigError as e:
        logger.error("Apple IAP misconfigured: %s", e)
        raise HTTPException(status_code=503, detail="Apple IAP misconfigured.") from e
    except APIException as e:
        logger.warning("Apple App Store API error: %s %s", e.http_status_code, e.error_message)
        raise HTTPException(
            status_code=502,
            detail="Could not verify this purchase with Apple. Try again shortly.",
        ) from e
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    patch = apply_profile_patch_for_apple(uid, summary)
    try:
        sb_update_profile(uid, patch)
    except Exception as exc:
        logger.exception("Failed to persist Apple entitlement for %s: %s", uid, exc)
        raise HTTPException(status_code=503, detail="Could not update your profile.") from exc

    try:
        apply_driver_subscription_referral_rewards(uid)
    except Exception as exc:
        logger.warning("driver referral rewards after Apple IAP: %s", exc)

    return {
        "success": True,
        "data": {
            "plan": summary.get("plan"),
            "product_id": summary.get("product_id"),
            "original_transaction_id": summary.get("original_transaction_id"),
        },
    }

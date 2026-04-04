"""Central premium / family entitlement checks (Stripe plan + admin promotion window)."""

from fastapi import HTTPException

from services.supabase_service import merge_profile_promotion_entitlements, sb_get_profile

MSG_PREMIUM_REQUIRED = "SnapRoad Premium is required for this feature."


def profile_row_is_premium(profile: dict) -> bool:
    if not profile:
        return False
    merged = merge_profile_promotion_entitlements(dict(profile))
    if bool(merged.get("is_premium")):
        return True
    plan = str(merged.get("plan") or "").lower()
    return plan in ("premium", "family")


def user_id_is_premium(user_id: str) -> bool:
    uid = str(user_id or "").strip()
    if not uid:
        return False
    return profile_row_is_premium(sb_get_profile(uid) or {})


def require_premium_user(user: dict) -> None:
    uid = str(user.get("id") or user.get("user_id") or "").strip()
    if not user_id_is_premium(uid):
        raise HTTPException(status_code=403, detail=MSG_PREMIUM_REQUIRED)

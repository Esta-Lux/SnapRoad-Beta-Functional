"""
Milestone rewards when referees complete first paid subscription (Stripe checkout.session.completed).

Partner → referrer earns +30 credits per 5 qualified referred partners (max 4 tiers: 30/60/90/120).
Driver  → referrer earns +60 gems per 5 qualified referred users (max 4 tiers: 60/120/180/240).
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
logger = logging.getLogger(__name__)

PARTNER_BLOCK = 5
PARTNER_BONUS_PER_TIER = 30
DRIVER_BLOCK = 5
DRIVER_BONUS_PER_TIER = 60
MAX_TIERS = 4


def _utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def apply_partner_subscription_referral_rewards(referred_partner_id: str) -> None:
    """Call after referred partner's subscription is activated from Stripe."""
    from services.supabase_service import (
        _sb,
        sb_get_partner,
        sb_update_partner,
    )

    pid = str(referred_partner_id or "").strip()
    if not pid:
        return
    try:
        sel = (
            _sb()
            .table("partner_referrals")
            .select("id,referrer_partner_id,qualified_at")
            .eq("referred_partner_id", pid)
            .limit(1)
            .execute()
        )
        rows = sel.data or []
        if not rows:
            return
        row = rows[0]
        if row.get("qualified_at"):
            return
        ref_row_id = row.get("id")
        referrer_id = str(row.get("referrer_partner_id") or "").strip()
        if not referrer_id:
            return

        _sb().table("partner_referrals").update({"qualified_at": _utcnow_iso()}).eq("id", ref_row_id).execute()

        qualified_rows = (
            _sb()
            .table("partner_referrals")
            .select("id")
            .eq("referrer_partner_id", referrer_id)
            .not_.is_("qualified_at", "null")
            .execute()
        )
        qualified_n = len(qualified_rows.data or [])
        tiers = min(qualified_n // PARTNER_BLOCK, MAX_TIERS)

        partner = sb_get_partner(referrer_id)
        if not partner:
            return
        old_tiers = int(partner.get("referral_milestone_tiers_paid") or 0)
        if tiers <= old_tiers:
            return
        delta = tiers - old_tiers
        bonus = float(delta * PARTNER_BONUS_PER_TIER)
        cur_cr = float(partner.get("credits") or 0)
        sb_update_partner(
            referrer_id,
            {
                "credits": cur_cr + bonus,
                "referral_milestone_tiers_paid": tiers,
            },
        )
        logger.info(
            "Referral milestone: partner %s +%s credits (tiers %s→%s, %s qualified)",
            referrer_id,
            bonus,
            old_tiers,
            tiers,
            qualified_n,
        )
    except Exception as e:
        logger.warning("apply_partner_subscription_referral_rewards: %s", e)


def apply_driver_subscription_referral_rewards(referred_user_id: str) -> None:
    """Call after referred user's premium/family subscription activates from Stripe."""
    from services.supabase_service import _sb, sb_get_profile, sb_update_profile

    uid = str(referred_user_id or "").strip()
    if not uid:
        return
    try:
        sel = (
            _sb()
            .table("referrals")
            .select("id,referrer_id,qualified_at")
            .eq("referred_user_id", uid)
            .limit(1)
            .execute()
        )
        rows = sel.data or []
        if not rows:
            return
        row = rows[0]
        if row.get("qualified_at"):
            return
        ref_row_id = row.get("id")
        referrer_id = str(row.get("referrer_id") or "").strip()
        if not referrer_id:
            return

        _sb().table("referrals").update({"qualified_at": _utcnow_iso()}).eq("id", ref_row_id).execute()

        qualified_rows = (
            _sb()
            .table("referrals")
            .select("id")
            .eq("referrer_id", referrer_id)
            .not_.is_("qualified_at", "null")
            .execute()
        )
        qualified_n = len(qualified_rows.data or [])
        tiers = min(qualified_n // DRIVER_BLOCK, MAX_TIERS)

        profile = sb_get_profile(referrer_id)
        if not profile:
            return
        old_tiers = int(profile.get("referral_milestone_tiers_paid") or 0)
        if tiers <= old_tiers:
            return
        delta = tiers - old_tiers
        bonus_gems = int(delta * DRIVER_BONUS_PER_TIER)
        cur_gems = int(profile.get("gems") or 0)
        sb_update_profile(
            referrer_id,
            {
                "gems": cur_gems + bonus_gems,
                "referral_milestone_tiers_paid": tiers,
            },
        )
        logger.info(
            "Referral milestone: driver %s +%s gems (tiers %s→%s, %s qualified)",
            referrer_id,
            bonus_gems,
            old_tiers,
            tiers,
            qualified_n,
        )
    except Exception as e:
        logger.warning("apply_driver_subscription_referral_rewards: %s", e)

"""
Driver Referral (beta) — single source of truth for referral code resolution,
applying pending referrals on signup, awarding gems via the wallet ledger on
verification, and building the mobile dashboard payload.

Reuses:
- public.profiles.friend_code as the per-user shareable code (already unique).
- public.referrals as the referrer↔referred join (extended in sql/055).
- services.wallet_ledger.record_wallet_transaction for `referral_bonus` rows.
- Profile.gems integer column as the cached balance updated alongside the ledger.

All Supabase calls are synchronous (matches services/wallet_ledger.py style).
"""
from __future__ import annotations

import logging
import re
import secrets
import string
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from config import REFERRAL_INVITE_URL_BASE, REFERRAL_SIGNUP_GEMS
from services.wallet_ledger import record_wallet_transaction

logger = logging.getLogger(__name__)

# Achievement tiers used by /api/referrals/me. The dashboard exposes each tier as
# {key, label, requirement, unlocked} for the mobile UI.
ACHIEVEMENT_TIERS: tuple[tuple[str, str, int], ...] = (
    ("first_invite", "First Invite", 1),
    ("five_drivers", "5 Drivers", 5),
    ("ten_drivers", "10 Drivers", 10),
    ("road_builder", "Road Builder", 25),
)

_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no ambiguous 0/O/1/I
_CODE_LEN = 6
_CODE_PREFIX = "SNAP-"
_CODE_RE = re.compile(r"^[A-Z0-9-]{4,32}$")


# ============================================================
# Code resolution
# ============================================================
def normalize_code(raw: Optional[str]) -> str:
    """Uppercase + strip optional 'SNAP-' prefix; returns '' when malformed."""
    if raw is None:
        return ""
    cleaned = str(raw).strip().upper().replace(" ", "")
    if not cleaned:
        return ""
    if cleaned.startswith(_CODE_PREFIX):
        cleaned = cleaned[len(_CODE_PREFIX):]
    if not _CODE_RE.match(cleaned):
        return ""
    return cleaned


def _looks_like_uuid(value: str) -> bool:
    try:
        uuid.UUID(value)
        return True
    except (ValueError, AttributeError, TypeError):
        return False


def _random_friend_code() -> str:
    return "".join(secrets.choice(_CODE_ALPHABET) for _ in range(_CODE_LEN))


def build_invite_url(code: str) -> str:
    norm = normalize_code(code) or str(code or "").strip()
    return f"{REFERRAL_INVITE_URL_BASE.rstrip('/')}/{norm}"


def get_or_create_referral_code(sb: Any, user_id: str) -> str:
    """Return profiles.friend_code; generate a unique one if missing."""
    uid = str(user_id or "").strip()
    if not uid:
        return ""
    try:
        row = (
            sb.table("profiles")
            .select("friend_code")
            .eq("id", uid)
            .limit(1)
            .execute()
        )
        existing = ((row.data or [{}])[0] or {}).get("friend_code")
        if existing and str(existing).strip():
            return str(existing).strip().upper()
    except Exception as exc:  # pragma: no cover - logged
        logger.warning("get_or_create_referral_code read failed: %s", exc)

    # Generate + write back. Loop in case of rare collision.
    for _ in range(5):
        candidate = _random_friend_code()
        try:
            sb.table("profiles").update({"friend_code": candidate}).eq("id", uid).execute()
            return candidate
        except Exception as exc:
            msg = str(exc).lower()
            if "duplicate" in msg or "unique" in msg or "friend_code" in msg:
                continue
            logger.warning("get_or_create_referral_code write failed: %s", exc)
            return ""
    return ""


def resolve_code_to_referrer(sb: Any, code: str) -> Optional[str]:
    """
    Returns the referrer's profiles.id for a given code.
    Accepts either the readable friend_code (case-insensitive, optional SNAP- prefix)
    or a raw UUID (back-compat with the pre-beta referral_code field).
    """
    raw = str(code or "").strip()
    if not raw:
        return None
    if _looks_like_uuid(raw):
        try:
            res = (
                sb.table("profiles")
                .select("id")
                .eq("id", raw)
                .limit(1)
                .execute()
            )
            rows = res.data or []
            if rows:
                return str(rows[0]["id"])
        except Exception as exc:
            logger.warning("resolve_code_to_referrer UUID lookup failed: %s", exc)
        return None

    normalized = normalize_code(raw)
    if not normalized:
        return None
    try:
        res = (
            sb.table("profiles")
            .select("id,friend_code")
            .eq("friend_code", normalized)
            .limit(1)
            .execute()
        )
        rows = res.data or []
        if rows:
            return str(rows[0]["id"])
    except Exception as exc:
        logger.warning("resolve_code_to_referrer friend_code lookup failed: %s", exc)
    return None


# ============================================================
# Apply / verify / decline
# ============================================================
def _utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _fetch_referrer_email(sb: Any, referrer_id: str) -> str:
    try:
        res = (
            sb.table("profiles")
            .select("email")
            .eq("id", referrer_id)
            .limit(1)
            .execute()
        )
        rows = res.data or []
        if rows:
            return str(rows[0].get("email") or "")
    except Exception as exc:
        logger.debug("_fetch_referrer_email skipped: %s", exc)
    return ""


def _fetch_existing_referral_for_user(sb: Any, referred_user_id: str) -> Optional[dict]:
    try:
        res = (
            sb.table("referrals")
            .select("*")
            .eq("referred_user_id", referred_user_id)
            .limit(1)
            .execute()
        )
        rows = res.data or []
        return dict(rows[0]) if rows else None
    except Exception as exc:
        logger.warning("_fetch_existing_referral_for_user failed: %s", exc)
        return None


def apply_referral(
    sb: Any,
    *,
    referred_user_id: str,
    referred_email: str,
    code: str,
) -> dict:
    """
    Validate the code and insert a pending referrals row. Idempotent — calling
    twice for the same referred_user_id returns the existing row.

    Returns {"status": "pending"|"declined"|"already_referred", "referral": row|None, "reason": str|None}.
    """
    rid = str(referred_user_id or "").strip()
    if not rid:
        return {"status": "declined", "referral": None, "reason": "missing_referred_user_id"}

    referrer_id = resolve_code_to_referrer(sb, code)
    if not referrer_id:
        logger.info("referral apply: unknown code (truncated)=%s", str(code or "")[:12])
        return {"status": "declined", "referral": None, "reason": "invalid_code"}

    if referrer_id == rid:
        logger.info("referral apply: self-referral rejected for %s", rid[:8])
        return {"status": "declined", "referral": None, "reason": "self_referral"}

    existing = _fetch_existing_referral_for_user(sb, rid)
    if existing:
        # One referrer per referred user — never overwrite.
        return {
            "status": "already_referred",
            "referral": existing,
            "reason": None,
        }

    referrer_email = _fetch_referrer_email(sb, referrer_id)
    normalized_code = normalize_code(code) or str(code or "").strip()
    payload = {
        "referrer_id": referrer_id,
        "referred_user_id": rid,
        "referrer_email": (referrer_email or "")[:320],
        "referred_email": (referred_email or "")[:320],
        "referral_code": normalized_code[:64],
        "status": "pending",
        "credits_awarded": 0,
        "gems_awarded": 0,
    }
    try:
        res = sb.table("referrals").insert(payload).execute()
        row = (res.data or [payload])[0]
        logger.info(
            "referral apply: pending row created referrer=%s referred=%s",
            referrer_id[:8],
            rid[:8],
        )
        return {"status": "pending", "referral": dict(row), "reason": None}
    except Exception as exc:
        msg = str(exc).lower()
        if "duplicate" in msg or "unique" in msg or "referred_user" in msg:
            existing = _fetch_existing_referral_for_user(sb, rid)
            return {"status": "already_referred", "referral": existing, "reason": None}
        logger.warning("apply_referral insert failed: %s", exc)
        return {"status": "declined", "referral": None, "reason": "insert_failed"}


def verify_referral(sb: Any, *, referred_user_id: str) -> Optional[dict]:
    """
    Mark a pending referral verified and award REFERRAL_SIGNUP_GEMS to the referrer.
    Idempotent: returns None when no pending row exists or gems were already awarded.

    Side effects on success:
    - wallet_transactions row (`referral_bonus`, credit) for the referrer.
    - profiles.gems incremented by REFERRAL_SIGNUP_GEMS for the referrer.
    - referrals row updated to status='verified' with gems_awarded/verified_at/joined_at.
    """
    rid = str(referred_user_id or "").strip()
    if not rid:
        return None

    row = _fetch_existing_referral_for_user(sb, rid)
    if not row:
        return None

    if str(row.get("status") or "").lower() == "verified" and int(row.get("gems_awarded") or 0) > 0:
        return None  # already awarded — idempotent no-op

    referrer_id = str(row.get("referrer_id") or "").strip()
    referral_id = str(row.get("id") or "").strip()
    if not referrer_id or not referral_id:
        logger.warning("verify_referral: missing referrer_id or referral_id (row=%s)", row.get("id"))
        return None

    amount = int(REFERRAL_SIGNUP_GEMS)
    if amount <= 0:
        # Still mark verified for accounting, just no gems.
        try:
            sb.table("referrals").update({
                "status": "verified",
                "verified_at": _utcnow_iso(),
                "joined_at": row.get("joined_at") or _utcnow_iso(),
                "gems_awarded": 0,
            }).eq("id", referral_id).execute()
        except Exception as exc:
            logger.warning("verify_referral status-only update failed: %s", exc)
        return {**row, "status": "verified", "gems_awarded": 0}

    # Snapshot current balance.
    balance_before: Optional[int] = None
    try:
        res = (
            sb.table("profiles")
            .select("gems")
            .eq("id", referrer_id)
            .limit(1)
            .execute()
        )
        rows = res.data or []
        if rows:
            balance_before = int(rows[0].get("gems") or 0)
    except Exception as exc:
        logger.debug("verify_referral balance read skipped: %s", exc)

    balance_after = (balance_before + amount) if balance_before is not None else None

    ledger_ok = record_wallet_transaction(
        sb,
        user_id=referrer_id,
        tx_type="referral_bonus",
        direction="credit",
        amount=amount,
        balance_before=balance_before,
        balance_after=balance_after,
        reference_type="referral",
        reference_id=referral_id,
        metadata={
            "referred_user_id": rid,
            "referral_id": referral_id,
            "source": "signup_verified",
        },
    )

    try:
        if balance_after is not None:
            sb.table("profiles").update({"gems": balance_after}).eq("id", referrer_id).execute()
    except Exception as exc:
        logger.warning("verify_referral profile gem bump failed: %s", exc)

    try:
        sb.table("referrals").update({
            "status": "verified",
            "verified_at": _utcnow_iso(),
            "joined_at": row.get("joined_at") or _utcnow_iso(),
            "gems_awarded": amount,
        }).eq("id", referral_id).execute()
    except Exception as exc:
        logger.warning("verify_referral status update failed: %s", exc)
        # If we credited gems but couldn't update the row, leave it pending so
        # a retry can't double-award (record_wallet_transaction is the audit trail).

    logger.info(
        "referral verified: referrer=%s referred=%s gems=%d ledger=%s",
        referrer_id[:8],
        rid[:8],
        amount,
        "ok" if ledger_ok else "skipped",
    )

    return {
        **row,
        "status": "verified",
        "gems_awarded": amount,
        "verified_at": _utcnow_iso(),
        "ledger_recorded": ledger_ok,
    }


def decline_referral(sb: Any, *, referral_id: str, reason: str) -> bool:
    rid = str(referral_id or "").strip()
    if not rid:
        return False
    try:
        sb.table("referrals").update({
            "status": "declined",
            "declined_at": _utcnow_iso(),
            "decline_reason": (reason or "")[:240],
        }).eq("id", rid).execute()
        return True
    except Exception as exc:
        logger.warning("decline_referral failed: %s", exc)
        return False


# ============================================================
# Dashboard / list helpers
# ============================================================
def mask_email(email: Optional[str]) -> str:
    """jo***@gmail.com style masking; safe for empty / malformed input."""
    raw = str(email or "").strip()
    if not raw or "@" not in raw:
        return ""
    local, _, domain = raw.partition("@")
    if not local:
        return f"***@{domain}"
    if len(local) <= 2:
        return f"{local[0]}*@{domain}"
    return f"{local[:2]}***@{domain}"


def _compute_progress(verified_count: int) -> dict:
    next_tier_target: Optional[int] = None
    next_tier_label: Optional[str] = None
    achievements: list[dict] = []
    for key, label, requirement in ACHIEVEMENT_TIERS:
        unlocked = verified_count >= requirement
        achievements.append({
            "key": key,
            "label": label,
            "requirement": requirement,
            "unlocked": unlocked,
        })
        if next_tier_target is None and not unlocked:
            next_tier_target = requirement
            next_tier_label = label

    if next_tier_target:
        progress_percent = min(100, int(round((verified_count / next_tier_target) * 100)))
    else:
        progress_percent = 100

    return {
        "achievements": achievements,
        "next_reward_target": next_tier_target,
        "next_reward_label": next_tier_label,
        "progress_percent": progress_percent,
    }


def _fetch_referrer_rows(sb: Any, referrer_id: str, limit: int = 50) -> list[dict]:
    try:
        res = (
            sb.table("referrals")
            .select("id,referred_email,status,gems_awarded,joined_at,verified_at,declined_at,decline_reason,created_at")
            .eq("referrer_id", referrer_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return list(res.data or [])
    except Exception as exc:
        logger.warning("_fetch_referrer_rows failed: %s", exc)
        return []


def _serialize_recent(row: dict) -> dict:
    status = str(row.get("status") or "pending").lower()
    return {
        "email": mask_email(row.get("referred_email")),
        "joined_at": row.get("joined_at") or row.get("verified_at") or row.get("created_at"),
        "status": status,
        "gems_awarded": int(row.get("gems_awarded") or 0),
    }


def list_recent_referrals(sb: Any, *, referrer_id: str, limit: int = 20) -> list[dict]:
    rows = _fetch_referrer_rows(sb, referrer_id, limit=limit)
    return [_serialize_recent(r) for r in rows[:limit]]


def build_dashboard(sb: Any, *, user_id: str, recent_limit: int = 10) -> dict:
    """Compose the payload returned by GET /api/referrals/me."""
    uid = str(user_id or "").strip()
    code = get_or_create_referral_code(sb, uid)
    invite_url = build_invite_url(code) if code else ""

    rows = _fetch_referrer_rows(sb, uid, limit=max(recent_limit, 50))
    invited_count = len(rows)
    verified_count = sum(1 for r in rows if str(r.get("status") or "").lower() == "verified")
    pending_count = sum(1 for r in rows if str(r.get("status") or "").lower() == "pending")
    declined_count = sum(1 for r in rows if str(r.get("status") or "").lower() == "declined")
    gems_earned = sum(int(r.get("gems_awarded") or 0) for r in rows)

    progress = _compute_progress(verified_count)

    return {
        "code": code,
        "invite_url": invite_url,
        "invited_count": invited_count,
        "verified_count": verified_count,
        "pending_count": pending_count,
        "declined_count": declined_count,
        "gems_earned": gems_earned,
        "reward_per_signup": int(REFERRAL_SIGNUP_GEMS),
        "next_reward_target": progress["next_reward_target"],
        "next_reward_label": progress["next_reward_label"],
        "progress_percent": progress["progress_percent"],
        "achievements": progress["achievements"],
        "recent_referrals": [_serialize_recent(r) for r in rows[:recent_limit]],
    }

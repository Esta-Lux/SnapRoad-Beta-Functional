"""
Friend challenge lifecycle: bump best safety during active duels, resolve when ends_at passes.
DB columns your_score / opponent_score hold challenger vs opponent best safety (0-100) while active.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Optional

from services.supabase_service import (
    get_supabase,
    sb_get_profile,
    sb_update_friend_challenge,
    sb_update_profile,
)

logger = logging.getLogger(__name__)


def _parse_ends_at(raw: Any) -> Optional[datetime]:
    if raw is None:
        return None
    if isinstance(raw, datetime):
        return raw if raw.tzinfo else raw.replace(tzinfo=timezone.utc)
    s = str(raw).strip()
    if not s:
        return None
    try:
        if s.endswith("Z"):
            s = s[:-1] + "+00:00"
        return datetime.fromisoformat(s)
    except Exception:
        return None


def resolve_expired_active_friend_challenges() -> int:
    """Set completed + winner_id for active challenges past ends_at. Returns count updated."""
    sb = get_supabase()
    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()
    try:
        r = sb.table("friend_challenges").select("*").eq("status", "active").lt("ends_at", now_iso).execute()
        rows = r.data or []
    except Exception as e:
        logger.warning("resolve_expired_active_friend_challenges select failed: %s", e)
        return 0
    n = 0
    for row in rows:
        cid = str(row.get("id") or "").strip()
        if not cid:
            continue
        ch_s = int(row.get("your_score") or 0)
        op_s = int(row.get("opponent_score") or 0)
        ch_uid = str(row.get("challenger_id") or "")
        op_uid = str(row.get("opponent_id") or "")
        if ch_s > op_s:
            winner = ch_uid
        elif op_s > ch_s:
            winner = op_uid
        else:
            winner = None
        updates: dict[str, Any] = {"status": "completed"}
        if winner:
            updates["winner_id"] = winner
        else:
            updates["winner_id"] = None
        if sb_update_friend_challenge(cid, updates, expected_status="active"):
            stake = int(row.get("stake_gems") or 0)
            try:
                settle_friend_challenge_pot(ch_uid, op_uid, winner, stake)
            except Exception as e:
                logger.warning("settle_friend_challenge_pot failed id=%s: %s", cid, e)
            n += 1
    return n


def bump_friend_challenge_scores_after_trip(user_id: str, safety: float) -> None:
    """After a qualifying trip, raise duel-side best safety for active challenges."""
    uid = str(user_id or "").strip()
    if not uid:
        return
    s = int(max(0, min(100, round(float(safety)))))
    sb = get_supabase()
    try:
        r = (
            sb.table("friend_challenges")
            .select("*")
            .eq("status", "active")
            .or_(f"challenger_id.eq.{uid},opponent_id.eq.{uid}")
            .execute()
        )
        rows = r.data or []
    except Exception as e:
        logger.warning("bump_friend_challenge_scores select failed: %s", e)
        return
    now = datetime.now(timezone.utc)
    for row in rows:
        ends_raw = row.get("ends_at")
        end_dt = _parse_ends_at(ends_raw)
        if end_dt and end_dt < now:
            continue
        cid = str(row.get("id") or "").strip()
        if not cid:
            continue
        if str(row.get("challenger_id")) == uid:
            cur = int(row.get("your_score") or 0)
            if s > cur:
                sb_update_friend_challenge(cid, {"your_score": s})
        elif str(row.get("opponent_id")) == uid:
            cur = int(row.get("opponent_score") or 0)
            if s > cur:
                sb_update_friend_challenge(cid, {"opponent_score": s})

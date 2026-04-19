import threading
from collections import defaultdict
from datetime import datetime, timezone
from typing import Optional

from config import ENVIRONMENT
from database import get_supabase
from services.cache import get_redis

_memory_fees: dict[tuple[str, str], dict] = {}
_locks: dict[tuple[str, str], threading.Lock] = defaultdict(threading.Lock)


def _month_year(value: Optional[str] = None) -> str:
    if value and value.strip():
        return value.strip()
    return datetime.now(timezone.utc).strftime("%Y-%m")


def _next_fee_cents(redemption_number: int) -> int:
    tier_index = max(0, (max(1, redemption_number) - 1) // 500)
    return 20 + tier_index * 10


def _fee_tier(redemption_number: int) -> int:
    return max(1, ((max(1, redemption_number) - 1) // 500) + 1)


def _lock_key(partner_id: str, month_year: str) -> tuple[str, str]:
    return (str(partner_id), str(month_year))


class _PartnerMonthLock:
    def __init__(self, partner_id: str, month_year: str):
        self.partner_id = str(partner_id)
        self.month_year = str(month_year)
        self.local_lock = _locks[_lock_key(self.partner_id, self.month_year)]
        self.redis_lock = None

    def __enter__(self):
        self.local_lock.acquire()
        redis_client = get_redis()
        if redis_client:
            self.redis_lock = redis_client.lock(
                f"fee-lock:{self.partner_id}:{self.month_year}",
                timeout=8,
                blocking_timeout=8,
            )
            self.redis_lock.acquire()
        return self

    def __exit__(self, exc_type, exc, tb):
        try:
            if self.redis_lock:
                self.redis_lock.release()
        finally:
            self.local_lock.release()


def _load_row(partner_id: str, month_year: str) -> Optional[dict]:
    try:
        result = (
            get_supabase()
            .table("redemption_fees")
            .select("*")
            .eq("partner_id", partner_id)
            .eq("month_year", month_year)
            .limit(1)
            .execute()
        )
        if result.data:
            return result.data[0]
    except Exception:
        if ENVIRONMENT == "production":
            return None
    return _memory_fees.get(_lock_key(partner_id, month_year))


def _persist_row(partner_id: str, month_year: str, row: dict) -> dict:
    payload = {
        "partner_id": partner_id,
        "month_year": month_year,
        "redemption_count": int(row.get("redemption_count") or 0),
        "total_fees_cents": int(row.get("total_fees_cents") or 0),
        "last_redemption_at": row.get("last_redemption_at"),
        "reset_date": row.get("reset_date"),
    }
    try:
        result = (
            get_supabase()
            .table("redemption_fees")
            .upsert(payload, on_conflict="partner_id,month_year")
            .execute()
        )
        if result.data:
            return result.data[0]
    except Exception:
        if ENVIRONMENT == "production":
            raise
    _memory_fees[_lock_key(partner_id, month_year)] = payload
    return payload


def calculate_redemption_fee(partner_id: str, month_year: Optional[str] = None) -> dict:
    month = _month_year(month_year)
    row = _load_row(partner_id, month) or {
        "partner_id": partner_id,
        "month_year": month,
        "redemption_count": 0,
        "total_fees_cents": 0,
        "last_redemption_at": None,
        "reset_date": f"{month}-01",
    }
    next_redemption = int(row.get("redemption_count") or 0) + 1
    fee_cents = _next_fee_cents(next_redemption)
    return {
        "partner_id": partner_id,
        "month_year": month,
        "next_redemption_number": next_redemption,
        "fee_cents": fee_cents,
        "fee_amount": round(fee_cents / 100, 2),
        "fee_tier": _fee_tier(next_redemption),
        "current_redemption_count": int(row.get("redemption_count") or 0),
        "total_fees_cents": int(row.get("total_fees_cents") or 0),
    }


def record_redemption_fee(partner_id: Optional[str], redeemed_at: Optional[datetime] = None) -> dict:
    if not partner_id:
        return {
            "partner_id": None,
            "month_year": _month_year(),
            "redemption_count": 0,
            "fee_cents": 0,
            "fee_amount": 0.0,
            "fee_tier": 0,
            "total_fees_cents": 0,
        }

    ts = redeemed_at or datetime.now(timezone.utc)
    month = ts.strftime("%Y-%m")
    with _PartnerMonthLock(partner_id, month):
        row = _load_row(partner_id, month) or {
            "partner_id": partner_id,
            "month_year": month,
            "redemption_count": 0,
            "total_fees_cents": 0,
            "last_redemption_at": None,
            "reset_date": f"{month}-01",
        }
        next_redemption = int(row.get("redemption_count") or 0) + 1
        fee_cents = _next_fee_cents(next_redemption)
        row["redemption_count"] = next_redemption
        row["total_fees_cents"] = int(row.get("total_fees_cents") or 0) + fee_cents
        row["last_redemption_at"] = ts.isoformat()
        saved = _persist_row(partner_id, month, row)
        return {
            "partner_id": partner_id,
            "month_year": month,
            "redemption_count": int(saved.get("redemption_count") or next_redemption),
            "fee_cents": fee_cents,
            "fee_amount": round(fee_cents / 100, 2),
            "fee_tier": _fee_tier(next_redemption),
            "total_fees_cents": int(saved.get("total_fees_cents") or row["total_fees_cents"]),
        }


def get_monthly_fee_summary(partner_id: str, month_year: Optional[str] = None) -> dict:
    month = _month_year(month_year)
    row = _load_row(partner_id, month) or {
        "partner_id": partner_id,
        "month_year": month,
        "redemption_count": 0,
        "total_fees_cents": 0,
        "last_redemption_at": None,
        "reset_date": f"{month}-01",
    }
    redemption_count = int(row.get("redemption_count") or 0)
    next_threshold = ((_fee_tier(max(1, redemption_count + 1)) * 500) if redemption_count else 500)
    return {
        "partner_id": partner_id,
        "month_year": month,
        "redemption_count": redemption_count,
        "total_fees_cents": int(row.get("total_fees_cents") or 0),
        "total_fees": round(int(row.get("total_fees_cents") or 0) / 100, 2),
        "current_fee_cents": _next_fee_cents(max(1, redemption_count or 1)),
        "current_fee": round(_next_fee_cents(max(1, redemption_count or 1)) / 100, 2),
        "current_tier": _fee_tier(max(1, redemption_count or 1)),
        "next_threshold": next_threshold,
        "redemptions_until_next_tier": max(0, next_threshold - redemption_count),
        "last_redemption_at": row.get("last_redemption_at"),
    }


def list_monthly_fee_summaries(month_year: Optional[str] = None) -> list[dict]:
    month = _month_year(month_year)
    rows: list[dict] = []
    try:
        result = get_supabase().table("redemption_fees").select("*").eq("month_year", month).execute()
        rows = result.data or []
    except Exception:
        if ENVIRONMENT == "production":
            return []
        rows = [v for v in _memory_fees.values() if v.get("month_year") == month]

    summaries = []
    for row in rows:
        partner_id = str(row.get("partner_id") or "")
        if not partner_id:
            continue
        summaries.append(get_monthly_fee_summary(partner_id, month))
    summaries.sort(key=lambda item: item.get("total_fees_cents", 0), reverse=True)
    return summaries


def get_partner_fee_history(partner_id: str, limit: int = 12) -> list[dict]:
    rows: list[dict] = []
    try:
        result = (
            get_supabase()
            .table("redemption_fees")
            .select("*")
            .eq("partner_id", partner_id)
            .order("month_year", desc=True)
            .limit(limit)
            .execute()
        )
        rows = result.data or []
    except Exception:
        if ENVIRONMENT == "production":
            return []
        rows = [v for v in _memory_fees.values() if v.get("partner_id") == partner_id]
        rows.sort(key=lambda item: str(item.get("month_year") or ""), reverse=True)
        rows = rows[:limit]

    return [
        {
            "partner_id": partner_id,
            "month_year": row.get("month_year"),
            "redemption_count": int(row.get("redemption_count") or 0),
            "total_fees_cents": int(row.get("total_fees_cents") or 0),
            "total_fees": round(int(row.get("total_fees_cents") or 0) / 100, 2),
            "last_redemption_at": row.get("last_redemption_at"),
        }
        for row in rows
    ]

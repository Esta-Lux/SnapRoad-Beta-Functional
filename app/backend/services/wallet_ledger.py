"""Optional append-only gem ledger (`wallet_transactions`). Fails soft if table missing."""

from __future__ import annotations

import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)

_TABLE = "wallet_transactions"


def _missing_table(exc: BaseException) -> bool:
    msg = str(exc).lower()
    return "wallet_transactions" in msg and ("does not exist" in msg or "42p01" in msg)


def record_wallet_transaction(
    sb: Any,
    *,
    user_id: str,
    tx_type: str,
    direction: str,
    amount: int,
    balance_before: Optional[int],
    balance_after: Optional[int],
    reference_type: Optional[str] = None,
    reference_id: Optional[str] = None,
    metadata: Optional[dict] = None,
) -> bool:
    """
    Insert one ledger row. Returns False if table unavailable or insert failed.
    direction: credit | debit; amount is always non-negative magnitude.
    """
    if amount < 0 or direction not in ("credit", "debit"):
        return False
    row = {
        "user_id": user_id,
        "tx_type": tx_type,
        "direction": direction,
        "amount": int(amount),
        "balance_before": balance_before,
        "balance_after": balance_after,
        "reference_type": reference_type,
        "reference_id": reference_id,
        "status": "posted",
        "metadata": metadata or {},
    }
    try:
        sb.table(_TABLE).insert(row).execute()
        return True
    except Exception as exc:
        if _missing_table(exc):
            logger.debug("wallet_transactions not available, skipping ledger insert")
        else:
            logger.warning("wallet_transactions insert failed: %s", exc)
        return False


def fetch_recent_ledger(sb: Any, user_id: str, limit: int = 40) -> list[dict]:
    try:
        res = (
            sb.table(_TABLE)
            .select(
                "id,tx_type,direction,amount,balance_before,balance_after,"
                "reference_type,reference_id,metadata,created_at"
            )
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return list(res.data or [])
    except Exception as exc:
        if not _missing_table(exc):
            logger.warning("wallet_transactions read failed: %s", exc)
        return []

"""HMAC verification for internal cron endpoints (commute dispatch, etc.)."""
from __future__ import annotations

import hashlib
import hmac
import os
import time
from typing import Optional

from fastapi import HTTPException, Request

_SKEW_SEC = 300


def _is_production() -> bool:
    return os.getenv("ENVIRONMENT", "development").strip().lower() == "production"


def _is_railway_deploy() -> bool:
    """Railway sets these; cron/workers often POST with X-Commute-Dispatch-Secret only."""
    return bool((os.getenv("RAILWAY_ENVIRONMENT") or os.getenv("RAILWAY_PROJECT_ID") or "").strip())


async def verify_commute_internal_request(
    request: Request,
    *,
    plain_secret_header: Optional[str],
    legacy_plain_secret_expected: Optional[str] = None,
) -> None:
    """
    Prefer HMAC-SHA256 over "{timestamp}\\n{raw_body}" using COMMUTE_INTERNAL_HMAC_SECRET
    (falls back to COMMUTE_DISPATCH_SECRET if unset).

    Headers:
      X-Internal-Timestamp — Unix seconds (or X-Commute-Timestamp)
      X-Internal-Signature — hex digest (or X-Commute-Signature)

    Legacy: X-Commute-Dispatch-Secret == COMMUTE_DISPATCH_SECRET when allowed:
      - Non-production: always allowed if secret matches.
      - Production: only if COMMUTE_INTERNAL_ALLOW_LEGACY_SECRET is truthy.
    """
    hmac_key = (os.getenv("COMMUTE_INTERNAL_HMAC_SECRET") or os.getenv("COMMUTE_DISPATCH_SECRET") or "").strip()
    dispatch_secret = (os.getenv("COMMUTE_DISPATCH_SECRET") or "").strip()
    allow_legacy = (
        os.getenv("COMMUTE_INTERNAL_ALLOW_LEGACY_SECRET", "").strip().lower() in ("1", "true", "yes")
    )

    ts_raw = request.headers.get("X-Internal-Timestamp") or request.headers.get("X-Commute-Timestamp")
    sig_raw = request.headers.get("X-Internal-Signature") or request.headers.get("X-Commute-Signature")

    body = await request.body()

    if hmac_key and ts_raw and sig_raw:
        try:
            ts_int = int(str(ts_raw).strip())
        except ValueError as e:
            raise HTTPException(status_code=403, detail="Invalid timestamp") from e
        if abs(int(time.time()) - ts_int) > _SKEW_SEC:
            raise HTTPException(status_code=403, detail="Timestamp outside allowed window")
        msg = str(ts_int).encode("utf-8") + b"\n" + body
        expected = hmac.new(hmac_key.encode("utf-8"), msg, hashlib.sha256).hexdigest()
        got = str(sig_raw).strip().lower()
        if not hmac.compare_digest(expected.lower(), got):
            raise HTTPException(status_code=403, detail="Invalid signature")
        return

    legacy_expected = (legacy_plain_secret_expected or "").strip() or dispatch_secret
    plain = (plain_secret_header or "").strip()
    plain_ok = bool(legacy_expected) and plain == legacy_expected

    if plain_ok:
        if not _is_production():
            return
        if allow_legacy:
            return
        if _is_railway_deploy():
            # Cron on Railway typically uses a shared secret header; same security model as legacy flag.
            return
        raise HTTPException(
            status_code=403,
            detail="Forbidden: use HMAC (X-Internal-Timestamp + X-Internal-Signature over "
            "{timestamp}\\n{raw_body}) or set COMMUTE_INTERNAL_ALLOW_LEGACY_SECRET=1. "
            "Plain X-Commute-Dispatch-Secret is also accepted automatically on Railway.",
        )

    if _is_production() and not allow_legacy:
        raise HTTPException(
            status_code=403,
            detail="Forbidden: send X-Internal-Timestamp, X-Internal-Signature (HMAC-SHA256 of "
            "{timestamp}\\n{body}), set COMMUTE_INTERNAL_ALLOW_LEGACY_SECRET=1, "
            "or use X-Commute-Dispatch-Secret on Railway with COMMUTE_DISPATCH_SECRET.",
        )

    raise HTTPException(status_code=403, detail="Forbidden")

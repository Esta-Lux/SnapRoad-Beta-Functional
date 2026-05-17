"""HMAC verification for internal cron endpoints (commute dispatch, etc.)."""
from __future__ import annotations

import hashlib
import hmac
import os
import time
from typing import Optional

from fastapi import HTTPException, Request

_SKEW_SEC = 300


def _looks_like_hmac_sha256_signature(sig_raw: Optional[str]) -> bool:
    """SHA256 hex digests are 64 chars; ignore junk headers so legacy/plain auth can run."""
    if not sig_raw:
        return False
    s = str(sig_raw).strip()
    if len(s) != 64:
        return False
    try:
        bytes.fromhex(s)
        return True
    except ValueError:
        return False


def _commute_hmac_body_variants(body: bytes) -> tuple[bytes, ...]:
    """Cron POST bodies are often '{}' or whitespace while curl/scripts sign an empty body."""
    variants: list[bytes] = []
    seen: set[bytes] = set()

    def add(b: bytes) -> None:
        if b not in seen:
            seen.add(b)
            variants.append(b)

    add(body)
    stripped = body.strip()
    add(stripped)
    if stripped in (b"", b"{}", b"null"):
        add(b"")
    return tuple(variants)


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
      - Production: only if COMMUTE_INTERNAL_ALLOW_LEGACY_SECRET is truthy,
        or the API runs on Railway (same deploy env).

    HMAC runs only when X-Internal-Signature looks like a SHA256 hex digest (64 chars).
    Otherwise legacy/plain auth is attempted (avoids bogus headers blocking cron).

    For HMAC, the message is "{timestamp}\\n{body}". Cron tools sometimes POST "{}"
    or whitespace while signing an empty body; those variants are accepted.
    """
    hmac_key = (os.getenv("COMMUTE_INTERNAL_HMAC_SECRET") or os.getenv("COMMUTE_DISPATCH_SECRET") or "").strip()
    dispatch_secret = (os.getenv("COMMUTE_DISPATCH_SECRET") or "").strip()
    allow_legacy = (
        os.getenv("COMMUTE_INTERNAL_ALLOW_LEGACY_SECRET", "").strip().lower() in ("1", "true", "yes")
    )

    ts_raw = request.headers.get("X-Internal-Timestamp") or request.headers.get("X-Commute-Timestamp")
    sig_raw = request.headers.get("X-Internal-Signature") or request.headers.get("X-Commute-Signature")

    body = await request.body()

    use_hmac = bool(hmac_key and ts_raw and sig_raw and _looks_like_hmac_sha256_signature(sig_raw))
    if use_hmac:
        try:
            ts_int = int(str(ts_raw).strip())
        except ValueError as e:
            raise HTTPException(status_code=403, detail="Invalid timestamp") from e
        if abs(int(time.time()) - ts_int) > _SKEW_SEC:
            raise HTTPException(status_code=403, detail="Timestamp outside allowed window")
        got = str(sig_raw).strip().lower()
        key_bytes = hmac_key.encode("utf-8")
        for variant in _commute_hmac_body_variants(body):
            msg = str(ts_int).encode("utf-8") + b"\n" + variant
            expected = hmac.new(key_bytes, msg, hashlib.sha256).hexdigest()
            if hmac.compare_digest(expected.lower(), got):
                return
        raise HTTPException(status_code=403, detail="Invalid signature")

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

"""Commute internal cron auth: HMAC and plain secret (incl. Railway production)."""
import asyncio
import hashlib
import hmac
import time

import pytest
from fastapi import HTTPException, Request

from services.internal_request_auth import verify_commute_internal_request


def test_commute_internal_accepts_hmac(monkeypatch):
    monkeypatch.delenv("RAILWAY_ENVIRONMENT", raising=False)
    monkeypatch.delenv("RAILWAY_PROJECT_ID", raising=False)
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("COMMUTE_DISPATCH_SECRET", "unit-test-dispatch-secret")
    monkeypatch.delenv("COMMUTE_INTERNAL_ALLOW_LEGACY_SECRET", raising=False)

    key = "unit-test-dispatch-secret"
    ts = str(int(time.time()))
    body = b""
    msg = ts.encode() + b"\n" + body
    sig = hmac.new(key.encode(), msg, hashlib.sha256).hexdigest()

    scope = {
        "type": "http",
        "method": "POST",
        "path": "/api/commute-routes/internal/dispatch",
        "headers": [
            (b"x-internal-timestamp", ts.encode()),
            (b"x-internal-signature", sig.encode()),
        ],
    }

    async def receive():
        return {"type": "http.request", "body": body, "more_body": False}

    async def _run():
        request = Request(scope, receive)
        await verify_commute_internal_request(request, plain_secret_header=None)
        # body consumed once — second read should still work via cache in Starlette
        b2 = await request.body()
        assert b2 == body

    asyncio.run(_run())


def test_commute_internal_plain_secret_rejected_non_railway_production(monkeypatch):
    monkeypatch.delenv("RAILWAY_ENVIRONMENT", raising=False)
    monkeypatch.delenv("RAILWAY_PROJECT_ID", raising=False)
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("COMMUTE_DISPATCH_SECRET", "cron-secret")
    monkeypatch.delenv("COMMUTE_INTERNAL_ALLOW_LEGACY_SECRET", raising=False)

    scope = {
        "type": "http",
        "method": "POST",
        "path": "/dispatch",
        "headers": [(b"x-commute-dispatch-secret", b"cron-secret")],
    }

    async def receive():
        return {"type": "http.request", "body": b"", "more_body": False}

    async def _run():
        request = Request(scope, receive)
        with pytest.raises(HTTPException) as exc:
            await verify_commute_internal_request(request, plain_secret_header="cron-secret")
        assert exc.value.status_code == 403

    asyncio.run(_run())


def test_commute_internal_plain_secret_ok_on_railway_production(monkeypatch):
    monkeypatch.setenv("RAILWAY_ENVIRONMENT", "production")
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("COMMUTE_DISPATCH_SECRET", "cron-secret")
    monkeypatch.delenv("COMMUTE_INTERNAL_ALLOW_LEGACY_SECRET", raising=False)

    scope = {
        "type": "http",
        "method": "POST",
        "path": "/dispatch",
        "headers": [(b"x-commute-dispatch-secret", b"cron-secret")],
    }

    async def receive():
        return {"type": "http.request", "body": b"", "more_body": False}

    async def _run():
        request = Request(scope, receive)
        await verify_commute_internal_request(request, plain_secret_header="cron-secret")

    asyncio.run(_run())


def test_commute_internal_hmac_accepts_signed_empty_when_body_is_json_empty(monkeypatch):
    monkeypatch.delenv("RAILWAY_ENVIRONMENT", raising=False)
    monkeypatch.delenv("RAILWAY_PROJECT_ID", raising=False)
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("COMMUTE_DISPATCH_SECRET", "unit-test-dispatch-secret")
    monkeypatch.delenv("COMMUTE_INTERNAL_ALLOW_LEGACY_SECRET", raising=False)

    key = "unit-test-dispatch-secret"
    ts = str(int(time.time()))
    signed_body = b""
    msg = ts.encode() + b"\n" + signed_body
    sig = hmac.new(key.encode(), msg, hashlib.sha256).hexdigest()

    scope = {
        "type": "http",
        "method": "POST",
        "path": "/api/commute-routes/internal/dispatch",
        "headers": [
            (b"x-internal-timestamp", ts.encode()),
            (b"x-internal-signature", sig.encode()),
        ],
    }

    post_body = b"{}"

    async def receive():
        return {"type": "http.request", "body": post_body, "more_body": False}

    async def _run():
        request = Request(scope, receive)
        await verify_commute_internal_request(request, plain_secret_header=None)

    asyncio.run(_run())


def test_commute_internal_junk_hmac_headers_plain_ok_on_railway(monkeypatch):
    """Cron templates sometimes send placeholder timestamp/signature; plain secret must still work."""
    monkeypatch.setenv("RAILWAY_ENVIRONMENT", "production")
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("COMMUTE_DISPATCH_SECRET", "cron-secret")
    monkeypatch.delenv("COMMUTE_INTERNAL_ALLOW_LEGACY_SECRET", raising=False)

    scope = {
        "type": "http",
        "method": "POST",
        "path": "/dispatch",
        "headers": [
            (b"x-internal-timestamp", b"1712345678"),
            (b"x-internal-signature", b"not-valid-sha256"),
            (b"x-commute-dispatch-secret", b"cron-secret"),
        ],
    }

    async def receive():
        return {"type": "http.request", "body": b"", "more_body": False}

    async def _run():
        request = Request(scope, receive)
        await verify_commute_internal_request(request, plain_secret_header="cron-secret")

    asyncio.run(_run())

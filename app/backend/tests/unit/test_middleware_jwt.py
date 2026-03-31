import pytest
from fastapi import HTTPException

from middleware.auth import create_access_token, decode_token, verify_password, get_password_hash


def _patch_jwt_secret(monkeypatch, secret: str):
    monkeypatch.setenv("JWT_SECRET", secret)
    monkeypatch.setattr("middleware.auth.JWT_SECRET", secret, raising=False)
    monkeypatch.setattr("config.JWT_SECRET", secret, raising=False)


def test_verify_password_rejects_mismatch():
    h = get_password_hash("snapshot-password-ci-" + "x" * 8)
    assert verify_password("wrong-password", h) is False


def test_create_and_decode_snaproad_token(monkeypatch):
    secret = "unit-test-jwt-secret-min-32-chars!!"
    _patch_jwt_secret(monkeypatch, secret)
    tok = create_access_token(
        {"sub": "user-1", "email": "a@b.com", "role": "driver"}
    )
    payload = decode_token(tok)
    assert payload.get("sub") == "user-1"
    assert payload.get("email") == "a@b.com"
    assert payload.get("role") == "driver"


def test_decode_rejects_tampered_token(monkeypatch):
    secret = "unit-test-jwt-secret-min-32-chars!!"
    _patch_jwt_secret(monkeypatch, secret)
    tok = create_access_token({"sub": "user-1"})
    bad = tok[:-5] + "xxxxx"
    with pytest.raises(HTTPException) as exc:
        decode_token(bad)
    assert exc.value.status_code == 401

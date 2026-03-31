#!/usr/bin/env python3
"""
Smoke test: SnapRoad JWT from login must authorize GET /api/user/profile without Supabase Auth.
Run from app/backend with minimal env (no real Supabase calls for this path):

  JWT_SECRET=$(python3 -c "print('a'*40)") \\
  SUPABASE_URL=https://example.supabase.co \\
  SUPABASE_SECRET_KEY=test-service-role \\
  ENVIRONMENT=development \\
  .venv/bin/python scripts/smoke_auth_jwt.py
"""
from __future__ import annotations

import os
import sys

# app/backend is the package root (middleware, routes, main)
_BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACKEND_ROOT not in sys.path:
    sys.path.insert(0, _BACKEND_ROOT)


def main() -> int:
    if len((os.environ.get("JWT_SECRET") or "").strip()) < 32:
        print("Set JWT_SECRET (32+ chars) for this smoke test.", file=sys.stderr)
        return 1
    os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
    os.environ.setdefault("SUPABASE_SECRET_KEY", "test-service-role-key")
    os.environ.setdefault("ENVIRONMENT", "development")

    from fastapi.testclient import TestClient

    import middleware.auth as auth_mod

    from middleware.auth import create_access_token
    from main import app

    calls: list[str] = []
    real_get = auth_mod.sb_get_auth_user_from_access_token

    def wrapped(tok: str):
        calls.append(tok)
        return real_get(tok)

    auth_mod.sb_get_auth_user_from_access_token = wrapped  # type: ignore[assignment]

    try:
        token = create_access_token(
            {"sub": "smoke-user-id", "email": "smoke@test.dev", "role": "driver"}
        )
        client = TestClient(app)
        r = client.get("/api/user/profile", headers={"Authorization": f"Bearer {token}"})
        if r.status_code != 200:
            print("FAIL profile status", r.status_code, r.text[:500], file=sys.stderr)
            return 1
        body = r.json()
        if not body.get("success") or not body.get("data", {}).get("id"):
            print("FAIL profile body", body, file=sys.stderr)
            return 1
        if calls:
            print(
                "FAIL: SnapRoad JWT should not call sb_get_auth_user_from_access_token; got",
                len(calls),
                "call(s)",
                file=sys.stderr,
            )
            return 1
        print("OK: GET /api/user/profile with SnapRoad JWT (Supabase get_user not invoked)")
        return 0
    finally:
        auth_mod.sb_get_auth_user_from_access_token = real_get  # type: ignore[assignment]


if __name__ == "__main__":
    raise SystemExit(main())

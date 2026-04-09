"""Shared base URL for legacy ``requests``-based tests against a running API.

Resolution order:

1. ``REACT_APP_BACKEND_URL`` (frontend / monorepo convention)
2. ``SNAPROAD_TEST_API_URL`` (explicit test alias)
3. ``VITE_BACKEND_URL`` (some driver / Vite-oriented scripts)
4. ``http://127.0.0.1:8001`` (SnapRoad backend default port)

Host-only values get an ``http://`` scheme. Trailing slashes are stripped.
"""

from __future__ import annotations

import os

_DEFAULT = "http://127.0.0.1:8001"


def normalize_api_base_url(value: str) -> str:
    raw = (value or "").strip().rstrip("/")
    if not raw:
        return ""
    low = raw.lower()
    if not low.startswith(("http://", "https://")):
        raw = f"http://{raw.lstrip('/')}"
    return raw.rstrip("/")


def integration_base_url() -> str:
    raw = (
        (os.environ.get("REACT_APP_BACKEND_URL") or "").strip()
        or (os.environ.get("SNAPROAD_TEST_API_URL") or "").strip()
        or (os.environ.get("VITE_BACKEND_URL") or "").strip()
        or _DEFAULT
    )
    return normalize_api_base_url(raw)


INTEGRATION_BASE_URL = integration_base_url()

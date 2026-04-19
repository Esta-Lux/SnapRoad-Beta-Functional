import os

# Before importing the app: avoid Sentry flush/network during unit tests.
os.environ.setdefault("SENTRY_DSN", "")
os.environ.setdefault("ENVIRONMENT", "development")

import pytest
from fastapi.testclient import TestClient

from main import app
from tests.http_integration import normalize_api_base_url


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def live_base_url() -> str:
    raw = (os.environ.get("REACT_APP_BACKEND_URL") or "").strip()
    if not raw:
        pytest.skip("Set REACT_APP_BACKEND_URL for integration tests")
    return normalize_api_base_url(raw)

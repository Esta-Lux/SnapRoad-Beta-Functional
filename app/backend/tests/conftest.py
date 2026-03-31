import os

# Before importing the app: avoid Sentry flush/network during unit tests.
os.environ.setdefault("SENTRY_DSN", "")
os.environ.setdefault("ENVIRONMENT", "development")

import pytest
from fastapi.testclient import TestClient

from main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def live_base_url() -> str:
    url = (os.environ.get("REACT_APP_BACKEND_URL") or "").strip().rstrip("/")
    if not url:
        pytest.skip("Set REACT_APP_BACKEND_URL for integration tests")
    return url

"""
Integration / contract tests against a running API (staging or local).

Usage:
  REACT_APP_BACKEND_URL=https://your-api.example.com pytest tests/integration -m integration

Skipped in CI unless you set the env var (e.g. repository variable for a staging URL).
"""
import pytest
import requests


pytestmark = pytest.mark.integration


def test_live_health(live_base_url: str):
    r = requests.get(f"{live_base_url}/health", timeout=15)
    assert r.status_code == 200
    body = r.json()
    assert body.get("status") in ("ok", "degraded")


def test_live_openapi(live_base_url: str):
    r = requests.get(f"{live_base_url}/openapi.json", timeout=15)
    assert r.status_code == 200
    assert "openapi" in r.json()


def test_live_public_config_shape(live_base_url: str):
    r = requests.get(f"{live_base_url}/api/config", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert data.get("success") is True
    assert isinstance(data.get("data"), dict)

"""
Fast unit-style checks for CI + coverage (no live HTTP server, no Supabase required).
Legacy tests under this folder that use requests + REACT_APP_BACKEND_URL stay optional in CI.
"""

from fastapi.testclient import TestClient

from main import app


def test_root_returns_api_message():
    client = TestClient(app)
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "SnapRoad" in (data.get("message") or "")


def test_health_endpoint_structure():
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body.get("status") in ("ok", "degraded")
    assert "checks" in body

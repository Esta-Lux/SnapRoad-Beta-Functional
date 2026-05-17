"""
Fast unit-style checks for CI + coverage (no live HTTP server, no Supabase required).
Legacy HTTP tests use ``tests.http_integration`` (env: REACT_APP_BACKEND_URL, SNAPROAD_TEST_API_URL,
VITE_BACKEND_URL; default http://127.0.0.1:8001). CI still runs only in-process smoke + ``tests/unit``.
"""

from fastapi.testclient import TestClient

from main import app


def test_apple_notifications_503_when_unconfigured(monkeypatch):
    monkeypatch.setattr("routes.apple_iap_routes.is_apple_iap_configured", lambda: False)
    client = TestClient(app)
    resp = client.post("/api/payments/apple/notifications", json={"signedPayload": "x" * 40})
    assert resp.status_code == 503


def test_apple_notifications_200_when_processor_ok(monkeypatch):
    monkeypatch.setattr("routes.apple_iap_routes.is_apple_iap_configured", lambda: True)
    monkeypatch.setattr(
        "routes.apple_iap_routes.apply_apple_server_notification_v2",
        lambda _signed: {
            "resolution": "test",
            "notification_type": "TEST",
            "notification_uuid": "n1",
            "profiles_updated": 0,
            "profiles_skipped": 0,
            "db_write_failed": False,
            "referral_user_ids": [],
        },
    )
    monkeypatch.setattr("routes.apple_iap_routes.apply_driver_subscription_referral_rewards", lambda _uid: None)
    client = TestClient(app)
    resp = client.post("/api/payments/apple/notifications", json={"signedPayload": "y" * 40})
    assert resp.status_code == 200
    assert resp.json().get("success") is True


def test_apple_notifications_503_on_db_fail(monkeypatch):
    monkeypatch.setattr("routes.apple_iap_routes.is_apple_iap_configured", lambda: True)
    monkeypatch.setattr(
        "routes.apple_iap_routes.apply_apple_server_notification_v2",
        lambda _signed: {"db_write_failed": True},
    )
    monkeypatch.setattr("routes.apple_iap_routes.apply_driver_subscription_referral_rewards", lambda _uid: None)
    client = TestClient(app)
    resp = client.post("/api/payments/apple/notifications", json={"signedPayload": "z" * 40})
    assert resp.status_code == 503


def test_apple_notifications_422_when_body_invalid():
    client = TestClient(app)
    resp = client.post("/api/payments/apple/notifications", json={})
    assert resp.status_code == 422


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
    # Development: detailed checks; production liveness: instant ok + live flag (no Supabase in probe).
    if "checks" in body:
        assert isinstance(body["checks"], dict)
    else:
        assert body.get("live") is True

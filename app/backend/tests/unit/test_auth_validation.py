from fastapi.testclient import TestClient


def test_login_rejects_empty_body(client: TestClient):
    r = client.post("/api/auth/login", json={})
    assert r.status_code == 422


def test_signup_rejects_empty_body(client: TestClient):
    r = client.post("/api/auth/signup", json={})
    assert r.status_code == 422


def test_oauth_supabase_requires_token(client: TestClient):
    r = client.post("/api/auth/oauth/supabase", json={})
    assert r.status_code == 400

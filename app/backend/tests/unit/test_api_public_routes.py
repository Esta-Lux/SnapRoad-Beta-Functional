"""In-process API tests (no external HTTP server)."""
from unittest.mock import patch


def test_openapi_json_available(client):
    r = client.get("/openapi.json")
    assert r.status_code == 200
    body = r.json()
    assert "openapi" in body
    assert "paths" in body


def test_docs_page_available(client):
    r = client.get("/docs")
    assert r.status_code == 200


@patch("routes.config_public.sb_get_app_config")
@patch("routes.config_public.cache_get", return_value=None)
@patch("routes.config_public.cache_set")
def test_public_config_uses_supabase_config(
    _mock_cache_set, _mock_cache_get, mock_sb_config, client
):
    mock_sb_config.return_value = {"maintenance_mode": False, "gems_multiplier": 1.0}
    r = client.get("/api/config")
    assert r.status_code == 200
    data = r.json()
    assert data.get("success") is True
    assert "data" in data
    assert data["data"].get("maintenance_mode") is False


@patch("routes.config_public.sb_get_app_config")
@patch("routes.config_public.cache_get")
@patch("routes.config_public.cache_set")
def test_public_config_returns_cache_when_warm(
    _mock_cache_set, mock_cache_get, mock_sb_config, client
):
    mock_cache_get.return_value = {"maintenance_mode": True}
    r = client.get("/api/config")
    assert r.status_code == 200
    assert r.json()["data"].get("maintenance_mode") is True
    mock_sb_config.assert_not_called()


def test_env_check_shape_or_blocked_in_production(client):
    """In CI the app is started with ENVIRONMENT=development; production hides details."""
    r = client.get("/api/env-check")
    assert r.status_code == 200
    body = r.json()
    if body.get("detail") == "Not available in production":
        return
    assert "jwt_configured" in body
    assert "supabase_configured" in body

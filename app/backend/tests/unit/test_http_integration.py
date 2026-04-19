"""Unit tests for legacy HTTP test base URL resolution."""

import pytest

from tests.http_integration import integration_base_url, normalize_api_base_url


def test_normalize_prepends_scheme_for_host_port():
    assert normalize_api_base_url("127.0.0.1:8001") == "http://127.0.0.1:8001"


def test_normalize_strips_trailing_slash():
    assert normalize_api_base_url("http://localhost:8001/") == "http://localhost:8001"


def test_integration_base_url_prefers_react_env(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("REACT_APP_BACKEND_URL", "https://example.com/staging/")
    monkeypatch.delenv("SNAPROAD_TEST_API_URL", raising=False)
    monkeypatch.delenv("VITE_BACKEND_URL", raising=False)
    assert integration_base_url() == "https://example.com/staging"

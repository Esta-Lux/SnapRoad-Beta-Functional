"""CollectAPI adapter: Bearer fallback after apikey-style 401, safe JSON envelope."""
from __future__ import annotations

from unittest.mock import MagicMock

import httpx

import services.gas_collectapi_http as gch


def test_get_collect_gas_json_retries_bearer_after_401() -> None:
    ok_body = {"success": True, "result": [{"name": "Ohio", "regular": "3.05"}]}
    unauthorized = httpx.Response(401, text="Unauthorized")
    ok = httpx.Response(200, json=ok_body)

    mock_client_cm = MagicMock()
    mock_client_cm.__enter__.return_value.get.side_effect = [unauthorized, ok]

    def _fake_client(**_kw):
        return mock_client_cm

    real_cm = httpx.Client
    httpx.Client = _fake_client  # type: ignore[misc]
    try:
        body, err, st = gch.get_collect_gas_json(5.0, "secret-key")
    finally:
        httpx.Client = real_cm

    assert err is None and st == 200
    assert isinstance(body, dict) and body.get("success") is True


def test_fetch_gas_rows_with_mock_collect_api(monkeypatch) -> None:
    import services.gas_prices_service as gps

    body = {
        "success": True,
        "result": [{"name": "Ohio", "regular": "3.05", "midGrade": None, "premium": None, "diesel": None}],
    }
    seen: list[str] = []

    def fake_collect(_timeout: float, key: str):
        seen.append(key)
        return body, None, 200

    monkeypatch.setattr(gps, "get_collect_gas_json", fake_collect)
    monkeypatch.setattr(gps, "COLLECTAPI_KEY", "Bearer dummy-token")

    with gps._CACHE_LOCK:
        gps._cache_mono_until = 0.0
        gps._cached_rows.clear()
        gps._cached_error = None

    rows, err = gps.fetch_us_state_gas_prices()
    assert err is None
    assert len(rows) >= 1
    oh = next((r for r in rows if r.get("state") == "Ohio"), None)
    assert oh is not None
    assert oh.get("regular") in {"3.05", "3.050"}
    assert seen == ["dummy-token"]


def test_collectapi_key_normalization_accepts_common_header_values() -> None:
    import services.gas_prices_service as gps

    assert gps._normalize_collectapi_key("apikey abc123") == "abc123"
    assert gps._normalize_collectapi_key("Bearer abc123") == "abc123"
    assert gps._normalize_collectapi_key("authorization: apikey abc123") == "abc123"
    assert gps._normalize_collectapi_key("Authorization: Bearer abc123") == "abc123"

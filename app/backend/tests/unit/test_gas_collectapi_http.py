"""CollectAPI adapter: documented apikey header first + fallbacks; safe JSON envelope."""
from __future__ import annotations

from unittest.mock import MagicMock

import httpx

import services.gas_collectapi_http as gch


def test_get_collect_gas_json_eventually_succeeds_after_401s() -> None:
    ok_body = {"success": True, "result": [{"name": "Ohio", "regular": "3.05"}]}
    unauthorized = httpx.Response(401, text="Unauthorized")
    ok = httpx.Response(200, json=ok_body)

    mock_client_cm = MagicMock()
    mock_client_cm.__enter__.return_value.get.side_effect = [
        unauthorized,
        unauthorized,
        unauthorized,
        ok,
    ]

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
    assert mock_client_cm.__enter__.return_value.get.call_count == 4


def test_header_sets_put_official_authorization_first() -> None:
    h = gch._header_sets("  my-token  ")
    assert h[0]["Authorization"] == "my-token"
    assert h[0]["content-type"] == "application/json"
    assert h[1]["authorization"] == "apikey my-token"


def test_get_collect_state_gas_json_uses_documented_state_endpoint() -> None:
    ok_body = {
        "success": True,
        "result": {
            "state": {
                "currency": "usd",
                "name": "Washington",
                "gasoline": "4.401",
                "midGrade": "4.671",
                "premium": "4.901",
                "diesel": "5.032",
            },
        },
    }
    ok = httpx.Response(200, json=ok_body)

    mock_client_cm = MagicMock()
    mock_client_cm.__enter__.return_value.get.return_value = ok

    def _fake_client(**_kw):
        return mock_client_cm

    real_cm = httpx.Client
    httpx.Client = _fake_client  # type: ignore[misc]
    try:
        body, err, st = gch.get_collect_state_gas_json(5.0, "secret-key", "wa")
    finally:
        httpx.Client = real_cm

    assert err is None and st == 200
    assert body == ok_body
    _url = mock_client_cm.__enter__.return_value.get.call_args.args[0]
    _kwargs = mock_client_cm.__enter__.return_value.get.call_args.kwargs
    assert _url.endswith("/gasPrice/stateUsaPrice")
    assert _kwargs["params"] == {"state": "WA"}
    hdrs = _kwargs["headers"]
    assert hdrs.get("Authorization") == "secret-key"
    assert hdrs.get("content-type") == "application/json"


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
    monkeypatch.setattr(gps, "get_collectapi_key", lambda: "Bearer dummy-token")

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


def test_fallback_state_iteration_starts_with_ohio(monkeypatch) -> None:
    import services.gas_prices_service as gps

    def fake_all(_timeout: float, _key: str):
        return None, "gas_prices_collectapi_unauthorized", 401

    codes_seen: list[str] = []

    def fake_state(_timeout: float, _key: str, state_code: str):
        codes_seen.append(state_code)
        return None, "gas_prices_collectapi_transport_error", None

    monkeypatch.setattr(gps, "get_collect_gas_json", fake_all)
    monkeypatch.setattr(gps, "get_collect_state_gas_json", fake_state)
    monkeypatch.setattr(gps, "get_collectapi_key", lambda: "dummy-token")

    with gps._CACHE_LOCK:
        gps._cache_mono_until = 0.0
        gps._cached_rows.clear()
        gps._cached_error = None

    gps.fetch_us_state_gas_prices()
    assert codes_seen and codes_seen[0] == "OH"


def test_fallback_state_shapes_ohio_documented_gasoline(monkeypatch) -> None:
    import services.gas_prices_service as gps

    def fake_all(_timeout: float, _key: str):
        return None, "gas_prices_collectapi_unauthorized", 401

    def fake_state(_timeout: float, _key: str, state_code: str):
        if state_code == "OH":
            return {
                "success": True,
                "result": {
                    "state": {
                        "currency": "usd",
                        "name": "Ohio",
                        "lowername": "ohio",
                        "gasoline": "3.189",
                        "midGrade": "3.459",
                        "premium": "3.729",
                        "diesel": "3.929",
                    },
                    "cities": [],
                },
            }, None, 200
        name = gps.US_STATE_ABBREV_TO_NAME[state_code]
        return {
            "success": True,
            "result": {"state": {"currency": "usd", "name": name, "gasoline": "2.0"}},
        }, None, 200

    monkeypatch.setattr(gps, "get_collect_gas_json", fake_all)
    monkeypatch.setattr(gps, "get_collect_state_gas_json", fake_state)
    monkeypatch.setattr(gps, "get_collectapi_key", lambda: "dummy-token")

    with gps._CACHE_LOCK:
        gps._cache_mono_until = 0.0
        gps._cached_rows.clear()
        gps._cached_error = None

    rows, err = gps.fetch_us_state_gas_prices()
    assert err is None
    oh = next((r for r in rows if r.get("state") == "Ohio"), None)
    assert oh is not None
    assert oh.get("regular") == "3.189"
    assert oh.get("midGrade") == "3.459"


def test_fallback_state_endpoint_keeps_ohio_when_payload_omits_name(monkeypatch) -> None:
    import services.gas_prices_service as gps

    def fake_all(_timeout: float, _key: str):
        return None, "gas_prices_collectapi_unauthorized", 401

    def fake_state(_timeout: float, _key: str, state_code: str):
        if state_code == "OH":
            return {
                "success": True,
                "result": {
                    "state": {
                        "currency": "usd",
                        "gasoline": "3.219",
                        "midGrade": "3.499",
                    },
                },
            }, None, 200
        return None, "gas_prices_collectapi_transport_error", None

    monkeypatch.setattr(gps, "get_collect_gas_json", fake_all)
    monkeypatch.setattr(gps, "get_collect_state_gas_json", fake_state)
    monkeypatch.setattr(gps, "get_collectapi_key", lambda: "dummy-token")

    with gps._CACHE_LOCK:
        gps._cache_mono_until = 0.0
        gps._cached_rows.clear()
        gps._cached_error = None

    rows, err = gps.fetch_us_state_gas_prices()
    assert err is None
    assert len(rows) == 1
    oh = rows[0]
    assert oh.get("state") == "Ohio"
    assert oh.get("regular") == "3.219"


def test_fetch_gas_rows_falls_back_to_documented_state_endpoint(monkeypatch) -> None:
    import services.gas_prices_service as gps

    def fake_all(_timeout: float, _key: str):
        return None, "gas_prices_collectapi_unauthorized", 401

    def fake_state(_timeout: float, _key: str, state_code: str):
        name = "Washington" if state_code == "WA" else state_code
        return {
            "success": True,
            "result": {
                "state": {
                    "currency": "usd",
                    "name": name,
                    "gasoline": "4.401",
                    "midGrade": "4.671",
                    "premium": "4.901",
                    "diesel": "5.032",
                },
            },
        }, None, 200

    monkeypatch.setattr(gps, "get_collect_gas_json", fake_all)
    monkeypatch.setattr(gps, "get_collect_state_gas_json", fake_state)
    monkeypatch.setattr(gps, "get_collectapi_key", lambda: "dummy-token")

    with gps._CACHE_LOCK:
        gps._cache_mono_until = 0.0
        gps._cached_rows.clear()
        gps._cached_error = None

    rows, err = gps.fetch_us_state_gas_prices()
    assert err is None
    wa = next((r for r in rows if r.get("state") == "Washington"), None)
    assert wa is not None
    assert wa.get("regular") == "4.401"
    assert wa.get("midGrade") == "4.671"


def test_fetch_raw_rows_skips_state_fallback_on_collectapi_429(monkeypatch) -> None:
    import services.gas_prices_service as gps

    state_calls = {"n": 0}

    def fake_all(_timeout: float, _key: str):
        return None, gps._ERR_RATE_LIMITED, 429

    def fake_state(_timeout: float, _key: str, _state_code: str):
        state_calls["n"] += 1
        return None, None, None

    monkeypatch.setattr(gps, "get_collect_gas_json", fake_all)
    monkeypatch.setattr(gps, "get_collect_state_gas_json", fake_state)

    rows, err = gps._fetch_collectapi_raw_rows("dummy-key")
    assert rows == []
    assert err == gps._ERR_RATE_LIMITED
    assert state_calls["n"] == 0


def test_state_fallback_stops_after_first_state_429(monkeypatch) -> None:
    import services.gas_prices_service as gps

    codes_seen: list[str] = []

    def fake_state(_timeout: float, _key: str, state_code: str):
        codes_seen.append(state_code)
        return None, gps._ERR_RATE_LIMITED, 429

    monkeypatch.setattr(gps, "get_collect_state_gas_json", fake_state)

    rows, err = gps._fetch_collectapi_state_endpoint_rows("dummy-key")
    assert rows == []
    assert err == gps._ERR_RATE_LIMITED
    assert codes_seen == ["OH"]


def test_collectapi_key_normalization_accepts_common_header_values() -> None:
    import services.gas_prices_service as gps

    assert gps._normalize_collectapi_key("apikey abc123") == "abc123"
    assert gps._normalize_collectapi_key("Bearer abc123") == "abc123"
    assert gps._normalize_collectapi_key("authorization: apikey abc123") == "abc123"
    assert gps._normalize_collectapi_key("Authorization: Bearer abc123") == "abc123"

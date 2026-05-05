import services.gas_prices_service as gps


def test_cached_regular_price_usd_per_gallon_parses_dollar_string():
    with gps._CACHE_LOCK:
        prev = list(gps._cached_rows)
        gps._cached_rows = [{"state": "Ohio", "regular": "$3.449"}]
    try:
        p = gps.cached_regular_price_usd_per_gallon("Ohio")
        assert p is not None
        assert abs(p - 3.449) < 1e-6
    finally:
        with gps._CACHE_LOCK:
            gps._cached_rows = prev

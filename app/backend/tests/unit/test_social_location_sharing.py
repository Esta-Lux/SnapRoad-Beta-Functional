from routes import social


class _FakeResult:
    def __init__(self, data):
        self.data = data


class _FakeQuery:
    def __init__(self, responder):
        self._responder = responder
        self._select_cols = ""
        self._in_values = []

    def select(self, cols):
        self._select_cols = cols
        return self

    def in_(self, _key, values):
        self._in_values = list(values or [])
        return self

    def execute(self):
        return self._responder(self._select_cols, self._in_values)


class _FakeSB:
    def __init__(self, responder):
        self._responder = responder

    def table(self, _name):
        return _FakeQuery(self._responder)


def test_missing_column_error_detection():
    err = Exception('column "battery_pct" of relation "live_locations" does not exist')
    assert social._is_missing_column_error(err, "live_locations", "battery_pct") is True
    assert social._is_missing_column_error(err, "live_locations", "speed_mph") is False


def test_select_live_locations_includes_battery_when_present():
    def responder(cols, values):
        assert "battery_pct" in cols
        assert values == ["u1"]
        return _FakeResult([{"user_id": "u1", "is_sharing": True, "battery_pct": 74}])

    sb = _FakeSB(responder)
    res, has_battery = social._select_live_locations_with_optional_battery(sb, ["u1"])
    assert has_battery is True
    assert res.data[0]["battery_pct"] == 74


def test_select_live_locations_falls_back_without_battery_column():
    calls = {"n": 0}

    def responder(cols, values):
        calls["n"] += 1
        assert values == ["u1"]
        if calls["n"] == 1:
            assert "battery_pct" in cols
            raise Exception('column "battery_pct" of relation "live_locations" does not exist')
        assert "battery_pct" not in cols
        return _FakeResult([{"user_id": "u1", "is_sharing": True}])

    sb = _FakeSB(responder)
    res, has_battery = social._select_live_locations_with_optional_battery(sb, ["u1"])
    assert has_battery is False
    assert res.data[0]["user_id"] == "u1"
    assert calls["n"] == 2

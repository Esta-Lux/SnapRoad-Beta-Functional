from services import commute_traffic_mapbox as ctm
from routes import commute_routes


class _FakeResponse:
    def __init__(self, payload):
        self._payload = payload
        self.is_success = True
        self.status_code = 200
        self.text = ""

    def json(self):
        return self._payload


class _FakeClient:
    def __init__(self):
        self.urls = []

    def get(self, url):
        self.urls.append(url)
        if "/driving-traffic/" in url:
            return _FakeResponse(
                {
                    "routes": [
                        {
                            "duration": 1800,
                            "distance": 19000,
                            "legs": [{"annotation": {"congestion": ["heavy", "severe", "heavy"]}}],
                        },
                        {
                            "duration": 1500,
                            "distance": 20500,
                            "legs": [{"annotation": {"congestion": ["low", "low", "moderate"]}}],
                        },
                    ]
                }
            )
        return _FakeResponse({"routes": [{"duration": 1200, "distance": 18500}]})


def test_commute_traffic_snapshot_picks_cleaner_alternate(monkeypatch):
    monkeypatch.setattr(ctm, "mapbox_token_from_env", lambda: "pk.test")
    client = _FakeClient()

    snapshot = ctm.commute_traffic_snapshot(40.0, -83.0, 40.2, -83.2, http=client)

    assert snapshot.primary_duration_sec == 1800
    assert snapshot.baseline_duration_sec == 1200
    assert snapshot.extra_sec == 600
    assert snapshot.best_duration_sec == 1500
    assert snapshot.alternate_saves_sec == 300
    assert snapshot.primary_congestion == "severe"
    assert snapshot.best_congestion == "moderate"
    assert snapshot.route_count == 2
    assert "alternatives=true" in client.urls[0]


def test_commute_traffic_push_copy_is_short_and_actionable(monkeypatch):
    monkeypatch.setattr(ctm, "mapbox_token_from_env", lambda: "pk.test")
    snapshot = ctm.commute_traffic_snapshot(40.0, -83.0, 40.2, -83.2, http=_FakeClient())

    title, body = commute_routes._commute_traffic_push_copy("Work", snapshot)

    assert title == "Route busy"
    assert "Cleaner road saves ~5 min" in body
    assert "open SnapRoad" in body
    assert len(body) <= 110

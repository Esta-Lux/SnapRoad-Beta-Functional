from __future__ import annotations

from routes import navigation, offers


class FakeRequest:
    headers = {"x-snaproad-guest-id": "guest_test_driver"}


def test_nearby_offers_accepts_signed_out_guest(monkeypatch):
    monkeypatch.setattr(offers, "cache_get", lambda _key: None)
    monkeypatch.setattr(offers, "cache_set", lambda *_args, **_kwargs: None)
    monkeypatch.setattr(offers, "_hydrate_offer_coordinates_from_locations", lambda _rows: None)
    monkeypatch.setattr(offers, "_user_offer_affinity", lambda user_id, _offer: (10.0 if user_id == "guest_test_driver" else 0.0, False))
    monkeypatch.setattr(
        offers,
        "_active_offers_source",
        lambda limit=500: [
            {
                "id": "offer_1",
                "business_name": "Snap Coffee",
                "business_type": "coffee",
                "lat": 39.9613,
                "lng": -82.9989,
                "base_gems": 25,
            }
        ],
    )

    res = offers.get_nearby_offers(
        request=FakeRequest(),
        auth_user=None,
        lat=39.9612,
        lng=-82.9988,
        radius=1,
        limit=10,
    )

    assert res["success"] is True
    assert res["count"] == 1
    assert res["data"][0]["id"] == "offer_1"


def test_navigation_nearby_offers_accepts_signed_out_guest(monkeypatch):
    monkeypatch.setattr(navigation, "cache_get", lambda _key: None)
    monkeypatch.setattr(navigation, "cache_set", lambda *_args, **_kwargs: None)
    monkeypatch.setattr(
        "routes.offers._active_offers_source",
        lambda limit=500: [
            {
                "id": "offer_1",
                "business_name": "Snap Coffee",
                "business_type": "coffee",
                "lat": 39.9613,
                "lng": -82.9989,
                "boost_multiplier": 1.0,
            }
        ],
    )

    res = navigation.get_navigation_nearby_offers(
        request=FakeRequest(),
        lat=39.9612,
        lng=-82.9988,
        trip_id="trip_guest",
        auth_user=None,
    )

    assert res["success"] is True
    assert res["count"] == 1
    assert res["data"][0]["id"] == "offer_1"

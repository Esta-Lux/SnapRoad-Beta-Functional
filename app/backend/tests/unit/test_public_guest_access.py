from __future__ import annotations

from routes import navigation, offers
from routes import trips
from starlette.requests import Request


def guest_request() -> Request:
    return Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/",
            "headers": [(b"x-snaproad-guest-id", b"guest_test_driver")],
            "client": ("127.0.0.1", 12345),
        }
    )


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
        request=guest_request(),
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
        request=guest_request(),
        lat=39.9612,
        lng=-82.9988,
        trip_id="trip_guest",
        auth_user=None,
    )

    assert res["success"] is True
    assert res["count"] == 1
    assert res["data"][0]["id"] == "offer_1"


def test_guest_can_redeem_offer_without_profile(monkeypatch):
    monkeypatch.setattr("services.runtime_config.require_enabled", lambda *_args, **_kwargs: None)
    monkeypatch.setattr(
        offers,
        "_resolve_offer_by_id",
        lambda _offer_id: {
            "id": "offer_1",
            "business_name": "Snap Coffee",
            "discount_percent": 15,
        },
    )
    monkeypatch.setattr(offers, "_issue_post_redeem_qr", lambda **_kwargs: {"claim_code": "GUEST15"})
    seen = {}
    monkeypatch.setattr(offers, "record_guest_activity", lambda guest_id, event_type, **kwargs: seen.update({"guest_id": guest_id, "event_type": event_type, **kwargs}))

    res = offers.redeem_offer(
        request=guest_request(),
        offer_id="offer_1",
        auth_user={"id": "guest_test_driver", "user_id": "guest_test_driver", "is_guest": True},
    )

    assert res["success"] is True
    assert res["data"]["gem_cost"] == 0
    assert res["data"]["claim_code"] == "GUEST15"
    assert seen["event_type"] == "offer_redeem"


def test_guest_can_complete_trip_without_profile(monkeypatch):
    seen = {}
    monkeypatch.setattr(trips, "record_guest_activity", lambda guest_id, event_type, **kwargs: seen.update({"guest_id": guest_id, "event_type": event_type, **kwargs}))

    res = trips.complete_trip(
        request=guest_request(),
        body=trips.TripCompleteBody(
            distance_miles=1.2,
            duration_seconds=300,
            safety_score=94,
            origin="Start",
            destination="Coffee",
        ),
        user={"id": "guest_test_driver", "user_id": "guest_test_driver", "is_guest": True},
    )

    assert res["success"] is True
    assert res["data"]["guest"] is True
    assert res["data"]["counted"] is True
    assert res["data"]["trip_id"].startswith("guest_trip_")
    assert seen["event_type"] == "trip_complete"

from routes.trips import (
    TripCompleteBody,
    _build_trip_row,
    _strip_missing_trip_optional_column,
    _trip_row_to_client_shape,
)


def test_build_trip_row_region_state_overrides_fuel_cost(monkeypatch):
    """CollectAPI-backed price should win over a placeholder client estimate when region_state is set."""

    def fake_price(label: str | None) -> float | None:
        if (label or "").strip().lower() == "ohio":
            return 4.0
        return None

    monkeypatch.setattr("routes.trips.regular_price_usd_for_state_label", fake_price)
    body = TripCompleteBody(
        distance_miles=10,
        duration_seconds=600,
        safety_score=88,
        fuel_used_gallons=0.4,
        fuel_cost_estimate=999.0,
        region_state="Ohio",
    )
    row = _build_trip_row("trip-oh", "user-1", body, 10.0, 88, 5, 10)

    assert row["fuel_cost_estimate"] == round(0.4 * 4.0, 2)


def test_trip_complete_body_defaults_safety_to_zero():
    assert TripCompleteBody().safety_score == 0


def test_build_trip_row_carries_service_driver_metrics():
    body = TripCompleteBody(
        distance_miles=12.34,
        duration_seconds=1800,
        safety_score=91,
        origin="Current Location",
        destination="Downtown dropoff",
        avg_speed_mph=24.7,
        max_speed_mph=62.2,
        fuel_used_gallons=0.493,
        fuel_cost_estimate=1.78,
        mileage_value_estimate=8.27,
        hard_acceleration_events=2,
    )
    row = _build_trip_row("trip-1", "user-1", body, 12.34, 91, 4, 123)

    assert row["origin"] == "Current Location"
    assert row["destination"] == "Downtown dropoff"
    assert row["avg_speed_mph"] == 24.7
    assert row["max_speed_mph"] == 62.2
    assert row["fuel_used_gallons"] == 0.493
    assert row["fuel_cost_estimate"] == 1.78
    assert row["mileage_value_estimate"] == 8.27
    assert row["hard_acceleration_events"] == 2
    assert row["duration_minutes"] == 30


def test_build_trip_row_sanitizes_impossible_speed_spikes():
    body = TripCompleteBody(
        distance_miles=10,
        duration_seconds=120,
        safety_score=80,
        avg_speed_mph=300,
        max_speed_mph=72,
    )
    row = _build_trip_row("trip-spike", "user-1", body, 10, 80, 4, 50)

    assert row["distance_miles"] == 2.4
    assert row["avg_speed_mph"] == 72
    assert row["max_speed_mph"] == 72


def test_trip_row_to_client_shape_returns_recap_summary_metrics_and_aliases():
    row = {
        "id": "trip-2",
        "origin_label": "971 Summit Street",
        "dest_label": "5407 Silver Dust Ln",
        "distance_miles": "1.06",
        "duration_seconds": 123,
        "safety_score": "85",
        "gems_earned": "5",
        "xp_earned": "20",
        "avg_speed": "42",
        "max_speed": "72",
        "fuel_used_gallons": "0.04",
        "fuel_cost_estimate": "0.14",
        "mileage_value_estimate": "0.71",
        "hard_brakes": "1",
        "hard_accels": "2",
        "speeding_events": "2",
        "started_at": "2026-05-03T06:37:00Z",
        "ended_at": "2026-05-03T06:39:03Z",
    }

    shaped = _trip_row_to_client_shape(row)

    assert shaped["origin"] == "971 Summit Street"
    assert shaped["destination"] == "5407 Silver Dust Ln"
    assert shaped["distance_miles"] == 1.06
    assert shaped["duration"] == 123
    assert shaped["duration_seconds"] == 123
    assert shaped["duration_minutes"] == 2
    assert shaped["safety_score"] == 85
    assert shaped["gems_earned"] == 5
    assert shaped["xp_earned"] == 20
    assert shaped["avg_speed_mph"] == 42
    assert shaped["max_speed_mph"] == 72
    assert shaped["fuel_used_gallons"] == 0.04
    assert shaped["fuel_cost_estimate"] == 0.14
    assert shaped["mileage_value_estimate"] == 0.71
    assert shaped["hard_braking_events"] == 1
    assert shaped["hard_acceleration_events"] == 2
    assert shaped["speeding_events"] == 2
    assert shaped["started_at"] == "2026-05-03T06:37:00Z"
    assert shaped["ended_at"] == "2026-05-03T06:39:03Z"


def test_trip_row_to_client_shape_sanitizes_legacy_speed_spikes():
    shaped = _trip_row_to_client_shape({
        "id": "trip-spike",
        "distance_miles": "10",
        "duration_seconds": 120,
        "avg_speed_mph": "300",
        "max_speed_mph": "72",
    })

    assert shaped["distance_miles"] == 2.4
    assert shaped["avg_speed_mph"] == 72
    assert shaped["max_speed_mph"] == 72


def test_strip_missing_trip_optional_column_handles_schema_cache_wording():
    row = {"origin": "A", "destination": "B", "distance_miles": 1.2}
    err = Exception("Could not find the 'origin' column of 'trips' in the schema cache")

    assert _strip_missing_trip_optional_column(row, err) is True
    assert "origin" not in row
    assert row["destination"] == "B"

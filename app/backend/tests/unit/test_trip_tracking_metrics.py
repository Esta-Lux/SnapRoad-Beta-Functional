from routes.trips import (
    TripCompleteBody,
    _build_trip_row,
    _strip_missing_trip_optional_column,
)


def test_build_trip_row_carries_service_driver_metrics():
    body = TripCompleteBody(
        distance_miles=12.34,
        duration_seconds=1800,
        safety_score=91,
        origin="Current Location",
        destination="Downtown dropoff",
        avg_speed_mph=24.7,
        fuel_used_gallons=0.493,
    )
    row = _build_trip_row("trip-1", "user-1", body, 12.34, 91, 4, 123)

    assert row["origin"] == "Current Location"
    assert row["destination"] == "Downtown dropoff"
    assert row["avg_speed_mph"] == 24.7
    assert row["fuel_used_gallons"] == 0.493
    assert row["duration_minutes"] == 30


def test_strip_missing_trip_optional_column_handles_schema_cache_wording():
    row = {"origin": "A", "destination": "B", "distance_miles": 1.2}
    err = Exception("Could not find the 'origin' column of 'trips' in the schema cache")

    assert _strip_missing_trip_optional_column(row, err) is True
    assert "origin" not in row
    assert row["destination"] == "B"

from services.gem_economy import (
    TRIP_GEMS_PER_COUNTED_DRIVE,
    apply_trip_gem_daily_cap,
    trip_drive_ledger_metadata,
    trip_gems_from_duration_minutes,
)


def test_trip_gems_flat_ignore_duration_and_premium():
    assert trip_gems_from_duration_minutes(1, False) == TRIP_GEMS_PER_COUNTED_DRIVE
    assert trip_gems_from_duration_minutes(999, True) == TRIP_GEMS_PER_COUNTED_DRIVE


def test_apply_daily_cap_reduces_when_room_below_gems():
    assert apply_trip_gem_daily_cap(5, 100) == 0
    assert apply_trip_gem_daily_cap(5, 97) == 3


def test_trip_drive_ledger_metadata_shape():
    meta = trip_drive_ledger_metadata(
        duration_seconds=120.0,
        distance_miles=2.5,
        is_premium=False,
        gems_credited=5,
        already_earned_today_before_this_trip=0,
    )
    assert meta["gems_credited"] == 5
    assert "flat_trip_gems" in meta
    assert "formula_summary" in meta

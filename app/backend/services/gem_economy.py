"""Central gem pricing rules (trips, offers)."""

# Max trip gems credited from driving per calendar day (UTC); 0 = no cap.
TRIP_GEM_DAILY_CAP = 100
# Hard ceiling per single counted trip (flat reward below).
TRIP_GEM_PER_TRIP_CAP = 25
# Flat gems per qualifying trip once distance/duration gates pass (`complete_trip` route).
TRIP_GEMS_PER_COUNTED_DRIVE = 5


def trip_gems_from_duration_minutes(duration_minutes: float, is_premium: bool) -> int:
    """
    Flat gems per counted trip (gates are enforced in `/trips/complete`).
    Premium does not multiply trip-drive gems anymore — Insights + wallet stay aligned.
    Legacy parameters kept so call sites stay stable.
    """
    _ = duration_minutes, is_premium
    return min(TRIP_GEMS_PER_COUNTED_DRIVE, TRIP_GEM_PER_TRIP_CAP)


def apply_trip_gem_daily_cap(gems: int, already_earned_today: int) -> int:
    if TRIP_GEM_DAILY_CAP <= 0:
        return gems
    room = max(0, TRIP_GEM_DAILY_CAP - int(already_earned_today))
    return min(int(gems), room)


def trip_drive_ledger_metadata(
    duration_seconds: float,
    distance_miles: float,
    is_premium: bool,
    gems_credited: int,
    already_earned_today_before_this_trip: int,
) -> dict:
    """
    Server-side breakdown for wallet_transactions metadata (trip_drive credits).
    Mirrors flat trip gems + daily cap semantics.
    """
    duration_min = max(0.0, float(duration_seconds)) / 60.0
    base_flat = min(TRIP_GEMS_PER_COUNTED_DRIVE, TRIP_GEM_PER_TRIP_CAP)
    after_daily = apply_trip_gem_daily_cap(base_flat, already_earned_today_before_this_trip)
    formula_summary = (
        f"Counted trip reward: {TRIP_GEMS_PER_COUNTED_DRIVE} gems (flat; premium does not multiply). "
        f"Per-trip cap {TRIP_GEM_PER_TRIP_CAP} gems; daily cap {TRIP_GEM_DAILY_CAP} gems (UTC)."
    )
    return {
        "duration_minutes": round(duration_min, 2),
        "duration_seconds": int(duration_seconds),
        "distance_miles": round(float(distance_miles), 2),
        "flat_trip_gems": base_flat,
        "is_premium": bool(is_premium),
        "gems_after_trip_cap": base_flat,
        "already_earned_today_utc_before_trip": int(already_earned_today_before_this_trip),
        "gems_after_daily_cap": after_daily,
        "gems_credited": int(gems_credited),
        "formula_summary": formula_summary,
    }


def offer_gems_reward_for_discount(discount_percent: float, is_free_item: bool) -> int:
    """Partner offer gem cost to drivers — derived from discount, not partner input."""
    if is_free_item:
        return 35
    disc = max(0.0, min(100.0, float(discount_percent)))
    if disc <= 10:
        return 20
    if disc <= 45:
        return 45
    return 50

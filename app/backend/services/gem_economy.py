"""Central gem pricing rules (trips, offers)."""

# Max trip gems credited from driving per calendar day (UTC); 0 = no cap.
TRIP_GEM_DAILY_CAP = 800
# Hard ceiling per single trip (after premium multiplier).
TRIP_GEM_PER_TRIP_CAP = 200


def trip_gems_from_duration_minutes(duration_minutes: float, is_premium: bool) -> int:
    """
    10-minute buckets from driving time on a valid trip:
      - 1st full 10 min: 15 gems
      - each additional full 10 min: +5 gems
    Premium doubles the total. Partial buckets below 10 min → 0 gems from buckets.
    """
    d = max(0.0, float(duration_minutes))
    chunks = int(d // 10)
    if chunks < 1:
        return 0
    raw = 15 + (chunks - 1) * 5
    raw = min(raw, 100)
    total = raw * 2 if is_premium else raw
    return min(total, TRIP_GEM_PER_TRIP_CAP)


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
    Mirrors trip_gems_from_duration_minutes + daily cap semantics.
    """
    duration_min = max(0.0, float(duration_seconds)) / 60.0
    chunks = int(duration_min // 10)
    raw_bucket = 0
    if chunks >= 1:
        raw_bucket = min(15 + (chunks - 1) * 5, 100)
    after_premium = raw_bucket * 2 if is_premium else raw_bucket
    after_trip_cap = min(after_premium, TRIP_GEM_PER_TRIP_CAP)
    after_daily = apply_trip_gem_daily_cap(after_trip_cap, already_earned_today_before_this_trip)
    formula_summary = (
        f"{chunks} full 10 min block(s) of valid driving: first block 15 gems, "
        f"+5 per additional block (cap 100 before multiplier). "
        f"{'Premium 2× applied. ' if is_premium else ''}"
        f"Per-trip cap {TRIP_GEM_PER_TRIP_CAP} gems; daily cap {TRIP_GEM_DAILY_CAP} gems (UTC)."
    )
    return {
        "duration_minutes": round(duration_min, 2),
        "duration_seconds": int(duration_seconds),
        "distance_miles": round(float(distance_miles), 2),
        "full_ten_minute_chunks": chunks,
        "base_bucket_gems": raw_bucket,
        "premium_multiplier": 2 if is_premium else 1,
        "gems_after_premium_and_trip_cap": after_trip_cap,
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

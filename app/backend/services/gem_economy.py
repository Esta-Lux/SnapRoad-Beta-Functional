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

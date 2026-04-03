"""Central gem pricing rules (trips, offers)."""


def trip_gems_from_duration_minutes(duration_minutes: float, is_premium: bool) -> int:
    """Gems for a qualifying trip from duration (minutes). Premium = 2×."""
    d = max(0.0, float(duration_minutes))
    if d < 20:
        base = 10
    elif d < 60:
        base = 25
    else:
        base = 45
    return base * 2 if is_premium else base


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

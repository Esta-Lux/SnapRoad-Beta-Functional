"""
SnapRoad Offer Utility Functions
Centralized gem pricing, redemption fees, and discount calculations.
"""


def calculate_auto_gems(discount_percent: int, is_free_item: bool = False) -> int:
    """Auto-calculate gem cost for drivers from discount bands (partners do not set this)."""
    from services.gem_economy import offer_gems_reward_for_discount

    return offer_gems_reward_for_discount(float(discount_percent), bool(is_free_item))


def calculate_free_discount(premium_discount: int) -> int:
    """Free users get ~30% of the premium discount (premium gets 70%), minimum 1%."""
    if premium_discount <= 0:
        return 0
    return max(1, round(premium_discount * 0.3))


def calculate_redemption_fee(total_redemptions: int) -> float:
    """
    Tiered per-redemption fee:
      1-500:   $0.20
      501-1000: $0.30
      1001-1500: $0.40
      ... +$0.10 per 500 after the first 500
    """
    base = 0.20
    tiers_past = max(0, (total_redemptions - 1) // 500)
    return round(base + tiers_past * 0.10, 2)


def get_fee_tier_info(total_redemptions: int) -> dict:
    """Return human-readable fee tier info for the partner dashboard."""
    current_fee = calculate_redemption_fee(total_redemptions)
    current_tier = max(0, (total_redemptions - 1) // 500) if total_redemptions > 0 else 0
    tier_start = current_tier * 500 + 1 if total_redemptions > 0 else 1
    tier_end = (current_tier + 1) * 500
    next_fee = round(current_fee + 0.10, 2)

    return {
        "current_fee": current_fee,
        "current_tier": current_tier + 1,
        "tier_range": f"{tier_start}-{tier_end}",
        "next_tier_fee": next_fee,
        "next_tier_at": tier_end + 1,
        "total_redemptions": total_redemptions,
        "schedule": [
            {"range": "1-500", "fee": 0.20},
            {"range": "501-1,000", "fee": 0.30},
            {"range": "1,001-1,500", "fee": 0.40},
            {"range": "1,501-2,000", "fee": 0.50},
            {"range": "2,001+", "fee": "0.50+ ($0.10 per 500)"},
        ],
    }

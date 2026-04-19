"""Tier math for referral milestone rewards (no DB)."""


def test_partner_tiers_cap():
    from services.referral_rewards import MAX_TIERS, PARTNER_BLOCK, PARTNER_BONUS_PER_TIER

    assert PARTNER_BLOCK == 5
    assert PARTNER_BONUS_PER_TIER == 30
    assert MAX_TIERS == 4
    for n, expect_tier in [(4, 0), (5, 1), (9, 1), (10, 2), (20, 4), (100, 4)]:
        assert min(n // PARTNER_BLOCK, MAX_TIERS) == expect_tier


def test_driver_tiers():
    from services.referral_rewards import DRIVER_BLOCK, DRIVER_BONUS_PER_TIER, MAX_TIERS

    assert DRIVER_BLOCK == 5
    assert DRIVER_BONUS_PER_TIER == 60
    for n, expect_tier in [(4, 0), (5, 1), (15, 3), (20, 4), (99, 4)]:
        assert min(n // DRIVER_BLOCK, MAX_TIERS) == expect_tier

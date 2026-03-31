"""Server-side SnapRoad 0–1000 score from profile counters (single source of truth for API clients)."""


def snap_road_tier_from_total(total: int) -> str:
    if total >= 800:
        return "Elite"
    if total >= 600:
        return "Pro"
    if total >= 400:
        return "Driver"
    return "Rookie"


def compute_snap_road_fields(user: dict) -> dict:
    """
    Returns API fields: snap_road_score, snap_road_tier, snap_road_breakdown.
    Uses the same weighting as the mobile fallback heuristic.
    """
    safety = float(user.get("safety_score") or 0)
    streak = float(
        user["streak"]
        if user.get("streak") is not None
        else user.get("safe_drive_streak") or 0
    )
    miles = float(user.get("total_miles") or 0)
    gems = float(user.get("gems") or 0)

    safety_pts = min(300, int(round((safety / 100.0) * 300)))
    streak_pts = min(200, int(round(min(streak, 20) * 10)))
    miles_pts = min(200, int(round((min(miles, 2000) / 2000.0) * 200)))
    gems_pts = min(200, int(round((min(gems, 2000) / 2000.0) * 200)))

    total = min(1000, safety_pts + streak_pts + miles_pts + gems_pts)
    tier = snap_road_tier_from_total(total)

    return {
        "snap_road_score": total,
        "snap_road_tier": tier,
        "snap_road_breakdown": {
            "safety_pts": safety_pts,
            "streak_pts": streak_pts,
            "miles_pts": miles_pts,
            "gems_pts": gems_pts,
        },
    }

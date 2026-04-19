import type { User } from '../types';

export function snapRoadTierFromTotal(total: number): string {
  if (total >= 800) return 'Elite';
  if (total >= 600) return 'Pro';
  if (total >= 400) return 'Driver';
  return 'Rookie';
}

/** Merge snake_case SnapRoad fields from /api/user/profile into a Partial<User>. */
export function applySnapRoadFromProfilePayload(patch: Partial<User>, pp: Record<string, unknown>): void {
  if (pp.streak != null || pp.safe_drive_streak != null) {
    patch.streak = Number(pp.streak ?? pp.safe_drive_streak ?? 0);
  }
  if (pp.snap_road_score != null && pp.snap_road_score !== '') {
    patch.snapRoadScore = Number(pp.snap_road_score);
  }
  if (typeof pp.snap_road_tier === 'string') {
    patch.snapRoadTier = pp.snap_road_tier;
  }
  const srb = pp.snap_road_breakdown;
  if (srb && typeof srb === 'object' && !Array.isArray(srb)) {
    const b = srb as Record<string, unknown>;
    patch.snapRoadBreakdown = {
      safetyPts: Number(b.safety_pts ?? b.safetyPts ?? 0),
      streakPts: Number(b.streak_pts ?? b.streakPts ?? 0),
      milesPts: Number(b.miles_pts ?? b.milesPts ?? 0),
      gemsPts: Number(b.gems_pts ?? b.gemsPts ?? 0),
    };
  }
}

function fallbackBreakdown(user: User | null) {
  const safety = user?.safetyScore ?? 0;
  const streak = user?.streak ?? 0;
  const miles = user?.totalMiles ?? 0;
  const gems = user?.gems ?? 0;

  const safetyPts = Math.min(300, Math.round((safety / 100) * 300));
  const streakPts = Math.min(200, Math.round(Math.min(streak, 20) * 10));
  const milesPts = Math.min(200, Math.round((Math.min(miles, 2000) / 2000) * 200));
  const gemsPts = Math.min(200, Math.round((Math.min(gems, 2000) / 2000) * 200));

  const total = Math.min(1000, safetyPts + streakPts + milesPts + gemsPts);
  const tier = snapRoadTierFromTotal(total);

  return {
    total,
    tier,
    safetyPts,
    streakPts,
    milesPts,
    gemsPts,
    toPerfect: Math.max(0, 1000 - total),
    safety,
    streak,
    miles,
    gems,
  };
}

/**
 * Prefer server `snap_road_score` / `snap_road_breakdown` from profile;
 * fall back to client-only heuristic if the API omits them.
 */
export function computeSnapRoadScoreBreakdown(user: User | null) {
  const safety = user?.safetyScore ?? 0;
  const streak = user?.streak ?? 0;
  const miles = user?.totalMiles ?? 0;
  const gems = user?.gems ?? 0;

  const bd = user?.snapRoadBreakdown;
  const hasServer =
    user?.snapRoadScore != null &&
    Number.isFinite(user.snapRoadScore) &&
    bd != null &&
    typeof bd.safetyPts === 'number' &&
    typeof bd.streakPts === 'number' &&
    typeof bd.milesPts === 'number' &&
    typeof bd.gemsPts === 'number';

  if (hasServer) {
    const total = Math.min(1000, Math.round(Number(user.snapRoadScore)));
    const tier = user.snapRoadTier ?? snapRoadTierFromTotal(total);
    return {
      total,
      tier,
      safetyPts: bd!.safetyPts,
      streakPts: bd!.streakPts,
      milesPts: bd!.milesPts,
      gemsPts: bd!.gemsPts,
      toPerfect: Math.max(0, 1000 - total),
      safety,
      streak,
      miles,
      gems,
    };
  }

  return fallbackBreakdown(user);
}

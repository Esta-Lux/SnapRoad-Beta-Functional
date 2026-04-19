type UnknownRecord = Record<string, unknown>;

function asRecord(v: unknown): UnknownRecord | null {
  return v && typeof v === 'object' ? (v as UnknownRecord) : null;
}

export function unwrapApiData(payload: unknown): unknown {
  const root = asRecord(payload);
  if (!root) return payload;
  const data = root.data;
  const nested = asRecord(data);
  if (nested && 'data' in nested) return nested.data;
  return data ?? payload;
}

export type ProfilePatch = Partial<{
  gems: number;
  level: number;
  totalMiles: number;
  totalTrips: number;
  safetyScore: number;
  xp: number;
  streak: number;
  plan: string;
  isPremium: boolean;
  isFamilyPlan: boolean;
  gem_multiplier: number;
}>;

/**
 * Build a partial user update from `GET /api/user/profile` (or equivalent)
 * suitable for `updateUser(patch)` — only includes fields that are present
 * and parseable. Mirrors premium-derivation rules from `mapApiUserToContext`
 * so Wallet pull-to-refresh can surface plan changes without a full re-login.
 */
export function parseProfilePatch(payload: unknown): ProfilePatch {
  const root = asRecord(unwrapApiData(payload));
  if (!root) return {};
  const out: ProfilePatch = {};
  const gems = Number(root.gems);
  if (Number.isFinite(gems)) out.gems = gems;
  const level = Number(root.level);
  if (Number.isFinite(level)) out.level = level;
  const miles = Number(root.total_miles);
  if (Number.isFinite(miles)) out.totalMiles = miles;
  const trips = Number(root.total_trips);
  if (Number.isFinite(trips)) out.totalTrips = trips;
  const safety = Number(root.safety_score);
  if (Number.isFinite(safety)) out.safetyScore = safety;
  const xp = root.xp != null ? Number(root.xp) : NaN;
  if (Number.isFinite(xp)) out.xp = xp;
  const streak = root.streak != null ? Number(root.streak) : (root.safe_drive_streak != null ? Number(root.safe_drive_streak) : NaN);
  if (Number.isFinite(streak)) out.streak = streak;
  const mult = root.gem_multiplier != null ? Number(root.gem_multiplier) : NaN;
  if (Number.isFinite(mult)) out.gem_multiplier = mult;
  const planRaw = typeof root.plan === 'string' ? root.plan.trim().toLowerCase() : '';
  // Premium derivation: explicit `plan` wins (matches AuthContext.mapApiUserToContext).
  // Only emit isPremium / isFamilyPlan when the server actually carries a signal,
  // to avoid silently demoting a premium user if a partial payload omits them.
  if (planRaw) {
    out.plan = planRaw;
    out.isFamilyPlan = planRaw === 'family';
    out.isPremium = planRaw === 'premium' || planRaw === 'family';
  } else if (root.is_premium != null) {
    out.isPremium = Boolean(root.is_premium);
  }
  return out;
}

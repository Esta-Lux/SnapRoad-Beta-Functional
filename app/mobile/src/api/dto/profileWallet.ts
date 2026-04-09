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
}>;

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
  return out;
}

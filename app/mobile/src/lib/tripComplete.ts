/**
 * Pure helpers for merging `/api/trips/complete` responses into a local `TripSummary`.
 * Kept free of React / React Native imports so it can run under plain Node test harness
 * (`tsx --test`).
 */

import type { TripSummary } from '../hooks/useDriveNavigation';

/** Shape of the unwrapped `/api/trips/complete` success body (inside `data`). */
export interface TripCompleteApiData {
  trip_id?: string | null;
  counted?: boolean;
  gems_earned?: number;
  xp_earned?: number;
  safety_score?: number;
  distance_miles?: number;
  profile?: {
    total_miles?: number;
    total_trips?: number;
    gems?: number;
    xp?: number;
    safety_score?: number;
    level?: number;
  };
}

/** Extract the payload from either `{data: {...}}` wrappers or a bare object. */
export function unwrapTripCompleteData(body: unknown): TripCompleteApiData {
  if (!body || typeof body !== 'object') return {};
  const outer = body as { data?: unknown } & TripCompleteApiData;
  if (outer.data && typeof outer.data === 'object') {
    return outer.data as TripCompleteApiData;
  }
  return outer as TripCompleteApiData;
}

/**
 * Take the raw `/api/trips/complete` server body and merge it into a local `TripSummary`.
 * Shared by the bridge hook + unit tests so there's a single implementation to reason about.
 */
export function mergeTripCompleteResponse(base: TripSummary, body: unknown): TripSummary {
  if (!body || typeof body !== 'object') return base;
  const d = unwrapTripCompleteData(body);

  const apiCounted = d.counted !== false && d.trip_id != null;
  const profRaw = d.profile;
  const profileSnap =
    profRaw && typeof profRaw === 'object'
      ? {
          total_miles: profRaw.total_miles != null ? Number(profRaw.total_miles) : undefined,
          total_trips: profRaw.total_trips != null ? Number(profRaw.total_trips) : undefined,
          gems: profRaw.gems != null ? Number(profRaw.gems) : undefined,
          xp: profRaw.xp != null ? Number(profRaw.xp) : undefined,
        }
      : undefined;

  return {
    ...base,
    gems_earned: Number(d.gems_earned ?? base.gems_earned),
    xp_earned: Number(d.xp_earned ?? base.xp_earned),
    safety_score: Number(d.safety_score ?? base.safety_score),
    counted: apiCounted,
    profile_totals: profileSnap ?? base.profile_totals,
  };
}

/** Race `promise` against a timeout. Returns `null` if the timeout wins. */
export async function raceWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T | null> {
  return new Promise<T | null>((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve(null);
    }, timeoutMs);
    promise.then(
      (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(null);
      },
    );
  });
}

/**
 * `navPuckSync` — small set of **pure** helpers that keep the on-screen puck
 * and arrow tied to the user's *true* GPS location during turn-by-turn:
 *
 *   1. **Stationary lock** — when the user is actually stopped (red light,
 *      parking, sub-walking-speed) we freeze both the published coordinate
 *      AND the heading. Without this, native matched-location wobble (a few
 *      meters per tick) and route-tangent flips (when the matcher snaps
 *      across a vertex) make the chevron visibly drift and rotate even
 *      though the device is sitting still.
 *
 *   2. **True-location leash** — if the matched/snapped coordinate diverges
 *      from the user's smoothed GPS position by more than `LEASH_HARD_MAX_M`
 *      we publish the GPS position instead. This guarantees the puck stays
 *      with the user (no "phantom puck on the parallel street" once the
 *      matcher misbehaves). Smaller divergences are blended.
 *
 *   3. **Heading stabilizer** — at low speed the bearing source switches
 *      from GPS course (which is meaningless < 5 mph) to "hold prior".
 *      `resolvePuckHeading` returns a heading that is monotonically eased
 *      with a per-second cap so a single noisy tick can't visibly spin
 *      the chevron to the wrong direction.
 *
 * All functions are pure (no React, no time source from `Date.now()` —
 * callers pass `nowMs`) so they're easy to unit-test and reason about.
 */
import type { Coordinate } from '../types';
import { haversineMeters } from '../utils/distance';

/* ── Stationary-lock thresholds ──────────────────────────────────────── */

/** Below this smoothed speed, we *consider* the device stationary. */
export const STATIONARY_SPEED_MPH = 1.6;
/** Below this raw speed, we *consider* the device stationary. */
export const STATIONARY_RAW_SPEED_MPS = 0.85;
/**
 * Below this raw speed we lock **immediately** instead of waiting for the
 * dwell window. At literal zero / parking-lot speeds, the polyline-snapped
 * matched coord can creep with dead-reckoning, so we want to freeze ASAP.
 */
export const STATIONARY_INSTANT_LOCK_RAW_MPS = 0.35;
/** Must hold for this long before the lock engages (avoids brief 0-mph dips). */
export const STATIONARY_DWELL_MS = 260;
/** Above this smoothed speed we release the lock immediately. */
export const MOTION_RELEASE_SPEED_MPH = 3.0;
/** Brief debounce after motion is detected to avoid quick re-locks. */
export const MOTION_RELEASE_DWELL_MS = 350;

/* ── True-location leash thresholds ─────────────────────────────────── */

/**
 * Above this divergence between matched coord and true GPS, the matched
 * coord is rejected outright in favour of the user's GPS position. Tuned
 * for highway accuracy bands — typical good-fix accuracy is 5–18m, so a
 * 110m divergence reliably indicates a phantom snap to a parallel road.
 */
export const LEASH_HARD_MAX_M = 110;
/**
 * Between `LEASH_SOFT_MAX_M` and `LEASH_HARD_MAX_M` we blend matched
 * toward GPS at a fixed ratio so the puck "snaps back" smoothly without
 * a visible teleport.
 */
export const LEASH_SOFT_MAX_M = 32;

/* ── Heading stabilizer ─────────────────────────────────────────────── */

/** Below this speed, GPS course-over-ground is unreliable; freeze heading. */
export const HEADING_FREEZE_SPEED_MPH = 5;
/** Cap on heading change applied per published frame when moving (degrees). */
export const HEADING_MAX_STEP_DEG = 10;
/** Reject single-tick flips ≥ this when the device is below 12 mph. */
export const HEADING_FLIP_REJECT_DEG = 90;

/* ── Display-position filter ───────────────────────────────────────── */

/** Ignore tiny display-position deltas while moving; below this is visual jitter. */
export const DISPLAY_POSITION_MIN_MOVE_M = 3.2;
/** Wider dead-zone at low speed / stoplights where GPS and matcher wander most. */
export const DISPLAY_POSITION_SLOW_MIN_MOVE_M = 4.8;
/** Route handoff / reroute scale jumps should snap, not slowly scrub across the map. */
export const DISPLAY_POSITION_SNAP_JUMP_M = 180;
/** Time constant for accepted display-position interpolation. */
export const DISPLAY_POSITION_TIME_CONSTANT_MS = 340;

/* ── Types ──────────────────────────────────────────────────────────── */

export type StationaryLockState = {
  /** True iff the lock is currently engaged. */
  locked: boolean;
  /** Anchor point captured when the lock engaged. */
  anchor: Coordinate | null;
  /** Heading captured when the lock engaged. */
  anchorHeading: number | null;
  /** Last update wall-clock ms (set by caller). */
  updatedAtMs: number;
  /**
   * When the device first appeared stationary in this run; reset to null
   * once motion is observed. Used to enforce `STATIONARY_DWELL_MS`.
   */
  stillSinceMs: number | null;
  /** When motion was first observed after a lock; null when locked. */
  movingSinceMs: number | null;
};

export type DisplayPositionState = {
  coord: Coordinate | null;
  updatedAtMs: number;
};

export const INITIAL_STATIONARY_LOCK: StationaryLockState = {
  locked: false,
  anchor: null,
  anchorHeading: null,
  updatedAtMs: 0,
  stillSinceMs: null,
  movingSinceMs: null,
};

export const INITIAL_DISPLAY_POSITION_STATE: DisplayPositionState = {
  coord: null,
  updatedAtMs: 0,
};

/* ── Helpers ────────────────────────────────────────────────────────── */

function isFiniteCoord(c: Coordinate | null | undefined): c is Coordinate {
  return (
    !!c &&
    Number.isFinite(c.lat) &&
    Number.isFinite(c.lng) &&
    !(Math.abs(c.lat) < 1e-7 && Math.abs(c.lng) < 1e-7)
  );
}

function shortestAngleDeltaDeg(from: number, to: number): number {
  const d = ((to - from + 540) % 360) - 180;
  return d;
}

function clampStep(prev: number, target: number, maxStepDeg: number): number {
  const delta = shortestAngleDeltaDeg(prev, target);
  if (Math.abs(delta) <= maxStepDeg) return ((target % 360) + 360) % 360;
  const stepped = prev + Math.sign(delta) * maxStepDeg;
  return ((stepped % 360) + 360) % 360;
}

function blendCoord(a: Coordinate, b: Coordinate, t: number): Coordinate {
  const k = Math.max(0, Math.min(1, t));
  return {
    lat: a.lat + (b.lat - a.lat) * k,
    lng: a.lng + (b.lng - a.lng) * k,
  };
}

function displayPositionMinMoveMeters(speedMps: number, accuracyM?: number | null): number {
  const speed = Number.isFinite(speedMps) ? Math.max(0, speedMps) : 0;
  const base = speed < 1.4 ? DISPLAY_POSITION_SLOW_MIN_MOVE_M : DISPLAY_POSITION_MIN_MOVE_M;
  const accExtra =
    typeof accuracyM === 'number' && Number.isFinite(accuracyM)
      ? Math.min(1.4, Math.max(0, (accuracyM - 12) * 0.045))
      : 0;
  return base + accExtra;
}

/* ── Pure resolvers ─────────────────────────────────────────────────── */

/**
 * Update the stationary-lock state from the latest sample.
 *
 * - Engages the lock once `STATIONARY_DWELL_MS` of low-speed dwell has
 *   elapsed. Anchors to the *current matched coord* (or true GPS if no
 *   matched yet) so the published position is what the user last saw,
 *   not whatever drifts in.
 * - Releases the lock immediately when smoothed speed crosses
 *   `MOTION_RELEASE_SPEED_MPH` for `MOTION_RELEASE_DWELL_MS` — this
 *   avoids a single noisy speed tick popping the lock while waiting at
 *   a light.
 */
export function updateStationaryLock(
  prev: StationaryLockState,
  sample: {
    speedMph: number;
    rawSpeedMps: number;
    matched: Coordinate | null;
    trueLoc: Coordinate | null;
    heading: number | null;
    nowMs: number;
    /**
     * Optional explicit anchor to use when the lock engages. When the
     * caller has already snapped the puck to the route polyline, passing
     * the snapped coord here means the freeze point is exactly on the
     * line — no creeping during the dwell window can carry it off.
     */
    anchorOverride?: Coordinate | null;
  },
): StationaryLockState {
  const { speedMph, rawSpeedMps, matched, trueLoc, heading, nowMs, anchorOverride } = sample;
  const anchorSrc = isFiniteCoord(anchorOverride)
    ? anchorOverride
    : isFiniteCoord(matched)
      ? matched
      : isFiniteCoord(trueLoc)
        ? trueLoc
        : null;

  const isSlow =
    Number.isFinite(speedMph) &&
    Number.isFinite(rawSpeedMps) &&
    speedMph <= STATIONARY_SPEED_MPH &&
    rawSpeedMps <= STATIONARY_RAW_SPEED_MPS;

  /**
   * Raw speed is *literally* zero-ish AND the caller handed us an
   * explicit anchor (e.g. the route-snapped point). In that case the
   * dwell window is just dead time during which the upstream candidate
   * can creep, so freeze immediately. We require the override so this
   * fast path only fires for callers that know what they're locking to.
   */
  const isInstantLockable =
    Number.isFinite(rawSpeedMps) &&
    rawSpeedMps <= STATIONARY_INSTANT_LOCK_RAW_MPS &&
    Number.isFinite(speedMph) &&
    speedMph <= STATIONARY_SPEED_MPH &&
    isFiniteCoord(anchorOverride);

  if (prev.locked) {
    if (Number.isFinite(speedMph) && speedMph >= MOTION_RELEASE_SPEED_MPH) {
      const since = prev.movingSinceMs ?? nowMs;
      if (nowMs - since >= MOTION_RELEASE_DWELL_MS) {
        return {
          locked: false,
          anchor: null,
          anchorHeading: null,
          updatedAtMs: nowMs,
          stillSinceMs: null,
          movingSinceMs: null,
        };
      }
      return { ...prev, movingSinceMs: since, updatedAtMs: nowMs };
    }
    if (!isSlow) {
      return { ...prev, movingSinceMs: prev.movingSinceMs ?? nowMs, updatedAtMs: nowMs };
    }
    return { ...prev, movingSinceMs: null, updatedAtMs: nowMs };
  }

  if (!isSlow) {
    return {
      locked: false,
      anchor: null,
      anchorHeading: null,
      updatedAtMs: nowMs,
      stillSinceMs: null,
      movingSinceMs: null,
    };
  }

  if (isInstantLockable && anchorSrc) {
    return {
      locked: true,
      anchor: anchorSrc,
      anchorHeading:
        typeof heading === 'number' && Number.isFinite(heading) ? heading : null,
      updatedAtMs: nowMs,
      stillSinceMs: prev.stillSinceMs ?? nowMs,
      movingSinceMs: null,
    };
  }

  const stillSince = prev.stillSinceMs ?? nowMs;
  const dwell = nowMs - stillSince;
  if (dwell < STATIONARY_DWELL_MS) {
    return { ...prev, stillSinceMs: stillSince, updatedAtMs: nowMs };
  }

  return {
    locked: true,
    anchor: anchorSrc,
    anchorHeading:
      typeof heading === 'number' && Number.isFinite(heading) ? heading : null,
    updatedAtMs: nowMs,
    stillSinceMs: stillSince,
    movingSinceMs: null,
  };
}

/**
 * Resolve the coordinate to publish to the puck.
 *
 * Rules (in order):
 *  1. If the lock is engaged AND the anchor is finite: publish the anchor.
 *  2. If matched is finite: clamp toward true GPS using the leash.
 *  3. Else if true GPS is finite: publish true GPS.
 *  4. Else: publish `prevPublished` if we have one, otherwise null.
 */
export function resolvePuckCoord(input: {
  matched: Coordinate | null;
  trueLoc: Coordinate | null;
  prevPublished: Coordinate | null;
  lock: StationaryLockState;
  /** Optional GPS accuracy (m) — looser leash when accuracy is poor. */
  accuracyM?: number | null;
  /**
   * Force-publish `matched` when the caller has already validated it as an
   * on-route polyline point. This keeps the visible puck glued to the route
   * instead of letting raw GPS tug it across lanes or around corners.
   */
  lockToMatched?: boolean;
}): Coordinate | null {
  const { matched, trueLoc, prevPublished, lock, accuracyM, lockToMatched = false } = input;

  if (lock.locked && isFiniteCoord(lock.anchor)) {
    return lock.anchor;
  }

  if (isFiniteCoord(matched)) {
    if (lockToMatched) return matched;
    if (!isFiniteCoord(trueLoc)) return matched;
    const div = haversineMeters(matched.lat, matched.lng, trueLoc.lat, trueLoc.lng);
    const acc = typeof accuracyM === 'number' && Number.isFinite(accuracyM) ? accuracyM : 0;
    const softMax = LEASH_SOFT_MAX_M + Math.min(40, Math.max(0, acc * 0.6));
    const hardMax = LEASH_HARD_MAX_M + Math.min(80, Math.max(0, acc * 0.6));
    if (div <= softMax) return matched;
    if (div >= hardMax) {
      // Phantom match (parallel road, etc.) — true GPS wins.
      return trueLoc;
    }
    // Linear blend: at softMax → matched, at hardMax → trueLoc.
    const t = (div - softMax) / Math.max(1, hardMax - softMax);
    return blendCoord(matched, trueLoc, t);
  }

  if (isFiniteCoord(trueLoc)) return trueLoc;
  if (isFiniteCoord(prevPublished)) return prevPublished;
  return null;
}

/**
 * Resolve the heading to publish.
 *
 * - When locked: hold `lock.anchorHeading` if available, otherwise hold
 *   `prevHeading`. Never derive from a noisy SDK course while stopped.
 * - When moving and the matched/preferred heading is finite: rate-limit
 *   the change to `HEADING_MAX_STEP_DEG` per call (one per published
 *   frame), and reject hard flips (≥ `HEADING_FLIP_REJECT_DEG`) at
 *   sub-12 mph speeds where they're almost always matcher artifacts.
 * - At low speeds (`< HEADING_FREEZE_SPEED_MPH`) keep the heading
 *   pinned to `prevHeading` regardless of what the candidate says.
 */
export function resolvePuckHeading(input: {
  candidate: number | null;
  prevHeading: number | null;
  speedMph: number;
  lock: StationaryLockState;
  /** Optional override max-step (degrees). */
  maxStepDeg?: number;
}): number | null {
  const { candidate, prevHeading, speedMph, lock, maxStepDeg } = input;

  if (lock.locked) {
    if (
      typeof lock.anchorHeading === 'number' &&
      Number.isFinite(lock.anchorHeading)
    ) {
      return ((lock.anchorHeading % 360) + 360) % 360;
    }
    if (typeof prevHeading === 'number' && Number.isFinite(prevHeading)) {
      return ((prevHeading % 360) + 360) % 360;
    }
    return null;
  }

  if (typeof candidate !== 'number' || !Number.isFinite(candidate) || candidate < 0) {
    if (typeof prevHeading === 'number' && Number.isFinite(prevHeading)) {
      return ((prevHeading % 360) + 360) % 360;
    }
    return null;
  }

  if (
    Number.isFinite(speedMph) &&
    speedMph < HEADING_FREEZE_SPEED_MPH &&
    typeof prevHeading === 'number' &&
    Number.isFinite(prevHeading)
  ) {
    return ((prevHeading % 360) + 360) % 360;
  }

  if (typeof prevHeading !== 'number' || !Number.isFinite(prevHeading)) {
    return ((candidate % 360) + 360) % 360;
  }

  const delta = Math.abs(shortestAngleDeltaDeg(prevHeading, candidate));
  if (speedMph < 12 && delta >= HEADING_FLIP_REJECT_DEG) {
    return ((prevHeading % 360) + 360) % 360;
  }

  return clampStep(prevHeading, candidate, maxStepDeg ?? HEADING_MAX_STEP_DEG);
}

/**
 * Final display-position filter for the visible navigation puck/camera point.
 *
 * Upstream route progress may arrive at low frequency, while native matched
 * fixes can wobble a few meters around the same road position. This helper
 * holds sub-threshold movement, eases accepted movement, and snaps only for
 * route-handoff / reroute scale jumps.
 */
export function stabilizeDisplayPosition(input: {
  candidate: Coordinate | null;
  prev: DisplayPositionState;
  speedMps: number;
  accuracyM?: number | null;
  nowMs: number;
  minMoveMeters?: number;
  slowMinMoveMeters?: number;
  snapJumpMeters?: number;
  timeConstantMs?: number;
}): DisplayPositionState {
  const {
    candidate,
    prev,
    speedMps,
    accuracyM,
    nowMs,
    minMoveMeters,
    slowMinMoveMeters,
    snapJumpMeters = DISPLAY_POSITION_SNAP_JUMP_M,
    timeConstantMs = DISPLAY_POSITION_TIME_CONSTANT_MS,
  } = input;

  if (!isFiniteCoord(candidate)) {
    return {
      coord: isFiniteCoord(prev.coord) ? prev.coord : null,
      updatedAtMs: Number.isFinite(prev.updatedAtMs) ? prev.updatedAtMs : nowMs,
    };
  }

  if (!isFiniteCoord(prev.coord) || !Number.isFinite(prev.updatedAtMs) || prev.updatedAtMs <= 0) {
    return { coord: candidate, updatedAtMs: nowMs };
  }

  const movedM = haversineMeters(prev.coord.lat, prev.coord.lng, candidate.lat, candidate.lng);
  const speed = Number.isFinite(speedMps) ? Math.max(0, speedMps) : 0;
  const threshold =
    speed < 1.4
      ? slowMinMoveMeters ?? displayPositionMinMoveMeters(speed, accuracyM)
      : minMoveMeters ?? displayPositionMinMoveMeters(speed, accuracyM);

  if (movedM < threshold) {
    return { coord: prev.coord, updatedAtMs: nowMs };
  }

  if (movedM >= snapJumpMeters) {
    return { coord: candidate, updatedAtMs: nowMs };
  }

  const dtMs = Math.max(16, Math.min(1000, nowMs - prev.updatedAtMs));
  const alpha = 1 - Math.exp(-dtMs / Math.max(16, timeConstantMs));
  return {
    coord: blendCoord(prev.coord, candidate, alpha),
    updatedAtMs: nowMs,
  };
}

/* ── Test-only exports ─────────────────────────────────────────────── */

export const __testOnly__ = {
  shortestAngleDeltaDeg,
  clampStep,
  blendCoord,
  displayPositionMinMoveMeters,
};

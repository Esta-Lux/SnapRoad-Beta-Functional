/**
 * `useSmoothedNavFraction` — RAF-driven interpolation of the
 * "fraction-traveled along route" signal, so the puck, the route-split seam,
 * and the camera anchor all slide *smoothly* under the user instead of
 * hopping every time the native SDK emits a new progress tick.
 *
 * Why this exists
 * ---------------
 * The native Mapbox Navigation SDK emits matched-location + routeProgress
 * samples at roughly:
 *   - iOS: throttled to 150 ms (6–7 Hz)
 *   - Android: ~1 Hz for routeProgress, higher for locationMatcher
 *
 * Consuming those as-is produces a stepped puck (6–7 distinct positions per
 * second) + a route polyline that visibly "chops" every tick as the
 * GeoJSON split reassembles at the new fraction. Apple Maps hides this by
 * interpolating the puck/route split between ticks. We do the same here by
 * easing a local `displayed` value toward the latest `target` at ~60 Hz
 * (RAF) with a short time constant.
 *
 * Design notes
 * -----------
 * - **Exponential-decay ease** (not linear) so arrival is smooth — linear
 *   interpolation has a visible stop/start when ticks land far apart.
 * - **Time constant ≈ 180 ms** — roughly matches the iOS throttle and gives
 *   a perceptually stable puck without introducing a visible lag (<2 m at
 *   cruise speed).
 * - **Snap on large deltas** — if the target jumps by > `snapDeltaFraction`
 *   of the route (default 2%) we assume a reroute / teleport and skip the
 *   ease, otherwise the puck would visibly scrub across the map.
 * - **Monotonic forward guarantee** when the target only moves forward —
 *   we never ease *backward* past the current displayed value unless the
 *   snap threshold is crossed, which keeps the seam stable when matcher
 *   jitter produces a 1–2 m retrograde sample.
 */
import { useEffect, useRef, useState } from 'react';

type Options = {
  /** If |target - displayed| > this fraction, skip easing and snap. */
  snapDeltaFraction?: number;
  /** Exponential ease time constant in ms (63% toward target per tc). */
  timeConstantMs?: number;
  /** When false (e.g. not navigating), always pass target straight through. */
  enabled?: boolean;
  /**
   * Optional dead-reckoning: while the authoritative `targetFraction` is not
   * updating (SDK silent — tunnel, stall, matcher hiccup), continue advancing
   * the displayed fraction at the last-known ground speed. This is what Apple
   * Maps does in tunnels / under overpasses and what Mapbox's own
   * NavigationCamera approximates via puck velocity. See
   * `docs/NATIVE_NAVIGATION.md` → Apple Maps comparison.
   */
  deadReckoning?: {
    /** Full route polyline length in meters. Required to convert m/s → fraction/ms. */
    polylineLengthMeters: number;
    /** Last-known ground speed in m/s. Pass 0 when stationary to freeze the puck. */
    speedMps: number;
    /** After this many ms of no target change, start extrapolating. Default 350 ms. */
    staleThresholdMs?: number;
    /** Cap total extrapolation at this many ms of silence. Default 4000 ms. */
    maxStaleMs?: number;
  };
};

/**
 * @param targetFraction Authoritative fraction-traveled (0-1). Typically
 *                      `navigationProgress.routeSplitSnap.cumulativeMeters /
 *                      polylineLengthMeters(polyline)`.
 * @param isNavigating  When false the hook immediately returns `target`.
 * @returns Smoothed fraction in `[0, 1]` — RAF-updated between ticks.
 */
export function useSmoothedNavFraction(
  targetFraction: number,
  isNavigating: boolean,
  opts: Options = {},
): number {
  const {
    snapDeltaFraction = 0.02,
    timeConstantMs = 180,
    enabled = true,
    deadReckoning,
  } = opts;

  const targetRef = useRef<number>(clamp01(targetFraction));
  const displayedRef = useRef<number>(clamp01(targetFraction));
  const lastFrameMsRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);
  const [displayed, setDisplayed] = useState<number>(clamp01(targetFraction));

  /**
   * Dead-reckoning bookkeeping — refs so the RAF callback always sees the
   * latest values without re-subscribing the effect.
   */
  const lastTargetChangeMsRef = useRef<number>(0);
  const drPolylineLenRef = useRef<number>(0);
  const drSpeedMpsRef = useRef<number>(0);
  const drStaleThresholdMsRef = useRef<number>(350);
  const drMaxStaleMsRef = useRef<number>(1400);

  drPolylineLenRef.current = deadReckoning?.polylineLengthMeters ?? 0;
  drSpeedMpsRef.current = deadReckoning?.speedMps ?? 0;
  drStaleThresholdMsRef.current = deadReckoning?.staleThresholdMs ?? 350;
  drMaxStaleMsRef.current = deadReckoning?.maxStaleMs ?? 1400;

  useEffect(() => {
    const next = clamp01(targetFraction);
    if (!enabled || !isNavigating) {
      targetRef.current = next;
      displayedRef.current = next;
      setDisplayed(next);
      return;
    }
    const delta = next - displayedRef.current;
    /** External target changed — reset the dead-reckoning staleness clock. */
    lastTargetChangeMsRef.current =
      typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now();
    /**
     * Snap on large jumps (reroute / teleport). Don't snap *backward* on a
     * negative delta if we're within one frame of the dead-reckoning band —
     * in that case the user just exited a tunnel and the displayed value is
     * legitimately ahead of the stale target that's about to catch up.
     */
    if (delta >= snapDeltaFraction) {
      targetRef.current = next;
      displayedRef.current = next;
      setDisplayed(next);
      return;
    }
    if (delta <= -snapDeltaFraction) {
      /** Backward jump — genuine reroute (not DR artifact). Snap. */
      targetRef.current = next;
      displayedRef.current = next;
      setDisplayed(next);
      return;
    }
    if (next < displayedRef.current - 1e-6) {
      targetRef.current = displayedRef.current;
    } else {
      targetRef.current = next;
    }
  }, [targetFraction, isNavigating, enabled, snapDeltaFraction]);

  useEffect(() => {
    if (!enabled || !isNavigating) {
      if (rafIdRef.current != null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      return;
    }
    lastFrameMsRef.current = 0;
    const tick = (tMs: number) => {
      const last = lastFrameMsRef.current;
      const dt = last > 0 ? Math.max(0, tMs - last) : 16.67;
      lastFrameMsRef.current = tMs;
      const target = targetRef.current;
      const current = displayedRef.current;
      const diff = target - current;

      /**
       * Compute "can we dead-reckon right now?" — used both to decide whether
       * to actually extrapolate AND to gate the ease branch (so we never pull
       * backward toward a target that is frozen-behind us during SDK silence).
       */
      const speed = drSpeedMpsRef.current;
      const polyLen = drPolylineLenRef.current;
      const now =
        typeof performance !== 'undefined' && typeof performance.now === 'function'
          ? performance.now()
          : Date.now();
      const staleMs =
        lastTargetChangeMsRef.current > 0
          ? now - lastTargetChangeMsRef.current
          : 0;
      const canDeadReckon =
        staleMs >= drStaleThresholdMsRef.current &&
        staleMs <= drMaxStaleMsRef.current &&
        speed > 1.2 &&
        polyLen > 1;

      /** Phase 1: ease toward latest external target (unless target is stale and behind). */
      if (Math.abs(diff) >= 1e-6 && !(canDeadReckon && diff < 0)) {
        const alpha = 1 - Math.exp(-dt / Math.max(16, timeConstantMs));
        const nextDisp = current + diff * alpha;
        displayedRef.current = nextDisp;
        setDisplayed(nextDisp);
        rafIdRef.current = requestAnimationFrame(tick);
        return;
      }

      /** Phase 2: dead-reckoning during SDK silence. */
      if (canDeadReckon) {
        const dFrac = (speed * dt) / 1000 / polyLen;
        const nextDisp = Math.min(1, current + dFrac);
        if (nextDisp !== current) {
          displayedRef.current = nextDisp;
          setDisplayed(nextDisp);
        }
      }
      rafIdRef.current = requestAnimationFrame(tick);
    };
    rafIdRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafIdRef.current != null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [enabled, isNavigating, timeConstantMs]);

  return displayed;
}

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

/**
 * Pure ease-step used by the hook. Exported for unit tests so we can assert
 * convergence / snap behaviour without animating real RAFs.
 */
export function stepSmoothedFraction(
  current: number,
  target: number,
  dtMs: number,
  timeConstantMs = 180,
  snapDeltaFraction = 0.02,
): number {
  const cur = clamp01(current);
  const tgt = clamp01(target);
  const diff = tgt - cur;
  if (Math.abs(diff) >= snapDeltaFraction) return tgt;
  if (Math.abs(diff) < 1e-6) return cur;
  const alpha = 1 - Math.exp(-Math.max(0, dtMs) / Math.max(16, timeConstantMs));
  return cur + diff * alpha;
}

/**
 * Pure ease+dead-reckoning step. Mirrors the hook's per-frame logic:
 *
 *  1. If `target !== current`, exponentially ease toward target.
 *  2. Else if external target has been stale for `[staleThresholdMs,
 *     maxStaleMs]` AND `speedMps > 1.2`, advance `current` forward at the
 *     given ground speed (converted to fraction via `polylineLengthMeters`).
 *  3. Otherwise return `current` unchanged.
 *
 * Exported so tests can simulate multi-second SDK silences without RAFs.
 */
export function stepSmoothedFractionWithDeadReckoning(params: {
  current: number;
  target: number;
  dtMs: number;
  staleMs: number;
  speedMps: number;
  polylineLengthMeters: number;
  timeConstantMs?: number;
  snapDeltaFraction?: number;
  staleThresholdMs?: number;
  maxStaleMs?: number;
}): number {
  const {
    current,
    target,
    dtMs,
    staleMs,
    speedMps,
    polylineLengthMeters,
    timeConstantMs = 180,
    snapDeltaFraction = 0.02,
    staleThresholdMs = 350,
    maxStaleMs = 1400,
  } = params;
  const cur = clamp01(current);
  const tgt = clamp01(target);
  const diff = tgt - cur;

  const isStale = staleMs >= staleThresholdMs;
  const canDeadReckon =
    isStale &&
    staleMs <= maxStaleMs &&
    speedMps > 1.2 &&
    polylineLengthMeters > 1;

  /**
   * Large jumps (reroute / teleport) snap — except when we've been dead-
   * reckoning forward past a frozen-behind target. In that case the large
   * negative delta is a *consequence* of DR, not a genuine reroute, and
   * snapping would undo the tunnel-crossing advance.
   */
  if (Math.abs(diff) >= snapDeltaFraction && !(canDeadReckon && diff < 0)) {
    return tgt;
  }

  /**
   * Ease toward the live target only when (a) there's a delta worth easing and
   * (b) we're not currently in dead-reckoning territory with a *stale target
   * behind us*. Pulling the puck backward toward a frozen-behind target would
   * undo the dead-reckoning advance and produce visible oscillation in
   * tunnels — so while DR is fueling forward progress, we never ease into a
   * backward target. A fresh forward-jumping target (within snap delta) still
   * eases normally.
   */
  if (Math.abs(diff) >= 1e-6 && !(canDeadReckon && diff < 0)) {
    const alpha =
      1 - Math.exp(-Math.max(0, dtMs) / Math.max(16, timeConstantMs));
    return cur + diff * alpha;
  }

  /** Dead-reckoning: advance at last-known speed while target is silent. */
  if (canDeadReckon) {
    const dFrac =
      (speedMps * Math.max(0, dtMs)) / 1000 / polylineLengthMeters;
    return Math.min(1, cur + dFrac);
  }
  return cur;
}

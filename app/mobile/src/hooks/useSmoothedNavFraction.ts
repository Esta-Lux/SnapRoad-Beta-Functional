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
  } = opts;

  const targetRef = useRef<number>(clamp01(targetFraction));
  const displayedRef = useRef<number>(clamp01(targetFraction));
  const lastFrameMsRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);
  const [displayed, setDisplayed] = useState<number>(clamp01(targetFraction));

  useEffect(() => {
    const next = clamp01(targetFraction);
    if (!enabled || !isNavigating) {
      targetRef.current = next;
      displayedRef.current = next;
      setDisplayed(next);
      return;
    }
    const delta = next - displayedRef.current;
    if (Math.abs(delta) >= snapDeltaFraction) {
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
      if (Math.abs(diff) < 1e-6) {
        rafIdRef.current = requestAnimationFrame(tick);
        return;
      }
      const alpha = 1 - Math.exp(-dt / Math.max(16, timeConstantMs));
      const nextDisp = current + diff * alpha;
      displayedRef.current = nextDisp;
      setDisplayed(nextDisp);
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

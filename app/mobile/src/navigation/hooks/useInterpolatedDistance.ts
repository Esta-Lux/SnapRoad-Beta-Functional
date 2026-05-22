import { useEffect, useRef, useState } from 'react';

type Options = {
  /**
   * Reset the cached distance when the maneuver changes. Use step index,
   * instruction signature, or another stable turn-card key.
   */
  resetKey?: string | number | null;
  /** Current speed in meters/second. */
  speedMps?: number | null;
  /** Smooth HUD cadence; 500ms feels live without hammering React. */
  updateIntervalMs?: number;
  /** Ignore impossible upward jumps while still on the same maneuver. */
  maxSameStepIncreaseMeters?: number;
};

export function useInterpolatedDistance(
  rawMeters: number | null | undefined,
  {
    resetKey = null,
    speedMps = 0,
    updateIntervalMs = 500,
    maxSameStepIncreaseMeters = 90,
  }: Options = {},
): number | null {
  const [displayMeters, setDisplayMeters] = useState<number | null>(
    typeof rawMeters === 'number' && Number.isFinite(rawMeters) && rawMeters >= 0 ? rawMeters : null,
  );
  const lastKnownDistanceRef = useRef<number | null>(displayMeters);
  const lastUpdateAtRef = useRef(Date.now());
  const resetKeyRef = useRef<string | number | null>(resetKey);
  const speedMpsRef = useRef(speedMps);

  useEffect(() => {
    speedMpsRef.current = speedMps;
  }, [speedMps]);

  useEffect(() => {
    const keyChanged = resetKey !== resetKeyRef.current;
    if (keyChanged) {
      resetKeyRef.current = resetKey;
      lastKnownDistanceRef.current = null;
      setDisplayMeters(null);
    }

    if (typeof rawMeters !== 'number' || !Number.isFinite(rawMeters) || rawMeters < 0) return;

    const prev = lastKnownDistanceRef.current;
    const sameStepSuspiciousJump =
      !keyChanged &&
      prev != null &&
      rawMeters > prev + maxSameStepIncreaseMeters;
    if (sameStepSuspiciousJump) return;

    lastKnownDistanceRef.current = rawMeters;
    lastUpdateAtRef.current = Date.now();
    setDisplayMeters(rawMeters);
  }, [maxSameStepIncreaseMeters, rawMeters, resetKey]);

  useEffect(() => {
    const id = setInterval(() => {
      const base = lastKnownDistanceRef.current;
      if (base == null) return;

      const speed = Math.max(0, Number.isFinite(speedMpsRef.current ?? NaN) ? speedMpsRef.current ?? 0 : 0);
      if (speed < 0.45) {
        setDisplayMeters(base);
        return;
      }

      const elapsedSec = Math.max(0, (Date.now() - lastUpdateAtRef.current) / 1000);
      setDisplayMeters(Math.max(0, base - speed * elapsedSec));
    }, updateIntervalMs);
    return () => clearInterval(id);
  }, [updateIntervalMs]);

  return displayMeters;
}

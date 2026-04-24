import { useMemo, useRef } from 'react';
import type { NavigationProgress } from './navModel';
import { formatImperialManeuverDistance } from './turnCardModel';
import { sdkGuidanceStabilityKey } from './sdkGuidanceUiKeys';
import {
  resolveStableManeuverDisplayMeters,
  type ManeuverDisplayMetersState,
} from './navDisplayHysteresis';

/**
 * Smoothed imperial distance for the headless-SDK turn card. Raw
 * `primaryDistanceMeters` can oscillate a few meters at 0–5 mph; the pure
 * {@link resolveStableManeuverDisplayMeters} pass runs before
 * {@link formatImperialManeuverDistance} (no “Now” label — matches native TTS cadence).
 */
export function useSdkManeuverDistanceForTurnCard(
  enabled: boolean,
  prog: NavigationProgress | null | undefined,
  displaySpeedMph: number,
): { value: string; unit: string } {
  const b = prog?.banner ?? null;
  const sdkNS = prog?.nextStep ?? null;

  const rawM = useMemo(() => {
    if (!enabled) return 0;
    return Math.max(0, b?.primaryDistanceMeters ?? prog?.nextStepDistanceMeters ?? 0);
  }, [enabled, b?.primaryDistanceMeters, prog?.nextStepDistanceMeters]);

  const textStabKey = useMemo(() => {
    if (!enabled) return '__sdk_maneuver_dist_off__';
    return sdkGuidanceStabilityKey(sdkNS);
  }, [enabled, sdkNS]);

  const distRef = useRef<ManeuverDisplayMetersState | null>(null);
  const smoothed = useMemo(() => {
    const now = Date.now();
    const next = resolveStableManeuverDisplayMeters(
      distRef.current,
      rawM,
      now,
      textStabKey,
      displaySpeedMph,
    );
    distRef.current = next;
    return next.displayed;
  }, [rawM, textStabKey, displaySpeedMph]);

  return useMemo(() => {
    if (!enabled) {
      return { value: '—', unit: '' };
    }
    if (!Number.isFinite(rawM) || rawM <= 0) {
      return { value: '—', unit: '' };
    }
    return formatImperialManeuverDistance(smoothed, {
      omitNowLabel: true,
    });
  }, [enabled, rawM, smoothed, displaySpeedMph]);
}

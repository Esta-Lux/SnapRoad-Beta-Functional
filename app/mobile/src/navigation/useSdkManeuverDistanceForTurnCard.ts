import { useMemo, useRef } from 'react';
import type { NavigationProgress } from './navModel';
import { formatImperialManeuverDistance } from './turnCardModel';
import {
  resolveStableManeuverDisplayMeters,
  type ManeuverDisplayMetersState,
} from './navDisplayHysteresis';

/**
 * Smoothed imperial distance for the headless-SDK turn card. Raw
 * `primaryDistanceMeters` can oscillate a few meters at 0–5 mph; the pure
 * {@link resolveStableManeuverDisplayMeters} pass runs before
 * {@link formatImperialManeuverDistance} (with speed-based “Now”).
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
    const rawPrimary =
      b?.primaryInstruction?.trim() ||
      sdkNS?.displayInstruction?.trim() ||
      sdkNS?.instruction?.trim() ||
      '';
    const primary = rawPrimary.replace(/\s+/g, ' ').trim();
    return `${sdkNS?.index ?? 0}|${(b?.primaryInstruction ?? primary).trim()}`;
  }, [enabled, b?.primaryInstruction, sdkNS?.index, sdkNS?.displayInstruction, sdkNS?.instruction]);

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
    return formatImperialManeuverDistance(smoothed, { speedMphForNow: displaySpeedMph });
  }, [enabled, rawM, smoothed, displaySpeedMph]);
}

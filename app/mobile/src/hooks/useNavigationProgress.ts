import { useMemo, useRef } from 'react';
import { NavigationProgress, RawLocation, RoutePoint, NavStep } from '../navigation/navModel';
import type { OffRouteTuning } from '../navigation/offRouteTuning';
import { computeNavigationProgressFrame } from '../navigation/navigationProgressCore';
import { DEFAULT_PROGRESS_TUNING, type ProgressTuning } from '../navigation/navModeProfile';

type Args = {
  rawLocation: RawLocation | null;
  route: RoutePoint[];
  steps: NavStep[];
  routeDurationSeconds: number;
  routeDistanceMeters: number;
  offRouteTuning: OffRouteTuning;
  edgeDurationSec?: number[] | null;
  /** Bump when route timing model refreshes so blend age resets. */
  routeModelTick?: number;
  routeModelRefreshedAtMs?: number;
  navEdgeEtaEnabled?: boolean;
  navEtaBlendEnabled?: boolean;
  progressTuning?: ProgressTuning;
};

export function useNavigationProgress({
  rawLocation,
  route,
  steps,
  routeDurationSeconds,
  routeDistanceMeters,
  offRouteTuning,
  edgeDurationSec = null,
  routeModelTick = 0,
  routeModelRefreshedAtMs = 0,
  navEdgeEtaEnabled = false,
  navEtaBlendEnabled = false,
  progressTuning = DEFAULT_PROGRESS_TUNING,
}: Args): NavigationProgress | null {
  const prevRef = useRef<NavigationProgress | null>(null);
  const prevSpeedRef = useRef<number | null>(null);
  const speedVarRef = useRef(0);
  const lastGlobalSnapAtRef = useRef(0);
  const lastQualityGlobalAtRef = useRef(0);

  return useMemo(() => {
    if (!rawLocation || route.length < 2) {
      prevRef.current = null;
      prevSpeedRef.current = null;
      lastGlobalSnapAtRef.current = 0;
      lastQualityGlobalAtRef.current = 0;
      return null;
    }

    const speedMps = rawLocation.speedMps ?? 0;
    const prevS = prevSpeedRef.current;
    if (prevS != null) {
      speedVarRef.current = speedVarRef.current * 0.88 + Math.abs(speedMps - prevS) * 0.12;
    }
    prevSpeedRef.current = speedMps;
    const speedStability01 = Math.max(0, Math.min(1, 1 - Math.min(1, speedVarRef.current / 7)));

    const modelAt =
      typeof routeModelRefreshedAtMs === 'number' && routeModelRefreshedAtMs > 1
        ? routeModelRefreshedAtMs
        : typeof rawLocation.timestamp === 'number'
          ? rawLocation.timestamp
          : Date.now();

    const nowTs =
      typeof rawLocation.timestamp === 'number' && Number.isFinite(rawLocation.timestamp)
        ? rawLocation.timestamp
        : Date.now();
    const previous = prevRef.current;
    if (lastGlobalSnapAtRef.current === 0) {
      lastGlobalSnapAtRef.current = nowTs;
    }
    let tryGlobalReanchor = false;
    if (nowTs - lastGlobalSnapAtRef.current >= 6_000) {
      tryGlobalReanchor = true;
      lastGlobalSnapAtRef.current = nowTs;
    } else if (
      previous?.snapped &&
      previous.snapped.distanceMeters > 30 &&
      speedMps > 2.5 &&
      nowTs - lastQualityGlobalAtRef.current >= 2000
    ) {
      tryGlobalReanchor = true;
      lastQualityGlobalAtRef.current = nowTs;
    }

    const next = computeNavigationProgressFrame({
      rawLocation,
      route,
      steps,
      routeDurationSeconds,
      routeDistanceMeters,
      offRouteTuning,
      previous,
      edgeDurationSec,
      useEdgeEta: navEdgeEtaEnabled,
      etaBlend:
        navEtaBlendEnabled
          ? {
              enabled: true,
              modelRefreshedAtMs: modelAt,
              speedStability01,
            }
          : undefined,
      tryGlobalReanchor,
      progressTuning,
    });

    if (!next) {
      return prevRef.current;
    }

    prevRef.current = next;
    return next;
  }, [
    rawLocation,
    route,
    steps,
    routeDurationSeconds,
    routeDistanceMeters,
    offRouteTuning,
    edgeDurationSec,
    routeModelTick,
    routeModelRefreshedAtMs,
    navEdgeEtaEnabled,
    navEtaBlendEnabled,
    progressTuning,
  ]);
}

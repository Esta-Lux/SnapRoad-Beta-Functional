import { useMemo, useRef } from 'react';
import type { DrivingMode } from '../types';
import { getLiveNavigationCameraPreset } from '../navigation/cameraPresets';

interface CameraParams {
  /** Speed in mph (from `useLocation`). */
  speedMph: number;
  /** Fused ground speed (m/s) while navigating — drives enhanced follow presets when set. */
  fusedSpeedMps?: number | null;
  drivingMode: DrivingMode;
  isNavigating: boolean;
  cameraLocked: boolean;
  nextManeuverDistanceMeters: number;
  safeAreaTop: number;
  safeAreaBottom: number;
}

/** Speed buckets (~5 mph) — smoother than 3 mph with typical GPS noise, still tracks speed bands. */
function speedMphBucket(mph: number): number {
  const m = Math.max(0, mph);
  return Math.round(m / 5) * 5;
}

function maneuverDistanceBucket(meters: number): number {
  if (!Number.isFinite(meters) || meters <= 0) return 400;
  const m = Math.min(2000, meters);
  // Near maneuvers, use finer buckets so camera framing keeps pace with the turn card
  // and ETA strip instead of lagging by a half-second cooldown + coarse 32m steps.
  if (m < 48) return Math.round(m / 8) * 8;
  if (m < 120) return Math.round(m / 14) * 14;
  if (m < 220) return Math.round(m / 24) * 24;
  return Math.round(m / 80) * 80;
}

export interface CameraSettings {
  followZoomLevel: number;
  followPitch: number;
  followPadding: { paddingBottom: number; paddingTop: number; paddingLeft: number; paddingRight: number };
  animationDuration: number;
  /**
   * Separate (shorter) duration for bearing / heading animation.
   * The Mapbox Camera `FollowWithCourse` handles bearing natively, so this is
   * provided for manual `setCamera({ heading })` calls (e.g. compass mode) and
   * any future consumer that controls bearing independently from framing.
   */
  bearingAnimationDuration: number;
}

const MPH_TO_MPS = 0.44704;

const STEP_PITCH_EPS = 1.5;
const STEP_PAD_EPS = 10;

function paddingNear(
  a: CameraSettings['followPadding'],
  b: CameraSettings['followPadding'],
  eps: number,
): boolean {
  return (
    Math.abs(a.paddingBottom - b.paddingBottom) < eps &&
    Math.abs(a.paddingTop - b.paddingTop) < eps &&
    Math.abs(a.paddingLeft - b.paddingLeft) < 1 &&
    Math.abs(a.paddingRight - b.paddingRight) < 1
  );
}

function nearlySameCamera(a: CameraSettings, b: CameraSettings): boolean {
  return (
    Math.abs(a.followZoomLevel - b.followZoomLevel) < 0.09 &&
    Math.abs(a.followPitch - b.followPitch) < STEP_PITCH_EPS &&
    paddingNear(a.followPadding, b.followPadding, STEP_PAD_EPS)
  );
}

/**
 * Follow-camera zoom / pitch / symmetric padding while navigating, using mode presets
 * and distance-to-upcoming-maneuver adaptation.
 */
export function useCameraController({
  speedMph,
  fusedSpeedMps,
  drivingMode,
  isNavigating,
  cameraLocked,
  nextManeuverDistanceMeters,
  safeAreaTop,
  safeAreaBottom,
}: CameraParams): CameraSettings | null {
  const speedB = speedMphBucket(speedMph);
  const maneuverB = maneuverDistanceBucket(nextManeuverDistanceMeters);
  const stableRef = useRef<CameraSettings | null>(null);
  /** Temporal hysteresis: last time the camera settings actually changed. */
  const lastCameraChangeMs = useRef(0);
  const computed = useMemo(() => {
    if (!isNavigating || !cameraLocked) return null;

    const fusedOk = fusedSpeedMps != null && Number.isFinite(fusedSpeedMps);
    /** 5 mph buckets from fused speed — sub-mph GPS jitter was thrashing zoom/pitch. */
    const mphForPreset = fusedOk
      ? Math.round((Math.max(0, fusedSpeedMps as number) * 2.236936) / 5) * 5
      : speedB;
    const speedMpsForPreset = Math.max(0, mphForPreset) * MPH_TO_MPS;

    const preset = getLiveNavigationCameraPreset({
      mode: drivingMode,
      speedMps: speedMpsForPreset,
      nextManeuverDistanceMeters: maneuverB,
      safeAreaTop,
      safeAreaBottom,
    });

    return {
      followZoomLevel: Math.round(preset.zoom * 4) / 4,
      followPitch: Math.round(preset.pitch),
      followPadding: preset.padding,
      animationDuration: preset.animationDuration,
      bearingAnimationDuration: Math.round(
        Math.min(preset.animationDuration * 0.55, 400),
      ),
    };
  }, [
    speedB,
    fusedSpeedMps,
    maneuverB,
    drivingMode,
    isNavigating,
    cameraLocked,
    safeAreaTop,
    safeAreaBottom,
  ]);
  const minCameraUpdateIntervalMs = useMemo(() => {
    if (!isNavigating || !cameraLocked) return 600;
    if (maneuverB <= 80) return 180;
    if (maneuverB <= 180) return 320;
    return 600;
  }, [isNavigating, cameraLocked, maneuverB]);

  return useMemo(() => {
    if (!computed) {
      stableRef.current = null;
      lastCameraChangeMs.current = 0;
      return null;
    }
    const prev = stableRef.current;
    if (prev && nearlySameCamera(prev, computed)) {
      return prev;
    }
    /* Temporal hysteresis: suppress rapid camera changes within the cooldown. */
    const now = Date.now();
    if (prev && now - lastCameraChangeMs.current < minCameraUpdateIntervalMs) {
      return prev;
    }
    stableRef.current = computed;
    lastCameraChangeMs.current = now;
    return computed;
  }, [computed, minCameraUpdateIntervalMs]);
}

import { useMemo } from 'react';
import type { DrivingMode } from '../types';
import { getCameraPreset } from '../navigation/useNavigationCamera';

interface CameraParams {
  /** Speed in mph (from `useLocation`). */
  speedMph: number;
  drivingMode: DrivingMode;
  isNavigating: boolean;
  cameraLocked: boolean;
  nextManeuverDistanceMeters: number;
  safeAreaTop: number;
  safeAreaBottom: number;
}

/** Coarse buckets so zoom/pitch/padding do not churn every GPS tick (stabilizes follow puck). */
function speedMphBucket(mph: number): number {
  const m = Math.max(0, mph);
  return Math.round(m / 5) * 5;
}

function maneuverDistanceBucket(meters: number): number {
  if (!Number.isFinite(meters) || meters <= 0) return 400;
  const m = Math.min(2000, meters);
  if (m < 70) return Math.round(m / 18) * 18;
  if (m < 200) return Math.round(m / 32) * 32;
  return Math.round(m / 50) * 50;
}

export interface CameraSettings {
  followZoomLevel: number;
  followPitch: number;
  followPadding: { paddingBottom: number; paddingTop: number; paddingLeft: number; paddingRight: number };
  animationDuration: number;
}

const MPH_TO_MPS = 0.44704;

/**
 * Follow-camera zoom / pitch / symmetric padding while navigating, using mode presets
 * and distance-to-upcoming-maneuver adaptation.
 */
export function useCameraController({
  speedMph,
  drivingMode,
  isNavigating,
  cameraLocked,
  nextManeuverDistanceMeters,
  safeAreaTop,
  safeAreaBottom,
}: CameraParams): CameraSettings | null {
  const speedB = speedMphBucket(speedMph);
  const maneuverB = maneuverDistanceBucket(nextManeuverDistanceMeters);

  return useMemo(() => {
    if (!isNavigating || !cameraLocked) return null;

    const preset = getCameraPreset({
      mode: drivingMode,
      speedMps: Math.max(0, speedB) * MPH_TO_MPS,
      nextManeuverDistanceMeters: maneuverB,
      safeAreaTop,
      safeAreaBottom,
    });

    return {
      followZoomLevel: Math.round(preset.zoom * 4) / 4,
      followPitch: Math.round(preset.pitch),
      followPadding: preset.padding,
      animationDuration: preset.animationDuration,
    };
  }, [
    speedB,
    maneuverB,
    drivingMode,
    isNavigating,
    cameraLocked,
    safeAreaTop,
    safeAreaBottom,
  ]);
}

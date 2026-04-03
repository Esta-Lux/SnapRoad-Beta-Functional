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
  return useMemo(() => {
    if (!isNavigating || !cameraLocked) return null;

    const preset = getCameraPreset({
      mode: drivingMode,
      speedMps: Math.max(0, speedMph) * MPH_TO_MPS,
      nextManeuverDistanceMeters,
      safeAreaTop,
      safeAreaBottom,
    });

    return {
      followZoomLevel: Math.round(preset.zoom * 10) / 10,
      followPitch: Math.round(preset.pitch),
      followPadding: preset.padding,
      animationDuration: preset.animationDuration,
    };
  }, [
    speedMph,
    drivingMode,
    isNavigating,
    cameraLocked,
    nextManeuverDistanceMeters,
    safeAreaTop,
    safeAreaBottom,
  ]);
}

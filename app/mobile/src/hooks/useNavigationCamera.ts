import { useEffect, type RefObject } from 'react';
import type Mapbox from '@rnmapbox/maps';
import type { NavigationProgress } from '../navigation/navModel';
import type { DrivingMode } from '../types';
import { getLiveNavigationCameraPreset } from '../navigation/cameraPresets';

type Args = {
  cameraRef: RefObject<Mapbox.Camera | null>;
  progress: NavigationProgress | null;
  mode: DrivingMode;
  isFollowing: boolean;
  safeAreaTop: number;
  safeAreaBottom: number;
};

/** Match `useCameraController` bucketing so zoom/padding do not churn every GPS tick. */
function maneuverDistanceBucket(meters: number): number {
  if (!Number.isFinite(meters) || meters <= 0) return 400;
  const m = Math.min(2000, meters);
  if (m < 70) return Math.round(m / 18) * 18;
  if (m < 200) return Math.round(m / 32) * 32;
  return Math.round(m / 50) * 50;
}

/**
 * **Single nav-follow camera owner:** center, heading, zoom, pitch, padding, and animation
 * all applied via `setCamera` from one preset chain — nothing else should set these while `isFollowing`.
 */
export function useNavigationCamera({
  cameraRef,
  progress,
  mode,
  isFollowing,
  safeAreaTop,
  safeAreaBottom,
}: Args) {
  useEffect(() => {
    if (!cameraRef.current || !progress?.displayCoord || !isFollowing) return;

    const speedMps = Math.max(0, progress.displayCoord.speedMps ?? 0);
    const maneuverB = maneuverDistanceBucket(progress.nextStepDistanceMeters);

    const preset = getLiveNavigationCameraPreset({
      mode,
      speedMps,
      nextManeuverDistanceMeters: maneuverB,
      safeAreaTop,
      safeAreaBottom,
    });

    cameraRef.current.setCamera({
      centerCoordinate: [progress.displayCoord.lng, progress.displayCoord.lat],
      heading: progress.displayCoord.heading ?? 0,
      zoomLevel: preset.zoom,
      pitch: preset.pitch,
      padding: preset.padding,
      animationDuration: preset.animationDuration,
    });
  }, [cameraRef, progress, mode, isFollowing, safeAreaTop, safeAreaBottom]);
}

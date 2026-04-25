/**
 * RN map camera settings aligned with the **hidden** `MapboxNavigationView`
 * (`followingZoom` / `followingPitch` props) — not the JS maneuver-distance
 * curves in `useCameraController`. Use when the RN map is in native SDK
 * pass-through mode (`nativeFractionTraveled` set) so `MapboxGL.Camera` matches
 * the headless Navigation SDK follow framing.
 */

import type { DrivingMode } from '../types';
import type { CameraSettings } from '../hooks/useCameraController';
import {
  bucketSpeedMpsTo5Mph,
  getCameraPreset,
  maneuverDistanceBucketMeters,
} from './cameraPresets';

/**
 * Hidden `MapboxNavigationView` following zoom — aligned with
 * {@link getCameraPreset} (speed + next maneuver) so native logic session
 * matches RN `setCamera` framing.
 */
export function getNativeHeadlessFollowingZoom(
  mode: DrivingMode,
  speedMps: number = 0,
  nextManeuverDistanceMeters: number = 400,
): number {
  const z = getCameraPreset({
    mode,
    speedMps: bucketSpeedMpsTo5Mph(speedMps),
    nextManeuverDistanceMeters: maneuverDistanceBucketMeters(nextManeuverDistanceMeters),
    safeAreaTop: 0,
    safeAreaBottom: 0,
    accelerationMps2: 0,
  }).zoom;
  return Math.round(z * 4) / 4;
}

export function getNativeHeadlessFollowingPitch(
  mode: DrivingMode,
  speedMps: number = 0,
  nextManeuverDistanceMeters: number = 400,
): number {
  return Math.round(
    getCameraPreset({
      mode,
      speedMps: bucketSpeedMpsTo5Mph(speedMps),
      nextManeuverDistanceMeters: maneuverDistanceBucketMeters(nextManeuverDistanceMeters),
      safeAreaTop: 0,
      safeAreaBottom: 0,
      accelerationMps2: 0,
    }).pitch,
  );
}

/**
 * Zoom + pitch match the headless native view; padding + animation duration come from
 * the same preset family as the first navigation frame (safe-area aware, no maneuver-distance nudging).
 */
export function buildNativeSdkMirrorCameraSettings(
  mode: DrivingMode,
  safeAreaTop: number,
  safeAreaBottom: number,
): CameraSettings {
  const preset = getCameraPreset({
    mode,
    speedMps: 0,
    nextManeuverDistanceMeters: 400,
    safeAreaTop,
    safeAreaBottom,
  });
  const zoom = getNativeHeadlessFollowingZoom(mode, 0, 400);
  const pitch = getNativeHeadlessFollowingPitch(mode, 0, 400);
  return {
    followZoomLevel: Math.round(zoom * 4) / 4,
    followPitch: Math.round(pitch),
    followPadding: preset.padding,
    animationDuration: preset.animationDuration,
    bearingAnimationDuration: Math.round(Math.min(preset.animationDuration * 0.55, 400)),
  };
}

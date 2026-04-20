/**
 * RN map camera settings aligned with the **hidden** `MapboxNavigationView`
 * (`followingZoom` / `followingPitch` props) — not the JS maneuver-distance
 * curves in `useCameraController`. Use when the RN map is in native SDK
 * pass-through mode (`nativeFractionTraveled` set) so `MapboxGL.Camera` matches
 * the headless Navigation SDK follow framing.
 */

import type { DrivingMode } from '../types';
import { DRIVING_MODES } from '../constants/modes';
import type { CameraSettings } from '../hooks/useCameraController';
import { getCameraPreset } from './cameraPresets';

/** Same values passed to `MapboxNavigationView` `followingZoom` on MapScreen. */
export function getNativeHeadlessFollowingZoom(mode: DrivingMode): number {
  switch (mode) {
    case 'calm':
      return 16.5;
    case 'sport':
      return 17.5;
    default:
      return 17.0;
  }
}

/** Same formula as full-screen {@link NativeNavigationScreen} (`navPitch + 6`, cap 76). */
export function getNativeHeadlessFollowingPitch(mode: DrivingMode): number {
  const navPitch = DRIVING_MODES[mode].navPitch;
  return Math.min(76, navPitch + 6);
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
  const zoom = getNativeHeadlessFollowingZoom(mode);
  const pitch = getNativeHeadlessFollowingPitch(mode);
  return {
    followZoomLevel: Math.round(zoom * 4) / 4,
    followPitch: Math.round(pitch),
    followPadding: preset.padding,
    animationDuration: preset.animationDuration,
    bearingAnimationDuration: Math.round(Math.min(preset.animationDuration * 0.55, 400)),
  };
}

import { useMemo, useRef } from 'react';
import type { DrivingMode } from '../types';
import { DRIVING_MODES } from '../constants/modes';
import {
  getCameraPreset,
  getLiveNavigationCameraPreset,
  getNavigationFollowPaddingFallback,
} from '../navigation/cameraPresets';
import type { SdkCameraPayload } from '../navigation/navSdkMirrorTypes';
import { isValidSdkCameraPayload } from '../navigation/navSdkMirrorTypes';

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
  /** Native navigation camera viewport — when {@link isNativeMirror} and valid, mirror verbatim. */
  nativeCameraState?: SdkCameraPayload | null;
  /** Headless SDK pass-through: native camera + distance + lanes are authoritative. */
  isNativeMirror?: boolean;
}

/** Short ease — native Navigation SDK already eased internally before emitting. */
const NATIVE_MIRROR_ANIM_MS = 180;

/** Speed buckets (~5 mph) — smoother than 3 mph with typical GPS noise, still tracks speed bands. */
function speedMphBucket(mph: number): number {
  const m = Math.max(0, mph);
  return Math.round(m / 5) * 5;
}

function maneuverDistanceBucket(meters: number): number {
  if (!Number.isFinite(meters) || meters <= 0) return 400;
  const m = Math.min(2000, meters);
  if (m < 48) return Math.round(m / 8) * 8;
  if (m < 120) return Math.round(m / 14) * 14;
  if (m < 220) return Math.round(m / 24) * 24;
  if (m < 700) return Math.round(m / 60) * 60;
  return Math.round(m / 120) * 120;
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
  /** When set with `useNativeCenter`, mirror native SDK viewport center verbatim in `setCamera`. */
  centerCoordinate?: { lat: number; lng: number };
  /** Heading/bearing (degrees) for `setCamera` when mirroring native camera. */
  headingDeg?: number;
  /** Native mirror path — use `centerCoordinate` + `headingDeg` instead of JS lead / display coord. */
  useNativeCenter?: boolean;
}

const MPH_TO_MPS = 0.44704;

const STEP_PITCH_EPS = 1.2;
const STEP_PAD_EPS = 8;

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

function nearlySameNativeCamera(a: CameraSettings, b: CameraSettings): boolean {
  if (!a.useNativeCenter || !b.useNativeCenter) return false;
  const c = a.centerCoordinate;
  const d = b.centerCoordinate;
  if (!c || !d) return false;
  return (
    Math.abs(c.lat - d.lat) < 1e-6 &&
    Math.abs(c.lng - d.lng) < 1e-6 &&
    Math.abs(a.followZoomLevel - b.followZoomLevel) < 0.05 &&
    Math.abs(a.followPitch - b.followPitch) < STEP_PITCH_EPS &&
    Math.abs((a.headingDeg ?? 0) - (b.headingDeg ?? 0)) < 1.5 &&
    paddingNear(a.followPadding, b.followPadding, STEP_PAD_EPS)
  );
}

/**
 * Build RN `Camera` settings from a native `SdkCameraPayload` (mirror bridge).
 */
export function cameraSettingsFromNativeSdkPayload(
  p: SdkCameraPayload,
  mode: DrivingMode,
  safeAreaTop: number,
  safeAreaBottom: number,
): CameraSettings {
  const pad =
    p.padding ?? getNavigationFollowPaddingFallback(mode, safeAreaTop, safeAreaBottom);
  return {
    followZoomLevel: Math.round(p.zoom * 4) / 4,
    followPitch: Math.round(p.pitch),
    followPadding: pad,
    centerCoordinate: { lat: p.center.latitude, lng: p.center.longitude },
    headingDeg: p.bearing,
    useNativeCenter: true,
    animationDuration: NATIVE_MIRROR_ANIM_MS,
    bearingAnimationDuration: NATIVE_MIRROR_ANIM_MS,
  };
}

/** Same framing as headless `MapboxNavigationView` `followingZoom` / `followingPitch` props. */
function mirrorFallbackNativeSdk(
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
  const zoom = mode === 'calm' ? 16.5 : mode === 'sport' ? 17.5 : 17.0;
  const pitch = Math.min(76, DRIVING_MODES[mode].navPitch + 6);
  return {
    followZoomLevel: Math.round(zoom * 4) / 4,
    followPitch: Math.round(pitch),
    followPadding: preset.padding,
    animationDuration: preset.animationDuration,
    bearingAnimationDuration: Math.round(Math.min(preset.animationDuration * 0.55, 400)),
  };
}

/**
 * Follow-camera zoom / pitch / symmetric padding while navigating, using mode presets
 * and distance-to-upcoming-maneuver adaptation.
 *
 * When `isNativeMirror` is true (headless SDK pass-through), prefer native SDK camera
 * payloads (`nativeCameraState`) before falling back to headless zoom/pitch alignment.
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
  nativeCameraState = null,
  isNativeMirror = false,
}: CameraParams): CameraSettings | null {
  const speedB = speedMphBucket(speedMph);
  const maneuverB = maneuverDistanceBucket(nextManeuverDistanceMeters);
  const stableRef = useRef<CameraSettings | null>(null);
  /** Temporal hysteresis: last time the camera settings actually changed. */
  const lastCameraChangeMs = useRef(0);
  const computed = useMemo(() => {
    if (!isNavigating || !cameraLocked) return null;

    if (isNativeMirror) {
      if (isValidSdkCameraPayload(nativeCameraState)) {
        return cameraSettingsFromNativeSdkPayload(nativeCameraState!, drivingMode, safeAreaTop, safeAreaBottom);
      }
      return mirrorFallbackNativeSdk(drivingMode, safeAreaTop, safeAreaBottom);
    }

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
    isNativeMirror,
    nativeCameraState,
  ]);
  const minCameraUpdateIntervalMs = useMemo(() => {
    if (!isNavigating || !cameraLocked) return 600;
    if (maneuverB <= 48) return 110;
    if (maneuverB <= 80) return 160;
    if (maneuverB <= 180) return 280;
    if (maneuverB <= 700) return 420;
    return 760;
  }, [isNavigating, cameraLocked, maneuverB]);

  return useMemo(() => {
    if (!computed) {
      stableRef.current = null;
      lastCameraChangeMs.current = 0;
      return null;
    }
    if (computed.useNativeCenter) {
      const prev = stableRef.current;
      if (prev && nearlySameNativeCamera(prev, computed)) {
        return prev;
      }
      stableRef.current = computed;
      lastCameraChangeMs.current = Date.now();
      return computed;
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

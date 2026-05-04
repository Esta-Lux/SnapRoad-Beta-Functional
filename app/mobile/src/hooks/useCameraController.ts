import { useMemo, useRef } from 'react';
import type { DrivingMode } from '../types';
import {
  getCameraPreset,
  getLiveNavigationCameraPreset,
  getNavigationFollowPaddingFallback,
  maneuverDistanceBucketMeters,
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

const maneuverDistanceBucket = maneuverDistanceBucketMeters;

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

/** Same family as `getCameraPreset` so RN map matches speed-aware `useCameraController` when native payload is absent. */
function mirrorFallbackNativeSdk(
  mode: DrivingMode,
  safeAreaTop: number,
  safeAreaBottom: number,
  speedMps: number,
  nextManeuverDistanceMeters: number,
): CameraSettings {
  const preset = getCameraPreset({
    mode,
    speedMps: Number.isFinite(speedMps) ? speedMps : 0,
    nextManeuverDistanceMeters: Number.isFinite(nextManeuverDistanceMeters) ? nextManeuverDistanceMeters : 400,
    safeAreaTop,
    safeAreaBottom,
    accelerationMps2: 0,
  });
  return {
    followZoomLevel: Math.round(preset.zoom * 4) / 4,
    followPitch: Math.round(preset.pitch),
    followPadding: preset.padding,
    animationDuration: Math.min(420, Math.max(180, Math.round(preset.animationDuration * 0.5))),
    bearingAnimationDuration: Math.round(
      Math.min(380, Math.max(160, preset.animationDuration * 0.4)),
    ),
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
  const accelSampleRef = useRef<{ mps: number; t: number } | null>(null);
  const computed = useMemo(() => {
    if (!isNavigating || !cameraLocked) return null;

    if (isNativeMirror) {
      if (isValidSdkCameraPayload(nativeCameraState)) {
        return cameraSettingsFromNativeSdkPayload(nativeCameraState!, drivingMode, safeAreaTop, safeAreaBottom);
      }
      const fusedOkNav = fusedSpeedMps != null && Number.isFinite(fusedSpeedMps);
      const mpsNav = Math.max(0, fusedOkNav ? (fusedSpeedMps as number) : speedMph * MPH_TO_MPS);
      return mirrorFallbackNativeSdk(
        drivingMode,
        safeAreaTop,
        safeAreaBottom,
        mpsNav,
        nextManeuverDistanceMeters,
      );
    }

    const fusedOk = fusedSpeedMps != null && Number.isFinite(fusedSpeedMps);
    /** 5 mph buckets from fused speed — sub-mph GPS jitter was thrashing zoom/pitch. */
    const mphForPreset = fusedOk
      ? Math.round((Math.max(0, fusedSpeedMps as number) * 2.236936) / 5) * 5
      : speedB;
    const speedMpsForPreset = Math.max(0, mphForPreset) * MPH_TO_MPS;

    const now =
      typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now();
    let accelerationMps2 = 0;
    const pr = accelSampleRef.current;
    if (pr && now - pr.t < 2000) {
      const dt = (now - pr.t) / 1000;
      if (dt > 0.09 && dt < 1.4) {
        accelerationMps2 = (speedMpsForPreset - pr.mps) / dt;
      }
    }
    accelSampleRef.current = { mps: speedMpsForPreset, t: now };
    accelerationMps2 = Math.max(-8, Math.min(8, accelerationMps2));

    const preset = getLiveNavigationCameraPreset({
      mode: drivingMode,
      speedMps: speedMpsForPreset,
      nextManeuverDistanceMeters: maneuverB,
      safeAreaTop,
      safeAreaBottom,
      accelerationMps2,
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
    speedMph,
    fusedSpeedMps,
    maneuverB,
    drivingMode,
    isNavigating,
    cameraLocked,
    safeAreaTop,
    safeAreaBottom,
    isNativeMirror,
    nativeCameraState,
    nextManeuverDistanceMeters,
  ]);
  const minCameraUpdateIntervalMs = useMemo(() => {
    if (!isNavigating || !cameraLocked) return 600;
    const modeEase = drivingMode === 'sport' ? 1.06 : drivingMode === 'calm' ? 0.82 : 0.9;
    if (maneuverB <= 48) return Math.round(110 * modeEase);
    if (maneuverB <= 80) return Math.round(160 * modeEase);
    if (maneuverB <= 180) return Math.round(280 * modeEase);
    if (maneuverB <= 700) return Math.round(420 * modeEase);
    return Math.round(760 * modeEase);
  }, [isNavigating, cameraLocked, maneuverB, drivingMode]);

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

/**
 * Native `onRouteProgressChanged` JSON contract (iOS + Android bridges).
 * Keep in sync with Swift `navProgressPayload` / Kotlin `navProgressPayload`.
 */

import type { NativeLaneAsset, NativeFormattedDistance, SdkCameraPayload } from './navSdkMirrorTypes';

export type { NativeLaneAsset, NativeFormattedDistance, SdkCameraPayload, SdkCameraPadding } from './navSdkMirrorTypes';

/**
 * One parser for turn-card distance: matches native iOS/Kotlin `navProgressPayload` priority
 * (`formattedDistance`+unit, then `primaryDistanceFormatted`) so the minimal adapter, store,
 * and UI never disagree on which field to show.
 */
export function nativeFormattedDistanceFromProgressPayload(
  p: Pick<
    SdkNavProgressEvent,
    'formattedDistance' | 'formattedDistanceUnit' | 'primaryDistanceFormatted'
  >,
): NativeFormattedDistance | null {
  const split = p.formattedDistance?.trim();
  if (split) {
    return { value: split, unit: (p.formattedDistanceUnit ?? '').trim() };
  }
  const primary = p.primaryDistanceFormatted?.trim();
  if (primary) return { value: primary, unit: '' };
  return null;
}

/**
 * iOS (pre-fix) could emit `primaryDistanceFormatted` from `userDistanceToUpcomingIntersection
 * ?? distanceRemaining` but only set `distanceToNextManeuverMeters` when
 * `userDistanceToUpcomingIntersection` was non-nil — the UI showed a huge formatted distance
 * while {@link distNext} stayed 0. Reject the mirror string unless the bridge also sent a numeric
 * distance to the same maneuver. Android always sends the numeric, so it still passes.
 */
export function nativeMirrorFormattedDistanceOrNull(
  p: Pick<
    SdkNavProgressEvent,
    | 'formattedDistance'
    | 'formattedDistanceUnit'
    | 'primaryDistanceFormatted'
    | 'distanceToNextManeuverMeters'
  >,
): NativeFormattedDistance | null {
  const fd = nativeFormattedDistanceFromProgressPayload(p);
  if (!fd) return null;
  const d = p.distanceToNextManeuverMeters;
  if (typeof d !== 'number' || !Number.isFinite(d)) {
    return null;
  }
  return fd;
}

export type SdkNavProgressLane = {
  indications: string[];
  active: boolean;
  valid: boolean;
};

export type SdkNavProgressShield = {
  text: string;
  /** Optional PNG as base64; bridges may omit to avoid fetch on the main thread. */
  imageBase64?: string;
};

export type SdkNavProgressEvent = {
  distanceRemaining: number;
  distanceTraveled: number;
  durationRemaining: number;
  fractionTraveled: number;
  legIndex?: number;
  stepIndex?: number;
  primaryInstruction?: string;
  secondaryInstruction?: string;
  maneuverType?: string;
  maneuverDirection?: string;
  distanceToNextManeuverMeters?: number;
  speedLimitMps?: number;
  thenInstruction?: string;
  currentStepInstruction?: string;
  upcomingIntersectionName?: string;
  currentRoadName?: string;
  lanes?: SdkNavProgressLane[];
  shield?: SdkNavProgressShield | null;
  /**
   * Optional: locale-aware distance string from native (e.g. "500 ft", "0.2 mi").
   * When set, turn UI should display it verbatim instead of formatting meters in JS.
   */
  primaryDistanceFormatted?: string;
  /** Split form (same intent as {@link primaryDistanceFormatted}). */
  formattedDistance?: string;
  formattedDistanceUnit?: string;
  /** Native navigation camera viewport — mirror RN `MapboxGL.Camera` to this when present. */
  cameraState?: SdkCameraPayload;
  /** Native-rendered lane PNGs (same order as `lanes` when lengths match). */
  laneAssets?: NativeLaneAsset[];
};

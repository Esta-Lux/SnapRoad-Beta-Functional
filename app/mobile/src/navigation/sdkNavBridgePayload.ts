/**
 * Native `onRouteProgressChanged` JSON contract (iOS + Android bridges).
 * Keep in sync with Swift `navProgressPayload` / Kotlin `navProgressPayload`.
 */

import { formatImperialManeuverDistance } from './turnCardModel';
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

/**
 * Turn-card distance for the HUD: **always** format from `distanceToNextManeuverMeters` when it is
 * valid. Native `formattedDistance` / `primaryDistanceFormatted` are not used for display — they
 * can be locale-mangled (`0,25 mi`, odd padding) or split oddly; {@link formatImperialManeuverDistance}
 * gives consistent US-style `123` + `FT` / `0.2` + `MI` to match the rest of the app.
 *
 * (Bridge strings remain available via {@link nativeFormattedDistanceFromProgressPayload} for
 * diagnostics; {@link nativeMirrorFormattedDistanceOrNull} still encodes the iOS “reject mirror
 * without numeric” safety for other call sites.)
 */
export function sdkManeuverDisplayDistanceFromProgress(
  p: Pick<SdkNavProgressEvent, 'distanceToNextManeuverMeters'>,
): NativeFormattedDistance | null {
  const d = p.distanceToNextManeuverMeters;
  if (typeof d !== 'number' || !Number.isFinite(d) || d < 0) {
    return null;
  }
  return formatImperialManeuverDistance(d, { omitNowLabel: true });
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
   * Optional: native may send locale-specific strings. The headless HUD turn card does **not**
   * use these for display; it uses `distanceToNextManeuverMeters` →
   * {@link sdkManeuverDisplayDistanceFromProgress}.
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

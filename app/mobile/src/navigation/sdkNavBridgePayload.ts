/**
 * Native `onRouteProgressChanged` JSON contract (iOS + Android bridges).
 * Keep in sync with Swift `navProgressPayload` / Kotlin `navProgressPayload`.
 */

import type { NativeLaneAsset, SdkCameraPayload } from './navSdkMirrorTypes';

export type { NativeLaneAsset, NativeFormattedDistance, SdkCameraPayload, SdkCameraPadding } from './navSdkMirrorTypes';

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

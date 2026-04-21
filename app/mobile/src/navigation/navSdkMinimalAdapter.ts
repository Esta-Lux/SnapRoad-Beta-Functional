/**
 * Minimal SDK → `NavigationProgress` bridge: native payloads only.
 *
 * Does **not** project GPS onto the polyline, geometrically pick steps from REST
 * Directions, smooth heading, or merge REST rows into the banner. Uses
 * `progress.fractionTraveled` for along-route geometry (trim / split) only.
 */

import type { Coordinate } from '../types';
import type { NavigationProgress, NavStep, RawLocation } from './navModel';
import type { SdkLocationPayload, SdkProgressPayload } from './navSdkStore';
import {
  mapSdkLanesToLaneInfo,
  mapSdkShieldPayload,
  mapSdkToRichKind,
  normalizeSdkManeuverDirection,
  normalizeSdkManeuverType,
  roadSignalFromSdkPayload,
} from './navSdkProgressAdapter';
import { splitRouteAtSnap } from './navGeometry';
import {
  coordinateAtCumulativeMeters,
  polylineLengthMeters,
  segmentAndTFromCumAlongPolyline,
} from '../utils/distance';

export type MinimalSdkAdapterArgs = {
  progress: SdkProgressPayload;
  location: SdkLocationPayload | null;
  routePolyline: Coordinate[];
};

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/**
 * Build `NavigationProgress` from native SDK progress + matched location + route polyline.
 * Puck / heading use the native matched fix; route trim uses `fractionTraveled` on the polyline.
 */
export function buildMinimalNavigationProgressFromSdk(
  args: MinimalSdkAdapterArgs,
): NavigationProgress {
  const { progress, location, routePolyline: polyline } = args;

  const fractionTraveled = clamp01(
    Number.isFinite(progress.fractionTraveled) ? progress.fractionTraveled : 0,
  );
  const nativeFractionTraveled = fractionTraveled;

  const totalLen = Math.max(1e-6, polylineLengthMeters(polyline));
  const cumulativeMeters = fractionTraveled * totalLen;

  const routeSplitPos = segmentAndTFromCumAlongPolyline(cumulativeMeters, polyline);
  const routeSplitPoint = coordinateAtCumulativeMeters(polyline, cumulativeMeters);
  const stepIdxRaw = typeof progress.stepIndex === 'number' ? progress.stepIndex : 0;
  const maxSeg = Math.max(0, polyline.length - 2);
  const segIdxForStep = Math.min(Math.max(0, stepIdxRaw), maxSeg);

  const routeSplitSnap =
    routeSplitPos && routeSplitPoint
      ? {
          point: routeSplitPoint,
          segmentIndex: routeSplitPos.segmentIndex,
          t: routeSplitPos.tOnSegment,
          distanceMeters: 0,
          cumulativeMeters,
        }
      : {
          point: { lat: polyline[0]!.lat, lng: polyline[0]!.lng },
          segmentIndex: 0,
          t: 0,
          distanceMeters: 0,
          cumulativeMeters,
        };

  const { traveled, remaining } = splitRouteAtSnap(polyline, routeSplitSnap);

  const rawCourseDeg = location != null && location.course >= 0 ? location.course : null;
  /**
   * Map puck position rides the **polyline at `fractionTraveled`**, not the raw matched GPS fix.
   * The SDK’s matched lat/lng can sit a few meters off the JS polyline while `lineTrimOffset` is
   * driven by arc length — that produced a visible seam (gray/blue split not under the puck).
   * Heading / speed / accuracy still come from the native matched sample.
   */
  const onLine = routeSplitPoint ?? {
    lat: polyline[0]!.lat,
    lng: polyline[0]!.lng,
  };
  const displayCoord: RawLocation = {
    lat: onLine.lat,
    lng: onLine.lng,
    heading: rawCourseDeg != null && Number.isFinite(rawCourseDeg) ? rawCourseDeg : undefined,
    speedMps: location != null && location.speed >= 0 ? location.speed : undefined,
    accuracy: location?.horizontalAccuracy ?? null,
    timestamp: location?.timestamp ?? Date.now(),
  };
  const puckCoord: RawLocation = { ...displayCoord };

  const kind = mapSdkToRichKind(progress.maneuverType, progress.maneuverDirection);
  const normalizedRawType = normalizeSdkManeuverType(progress.maneuverType);
  const normalizedRawModifier = normalizeSdkManeuverDirection(progress.maneuverDirection);

  const sdkPrimary = progress.primaryInstruction?.trim() || '';
  const sdkCurrent = progress.currentStepInstruction?.trim() || '';
  const primaryText = sdkPrimary || sdkCurrent || 'Continue';
  const sdkSecondary = progress.secondaryInstruction?.trim() || '';
  const sdkThen = progress.thenInstruction?.trim() || '';
  const secondaryText = sdkSecondary || sdkThen || undefined;

  const distNext =
    typeof progress.distanceToNextManeuverMeters === 'number' &&
    Number.isFinite(progress.distanceToNextManeuverMeters)
      ? Math.max(0, progress.distanceToNextManeuverMeters)
      : 0;

  const signalForStep = roadSignalFromSdkPayload(progress, { kind: 'none', label: '' });
  const lanesForStep: NavStep['lanes'] = progress.lanes?.length
    ? mapSdkLanesToLaneInfo(progress.lanes)
    : [];
  const shieldsForStep = progress.shield ? [mapSdkShieldPayload(progress.shield)] : [];

  const nextStep: NavStep | null = {
    index: stepIdxRaw,
    segmentIndex: segIdxForStep,
    kind,
    rawType: normalizedRawType,
    rawModifier: normalizedRawModifier,
    bearingAfter: 0,
    displayInstruction: primaryText,
    secondaryInstruction: secondaryText ?? null,
    subInstruction: null,
    instruction:
      progress.currentStepInstruction?.trim() || progress.primaryInstruction?.trim() || '',
    streetName: progress.currentRoadName?.trim() || null,
    destinationRoad: progress.upcomingIntersectionName?.trim() || null,
    shields: shieldsForStep,
    signal: signalForStep,
    lanes: lanesForStep,
    roundaboutExitNumber: null,
    distanceMetersFromStart: 0,
    distanceMeters: distNext,
    distanceMetersToNext: distNext,
    durationSeconds: 0,
    voiceAnnouncement: null,
    nextManeuverKind: null,
    nextManeuverStreet: null,
    nextManeuverDistanceMeters: null,
  };

  const nativeFormatted = progress.primaryDistanceFormatted?.trim() || null;

  const banner = {
    primaryInstruction: primaryText,
    primaryDistanceMeters: distNext,
    primaryDistanceFormatted: nativeFormatted,
    primaryStreet: progress.currentRoadName ?? progress.upcomingIntersectionName ?? null,
    secondaryInstruction: secondaryText ?? null,
    signal: signalForStep,
    lanes: lanesForStep,
    shields: shieldsForStep,
    maneuverKind: kind,
    roundaboutExitNumber: null,
  };

  const durRem = Math.max(0, Math.round(progress.durationRemaining ?? 0));
  const distRem = Math.max(0, progress.distanceRemaining ?? 0);

  return {
    displayCoord,
    puckCoord,
    snapped: {
      point: { lat: displayCoord.lat, lng: displayCoord.lng },
      segmentIndex: routeSplitSnap.segmentIndex,
      t: routeSplitSnap.t,
      distanceMeters: 0,
      cumulativeMeters,
    },
    routeSplitSnap,
    traveledRoute: traveled,
    remainingRoute: remaining.length >= 2 ? remaining : polyline.slice(-2),
    maneuverRoute: [],
    nextStep,
    followingStep: null,
    nextStepDistanceMeters: distNext,
    banner,
    distanceRemainingMeters: distRem,
    modelDurationRemainingSeconds: durRem,
    durationRemainingSeconds: durRem,
    etaEpochMs: Date.now() + durRem * 1000,
    isOffRoute: false,
    confidence: 1,
    instructionSource: 'sdk',
    routePolyline: polyline,
    displayCumulativeMeters: cumulativeMeters,
    nativeFractionTraveled,
  };
}

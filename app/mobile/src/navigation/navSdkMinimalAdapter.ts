/**
 * Minimal SDK → `NavigationProgress` bridge: native payloads only.
 *
 * Does **not** project GPS onto the polyline, geometrically pick steps from REST
 * Directions, smooth heading, or merge REST rows into the banner. Uses
 * `progress.fractionTraveled` for along-route geometry (trim / split) only.
 */

import type { Coordinate } from '../types';
import type { NavigationProgress, NavStep, RawLocation } from './navModel';
import { nativeFormattedDistanceFromProgressPayload } from './sdkNavBridgePayload';
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
  haversineMeters,
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
   * Puck position follows the **native matched fix** from `onNavigationLocationUpdate` whenever it
   * is present. Route trim / `fractionTraveled` still come from the SDK so the GPU line split
   * matches the Navigation session; the chevron should reflect where the matcher places the user
   * on the road network (reroutes, lane geometry, and map-matched course), not a synthetic point
   * derived only from arc length on the decoded polyline (which lagged real motion and fought
   * reroutes). When location has not arrived yet, fall back to the on-polyline point at
   * `fractionTraveled`.
   */
  const onLine = routeSplitPoint ?? {
    lat: polyline[0]!.lat,
    lng: polyline[0]!.lng,
  };
  const hasMatchedFix =
    location != null &&
    Number.isFinite(location.latitude) &&
    Number.isFinite(location.longitude);
  const lateralMeters =
    hasMatchedFix && routeSplitPoint
      ? haversineMeters(location!.latitude, location!.longitude, routeSplitPoint.lat, routeSplitPoint.lng)
      : 0;
  const displayCoord: RawLocation = {
    lat: hasMatchedFix ? location!.latitude : onLine.lat,
    lng: hasMatchedFix ? location!.longitude : onLine.lng,
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
  /**
   * Use **only** the upcoming-maneuver line when the SDK provides it. Some ticks send
   * both `primaryInstruction` and a different `currentStepInstruction` (“depart / drive
   * east” vs “continue on …”); OR-ing them with `||` made which string won depend on
   * which field was non-empty, which can alternate tick-to-tick and fight the turn card
   * + TTS. Prefer primary; fall back to current when primary is empty.
   */
  const primaryText = sdkPrimary ? sdkPrimary : sdkCurrent || 'Continue';
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
    /** Same source order as `primaryText` (primary beats current) — was current∥primary, which could disagree with the banner. */
    instruction: primaryText,
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

  const nativeFd = nativeFormattedDistanceFromProgressPayload(progress);
  const nativeFormatted = nativeFd?.value ?? null;
  const nativeFormattedUnit = nativeFd?.unit != null && nativeFd.unit.length > 0 ? nativeFd.unit : null;

  const banner = {
    primaryInstruction: primaryText,
    primaryDistanceMeters: distNext,
    primaryDistanceFormatted: nativeFormatted,
    primaryDistanceFormattedUnit: nativeFormattedUnit,
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

  const legIdx = progress.legIndex ?? 0;

  return {
    displayCoord,
    puckCoord,
    snapped: {
      point: { lat: displayCoord.lat, lng: displayCoord.lng },
      segmentIndex: routeSplitSnap.segmentIndex,
      t: routeSplitSnap.t,
      distanceMeters: lateralMeters,
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
    nativeStepIdentity: { legIndex: legIdx, stepIndex: stepIdxRaw },
  };
}

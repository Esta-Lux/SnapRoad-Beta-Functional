import type { DirectionsStep } from '../lib/directions';
import type { Coordinate } from '../types';
import type { NavigationProgress, NavStep, NavBannerModel } from './navModel';
import {
  coordinateAtCumulativeMeters,
  polylineLengthMeters,
  projectOntoPolyline,
  segmentAndTFromCumAlongPolyline,
} from '../utils/distance';
import type { SdkLocationPayload, SdkProgressPayload } from './navSdkStore';
import { splitRouteAtSnap } from './navGeometry';
import { pickNextNavStepAlongRoute } from './navigationProgressCore';
import {
  buildNavStepsFromDirections,
  navStepFromDirectionsAtIndex,
  resolveManeuverKind,
} from './navStepsFromDirections';

function mapSdkToRichKind(maneuverType?: string, maneuverDirection?: string) {
  const t = String(maneuverType ?? '').toLowerCase();
  const d = String(maneuverDirection ?? '').toLowerCase();
  const blob = `${t} ${d}`;
  if (blob.includes('arrive')) return resolveManeuverKind('arrive', '');
  if (blob.includes('depart')) return resolveManeuverKind('depart', '');
  return resolveManeuverKind(t || 'continue', d);
}

function normText(v?: string | null): string {
  return String(v ?? '').trim().toLowerCase();
}

/**
 * Native SDK progress owns the live maneuver. We only reuse rich fields from a
 * REST Directions-derived NavStep when it very likely represents the SAME step.
 * Otherwise stale route rows can freeze the icon / signal while SDK distance updates.
 */
function routeNavStepMatchesSdk(
  routeStep: NavStep | null,
  sdkKind: NavStep['kind'],
  sdkInstruction?: string | null,
): routeStep is NavStep {
  if (!routeStep) return false;
  if (routeStep.kind !== sdkKind) return false;
  const sdkInstr = normText(sdkInstruction);
  const routeStreet = normText(routeStep.streetName);
  if (!sdkInstr) return true;
  if (!routeStreet) return normText(routeStep.displayInstruction) === sdkInstr;
  return sdkInstr.includes(routeStreet) || normText(routeStep.displayInstruction) === sdkInstr;
}

function distanceToSdkDisplayedStep(
  step: NavStep | null,
  currentStepIndex: number,
  cumulativeMeters: number,
): number | null {
  if (!step) return null;
  const stepStart = Math.max(0, step.distanceMetersFromStart);
  const stepEnd = Math.max(stepStart, step.distanceMetersFromStart + Math.max(0, step.distanceMeters));
  if (step.index <= currentStepIndex) {
    return Math.max(0, stepEnd - cumulativeMeters);
  }
  return Math.max(0, stepStart - cumulativeMeters);
}

export function buildNavigationProgressFromSdk(args: {
  progress: SdkProgressPayload;
  location: SdkLocationPayload | null;
  polyline: Coordinate[];
  steps: DirectionsStep[];
}): NavigationProgress | null {
  const { progress, location, polyline, steps } = args;
  if (polyline.length < 2) return null;

  const locCoord: Coordinate | null = location
    ? { lat: location.latitude, lng: location.longitude }
    : null;
  const frac = Math.max(0, Math.min(1, Number.isFinite(progress.fractionTraveled) ? progress.fractionTraveled : 0));
  const proj = locCoord ? projectOntoPolyline(locCoord, polyline) : null;
  const snap = proj
    ? {
        point: proj.snapCoord,
        segmentIndex: proj.segmentIndex,
        t: proj.tOnSegment,
        distanceMeters: proj.distanceToRouteMeters,
        cumulativeMeters: proj.cumFromStartMeters,
      }
    : null;
  const cumulativeMeters = snap?.cumulativeMeters ?? frac * Math.max(1e-6, polylineLengthMeters(polyline));
  const routeSplitPos = segmentAndTFromCumAlongPolyline(cumulativeMeters, polyline);
  const routeSplitPoint = coordinateAtCumulativeMeters(polyline, cumulativeMeters);
  const routeSplitSnap =
    routeSplitPos && routeSplitPoint
      ? {
          point: routeSplitPoint,
          segmentIndex: routeSplitPos.segmentIndex,
          t: routeSplitPos.tOnSegment,
          distanceMeters: snap?.distanceMeters ?? 0,
          cumulativeMeters,
        }
      : snap ??
        {
          point: { lat: polyline[0]!.lat, lng: polyline[0]!.lng },
          segmentIndex: 0,
          t: 0,
          distanceMeters: 0,
          cumulativeMeters,
        };
  const { traveled, remaining } = splitRouteAtSnap(polyline, routeSplitSnap);

  const stepIdxRaw = typeof progress.stepIndex === 'number' ? progress.stepIndex : 0;
  const idx =
    steps.length > 0
      ? Math.min(Math.max(0, stepIdxRaw), Math.max(0, steps.length - 1))
      : Math.max(0, stepIdxRaw);
  const kind = mapSdkToRichKind(progress.maneuverType, progress.maneuverDirection);
  const navSteps = steps.length > 0 ? buildNavStepsFromDirections(steps, polyline) : [];
  const sdkCurrentRouteStep = navSteps.length > 0 ? navSteps[idx] ?? null : null;
  const geometricUpcomingStep =
    navSteps.length > 0 ? pickNextNavStepAlongRoute(navSteps, cumulativeMeters) : null;
  const nextBaseStep = geometricUpcomingStep ?? sdkCurrentRouteStep;
  const followingStep =
    nextBaseStep != null && nextBaseStep.index + 1 < navSteps.length
      ? navSteps[nextBaseStep.index + 1] ?? null
      : null;
  const sdkInstruction =
    progress.primaryInstruction?.trim() ||
    progress.currentStepInstruction?.trim() ||
    '';
  const sdkMatchesDisplayedStep =
    nextBaseStep != null ? routeNavStepMatchesSdk(nextBaseStep, kind, sdkInstruction) : false;
  const preferRouteStepFields =
    nextBaseStep != null &&
    (!sdkInstruction || nextBaseStep.kind !== kind || !sdkMatchesDisplayedStep);
  const primaryText =
    (preferRouteStepFields ? nextBaseStep?.displayInstruction : sdkInstruction) ||
    nextBaseStep?.displayInstruction ||
    sdkInstruction ||
    'Continue';
  const secondaryText = progress.secondaryInstruction?.trim() || progress.thenInstruction?.trim() || undefined;
  const ds = steps.length > 0 ? steps[nextBaseStep?.index ?? idx] ?? null : null;
  const matchingRouteNavStep =
    nextBaseStep != null && routeNavStepMatchesSdk(nextBaseStep, kind, primaryText) ? nextBaseStep : null;
  const displayedDistanceMeters =
    distanceToSdkDisplayedStep(nextBaseStep, idx, cumulativeMeters);
  const distNext =
    typeof progress.distanceToNextManeuverMeters === 'number' && Number.isFinite(progress.distanceToNextManeuverMeters)
      ? Math.max(0, progress.distanceToNextManeuverMeters)
      : displayedDistanceMeters != null
        ? displayedDistanceMeters
      : matchingRouteNavStep != null
        ? Math.max(0, matchingRouteNavStep.distanceMeters)
        : 0;
  const followingDistanceMeters =
    followingStep != null && nextBaseStep != null
      ? Math.max(0, followingStep.distanceMetersFromStart - nextBaseStep.distanceMetersFromStart)
      : nextBaseStep != null
        ? Math.max(0, nextBaseStep.distanceMeters)
        : null;

  const nextStep: NavStep | null = {
    index: nextBaseStep?.index ?? idx,
    segmentIndex: nextBaseStep?.segmentIndex ?? Math.min(idx, Math.max(0, polyline.length - 2)),
    kind: preferRouteStepFields ? (nextBaseStep?.kind ?? kind) : kind,
    rawType: preferRouteStepFields ? (nextBaseStep?.rawType ?? String(progress.maneuverType ?? '')) : String(progress.maneuverType ?? ''),
    rawModifier:
      preferRouteStepFields ? (nextBaseStep?.rawModifier ?? String(progress.maneuverDirection ?? '')) : String(progress.maneuverDirection ?? ''),
    bearingAfter: nextBaseStep?.bearingAfter ?? matchingRouteNavStep?.bearingAfter ?? 0,
    displayInstruction: primaryText,
    secondaryInstruction: secondaryText ?? null,
    subInstruction: null,
    instruction:
      nextBaseStep?.instruction ??
      progress.currentStepInstruction?.trim() ??
      progress.primaryInstruction?.trim() ??
      '',
    streetName: nextBaseStep?.streetName ?? ds?.name ?? null,
    destinationRoad: nextBaseStep?.destinationRoad ?? null,
    shields: nextBaseStep?.shields ?? [],
    signal: nextBaseStep?.signal ?? { kind: 'none', label: '' },
    lanes: nextBaseStep?.lanes ?? [],
    roundaboutExitNumber: nextBaseStep?.roundaboutExitNumber ?? null,
    distanceMetersFromStart: nextBaseStep?.distanceMetersFromStart ?? 0,
    distanceMeters: nextBaseStep?.distanceMeters ?? ds?.distanceMeters ?? distNext,
    distanceMetersToNext: distNext,
    durationSeconds: nextBaseStep?.durationSeconds ?? ds?.durationSeconds ?? 0,
    voiceAnnouncement: null,
    nextManeuverKind: followingStep?.kind ?? null,
    nextManeuverStreet: followingStep?.streetName ?? null,
    nextManeuverDistanceMeters: followingDistanceMeters,
  };

  const banner: NavBannerModel = {
    primaryInstruction: primaryText,
    primaryDistanceMeters: distNext,
    primaryStreet: nextBaseStep?.streetName ?? ds?.name ?? null,
    secondaryInstruction: secondaryText ?? null,
  };

  const durRem = Math.max(0, Math.round(progress.durationRemaining ?? 0));
  const distRem = Math.max(0, progress.distanceRemaining ?? 0);

  const displayCoord = {
    lat: routeSplitSnap.point.lat,
    lng: routeSplitSnap.point.lng,
    heading: location != null && location.course >= 0 ? location.course : undefined,
    speedMps: location != null && location.speed >= 0 ? location.speed : undefined,
    accuracy: location?.horizontalAccuracy ?? null,
    timestamp: location?.timestamp ?? Date.now(),
  };
  const puckCoord = displayCoord;

  return {
    displayCoord,
    puckCoord,
    snapped:
      snap ??
      ({
        point: { lat: displayCoord.lat, lng: displayCoord.lng },
        segmentIndex: 0,
        t: 0,
        distanceMeters: 0,
        cumulativeMeters,
      }),
    routeSplitSnap,
    traveledRoute: traveled,
    remainingRoute: remaining.length >= 2 ? remaining : polyline.slice(-2),
    maneuverRoute: [],
    nextStep,
    followingStep,
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
  };
}

/** Before first native progress event: no maneuver text from JS Directions API. */
export function buildSdkWaitingNavigationProgress(
  navigationData: { polyline: Coordinate[]; distance: number; duration: number } | null,
  routePolylineFromSdk: Coordinate[],
): NavigationProgress | null {
  if (!navigationData) return null;
  const poly =
    routePolylineFromSdk.length >= 2
      ? routePolylineFromSdk
      : navigationData.polyline?.length
        ? navigationData.polyline
        : [];
  if (poly.length < 2) return null;
  const first = poly[0]!;
  const distRem = Math.max(0, navigationData.distance ?? 0);
  const durRem = Math.max(0, Math.round(navigationData.duration ?? 0));
  const now = Date.now();
  const waitingCoord = {
    lat: first.lat,
    lng: first.lng,
    heading: undefined,
    speedMps: undefined,
    accuracy: null,
    timestamp: now,
  };
  return {
    displayCoord: waitingCoord,
    puckCoord: waitingCoord,
    snapped: {
      point: { lat: first.lat, lng: first.lng },
      segmentIndex: 0,
      t: 0,
      distanceMeters: 0,
      cumulativeMeters: 0,
    },
    routeSplitSnap: {
      point: { lat: first.lat, lng: first.lng },
      segmentIndex: 0,
      t: 0,
      distanceMeters: 0,
      cumulativeMeters: 0,
    },
    traveledRoute: [first],
    remainingRoute: poly,
    maneuverRoute: [],
    nextStep: null,
    followingStep: null,
    nextStepDistanceMeters: 0,
    banner: {
      primaryInstruction: 'Starting navigation…',
      primaryDistanceMeters: 0,
      primaryStreet: null,
      secondaryInstruction: null,
    },
    distanceRemainingMeters: distRem,
    modelDurationRemainingSeconds: durRem,
    durationRemainingSeconds: durRem,
    etaEpochMs: now + durRem * 1000,
    isOffRoute: false,
    confidence: 1,
    instructionSource: 'sdk_waiting',
    routePolyline: poly,
    displayCumulativeMeters: 0,
  };
}

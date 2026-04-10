import {
  cumulativeRouteMeters,
  snapToRoute,
  snapToRouteFullRoute,
  splitRouteAtSnap,
  sliceRouteWindow,
  bearingDegrees,
} from './navGeometry';
import type { NavigationProgress, RawLocation, RoutePoint, NavStep } from './navModel';
import { buildNavBanner } from './navBanner';
import type { OffRouteTuning } from './offRouteTuning';
import { remainingDurationSecondsFromNavSteps } from './navigationEta';
import { remainingDurationSecondsFromEdges } from './navigationEtaEdges';
import { blendModelWithObservedEta } from './etaObservedBlend';

export type ComputeNavigationProgressArgs = {
  rawLocation: RawLocation;
  route: RoutePoint[];
  steps: NavStep[];
  routeDurationSeconds: number;
  /** Mapbox route `distance` (meters); aligns polyline snap with step boundaries for ETA. */
  routeDistanceMeters: number;
  offRouteTuning: OffRouteTuning;
  /** Prior frame for smoothing / segment continuity; null on first tick. */
  previous: NavigationProgress | null;
  /** Per-edge duration (seconds), length = route points - 1, when edge ETA is enabled. */
  edgeDurationSec?: number[] | null;
  useEdgeEta?: boolean;
  etaBlend?: {
    enabled: boolean;
    modelRefreshedAtMs: number;
    speedStability01: number;
  };
  /**
   * When true, also compute a whole-polyline snap; adopt it if it reduces perpendicular distance
   * to the route by at least ~12m vs the local window snap.
   */
  tryGlobalReanchor?: boolean;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function headingBlend(current: number, target: number, alpha: number) {
  let delta = ((target - current + 540) % 360) - 180;
  return (current + delta * alpha + 360) % 360;
}

function confidenceFrom(raw: RawLocation, distanceToRoute: number) {
  let c = 1;
  const acc = raw.accuracy ?? 999;
  if (acc > 12) c -= 0.08;
  if (acc > 20) c -= 0.12;
  if (acc > 35) c -= 0.18;
  if (distanceToRoute > 10) c -= 0.08;
  if (distanceToRoute > 20) c -= 0.15;
  if (distanceToRoute > 35) c -= 0.2;
  return clamp(c, 0, 1);
}

function bearingFallback(route: RoutePoint[], segmentIndex: number) {
  const i = Math.max(0, Math.min(segmentIndex, route.length - 2));
  return bearingDegrees(route[i]!, route[i + 1]!);
}

/**
 * Pure navigation progress for one GPS tick (`useNavigationProgress` is a thin ref holder).
 * Returns `null` if snap fails — caller should retain `previous`.
 */
export function computeNavigationProgressFrame({
  rawLocation,
  route,
  steps,
  routeDurationSeconds,
  routeDistanceMeters,
  offRouteTuning,
  previous,
  edgeDurationSec,
  useEdgeEta,
  etaBlend,
  tryGlobalReanchor = false,
}: ComputeNavigationProgressArgs): NavigationProgress | null {
  const cumulative = cumulativeRouteMeters(route);
  const prevSegment = previous?.snapped?.segmentIndex ?? 0;
  /** Wider window reduces wrong-edge snaps on sharp corners before global re-anchor kicks in. */
  let snap = snapToRoute(rawLocation, route, cumulative, prevSegment, 52);
  if (!snap) return null;

  if (tryGlobalReanchor) {
    const globalSnap = snapToRouteFullRoute(rawLocation, route, cumulative);
    const REANCHOR_IMPROVE_M = 12;
    if (
      globalSnap &&
      globalSnap.distanceMeters < snap.distanceMeters - REANCHOR_IMPROVE_M
    ) {
      snap = globalSnap;
    }
  }

  const confidence = confidenceFrom(rawLocation, snap.distanceMeters);
  const isOffRoute =
    snap.distanceMeters > offRouteTuning.maxSnapMeters &&
    confidence < offRouteTuning.minConfidence;

  const target = isOffRoute
    ? rawLocation
    : {
        ...rawLocation,
        lat: snap.point.lat,
        lng: snap.point.lng,
      };

  const prevDisplay = previous?.displayCoord ?? rawLocation;
  const speed = rawLocation.speedMps ?? 0;
  let alpha = 0.24;
  if (speed < 1) alpha = 0.12;
  else if (speed < 6) alpha = 0.18;
  else alpha = 0.28;
  if (snap.distanceMeters > 18) alpha = Math.min(0.52, alpha + 0.12);
  if (snap.distanceMeters > 38) alpha = Math.min(0.6, alpha + 0.08);

  const displayCoord: RawLocation = {
    lat: prevDisplay.lat + (target.lat - prevDisplay.lat) * alpha,
    lng: prevDisplay.lng + (target.lng - prevDisplay.lng) * alpha,
    speedMps: rawLocation.speedMps ?? prevDisplay.speedMps ?? 0,
    accuracy: rawLocation.accuracy ?? prevDisplay.accuracy ?? null,
    timestamp: rawLocation.timestamp ?? Date.now(),
    heading: undefined,
  };

  const targetHeading =
    typeof rawLocation.heading === 'number' && Number.isFinite(rawLocation.heading)
      ? rawLocation.heading
      : bearingFallback(route, snap.segmentIndex);
  const prevHeading = previous?.displayCoord?.heading ?? targetHeading ?? 0;
  displayCoord.heading = headingBlend(prevHeading, targetHeading ?? prevHeading, speed < 2 ? 0.1 : 0.18);

  const { traveled, remaining } = splitRouteAtSnap(route, snap);
  const routeTotalMeters = cumulative[cumulative.length - 1] ?? 0;
  const distanceRemainingMeters = Math.max(0, routeTotalMeters - snap.cumulativeMeters);
  let modelDurationRemainingSeconds = remainingDurationSecondsFromNavSteps({
    snapCumulativeMetersAlongPolyline: snap.cumulativeMeters,
    polylineTotalMeters: routeTotalMeters,
    routeDistanceMetersApi: routeDistanceMeters > 1 ? routeDistanceMeters : routeTotalMeters,
    steps,
    routeDurationSecondsFallback: routeDurationSeconds,
  });

  const edgeDur = edgeDurationSec;
  const edgeOk =
    Boolean(useEdgeEta) &&
    Array.isArray(edgeDur) &&
    edgeDur.length === route.length - 1 &&
    edgeDur.some((x) => x > 0);
  if (edgeOk) {
    modelDurationRemainingSeconds = remainingDurationSecondsFromEdges({
      snapCumulativeMetersAlongPolyline: snap.cumulativeMeters,
      cumulativeVertexMeters: cumulative,
      edgeDurationSec: edgeDur!,
    });
  }

  let durationRemainingSeconds = modelDurationRemainingSeconds;
  let etaBlendWeight: number | undefined;
  let etaNaiveSeconds: number | undefined;

  if (etaBlend?.enabled && typeof etaBlend.modelRefreshedAtMs === 'number') {
    const nowTs = typeof rawLocation.timestamp === 'number' ? rawLocation.timestamp : Date.now();
    const prevTs = previous?.displayCoord?.timestamp;
    const dtMs =
      typeof prevTs === 'number' && Number.isFinite(prevTs)
        ? Math.max(80, Math.min(6000, nowTs - prevTs))
        : 1000;
    const blended = blendModelWithObservedEta({
      modelRemainingSec: modelDurationRemainingSeconds,
      distanceRemainingM: distanceRemainingMeters,
      smoothedSpeedMps: Math.max(0, rawLocation.speedMps ?? 0),
      confidence,
      msSinceModelRefresh: Math.max(0, nowTs - etaBlend.modelRefreshedAtMs),
      speedStability01: Math.max(0, Math.min(1, etaBlend.speedStability01)),
      prevBlendedSec: previous?.durationRemainingSeconds ?? null,
      dtMs,
    });
    durationRemainingSeconds = blended.blendedSec;
    etaBlendWeight = blended.weightModel;
    etaNaiveSeconds = blended.naiveSec;
  }

  const etaEpochMs = Date.now() + durationRemainingSeconds * 1000;

  const nextStepRaw =
    steps.find((s) => s.distanceMetersFromStart > snap.cumulativeMeters) ?? null;
  const nextStepDistanceMeters = nextStepRaw
    ? Math.max(0, nextStepRaw.distanceMetersFromStart - snap.cumulativeMeters)
    : 0;
  const nextStep = nextStepRaw
    ? { ...nextStepRaw, distanceMetersToNext: nextStepDistanceMeters }
    : null;
  const followingStepRaw =
    nextStepRaw != null && nextStepRaw.index + 1 < steps.length
      ? steps[nextStepRaw.index + 1] ?? null
      : null;

  const maneuverRoute = nextStep
    ? sliceRouteWindow(route, Math.max(snap.segmentIndex, nextStep.segmentIndex - 1), 5)
    : sliceRouteWindow(route, snap.segmentIndex, 5);

  const banner = buildNavBanner(nextStep, followingStepRaw, nextStepDistanceMeters);

  return {
    displayCoord,
    snapped: snap,
    traveledRoute: traveled,
    remainingRoute: remaining,
    maneuverRoute,
    nextStep,
    followingStep: followingStepRaw,
    nextStepDistanceMeters,
    banner,
    distanceRemainingMeters,
    modelDurationRemainingSeconds,
    durationRemainingSeconds,
    etaEpochMs,
    etaBlendWeight,
    etaNaiveSeconds,
    isOffRoute,
    confidence,
    instructionSource: 'js',
  };
}

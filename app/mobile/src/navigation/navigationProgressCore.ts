import {
  cumulativeRouteMeters,
  snapToRoute,
  splitRouteAtSnap,
  sliceRouteWindow,
  bearingDegrees,
} from './navGeometry';
import type { NavigationProgress, RawLocation, RoutePoint, NavStep } from './navModel';
import { buildNavBanner } from './navBanner';
import type { OffRouteTuning } from './offRouteTuning';

export type ComputeNavigationProgressArgs = {
  rawLocation: RawLocation;
  route: RoutePoint[];
  steps: NavStep[];
  routeDurationSeconds: number;
  offRouteTuning: OffRouteTuning;
  /** Prior frame for smoothing / segment continuity; null on first tick. */
  previous: NavigationProgress | null;
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
  offRouteTuning,
  previous,
}: ComputeNavigationProgressArgs): NavigationProgress | null {
  const cumulative = cumulativeRouteMeters(route);
  const prevSegment = previous?.snapped?.segmentIndex ?? 0;
  const snap = snapToRoute(rawLocation, route, cumulative, prevSegment, 35);
  if (!snap) return null;

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
  const durationRemainingSeconds =
    routeTotalMeters > 1
      ? Math.round((distanceRemainingMeters / routeTotalMeters) * routeDurationSeconds)
      : 0;
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
    durationRemainingSeconds,
    etaEpochMs,
    isOffRoute,
    confidence,
  };
}

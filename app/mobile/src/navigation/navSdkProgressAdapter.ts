import type { DirectionsStep } from '../lib/directions';
import type { Coordinate } from '../types';
import type { NavigationProgress, NavStep, NavBannerModel } from './navModel';
import {
  coordinateAtCumulativeMeters,
  polylineLengthMeters,
  projectOntoPolyline,
  segmentAndTFromCumAlongPolyline,
  tangentBearingAlongPolyline,
} from '../utils/distance';
import type { SdkLocationPayload, SdkProgressPayload } from './navSdkStore';
import { splitRouteAtSnap } from './navGeometry';
import { pickNextNavStepAlongRoute } from './navigationProgressCore';
import {
  buildNavStepsFromDirections,
  navStepFromDirectionsAtIndex,
  resolveManeuverKind,
} from './navStepsFromDirections';

/**
 * iOS emits `String(describing: step.maneuverType)` and
 * `String(describing: step.maneuverDirection)` from the `MapboxDirections` Swift
 * enums (`ManeuverType` / `ManeuverDirection`). Those produce **Swift enum case
 * names** (`takeOnRamp`, `takeOffRamp`, `reachFork`, `takeRoundabout`,
 * `straightAhead`, `sharpLeft`, `slightRight`, `uTurn`, …) which are **not** the
 * canonical Mapbox Directions API strings we consume elsewhere (`"on ramp"`,
 * `"off ramp"`, `"fork"`, `"roundabout"`, `"straight"`, `"sharp left"`,
 * `"slight right"`, `"uturn"`, …).
 *
 * Without normalisation, `resolveManeuverKind` and `ManeuverIcon.resolveIconKey`
 * miss on every iOS turn and fall through to the default "continue" glyph,
 * which renders as the straight-up arrow — the exact symptom users see when
 * the SDK is speaking "turn right" but the card shows a straight arrow.
 *
 * These helpers convert iOS camelCase enum cases to canonical Mapbox Directions
 * form. Android already emits canonical strings via
 * `Maneuver.maneuverType` / `Maneuver.modifier`, so these mappings are
 * idempotent for Android payloads and for already-canonical JS fallbacks.
 */
export function normalizeSdkManeuverType(raw?: string | null): string {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  const lower = s.toLowerCase();
  if (lower === 'takeonramp' || lower === 'onramp' || lower === 'on ramp') return 'on ramp';
  if (lower === 'takeofframp' || lower === 'offramp' || lower === 'off ramp') return 'off ramp';
  if (lower === 'reachfork' || lower === 'fork') return 'fork';
  if (lower === 'takeroundabout' || lower === 'exitroundabout' || lower === 'roundaboutturn' || lower === 'roundabout turn' || lower === 'roundabout')
    return 'roundabout';
  if (lower === 'takerotary' || lower === 'exitrotary' || lower === 'rotary') return 'rotary';
  if (lower === 'usefreewayramp' || lower === 'usefreewayexit') return 'off ramp';
  if (lower === 'passnamechange' || lower === 'namechange') return 'continue';
  if (lower === 'heedwarning') return 'notification';
  if (lower === 'uselane' || lower === 'use lane') return 'continue';
  if (lower === 'endofroad' || lower === 'end of road') return 'end of road';
  return lower.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
}

export function normalizeSdkManeuverDirection(raw?: string | null): string {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  const lower = s.toLowerCase();
  if (lower === 'straightahead' || lower === 'straight_ahead' || lower === 'straight ahead') return 'straight';
  if (lower === 'sharpleft' || lower === 'sharp_left' || lower === 'sharp left') return 'sharp left';
  if (lower === 'sharpright' || lower === 'sharp_right' || lower === 'sharp right') return 'sharp right';
  if (lower === 'slightleft' || lower === 'slight_left' || lower === 'slight left') return 'slight left';
  if (lower === 'slightright' || lower === 'slight_right' || lower === 'slight right') return 'slight right';
  if (lower === 'uturn' || lower === 'u-turn' || lower === 'u_turn') return 'uturn';
  if (lower === 'left') return 'left';
  if (lower === 'right') return 'right';
  if (lower === 'straight') return 'straight';
  return lower.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
}

function mapSdkToRichKind(maneuverType?: string, maneuverDirection?: string) {
  const t = normalizeSdkManeuverType(maneuverType);
  const d = normalizeSdkManeuverDirection(maneuverDirection);
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

/**
 * Heading smoothing state (shortest-angle EWMA).
 *
 * Raw native `course` can swing ±5° on consecutive ticks at low speed or in
 * dense urban canyons — even when the matched point hasn't moved — which shows
 * up as a visibly twitchy puck and camera bearing. An Apple-Maps-like feel
 * requires a small amount of damping *without* adding visible lag on sharp
 * turns, so we blend in the shortest-angle direction with an alpha that scales
 * with speed (more damping when slow, almost none at freeway speed).
 *
 * Keep this pair module-private; callers should treat the function as pure
 * from their perspective (adapter output is a plain object). `resetHeadingSmoothing`
 * is exported for tests and trip-teardown paths in `navSdkStore.resetNavSdkState`.
 */
let smoothedHeadingDeg: number | null = null;
let smoothedHeadingAtMs = 0;

export function resetHeadingSmoothing(): void {
  smoothedHeadingDeg = null;
  smoothedHeadingAtMs = 0;
}

function shortestAngleDeltaDeg(target: number, current: number): number {
  let d = ((target - current + 540) % 360) - 180;
  if (d === -180) d = 180;
  return d;
}

function wrap360(deg: number): number {
  const m = deg % 360;
  return m < 0 ? m + 360 : m;
}

/**
 * Clamp the camera/puck bearing so it never deviates more than
 * `maxDeviationDeg` from the forward-looking route tangent.
 *
 * Why: `location.course` is just a direction-of-motion estimate from the
 * Navigation SDK matcher. In urban canyons, at low speed, or on ramp
 * pickups, the course can swing ±60° off the actual road. Feeding that to
 * `FollowWithCourse` makes the camera bearing point partly off-road, which
 * reads visually as "the camera is tracking me sideways."
 *
 * Apple Maps and Mapbox's own `NavigationCamera` both solve this with a
 * deviation cap against the forward route direction — see Mapbox
 * `BearingSmoothing.maximumBearingSmoothingAngle` (default 45°). With the
 * cap in place, the camera can lag or lead the course a little to feel
 * alive, but it is guaranteed to keep the road centered under the puck.
 *
 * Exported for unit tests; idempotent when `tangentDeg` is null/NaN so the
 * caller is free to skip the tangent lookup for routes without polylines.
 */
export function clampBearingToTangentDeg(
  bearingDeg: number,
  tangentDeg: number | null,
  maxDeviationDeg = 45,
): number {
  if (tangentDeg == null || !Number.isFinite(tangentDeg)) {
    return wrap360(bearingDeg);
  }
  if (!Number.isFinite(bearingDeg)) {
    return wrap360(tangentDeg);
  }
  const delta = shortestAngleDeltaDeg(bearingDeg, tangentDeg);
  if (Math.abs(delta) <= maxDeviationDeg) return wrap360(bearingDeg);
  const sign = delta >= 0 ? 1 : -1;
  return wrap360(tangentDeg + sign * maxDeviationDeg);
}

/**
 * Smooth `course` toward the previous emitted heading.
 *
 * - `alpha` = EWMA factor toward the new raw course.
 *   - Slow (≤ 4 m/s ≈ 9 mph): 0.35 — heavy damping, kills pedestrian-mode hunt.
 *   - Cruise (≥ 15 m/s ≈ 34 mph): 0.85 — near pass-through, no lag on turns.
 *   - Linear blend in between.
 * - Sharp turns (|Δ| ≥ 25°) bypass damping so real lane changes land instantly.
 * - Stale previous sample (> 2 s since last update, e.g. first tick after a
 *   reroute) bypasses damping.
 */
function smoothCourseDeg(
  rawCourseDeg: number,
  speedMps: number | null | undefined,
  nowMs: number,
): number {
  const prev = smoothedHeadingDeg;
  const stale = smoothedHeadingAtMs > 0 && nowMs - smoothedHeadingAtMs > 2000;
  if (prev == null || stale) {
    smoothedHeadingDeg = wrap360(rawCourseDeg);
    smoothedHeadingAtMs = nowMs;
    return smoothedHeadingDeg;
  }
  const delta = shortestAngleDeltaDeg(rawCourseDeg, prev);
  if (Math.abs(delta) >= 25) {
    smoothedHeadingDeg = wrap360(rawCourseDeg);
    smoothedHeadingAtMs = nowMs;
    return smoothedHeadingDeg;
  }
  const sp = Number.isFinite(speedMps as number) ? Math.max(0, speedMps as number) : 0;
  const tSpeed = Math.max(0, Math.min(1, (sp - 4) / (15 - 4)));
  const alpha = 0.35 + (0.85 - 0.35) * tSpeed;
  smoothedHeadingDeg = wrap360(prev + delta * alpha);
  smoothedHeadingAtMs = nowMs;
  return smoothedHeadingDeg;
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
  const sdkPrimary = progress.primaryInstruction?.trim() || '';
  const sdkCurrent = progress.currentStepInstruction?.trim() || '';
  const sdkInstruction = sdkPrimary || sdkCurrent || '';
  // REST rows are only for structural enrichment (signal / lanes / shields / street
  // name) when they describe the SAME maneuver the SDK is pointing at. Native is the
  // single authority for the primary display text, icon kind, and raw type/modifier
  // during an active SDK trip — the previous `preferRouteStepFields` path let REST
  // primary text + kind win whenever shapes differed (e.g. SDK promoted an upcoming
  // "turn left" while REST was still on the depart step), which made the turn card
  // contradict native voice. Now we only fall back to REST when the SDK is completely
  // silent about this step (no primary text and no current-step instruction).
  const preferRouteStepFields = nextBaseStep != null && !sdkInstruction;
  const primaryText =
    sdkPrimary ||
    sdkCurrent ||
    nextBaseStep?.displayInstruction ||
    'Continue';
  const sdkSecondary = progress.secondaryInstruction?.trim() || '';
  const sdkThen = progress.thenInstruction?.trim() || '';
  const restThenBody = followingStep
    ? followingStep.displayInstruction?.trim() || followingStep.instruction?.trim() || ''
    : '';
  const restThen = restThenBody ? `Then ${restThenBody}` : '';
  const secondaryText = sdkSecondary || sdkThen || restThen || undefined;
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

  const normalizedRawType = normalizeSdkManeuverType(progress.maneuverType);
  const normalizedRawModifier = normalizeSdkManeuverDirection(progress.maneuverDirection);
  const nextStep: NavStep | null = {
    index: nextBaseStep?.index ?? idx,
    segmentIndex: nextBaseStep?.segmentIndex ?? Math.min(idx, Math.max(0, polyline.length - 2)),
    kind: preferRouteStepFields ? (nextBaseStep?.kind ?? kind) : kind,
    rawType: preferRouteStepFields ? (nextBaseStep?.rawType ?? normalizedRawType) : normalizedRawType,
    rawModifier:
      preferRouteStepFields ? (nextBaseStep?.rawModifier ?? normalizedRawModifier) : normalizedRawModifier,
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

  /**
   * Heading source priority — Apple-Maps style, matches what Mapbox Navigation's
   * own NavigationCamera does when driving the embedded UI:
   *
   * 1. Route tangent (forward direction of upcoming road) at the snapped
   *    point — whenever the user is stationary / slow (<1.5 m/s ≈ 3.4 mph)
   *    or the native SDK hasn't produced a valid `course` sample yet.
   *    `location.course` is a direction-of-motion estimate; it's -1 or
   *    noise before the user actually starts rolling, so feeding it to
   *    `FollowWithCourse` causes the camera to spin toward the device
   *    compass (often ~180° off). Route tangent is always a valid
   *    forward direction along the path and matches what the native
   *    Mapbox Navigation camera does in the same condition.
   * 2. Smoothed SDK course (EWMA over shortest angle) — once the driver is
   *    rolling fast enough for `course` to be meaningful, we honour it so
   *    curve-following bearing looks natural.
   *
   * Both cases go through `smoothCourseDeg` so sharp transitions from
   * tangent → course (and back) don't whip the camera.
   */
  const rawCourseDeg = location != null && location.course >= 0 ? location.course : null;
  const speedMpsForSmoothing =
    location != null && location.speed >= 0 ? location.speed : null;
  const tangentDeg = tangentBearingAlongPolyline(polyline, cumulativeMeters);
  const movingFastEnoughForCourse =
    speedMpsForSmoothing != null && speedMpsForSmoothing >= 1.5;
  const bearingSeed =
    rawCourseDeg != null && movingFastEnoughForCourse
      ? rawCourseDeg
      : tangentDeg != null
        ? tangentDeg
        : rawCourseDeg;
  /**
   * After smoothing, cap the result so it never deviates more than 45° from
   * the forward route tangent — Mapbox's `BearingSmoothing.maximumBearingSmoothingAngle`
   * pattern. This guarantees the camera keeps the road centered even when
   * the matcher briefly disagrees with the polyline (urban canyon,
   * ramp pickup). See `clampBearingToTangentDeg` docstring.
   */
  const smoothedBearing =
    bearingSeed != null
      ? smoothCourseDeg(bearingSeed, speedMpsForSmoothing, Date.now())
      : undefined;
  const headingDeg =
    smoothedBearing != null
      ? clampBearingToTangentDeg(smoothedBearing, tangentDeg)
      : undefined;
  const displayCoord = {
    lat: routeSplitSnap.point.lat,
    lng: routeSplitSnap.point.lng,
    heading: headingDeg,
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

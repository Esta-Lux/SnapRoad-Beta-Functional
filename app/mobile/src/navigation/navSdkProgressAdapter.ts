import type { DirectionsStep } from '../lib/directions';
import type { Coordinate } from '../types';
import type {
  NavigationProgress,
  NavStep,
  NavBannerModel,
  LaneIndication,
  LaneInfo,
  RoadShield,
  RoadSignal,
} from './navModel';
import {
  coordinateAtCumulativeMeters,
  haversineMeters,
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
import { logNavVerify } from './navLogicDebug';
import { parseLaneIndication } from './laneIndication';
import { sdkManeuverDisplayDistanceFromProgress } from './sdkNavBridgePayload';

export function roadSignalFromSdkPayload(progress: SdkProgressPayload, fallback: RoadSignal | undefined): RoadSignal {
  const n = progress.upcomingIntersectionName?.trim();
  const r = progress.currentRoadName?.trim();
  if (n) return { kind: 'named_intersection', label: n };
  if (r) return { kind: 'road_name', label: r };
  return fallback ?? { kind: 'none', label: '' };
}

export function mapSdkLanesToLaneInfo(raw: NonNullable<SdkProgressPayload['lanes']>): LaneInfo[] {
  return raw.map((l) => {
    const indications = l.indications.map((x) => parseLaneIndication(String(x)));
    return {
      indications: indications.length ? indications : ['straight' as LaneIndication],
      displayIndication: undefined,
      /** Bridge: `active` = preferred lane, `valid` = usable — match {@link LaneInfo} semantics. */
      active: l.valid,
      preferred: l.active,
    };
  });
}

export function mapSdkShieldPayload(sh: NonNullable<NonNullable<SdkProgressPayload['shield']>>): RoadShield {
  const t = sh.text.trim();
  return { network: 'sdk', ref: t, displayRef: t, imageBase64: sh.imageBase64 };
}

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

export function mapSdkToRichKind(maneuverType?: string, maneuverDirection?: string) {
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

/**
 * Last-projection hysteresis state — prevents the matched-location projection
 * from flipping to a parallel segment / lane within a single tick.
 *
 * `projectOntoPolyline` returns the globally closest point on the polyline.
 * On real-world roads with HOV lanes, frontage roads, or roads that loop
 * back on themselves, two segments of the polyline can be within a few
 * metres of each other. A single noisy GPS sample can flip the projection
 * from one segment to the other even though the driver hasn't moved —
 * which manifests visually as the puck "jumping into a different lane"
 * during or just after a reroute.
 *
 * Guard: reject a new projection when
 *   1. the polyline **identity hasn't changed** (same route — i.e. not a
 *      legitimate reroute handoff), AND
 *   2. the new `cumulativeMeters` is more than 10 m **backward** along the
 *      route from the previous projection, AND
 *   3. the matched location is still within 20 m of the previous snap point
 *      (we haven't physically moved enough to justify the jump).
 *
 * In all other cases (forward motion, small jitter, large lateral move,
 * polyline swap) we accept the new projection.
 */
let lastProjectionPolyline: Coordinate[] | null = null;
let lastProjectionCumMeters: number | null = null;
let lastProjectionPoint: Coordinate | null = null;

export function resetHeadingSmoothing(): void {
  smoothedHeadingDeg = null;
  smoothedHeadingAtMs = 0;
  lastProjectionPolyline = null;
  lastProjectionCumMeters = null;
  lastProjectionPoint = null;
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
 * Time-based EWMA: `alpha = 1 - exp(-dt / tau)` so the perceived smoothness
 * is frame-rate independent. Matches what `useSmoothedNavFraction` does for
 * along-route position — iOS at ~10 Hz and Android at ~3–7 Hz now feel
 * identical.
 *
 * Time constant (`tau`) scales with speed to kill course jitter at low
 * speed while staying responsive on turns at cruise:
 *   - Slow (≤ 4 m/s ≈ 9 mph): tau = 350 ms (heavy damping).
 *   - Cruise (≥ 15 m/s ≈ 34 mph): tau = 120 ms (responsive).
 *   - Linear blend in between.
 *
 * Bypass paths (same as before):
 *   - First sample or stale > 2 s → accept raw course verbatim (no lag).
 *   - Sharp turns (|Δ| ≥ 25°) → accept raw course verbatim (real lane
 *     changes must land instantly, not ease in).
 */
function smoothCourseDeg(
  rawCourseDeg: number,
  speedMps: number | null | undefined,
  nowMs: number,
): number {
  const prev = smoothedHeadingDeg;
  const prevAt = smoothedHeadingAtMs;
  const stale = prevAt > 0 && nowMs - prevAt > 2000;
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
  const tauMs = 350 + (120 - 350) * tSpeed;
  const dt = Math.max(1, nowMs - prevAt);
  const alpha = 1 - Math.exp(-dt / Math.max(16, tauMs));
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
  const rawProj = locCoord ? projectOntoPolyline(locCoord, polyline) : null;

  /**
   * Lateral hysteresis — see `lastProjectionPolyline` docs above. Reject
   * backward flips of the projection that almost certainly represent the
   * matcher switching to a neighbouring segment (HOV / frontage / loop)
   * rather than real reverse motion. We only apply the guard when the
   * polyline identity hasn't changed — a reroute resets state below.
   */
  const BACKWARD_JUMP_THRESHOLD_M = 10;
  const LATERAL_HOLD_RADIUS_M = 20;
  let effectiveProj = rawProj;
  if (
    rawProj &&
    locCoord &&
    lastProjectionPolyline === polyline &&
    lastProjectionCumMeters != null &&
    lastProjectionPoint != null
  ) {
    const backwardDelta = lastProjectionCumMeters - rawProj.cumFromStartMeters;
    if (backwardDelta > BACKWARD_JUMP_THRESHOLD_M) {
      const lateralToLastSnap = haversineMeters(
        locCoord.lat,
        locCoord.lng,
        lastProjectionPoint.lat,
        lastProjectionPoint.lng,
      );
      if (lateralToLastSnap < LATERAL_HOLD_RADIUS_M) {
        effectiveProj = {
          ...rawProj,
          snapCoord: { lat: lastProjectionPoint.lat, lng: lastProjectionPoint.lng },
          cumFromStartMeters: lastProjectionCumMeters,
        };
      }
    }
  }

  const polylineSwapped =
    lastProjectionPolyline != null && lastProjectionPolyline !== polyline;
  if (polylineSwapped) {
    logNavVerify('reroute.handoff', {
      event: 'polyline_swap',
      oldCum: lastProjectionCumMeters,
      newProjCum: rawProj?.cumFromStartMeters ?? null,
      newPolylineLen: polyline.length,
    });
  }
  if (rawProj && effectiveProj !== rawProj) {
    logNavVerify('projection', {
      event: 'backward_flip_held',
      rawCum: rawProj.cumFromStartMeters,
      heldCum: lastProjectionCumMeters,
      lateralM: locCoord && lastProjectionPoint
        ? haversineMeters(
            locCoord.lat,
            locCoord.lng,
            lastProjectionPoint.lat,
            lastProjectionPoint.lng,
          )
        : null,
    });
  }
  if (effectiveProj) {
    lastProjectionPolyline = polyline;
    lastProjectionCumMeters = effectiveProj.cumFromStartMeters;
    lastProjectionPoint = {
      lat: effectiveProj.snapCoord.lat,
      lng: effectiveProj.snapCoord.lng,
    };
  } else if (lastProjectionPolyline !== polyline) {
    lastProjectionPolyline = polyline;
    lastProjectionCumMeters = null;
    lastProjectionPoint = null;
  }

  const proj = effectiveProj;
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

  const sdkRoadSignalCandidate = roadSignalFromSdkPayload(progress, nextBaseStep?.signal);
  const signalForStep: RoadSignal = preferRouteStepFields
    ? nextBaseStep?.signal ?? { kind: 'none', label: '' }
    : sdkRoadSignalCandidate.kind !== 'none'
      ? sdkRoadSignalCandidate
      : nextBaseStep?.signal ?? { kind: 'none', label: '' };

  const lanesForStep: LaneInfo[] = preferRouteStepFields
    ? nextBaseStep?.lanes ?? []
    : progress.lanes?.length
      ? mapSdkLanesToLaneInfo(progress.lanes)
      : nextBaseStep?.lanes ?? [];

  const shieldsForStep: RoadShield[] = preferRouteStepFields
    ? nextBaseStep?.shields ?? []
    : progress.shield
      ? [mapSdkShieldPayload(progress.shield)]
      : nextBaseStep?.shields ?? [];

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
    shields: shieldsForStep,
    signal: signalForStep,
    lanes: lanesForStep,
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

  /**
   * Single-source banner: when MapScreen resolves `banner?.lanes ?? prog.nextStep?.lanes`
   * (and the analogous chains for icon kind / signal / shields / roundabout exit)
   * we want every field to describe the SAME maneuver the banner's `primaryInstruction`
   * is talking about. Previously these rich fields were left `undefined` on the
   * banner, so MapScreen always fell through to `prog.nextStep.*` — which can be
   * a different step than the banner text when `nextBaseStep` (geometric pick)
   * disagrees with the SDK's banner. Populating them here from the same
   * `nextBaseStep` (the step whose `displayInstruction` fed `primaryText`) pins
   * all turn-card UI to one step reference and eliminates the "icon points
   * straight while voice says turn right" class of drift.
   */
  const bannerManeuverKind =
    preferRouteStepFields && nextBaseStep?.kind ? nextBaseStep.kind : kind;
  const nativeFd = sdkManeuverDisplayDistanceFromProgress(progress);
  const banner: NavBannerModel = {
    primaryInstruction: primaryText,
    primaryDistanceMeters: distNext,
    primaryDistanceFormatted: nativeFd?.value ?? null,
    primaryDistanceFormattedUnit: nativeFd?.unit && nativeFd.unit.length > 0 ? nativeFd.unit : null,
    primaryStreet: nextBaseStep?.streetName ?? ds?.name ?? null,
    secondaryInstruction: secondaryText ?? null,
    signal: signalForStep,
    lanes: lanesForStep,
    shields: shieldsForStep,
    maneuverKind: bannerManeuverKind,
    roundaboutExitNumber: nextBaseStep?.roundaboutExitNumber ?? null,
  };

  const durRem = Math.max(0, Math.round(progress.durationRemaining ?? 0));
  const distRem = Math.max(0, progress.distanceRemaining ?? 0);

  /**
   * Heading source priority — Apple-Maps-style, three-band fusion:
   *
   * 1. Moving (speed ≥ 2.0 m/s ≈ 4.5 mph) AND course valid
   *    → use **course** (GPS direction of travel). This is the only regime
   *    where `location.course` is reliable; feed it through the time-based
   *    EWMA so curve-following reads natural.
   * 2. Creep (0.5–2.0 m/s) AND course valid
   *    → still use **course**, but the EWMA's low-speed alpha damps noise.
   *    Falling back to tangent here was the old behaviour and it caused
   *    the puck to rotate toward the *road centreline direction* at lights
   *    and stop-and-go, not the direction the car is actually pointed.
   * 3. Stopped (< 0.5 m/s) OR course invalid
   *    → **hold** the previously-smoothed heading. Apple Maps does this: at
   *    a red light your arrow keeps pointing the way you were going until
   *    you move again. Never revert to route tangent mid-trip — that
   *    produces visible "snap to road" rotations that look wrong whenever
   *    the car is legitimately off-axis (angled parking, in a driveway,
   *    at the far side of an intersection).
   *
   * First-sample seed: when we have no last-known smoothed heading yet
   * (very first progress tick of the trip) we do use route tangent as a
   * safe starting value so the puck doesn't flash pointing north.
   */
  const rawCourseDeg = location != null && location.course >= 0 ? location.course : null;
  const speedMpsForSmoothing =
    location != null && location.speed >= 0 ? location.speed : null;
  const tangentDeg = tangentBearingAlongPolyline(polyline, cumulativeMeters);
  const nowMs = Date.now();
  const MOVING_THRESHOLD_MPS = 2.0;
  const CREEP_THRESHOLD_MPS = 0.5;
  const speedForBand = Number.isFinite(speedMpsForSmoothing as number)
    ? (speedMpsForSmoothing as number)
    : 0;
  const courseIsValid = rawCourseDeg != null && Number.isFinite(rawCourseDeg);
  const moving = speedForBand >= MOVING_THRESHOLD_MPS;
  const creeping = speedForBand >= CREEP_THRESHOLD_MPS && speedForBand < MOVING_THRESHOLD_MPS;
  let bearingSeed: number | null;
  if (courseIsValid && (moving || creeping)) {
    bearingSeed = rawCourseDeg as number;
  } else if (smoothedHeadingDeg != null) {
    bearingSeed = smoothedHeadingDeg;
  } else if (tangentDeg != null && Number.isFinite(tangentDeg)) {
    bearingSeed = tangentDeg;
  } else if (courseIsValid) {
    bearingSeed = rawCourseDeg as number;
  } else {
    bearingSeed = null;
  }
  /**
   * After smoothing, cap the result so it never deviates more than 45° from
   * the forward route tangent — Mapbox's `BearingSmoothing.maximumBearingSmoothingAngle`
   * pattern. This guarantees the camera keeps the road centered even when
   * the matcher briefly disagrees with the polyline (urban canyon,
   * ramp pickup). The clamp is only applied when `bearingSeed` came from
   * a live course sample; when we're holding a stale smoothed value
   * (stopped at a light), the clamp is skipped so the puck doesn't rotate
   * to an arbitrary tangent direction while the car isn't moving.
   */
  const smoothedBearing =
    bearingSeed != null
      ? smoothCourseDeg(bearingSeed, speedMpsForSmoothing, nowMs)
      : undefined;
  const shouldClampToTangent = courseIsValid && (moving || creeping);
  const headingDeg =
    smoothedBearing != null
      ? shouldClampToTangent
        ? clampBearingToTangentDeg(smoothedBearing, tangentDeg)
        : smoothedBearing
      : undefined;

  logNavVerify('bearing', {
    rawCourse: rawCourseDeg,
    courseValid: courseIsValid,
    speedMps: speedMpsForSmoothing,
    band: moving ? 'moving' : creeping ? 'creep' : 'stopped',
    tangent: tangentDeg,
    seed: bearingSeed,
    smoothed: smoothedBearing,
    heading: headingDeg,
    clamped: shouldClampToTangent,
  });
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

/**
 * Before first native progress tick: show a neutral waiting shell.
 *
 * `startNavigation` calls `resetNavSdkState()`, so `routePolylineFromSdk` is empty until
 * `onRoutesLoaded`. Use the **same preview polyline** the user just confirmed (Directions)
 * only for this transient window; `MapScreen` + `polylineToRender` prefer `sdkRoutePolyline`
 * as soon as native geometry lands, so the line does not fight an active SDK session.
 */
export function buildSdkWaitingNavigationProgress(
  navigationData: { polyline: Coordinate[]; distance: number; duration: number } | null,
  routePolylineFromSdk: Coordinate[],
): NavigationProgress | null {
  if (!navigationData) return null;
  const poly =
    routePolylineFromSdk.length >= 2
      ? routePolylineFromSdk
      : navigationData.polyline?.length && navigationData.polyline.length >= 2
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
      primaryInstruction: 'Syncing route with your location…',
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

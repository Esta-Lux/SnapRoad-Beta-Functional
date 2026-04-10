import type { DirectionsStep } from '../lib/directions';
import type { Coordinate } from '../types';
import type { NavigationProgress, NavStep, ManeuverKind, NavBannerModel } from './navModel';
import { polylineLengthMeters, projectOntoPolyline } from '../utils/distance';
import type { SdkLocationPayload, SdkProgressPayload } from './navSdkStore';

function mapManeuverKind(maneuverType?: string, maneuverDirection?: string): ManeuverKind {
  const blob = `${maneuverType ?? ''} ${maneuverDirection ?? ''}`.toLowerCase();
  if (blob.includes('arrive')) return 'arrive';
  if (blob.includes('uturn') || blob.includes('u-turn')) return 'uturn';
  if (blob.includes('roundabout') || blob.includes('rotary')) return 'merge';
  if (blob.includes('merge')) return 'merge';
  if (blob.includes('fork')) return 'fork';
  if (blob.includes('sharp') && blob.includes('left')) return 'sharp_left';
  if (blob.includes('sharp') && blob.includes('right')) return 'sharp_right';
  if (blob.includes('slight') && blob.includes('left')) return 'slight_left';
  if (blob.includes('slight') && blob.includes('right')) return 'slight_right';
  if (blob.includes('left')) return 'left';
  if (blob.includes('right')) return 'right';
  if (blob.includes('straight') || blob.includes('continue')) return 'straight';
  if (blob.includes('depart') || blob.includes('head')) return 'straight';
  return 'straight';
}

function splitPolylineRough(polyline: Coordinate[], fraction01: number): { traveled: Coordinate[]; remaining: Coordinate[] } {
  const f = Math.max(0, Math.min(1, fraction01));
  if (polyline.length < 2) {
    return { traveled: [...polyline], remaining: [...polyline] };
  }
  const total = polylineLengthMeters(polyline);
  const target = f * total;
  if (target <= 0) return { traveled: [polyline[0]!], remaining: [...polyline] };
  let acc = 0;
  for (let i = 0; i < polyline.length - 1; i++) {
    const a = polyline[i]!;
    const b = polyline[i + 1]!;
    const seg =
      haversineQuick(a.lat, a.lng, b.lat, b.lng);
    if (acc + seg >= target) {
      const t = seg > 0 ? (target - acc) / seg : 0;
      const split = {
        lat: a.lat + (b.lat - a.lat) * t,
        lng: a.lng + (b.lng - a.lng) * t,
      };
      const traveled = [...polyline.slice(0, i + 1), split];
      const remaining = [split, ...polyline.slice(i + 1)];
      return { traveled, remaining };
    }
    acc += seg;
  }
  return { traveled: [...polyline], remaining: [polyline[polyline.length - 1]!] };
}

function haversineQuick(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export function buildNavigationProgressFromSdk(args: {
  progress: SdkProgressPayload;
  location: SdkLocationPayload | null;
  polyline: Coordinate[];
  steps: DirectionsStep[];
}): NavigationProgress | null {
  const { progress, location, polyline, steps } = args;
  if (polyline.length < 2) return null;

  const frac = Math.max(0, Math.min(1, Number.isFinite(progress.fractionTraveled) ? progress.fractionTraveled : 0));
  const { traveled, remaining } = splitPolylineRough(polyline, frac);

  const locCoord: Coordinate | null = location
    ? { lat: location.latitude, lng: location.longitude }
    : null;
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

  const stepIdxRaw = typeof progress.stepIndex === 'number' ? progress.stepIndex : 0;
  const idx =
    steps.length > 0
      ? Math.min(Math.max(0, stepIdxRaw), Math.max(0, steps.length - 1))
      : Math.max(0, stepIdxRaw);
  const ds = steps.length > 0 ? steps[idx] ?? null : null;
  const kind = mapManeuverKind(progress.maneuverType, progress.maneuverDirection);
  const distNext =
    typeof progress.distanceToNextManeuverMeters === 'number' && Number.isFinite(progress.distanceToNextManeuverMeters)
      ? Math.max(0, progress.distanceToNextManeuverMeters)
      : Math.max(0, progress.distanceRemaining * 0.02);

  /** SDK strings only — never merge Mapbox Directions steps (avoids stale lanes / icons). */
  const primaryText =
    progress.primaryInstruction?.trim() ||
    progress.currentStepInstruction?.trim() ||
    'Continue';
  const secondaryText = progress.secondaryInstruction?.trim() || progress.thenInstruction?.trim() || undefined;

  const nextStep: NavStep | null = {
    index: idx,
    segmentIndex: Math.min(idx, Math.max(0, polyline.length - 2)),
    distanceMetersFromStart: ds?.distanceMeters ?? 0,
    distanceMetersToNext: distNext,
    durationSeconds: ds?.durationSeconds ?? 0,
    kind,
    streetName: ds?.name ?? null,
    instruction: progress.currentStepInstruction?.trim() || progress.primaryInstruction?.trim() || null,
    displayInstruction: primaryText,
  };

  const banner: NavBannerModel = {
    primaryInstruction: primaryText,
    primaryDistanceMeters: distNext,
    primaryStreet: ds?.name ?? null,
    secondaryInstruction: secondaryText ?? null,
  };

  const durRem = Math.max(0, Math.round(progress.durationRemaining ?? 0));
  const distRem = Math.max(0, progress.distanceRemaining ?? 0);

  const displayCoord = {
    lat: locCoord?.lat ?? polyline[0]!.lat,
    lng: locCoord?.lng ?? polyline[0]!.lng,
    heading: location != null && location.course >= 0 ? location.course : undefined,
    speedMps: location != null && location.speed >= 0 ? location.speed : undefined,
    accuracy: location?.horizontalAccuracy ?? null,
    timestamp: location?.timestamp ?? Date.now(),
  };

  return {
    displayCoord,
    snapped:
      snap ??
      ({
        point: { lat: displayCoord.lat, lng: displayCoord.lng },
        segmentIndex: 0,
        t: 0,
        distanceMeters: 0,
        cumulativeMeters,
      }),
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
  return {
    displayCoord: {
      lat: first.lat,
      lng: first.lng,
      heading: undefined,
      speedMps: undefined,
      accuracy: null,
      timestamp: now,
    },
    snapped: {
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
  };
}

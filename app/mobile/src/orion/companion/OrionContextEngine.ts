import type {
  OrionDriveContext,
  OrionDriveContextInput,
  OrionGuidanceInstructionSource,
  OrionStressLevel,
  OrionTimeOfDay,
  OrionTrafficLevel,
} from './types';
import { NAV_VOICE_IMMINENT_MAX_M } from './constants';

function deriveTimeOfDay(hour: number): OrionTimeOfDay {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

function normalizeTrafficLevel(raw?: string): OrionTrafficLevel {
  const v = (raw ?? '').trim().toLowerCase();
  if (v === 'light' || v === 'low') return 'light';
  if (v === 'moderate' || v === 'medium') return 'moderate';
  if (v === 'heavy') return 'heavy';
  if (v === 'severe' || v === 'critical') return 'severe';
  return 'unknown';
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function optionalFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeGuidanceInstructionSource(raw: unknown): OrionGuidanceInstructionSource {
  return raw === 'sdk' || raw === 'sdk_waiting' || raw === 'js' ? raw : 'unknown';
}

function tripGems(raw: OrionDriveContextInput): number {
  const tripGemsEarned = optionalFiniteNumber(raw.gemsEarnedThisTrip);
  if (tripGemsEarned != null) return tripGemsEarned;
  return finiteNumber(raw.gemsEarned, 0);
}

export function buildOrionDriveContext(raw: OrionDriveContextInput = {}): OrionDriveContext {
  const nowMs = raw.nowMs ?? Date.now();
  const hour = new Date(nowMs).getHours();
  return {
    isNavigating: Boolean(raw.isNavigating),
    speedMph: finiteNumber(raw.speedMph, 0),
    etaMinutes: optionalFiniteNumber(raw.etaMinutes),
    distanceMiles: optionalFiniteNumber(raw.distanceMiles),
    trafficLevel: raw.congestionNearManeuver
      ? 'heavy'
      : normalizeTrafficLevel(raw.trafficLevel),
    currentRoad: raw.currentRoad?.trim() || null,
    nextManeuver: raw.nextManeuver?.trim() || null,
    nextStepDistanceMeters: optionalFiniteNumber(raw.nextStepDistanceMeters),
    rerouteDetected: Boolean(raw.rerouteDetected),
    incidentNearby: Boolean(raw.incidentNearby),
    driveDurationMinutes: Math.max(0, finiteNumber(raw.driveDurationMinutes, 0)),
    gemsEarned: finiteNumber(raw.gemsEarned, 0),
    gemsEarnedThisTrip: tripGems(raw),
    timeOfDay: raw.timeOfDay ?? deriveTimeOfDay(hour),
    weather: raw.weather?.trim() || null,
    destination: raw.destination?.trim() || null,
    userName: raw.userName?.trim() || null,
    tripId: raw.tripId?.trim() || null,
    drivingMode: raw.drivingMode?.trim() || null,
    criticalTurnTransition: Boolean(raw.criticalTurnTransition),
    guidanceInstructionSource: normalizeGuidanceInstructionSource(raw.guidanceInstructionSource),
    guidanceStepIdentity: raw.guidanceStepIdentity?.trim() || null,
    nowMs,
  };
}

export function isImminentManeuver(ctx: OrionDriveContext): boolean {
  const d = ctx.nextStepDistanceMeters;
  return d != null && Number.isFinite(d) && d >= 0 && d <= NAV_VOICE_IMMINENT_MAX_M;
}

export function deriveOrionStressLevel(ctx: OrionDriveContext): OrionStressLevel {
  let score = 0;
  if (ctx.rerouteDetected) score += 2;
  if (ctx.incidentNearby) score += 2;
  if (isImminentManeuver(ctx)) score += 2;
  if (ctx.trafficLevel === 'heavy') score += 1;
  if (ctx.trafficLevel === 'severe') score += 2;
  if (score >= 3) return 'high';
  if (score >= 1) return 'medium';
  return 'low';
}

import type {
  OrionDriveContext,
  OrionDriveContextInput,
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

export function buildOrionDriveContext(raw: OrionDriveContextInput = {}): OrionDriveContext {
  const nowMs = raw.nowMs ?? Date.now();
  const hour = new Date(nowMs).getHours();
  return {
    isNavigating: Boolean(raw.isNavigating),
    speedMph: typeof raw.speedMph === 'number' && Number.isFinite(raw.speedMph) ? raw.speedMph : 0,
    etaMinutes:
      typeof raw.etaMinutes === 'number' && Number.isFinite(raw.etaMinutes) ? raw.etaMinutes : null,
    distanceMiles:
      typeof raw.distanceMiles === 'number' && Number.isFinite(raw.distanceMiles)
        ? raw.distanceMiles
        : null,
    trafficLevel: raw.congestionNearManeuver
      ? 'heavy'
      : normalizeTrafficLevel(raw.trafficLevel),
    currentRoad: raw.currentRoad?.trim() || null,
    nextManeuver: raw.nextManeuver?.trim() || null,
    nextStepDistanceMeters:
      typeof raw.nextStepDistanceMeters === 'number' && Number.isFinite(raw.nextStepDistanceMeters)
        ? raw.nextStepDistanceMeters
        : null,
    rerouteDetected: Boolean(raw.rerouteDetected),
    incidentNearby: Boolean(raw.incidentNearby),
    driveDurationMinutes:
      typeof raw.driveDurationMinutes === 'number' && Number.isFinite(raw.driveDurationMinutes)
        ? Math.max(0, raw.driveDurationMinutes)
        : 0,
    gemsEarned:
      typeof raw.gemsEarned === 'number' && Number.isFinite(raw.gemsEarned) ? raw.gemsEarned : 0,
    gemsEarnedThisTrip:
      typeof raw.gemsEarnedThisTrip === 'number' && Number.isFinite(raw.gemsEarnedThisTrip)
        ? raw.gemsEarnedThisTrip
        : typeof raw.gemsEarned === 'number' && Number.isFinite(raw.gemsEarned)
          ? raw.gemsEarned
          : 0,
    timeOfDay: raw.timeOfDay ?? deriveTimeOfDay(hour),
    weather: raw.weather?.trim() || null,
    destination: raw.destination?.trim() || null,
    userName: raw.userName?.trim() || null,
    tripId: raw.tripId?.trim() || null,
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

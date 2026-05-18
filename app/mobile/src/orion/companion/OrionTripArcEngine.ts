import type { OrionTripSession } from './OrionTripSession';
import type {
  OrionCompanionEventType,
  OrionDriveContext,
  OrionStressLevel,
  OrionTripPhase,
} from './types';

const OPENING_MAX_MINUTES = 4;

const PHASE_RANK: Record<OrionTripPhase, number> = {
  opening: 0,
  cruising: 1,
  stressed: 2,
  closing: 3,
};

export function deriveTripPhase(
  ctx: OrionDriveContext,
  stress: OrionStressLevel,
  event: OrionCompanionEventType,
  session: OrionTripSession,
): OrionTripPhase {
  if (event === 'arrival' || !ctx.isNavigating) return 'closing';
  if (event === 'reroute' || stress === 'high' || ctx.rerouteDetected) return 'stressed';
  if (stress === 'medium' && (event === 'heavy_traffic' || event === 'safety_caution')) {
    return 'stressed';
  }

  const mins = ctx.driveDurationMinutes;
  if (session.phase === 'opening' && mins < OPENING_MAX_MINUTES) return 'opening';

  return 'cruising';
}

/** Apply phase with monotonic rules: closing wins; stressed overrides cruising/opening. */
export function updateSessionPhase(
  session: OrionTripSession,
  next: OrionTripPhase,
  nowMs: number,
): void {
  const current = session.phase;
  if (next === 'closing') {
    session.phase = 'closing';
    session.lastPhaseChangeMs = nowMs;
    return;
  }
  if (current === 'closing') return;

  if (next === 'stressed') {
    session.phase = 'stressed';
    session.lastPhaseChangeMs = nowMs;
    return;
  }
  if (current === 'stressed' && next === 'cruising') {
    session.phase = 'cruising';
    session.lastPhaseChangeMs = nowMs;
    return;
  }

  if (PHASE_RANK[next] >= PHASE_RANK[current]) {
    session.phase = next;
    session.lastPhaseChangeMs = nowMs;
  }
}

export function markDriveStarted(session: OrionTripSession): void {
  session.flags.openedWithLine = true;
}

export function markSmoothDriveMentioned(session: OrionTripSession): void {
  session.flags.mentionedSmoothDrive = true;
}

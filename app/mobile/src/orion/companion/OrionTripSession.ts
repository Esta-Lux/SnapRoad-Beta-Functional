import type { OrionTripPhase } from './types';

export type OrionTripSessionFlags = {
  openedWithLine: boolean;
  mentionedSmoothDrive: boolean;
  mentionedHalfwayEta: boolean;
};

export type OrionTripSession = {
  tripId: string | null;
  startedAtMs: number;
  phase: OrionTripPhase;
  flags: OrionTripSessionFlags;
  lastPhaseChangeMs: number;
};

export function createOrionTripSession(tripId: string, nowMs: number): OrionTripSession {
  return {
    tripId,
    startedAtMs: nowMs,
    phase: 'opening',
    flags: {
      openedWithLine: false,
      mentionedSmoothDrive: false,
      mentionedHalfwayEta: false,
    },
    lastPhaseChangeMs: nowMs,
  };
}

export function resetOrionTripSessionState(session: OrionTripSession): void {
  session.tripId = null;
  session.startedAtMs = 0;
  session.phase = 'opening';
  session.flags.openedWithLine = false;
  session.flags.mentionedSmoothDrive = false;
  session.flags.mentionedHalfwayEta = false;
  session.lastPhaseChangeMs = 0;
}

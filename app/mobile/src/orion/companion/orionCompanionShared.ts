import { OrionMemoryEngine } from './OrionMemoryEngine';
import {
  createOrionTripSession,
  resetOrionTripSessionState,
  type OrionTripSession,
} from './OrionTripSession';

const memorySingleton = new OrionMemoryEngine();

const tripSession: OrionTripSession = {
  tripId: null,
  startedAtMs: 0,
  phase: 'opening',
  flags: {
    openedWithLine: false,
    mentionedSmoothDrive: false,
    mentionedHalfwayEta: false,
  },
  lastPhaseChangeMs: 0,
};

export function getOrionCompanionMemory(): OrionMemoryEngine {
  return memorySingleton;
}

export function getOrionTripSession(): OrionTripSession {
  return tripSession;
}

export function initOrionTripSession(tripId: string, nowMs: number = Date.now()): OrionTripSession {
  const next = createOrionTripSession(tripId, nowMs);
  tripSession.tripId = next.tripId;
  tripSession.startedAtMs = next.startedAtMs;
  tripSession.phase = next.phase;
  tripSession.flags = { ...next.flags };
  tripSession.lastPhaseChangeMs = next.lastPhaseChangeMs;
  return tripSession;
}

export function resetOrionTripSession(): void {
  resetOrionTripSessionState(tripSession);
}

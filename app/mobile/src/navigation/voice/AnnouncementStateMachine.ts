import type { AnnouncementThresholds } from '../config/announcementConfig';

export enum AnnouncementPhase {
  IDLE = 'idle',
  PRE_ANNOUNCED = 'pre_announced',
  ORION_SPOKEN = 'orion_spoken',
  IMMEDIATE_ANNOUNCED = 'immediate_announced',
  COMPLETED = 'completed',
}

export type ManeuverAnnouncementState = {
  stepIndex: number;
  phase: AnnouncementPhase;
  preAnnounceDistance: number;
  orionDistance: number;
  immediateDistance: number;
  lastAnnouncedAt: number;
};

export type AnnouncementCuePhase = 'pre' | 'orion' | 'immediate';

const DEBOUNCE_MS = 5000;

export function initialAnnouncementState(
  stepIndex: number,
  thresholds: AnnouncementThresholds,
): ManeuverAnnouncementState {
  return {
    stepIndex,
    phase: AnnouncementPhase.IDLE,
    preAnnounceDistance: thresholds.preAnnounce,
    orionDistance: thresholds.orion,
    immediateDistance: thresholds.immediate,
    lastAnnouncedAt: 0,
  };
}

export function resetAnnouncementState(
  state: ManeuverAnnouncementState | null,
  stepIndex: number,
  thresholds: AnnouncementThresholds,
): ManeuverAnnouncementState {
  if (!state || state.stepIndex !== stepIndex) {
    return initialAnnouncementState(stepIndex, thresholds);
  }
  return {
    ...state,
    preAnnounceDistance: thresholds.preAnnounce,
    orionDistance: thresholds.orion,
    immediateDistance: thresholds.immediate,
  };
}

export function nextAnnouncementCue(args: {
  state: ManeuverAnnouncementState;
  distanceMeters: number;
  nowMs: number;
  isNow?: boolean;
}): { state: ManeuverAnnouncementState; cue: AnnouncementCuePhase | null } {
  const { state, distanceMeters, nowMs, isNow } = args;
  if (nowMs - state.lastAnnouncedAt < DEBOUNCE_MS) {
    return { state, cue: null };
  }

  if (
    state.phase !== AnnouncementPhase.IMMEDIATE_ANNOUNCED &&
    state.phase !== AnnouncementPhase.COMPLETED &&
    (isNow || distanceMeters <= state.immediateDistance)
  ) {
    return {
      state: { ...state, phase: AnnouncementPhase.IMMEDIATE_ANNOUNCED, lastAnnouncedAt: nowMs },
      cue: 'immediate',
    };
  }

  if (state.phase === AnnouncementPhase.PRE_ANNOUNCED && distanceMeters <= state.orionDistance) {
    return {
      state: { ...state, phase: AnnouncementPhase.ORION_SPOKEN, lastAnnouncedAt: nowMs },
      cue: 'orion',
    };
  }

  if (state.phase === AnnouncementPhase.IDLE && distanceMeters <= state.preAnnounceDistance) {
    return {
      state: { ...state, phase: AnnouncementPhase.PRE_ANNOUNCED, lastAnnouncedAt: nowMs },
      cue: 'pre',
    };
  }

  return { state, cue: null };
}

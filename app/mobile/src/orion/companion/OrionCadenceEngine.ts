import { ADVISORY_SDK_HOLDOFF_MS, COMPANION_MIN_GAP_MS, EVENT_SPEAK_PROBABILITY } from './constants';
import { isImminentManeuver } from './OrionContextEngine';
import type { OrionMemoryEngine } from './OrionMemoryEngine';
import { getPersonalityKnobs } from './OrionPersonalityEngine';
import type {
  NavVoiceState,
  OrionCompanionEventType,
  OrionCompanionPriority,
  OrionDriveContext,
  OrionMood,
} from './types';

export type CadenceDecision = {
  allowed: boolean;
  reason?: string;
};

export type CadenceInput = {
  event: OrionCompanionEventType;
  ctx: OrionDriveContext;
  mood: OrionMood;
  priority: OrionCompanionPriority;
  memory: OrionMemoryEngine;
  navVoice: NavVoiceState;
  category: string;
  candidateMessage: string | null;
  /** Optional deterministic roll 0..1 for tests */
  speakRoll?: number;
};

function minGapForMood(mood: OrionMood): number {
  const freq = getPersonalityKnobs(mood).talkFrequency;
  const scale = 1.4 - freq * 0.5;
  return Math.round(COMPANION_MIN_GAP_MS * scale);
}

function isComplexRoadState(ctx: OrionDriveContext): boolean {
  return (
    ctx.rerouteDetected ||
    ctx.incidentNearby ||
    ctx.trafficLevel === 'heavy' ||
    ctx.trafficLevel === 'severe'
  );
}

function isWithinNavVoiceHoldoff(ctx: OrionDriveContext, navVoice: NavVoiceState): boolean {
  const holdoffMs = navVoice.advisorySdkHoldoffMs ?? ADVISORY_SDK_HOLDOFF_MS;
  return ctx.isNavigating && navVoice.msSinceLastSdkVoice < holdoffMs;
}

function violatesMinGap(
  memory: OrionMemoryEngine,
  nowMs: number,
  mood: OrionMood,
  complexRoadState: boolean,
): boolean {
  const lastAt = memory.lastSpokenAtMs();
  const stressScale = complexRoadState ? 1.6 : 1;
  const gap = Math.round(minGapForMood(mood) * stressScale);
  return lastAt > 0 && nowMs - lastAt < gap;
}

export function shouldSpeakNow(input: CadenceInput): CadenceDecision {
  const {
    event,
    ctx,
    mood,
    priority,
    memory,
    navVoice,
    category,
    candidateMessage,
    speakRoll = Math.random(),
  } = input;

  if (!candidateMessage?.trim()) {
    return { allowed: false, reason: 'no_message' };
  }

  const imminent = isImminentManeuver(ctx) || navVoice.imminentManeuver;
  if (imminent) {
    return { allowed: false, reason: 'imminent_maneuver' };
  }

  if (navVoice.guidanceSuppressed) {
    return { allowed: false, reason: 'guidance_suppressed' };
  }

  if (isWithinNavVoiceHoldoff(ctx, navVoice)) {
    return { allowed: false, reason: 'sdk_voice_holdoff' };
  }

  const nowMs = ctx.nowMs;
  const urgent = priority === 'urgent';
  const complexRoadState = isComplexRoadState(ctx);

  if (!urgent && ctx.criticalTurnTransition) {
    return { allowed: false, reason: 'critical_turn_transition' };
  }

  if (!urgent && complexRoadState && (event === 'smooth_drive' || mood === 'sassy')) {
    return { allowed: false, reason: 'complex_road_state' };
  }

  if (!urgent && violatesMinGap(memory, nowMs, mood, complexRoadState)) {
    return { allowed: false, reason: 'min_gap' };
  }

  if (!memory.canUseCategory(category, nowMs, urgent)) {
    return { allowed: false, reason: 'category_cooldown' };
  }

  if (memory.isDuplicateMessage(candidateMessage)) {
    return { allowed: false, reason: 'duplicate_message' };
  }

  const prob = EVENT_SPEAK_PROBABILITY[event] ?? 0.5;
  const adjusted = prob * (0.65 + getPersonalityKnobs(mood).talkFrequency * 0.5);
  if (!urgent && speakRoll > adjusted) {
    return { allowed: false, reason: 'probability_gate' };
  }

  return { allowed: true };
}

import { ADVISORY_SDK_HOLDOFF_MS, COMPANION_MIN_GAP_MS } from './constants';
import { isImminentManeuver } from './OrionContextEngine';
import type { OrionMemoryEngine } from './OrionMemoryEngine';
import { getPersonalityKnobs } from './OrionPersonalityEngine';
import type {
  NavVoiceState,
  OrionCompanionPriority,
  OrionDriveContext,
  OrionMood,
} from './types';

export type AdvisoryGateDecision = {
  allowed: boolean;
  reason?: string;
};

export function passesAdvisorySpeechGates(input: {
  ctx: OrionDriveContext;
  message: string;
  category: string;
  priority: OrionCompanionPriority;
  mood?: OrionMood;
  memory: OrionMemoryEngine;
  navVoice: NavVoiceState;
  voiceMuted?: boolean;
  /** Companion evaluate already passed cadence/memory — only nav-safety gates remain. */
  preApproved?: boolean;
}): AdvisoryGateDecision {
  const {
    ctx,
    message,
    category,
    priority,
    mood = 'calm',
    memory,
    navVoice,
    voiceMuted,
    preApproved = false,
  } = input;

  if (voiceMuted) return { allowed: false, reason: 'voice_muted' };
  if (!message.trim()) return { allowed: false, reason: 'no_message' };

  const urgent = priority === 'urgent';
  const inTurnWindow =
    navVoice.withinTurnVoiceWindow === true || navVoice.imminentManeuver || isImminentManeuver(ctx);
  if (!urgent && ctx.criticalTurnTransition) {
    return { allowed: false, reason: 'critical_turn_transition' };
  }
  if (inTurnWindow) return { allowed: false, reason: 'turn_voice_window' };

  if (navVoice.guidanceSuppressed) {
    return { allowed: false, reason: 'guidance_suppressed' };
  }

  if (
    ctx.isNavigating &&
    navVoice.msSinceLastSdkVoice < (navVoice.advisorySdkHoldoffMs ?? ADVISORY_SDK_HOLDOFF_MS)
  ) {
    return { allowed: false, reason: 'sdk_voice_holdoff' };
  }

  if (preApproved) {
    return { allowed: true };
  }

  const nowMs = ctx.nowMs;

  if (!urgent) {
    const freq = getPersonalityKnobs(mood).talkFrequency;
    const gap = Math.round(COMPANION_MIN_GAP_MS * (1.4 - freq * 0.5));
    const lastAt = memory.lastSpokenAtMs();
    if (lastAt > 0 && nowMs - lastAt < gap) {
      return { allowed: false, reason: 'min_gap' };
    }
  }

  if (!memory.canUseCategory(category, nowMs, urgent)) {
    return { allowed: false, reason: 'category_cooldown' };
  }

  if (memory.isDuplicateMessage(message)) {
    return { allowed: false, reason: 'duplicate_message' };
  }

  return { allowed: true };
}

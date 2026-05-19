import type {
  OrionCompanionEventType,
  OrionDriveContext,
  OrionMood,
  OrionStressLevel,
  OrionTripPhase,
  PersonalityKnobs,
} from './types';

const MOOD_KNOBS: Record<OrionMood, PersonalityKnobs> = {
  calm: {
    humorLevel: 0.15,
    maxWords: 14,
    sarcasmLevel: 0.05,
    supportiveness: 0.9,
    talkFrequency: 0.35,
  },
  witty: {
    humorLevel: 0.75,
    maxWords: 16,
    sarcasmLevel: 0.45,
    supportiveness: 0.55,
    talkFrequency: 0.55,
  },
  sassy: {
    humorLevel: 0.85,
    maxWords: 16,
    sarcasmLevel: 0.62,
    supportiveness: 0.5,
    talkFrequency: 0.6,
  },
  focused: {
    humorLevel: 0.1,
    maxWords: 12,
    sarcasmLevel: 0.05,
    supportiveness: 0.75,
    talkFrequency: 0.4,
  },
  hype: {
    humorLevel: 0.65,
    maxWords: 15,
    sarcasmLevel: 0.35,
    supportiveness: 0.65,
    talkFrequency: 0.65,
  },
  quiet: {
    humorLevel: 0.2,
    maxWords: 10,
    sarcasmLevel: 0.1,
    supportiveness: 0.7,
    talkFrequency: 0.25,
  },
};

function hashPick(seed: string, options: OrionMood[]): OrionMood {
  if (options.length === 0) return 'calm';
  if (options.length === 1) return options[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + (seed.codePointAt(i) ?? 0)) >>> 0;
  }
  return options[hash % options.length] ?? options[0];
}

export function getPersonalityKnobs(mood: OrionMood): PersonalityKnobs {
  return MOOD_KNOBS[mood];
}

function openingMood(ctx: OrionDriveContext, stressLevel: OrionStressLevel): OrionMood {
  if (stressLevel === 'low') {
    return hashPick(`${ctx.tripId}:open`, ['witty', 'sassy', 'focused', 'calm', 'hype']);
  }
  return hashPick(`${ctx.tripId}:open`, ['focused', 'calm']);
}

function smoothDriveMood(
  ctx: OrionDriveContext,
  stressLevel: OrionStressLevel,
  phase: OrionTripPhase,
): OrionMood {
  if (ctx.timeOfDay === 'night') return 'quiet';
  if (phase === 'cruising' && stressLevel === 'low') {
    return hashPick(`${ctx.tripId}:smooth_drive`, ['witty', 'sassy', 'hype', 'quiet']);
  }
  return hashPick(`${ctx.tripId}:smooth_drive`, ['witty', 'calm', 'focused', 'quiet']);
}

export function selectMood(
  ctx: OrionDriveContext,
  eventType: OrionCompanionEventType,
  stressLevel: OrionStressLevel,
  phase: OrionTripPhase = 'cruising',
): OrionMood {
  if (phase === 'stressed' || eventType === 'safety_caution' || stressLevel === 'high') {
    if (eventType === 'reroute') return 'focused';
    return hashPick(`${ctx.tripId}:${eventType}:stress`, ['calm', 'focused']);
  }
  if (phase === 'closing' || eventType === 'arrival') {
    return ctx.timeOfDay === 'night' ? 'quiet' : 'calm';
  }
  if (phase === 'opening' || eventType === 'drive_started') {
    return openingMood(ctx, stressLevel);
  }
  if (eventType === 'reroute') return 'focused';
  if (eventType === 'idle_checkin') return 'witty';
  if (eventType === 'long_drive') return 'calm';
  if (eventType === 'reward_earned') return 'hype';
  if (eventType === 'heavy_traffic') return 'focused';
  if (eventType === 'smooth_drive') {
    return smoothDriveMood(ctx, stressLevel, phase);
  }
  return 'calm';
}

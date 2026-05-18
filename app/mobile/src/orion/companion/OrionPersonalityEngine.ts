import type {
  OrionCompanionEventType,
  OrionDriveContext,
  OrionMood,
  OrionStressLevel,
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
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return options[hash % options.length] ?? options[0];
}

export function getPersonalityKnobs(mood: OrionMood): PersonalityKnobs {
  return MOOD_KNOBS[mood];
}

export function selectMood(
  ctx: OrionDriveContext,
  eventType: OrionCompanionEventType,
  stressLevel: OrionStressLevel,
): OrionMood {
  if (eventType === 'safety_caution' || stressLevel === 'high') {
    return eventType === 'reroute' ? 'focused' : 'calm';
  }
  if (eventType === 'reroute') return 'focused';
  if (eventType === 'arrival') {
    return ctx.timeOfDay === 'night' ? 'quiet' : 'calm';
  }
  if (eventType === 'idle_checkin') return 'witty';
  if (eventType === 'long_drive') return 'calm';
  if (eventType === 'reward_earned') return 'hype';
  if (eventType === 'heavy_traffic') return 'focused';
  if (eventType === 'smooth_drive') {
    if (ctx.timeOfDay === 'night') return 'quiet';
    return hashPick(`${ctx.tripId}:${eventType}`, ['witty', 'hype', 'quiet']);
  }
  if (eventType === 'drive_started') {
    return hashPick(`${ctx.tripId}:start`, ['focused', 'calm', 'witty']);
  }
  return 'calm';
}

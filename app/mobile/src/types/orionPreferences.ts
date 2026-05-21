import type { OrionMood } from '../orion/companion/types';

export type OrionChattiness = 'minimal' | 'balanced' | 'chatty';
export type OrionVoicePreference = 'device' | 'elevenlabs';
export type OrionMoodPreference = OrionMood | 'auto';

export type OrionPreferences = {
  mood: OrionMoodPreference;
  chattiness: OrionChattiness;
  auto_buddy: boolean;
  use_llm_buddy: boolean;
  voice: OrionVoicePreference;
};

export const ORION_PREFS_STORAGE_KEY = 'snaproad_orion_prefs';

export const DEFAULT_ORION_PREFERENCES: OrionPreferences = {
  mood: 'auto',
  chattiness: 'balanced',
  auto_buddy: true,
  use_llm_buddy: true,
  voice: 'device',
};

export const ORION_MOOD_OPTIONS: { key: OrionMoodPreference; label: string; hint: string }[] = [
  { key: 'auto', label: 'Auto', hint: 'Adapts to traffic & trip phase' },
  { key: 'calm', label: 'Calm', hint: 'Supportive & steady' },
  { key: 'witty', label: 'Witty', hint: 'Light humor, still safe' },
  { key: 'focused', label: 'Focused', hint: 'Direct & minimal' },
  { key: 'hype', label: 'Hype', hint: 'Upbeat energy' },
  { key: 'quiet', label: 'Quiet', hint: 'Speaks rarely' },
  { key: 'sassy', label: 'Sassy', hint: 'Playful SnapRoad tone' },
];

export const ORION_CHATTINESS_OPTIONS: { key: OrionChattiness; label: string }[] = [
  { key: 'minimal', label: 'Minimal' },
  { key: 'balanced', label: 'Balanced' },
  { key: 'chatty', label: 'Chatty' },
];

export function parseOrionPreferences(raw: unknown): OrionPreferences {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...DEFAULT_ORION_PREFERENCES };
  }
  const o = raw as Record<string, unknown>;
  const moodRaw = String(o.mood ?? 'auto').toLowerCase();
  const mood = (
    ORION_MOOD_OPTIONS.some((m) => m.key === moodRaw) ? moodRaw : 'auto'
  ) as OrionMoodPreference;
  const chatRaw = String(o.chattiness ?? 'balanced').toLowerCase();
  const chattiness = (
    ORION_CHATTINESS_OPTIONS.some((c) => c.key === chatRaw) ? chatRaw : 'balanced'
  ) as OrionChattiness;
  const voiceRaw = String(o.voice ?? 'device').toLowerCase();
  const voice: OrionVoicePreference = voiceRaw === 'elevenlabs' ? 'elevenlabs' : 'device';
  return {
    mood,
    chattiness,
    auto_buddy: o.auto_buddy !== false,
    use_llm_buddy: o.use_llm_buddy !== false,
    voice,
  };
}

export function orionPreferencesFromProfilePayload(pp: Record<string, unknown> | undefined): OrionPreferences {
  if (!pp) return { ...DEFAULT_ORION_PREFERENCES };
  const ap = pp.app_preferences;
  if (ap && typeof ap === 'object' && !Array.isArray(ap)) {
    const orion = (ap as Record<string, unknown>).orion;
    if (orion) return parseOrionPreferences(orion);
  }
  return { ...DEFAULT_ORION_PREFERENCES };
}

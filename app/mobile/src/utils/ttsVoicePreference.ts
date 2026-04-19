import type { Voice } from 'expo-speech';
import * as Speech from 'expo-speech';

/**
 * Prefer a male-sounding English TTS voice for navigation + Orion (`expo-speech`).
 *
 * Mapbox Navigation SDK (headless native) uses its own speech pipeline; it is not
 * configurable from JS in this app. On iOS/Android, system / engine TTS settings
 * may still affect that path.
 */

const MALE_NAME_HINTS = [
  'aaron',
  'fred',
  'tom',
  'nick',
  'gordon',
  'alex',
  'daniel',
  'arthur',
  'oliver',
  'james',
  'ralph',
  'rocko',
  'eddy',
  'albert',
  'david',
  'mark',
  'roger',
  'lee',
  'guy',
  'grandpa',
  'baritone',
  'male',
];

const FEMALE_NAME_HINTS = [
  'samantha',
  'victoria',
  'karen',
  'moira',
  'tessa',
  'zoe',
  'flo',
  'kate',
  'martha',
  'emma',
  'melissa',
  'susan',
  'nicky',
  'female',
  'siri',
];

let voiceLoadPromise: Promise<string | undefined> | null = null;

function scoreVoiceName(name: string): number {
  const n = name.toLowerCase();
  let s = 0;
  for (const h of MALE_NAME_HINTS) if (n.includes(h)) s += 10;
  for (const f of FEMALE_NAME_HINTS) if (n.includes(f)) s -= 10;
  return s;
}

/**
 * Pick best-effort male English voice from the device list.
 * Set `EXPO_PUBLIC_TTS_VOICE_IDENTIFIER` to a voice `identifier` from the device to force a voice.
 */
export function pickMaleEnglishVoiceIdentifier(voices: Voice[]): string | undefined {
  const forced = process.env.EXPO_PUBLIC_TTS_VOICE_IDENTIFIER?.trim();
  if (forced) {
    const byId = voices.find((v) => v.identifier === forced);
    if (byId) return byId.identifier;
    const byName = voices.find((v) => v.name === forced);
    if (byName) return byName.identifier;
  }

  const en = voices.filter((v) => typeof v.language === 'string' && /^en/i.test(v.language));
  if (!en.length) return undefined;

  const ranked = en
    .map((v) => ({ v, score: scoreVoiceName(v.name || '') }))
    .sort((a, b) => b.score - a.score);

  if (ranked[0]!.score > 0) return ranked[0]!.v.identifier;
  const nonNegative = ranked.filter((r) => r.score >= 0);
  if (nonNegative.length) return nonNegative[0]!.v.identifier;
  return undefined;
}

/** Cached promise so concurrent `speak` calls share one voice resolution. */
export function getPreferredTtsVoiceIdentifier(): Promise<string | undefined> {
  if (!voiceLoadPromise) {
    voiceLoadPromise = (async () => {
      try {
        const voices = await Speech.getAvailableVoicesAsync();
        return pickMaleEnglishVoiceIdentifier(voices);
      } catch {
        return undefined;
      }
    })();
  }
  return voiceLoadPromise;
}

/** Optional warm-up (e.g. after app load) so first cue does not await voice enumeration. */
export function preloadTtsVoicePreference(): void {
  void getPreferredTtsVoiceIdentifier();
}

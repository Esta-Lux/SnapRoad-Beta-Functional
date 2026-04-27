import type { Voice } from 'expo-speech';
import * as Speech from 'expo-speech';

/**
 * Prefer a clear US male / young-adult sounding TTS voice for navigation + Orion (`expo-speech`).
 *
 * Mapbox Navigation SDK (headless native) uses its own speech pipeline; it is not
 * configurable from JS in this app. On iOS/Android, system / engine TTS settings
 * may still affect that path.
 */

const MALE_NAME_HINTS = [
  'aaron',
  'alex',
  'evan',
  'nathan',
  'josh',
  'justin',
  'tyler',
  'ryan',
  'fred',
  'tom',
  'nick',
  'gordon',
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

const YOUNG_ADULT_NAME_HINTS = [
  'aaron',
  'alex',
  'evan',
  'nathan',
  'josh',
  'justin',
  'tyler',
  'ryan',
  'daniel',
  'oliver',
  'james',
];

const OLDER_NAME_HINTS = ['fred', 'ralph', 'grandpa', 'albert', 'arthur'];

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

function scoreVoice(v: Voice): number {
  const n = `${v.name || ''} ${v.identifier || ''}`.toLowerCase();
  const language = (v.language || '').toLowerCase();
  let s = 0;
  if (language === 'en-us') s += 80;
  else if (language.startsWith('en-us')) s += 70;
  else if (language.startsWith('en')) s += 12;
  else s -= 80;
  if (String(v.quality).toLowerCase().includes('enhanced')) s += 14;
  for (const h of MALE_NAME_HINTS) if (n.includes(h)) s += 10;
  for (const h of YOUNG_ADULT_NAME_HINTS) if (n.includes(h)) s += 7;
  for (const h of OLDER_NAME_HINTS) if (n.includes(h)) s -= 5;
  for (const f of FEMALE_NAME_HINTS) if (n.includes(f)) s -= 10;
  return s;
}

/**
 * Pick best-effort clear US male voice from the device list.
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
    .map((v) => ({ v, score: scoreVoice(v) }))
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.v.identifier;
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

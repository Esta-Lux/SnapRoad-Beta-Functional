import type { Voice } from 'expo-speech';
import * as Speech from 'expo-speech';

/**
 * Single US-male English preference for **all** Expo Speech output (Orion replies, advisory cues,
 * JS turn-by-turn via {@link ../utils/voice.speakGuidance}, repeat-last, etc.).
 *
 * Set `EXPO_PUBLIC_TTS_VOICE_IDENTIFIER` to a voice `identifier` from the device to force.
 */

const MALE_NAME_HINTS = [
  'aaron',
  'evan',
  'nathan',
  'alex',
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

const CLEAR_DEFAULT_NAME_PRIORITY = [
  'nathan',
  'evan',
  'aaron',
  'alex',
  'josh',
  'justin',
  'tyler',
  'ryan',
  'oliver',
  'james',
  'daniel',
] as const;

const YOUNG_ADULT_NAME_HINTS = [
  'nathan',
  'evan',
  'aaron',
  'alex',
  'josh',
  'justin',
  'tyler',
  'ryan',
  'daniel',
  'oliver',
  'james',
];

const OLDER_NAME_HINTS = ['fred', 'ralph', 'grandpa', 'albert', 'arthur', 'rocko', 'eddy', 'tom'];

const BUILT_IN_ROBOTIC_HINTS = ['boing', 'bells', 'bubbles', 'cellos', 'deranged', 'hysterical', 'junior', 'whisper', 'zarvox'];

const ACCENTED_OR_HARD_TO_HEAR_HINTS = [
  // Common non-US English voices exposed by iOS / Android engines.
  'daniel',
  'moira',
  'tessa',
  'karen',
  'serena',
  'veena',
  'rishi',
  'arthur',
  'martha',
  'gordon',
  'oliver',
  'lee',
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

function scoreVoice(v: Voice): number {
  const n = `${v.name || ''} ${v.identifier || ''}`.toLowerCase();
  const language = (v.language || '').toLowerCase();
  const quality = String(v.quality || '').toLowerCase();
  let s = 0;
  if (language === 'en-us') s += 120;
  else if (language.startsWith('en-us')) s += 95;
  else if (language.startsWith('en')) s -= 45;
  else s -= 80;
  if (quality.includes('enhanced')) s += 22;
  if (quality.includes('premium')) s += 28;
  const priorityIndex = CLEAR_DEFAULT_NAME_PRIORITY.findIndex((h) => n.includes(h));
  if (priorityIndex >= 0) s += 80 - priorityIndex * 4;
  for (const h of MALE_NAME_HINTS) if (n.includes(h)) s += 18;
  for (const h of YOUNG_ADULT_NAME_HINTS) if (n.includes(h)) s += 16;
  for (const h of OLDER_NAME_HINTS) if (n.includes(h)) s -= 34;
  for (const h of ACCENTED_OR_HARD_TO_HEAR_HINTS) if (n.includes(h) && language !== 'en-us') s -= 45;
  for (const f of FEMALE_NAME_HINTS) if (n.includes(f)) s -= 55;
  for (const h of BUILT_IN_ROBOTIC_HINTS) if (n.includes(h)) s -= 120;
  if (n.includes('compact')) s -= 20;
  if (n.includes('premium')) s += 18;
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

/** Cached promise so concurrent `Speech.speak` calls share one voice resolution. */
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

/** Optional warm-up so first cue does not await voice enumeration. */
export function preloadTtsVoicePreference(): void {
  void getPreferredTtsVoiceIdentifier();
}

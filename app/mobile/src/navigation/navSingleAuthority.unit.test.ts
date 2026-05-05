/**
 * Single-authority invariant tests for the hybrid navigation pipeline.
 *
 * These tests protect the core architecture rule in `docs/NATIVE_NAVIGATION.md`:
 *   - When the logic SDK is enabled and the trip is authoritative, JS must not emit turn-
 *     by-turn TTS (`navigation_fixed` rate source).
 *   - `advisory` lines (offer, incident) are held off for a short window after a native
 *     voice cue so the two audio streams don't overlap.
 *   - User-initiated repeat (`forceAllowDuringSdk`) bypasses the authoritative guard.
 *   - `speakGuidance` is a hard no-op during authoritative SDK trips.
 *
 * These are pure store / function tests — no `expo-speech` is exercised; we stub the
 * React Native native modules at require-time so `voice.ts` loads cleanly.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import Module from 'node:module';

process.env.EXPO_PUBLIC_NAV_LOGIC_SDK = '1';
process.env.EXPO_PUBLIC_NAV_NATIVE_SDK = '1';

/** Shared `expo-speech` stub so tests can observe (non-)calls. */
const speechStub: { speak: (...args: unknown[]) => void; stop: () => void } = {
  speak: () => {},
  stop: () => {},
};
const audioStub = {
  setAudioModeAsync: async () => {},
};
const moduleStubs: Record<string, unknown> = {
  'expo-speech': speechStub,
  'expo-av': {
    Audio: audioStub,
    InterruptionModeIOS: { DoNotMix: 0, DuckOthers: 1, MixWithOthers: 2 },
    InterruptionModeAndroid: { DoNotMix: 0, DuckOthers: 1 },
  },
  'expo-constants': {
    default: {
      expoConfig: {
        extra: {
          EXPO_PUBLIC_NAV_LOGIC_SDK: '1',
          EXPO_PUBLIC_NAV_NATIVE_SDK: '1',
        },
      },
    },
  },
  'react-native': {
    Platform: { OS: 'ios', select: (o: Record<string, unknown>) => o.ios ?? o.default },
  },
};

// Patch `Module._load` so `require('expo-speech')` / `require('expo-av')` short-circuit to
// our stubs before the transpiled CJS loader tries to read a file.
const modProto = Module as unknown as {
  _load: (req: string, parent: unknown, isMain: boolean) => unknown;
};
const origLoad = modProto._load;
modProto._load = function patched(request: string, parent: unknown, isMain: boolean) {
  if (Object.prototype.hasOwnProperty.call(moduleStubs, request)) {
    return moduleStubs[request];
  }
  return origLoad.call(this, request, parent, isMain);
};

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const voiceMod = require('../utils/voice') as typeof import('../utils/voice');
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const storeMod = require('./navSdkStore') as typeof import('./navSdkStore');
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const guardMod = require('./navSdkAuthority') as typeof import('./navSdkAuthority');

const { formatTurnInstruction, getTtsSpeechProfile, getVoiceDevCounters, resetVoiceDevCounters, speak, speakGuidance } = voiceMod;
const { resetNavSdkState, ingestSdkProgress, ingestSdkVoiceSubtitle, getNavSdkState } = storeMod;
const { isSdkTripAuthoritative } = guardMod;

function makeAuthoritative() {
  ingestSdkProgress({
    distanceRemaining: 1000,
    distanceTraveled: 0,
    durationRemaining: 60,
    fractionTraveled: 0,
  });
}

test('speak(rateSource: navigation_fixed) is blocked during authoritative SDK trip', () => {
  resetNavSdkState();
  resetVoiceDevCounters();
  makeAuthoritative();
  assert.equal(isSdkTripAuthoritative(), true);
  speak('turn right now', 'high', 'adaptive', { rateSource: 'navigation_fixed' });
  const c = getVoiceDevCounters();
  assert.equal(c.navigationFixedBlocked, 1, 'navigation_fixed JS speech must be blocked');
});

test('speak(rateSource: navigation_fixed, forceAllowDuringSdk) bypasses the guard (user repeat)', () => {
  resetNavSdkState();
  resetVoiceDevCounters();
  makeAuthoritative();
  speak('turn right now', 'high', 'adaptive', {
    rateSource: 'navigation_fixed',
    forceAllowDuringSdk: true,
  });
  const c = getVoiceDevCounters();
  assert.equal(c.navigationFixedBlocked, 0, 'user-initiated repeat must not be counted as blocked');
});

test('speak(rateSource: advisory) is held off for 3s after a native voice cue, then plays', () => {
  resetNavSdkState();
  resetVoiceDevCounters();
  makeAuthoritative();
  // Native TTS just spoke — advisory must defer.
  ingestSdkVoiceSubtitle('In 500 feet, turn right on Main Street.');
  speak('SnapRoad offer nearby — Dunkin Donuts.', 'normal', 'adaptive', { rateSource: 'advisory' });
  let c = getVoiceDevCounters();
  assert.equal(c.advisorySuppressed, 1, 'advisory must be held off while native just spoke');
  assert.equal(c.advisorySpoken, 0);

  // Rewind the native voice timestamp > 3s to simulate the hold-off expiring.
  const st = getNavSdkState() as unknown as { lastVoiceInstructionAtMs: number };
  st.lastVoiceInstructionAtMs = Date.now() - 4000;

  speak('SnapRoad offer nearby — Target.', 'normal', 'adaptive', { rateSource: 'advisory' });
  c = getVoiceDevCounters();
  assert.equal(c.advisorySpoken, 1, 'advisory must play after the hold-off window');
  assert.equal(c.advisorySuppressed, 1, 'earlier suppressed count stays');
});

test('speakGuidance is a no-op during an authoritative SDK trip', () => {
  resetNavSdkState();
  resetVoiceDevCounters();
  makeAuthoritative();

  let speakCalled = 0;
  const origSpeak = speechStub.speak;
  speechStub.speak = () => {
    speakCalled += 1;
  };
  try {
    speakGuidance('In 200 feet, turn left.', 'adaptive', 'en-US');
    assert.equal(speakCalled, 0, 'speakGuidance must not fire TTS while SDK owns turn voice');
  } finally {
    speechStub.speak = origSpeak;
  }
});

test('advisory line plays immediately when SDK has never spoken yet', () => {
  resetNavSdkState();
  resetVoiceDevCounters();
  makeAuthoritative();
  // No ingestSdkVoiceSubtitle call — `msSinceLastSdkVoice()` should be Infinity.
  speak('offer nearby', 'normal', 'adaptive', { rateSource: 'advisory' });
  const c = getVoiceDevCounters();
  assert.equal(c.advisorySuppressed, 0, 'no hold-off when native has not spoken yet');
  assert.equal(c.advisorySpoken, 1);
});

test('formatTurnInstruction strips street and shield names from spoken guidance', () => {
  const phrase = formatTurnInstruction(
    'Turn left onto Silver Dust Lane',
    150,
    'left',
    'adaptive',
    [],
    null,
    {
      kind: 'turn_left',
      destinationRoad: 'Silver Dust Lane',
      shields: [{ displayRef: 'I-75' }],
    },
  );
  assert.match(phrase.toLowerCase(), /turn left/);
  assert.doesNotMatch(phrase, /Silver Dust Lane|I-75/);
});

test('HUD and Orion speech profiles use normal-rate clear US male-style settings', () => {
  const calm = getTtsSpeechProfile('calm');
  const adaptive = getTtsSpeechProfile('adaptive');
  const sport = getTtsSpeechProfile('sport');

  assert.equal(calm.language, 'en-US');
  assert.equal(adaptive.language, 'en-US');
  assert.equal(sport.language, 'en-US');
  assert.equal(calm.rate, 1.06);
  assert.equal(adaptive.rate, 1.06);
  assert.equal(sport.rate, 1.06);
  assert.equal(calm.pitch, 0.98);
  assert.equal(adaptive.pitch, calm.pitch);
  assert.equal(sport.pitch, calm.pitch);
  assert.ok(sport.rate <= 1.08);
});

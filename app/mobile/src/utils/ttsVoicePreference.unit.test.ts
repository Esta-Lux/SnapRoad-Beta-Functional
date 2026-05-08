import assert from 'node:assert/strict';
import { test } from 'node:test';
import Module from 'node:module';

const moduleStubs: Record<string, unknown> = {
  'expo-speech': {
    getAvailableVoicesAsync: async () => [],
  },
};

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
const { pickMaleEnglishVoiceIdentifier } = require('./ttsVoicePreference') as typeof import('./ttsVoicePreference');

test('prefers the branded US male voice over slower or non-US fallback voices', () => {
  const id = pickMaleEnglishVoiceIdentifier([
    { identifier: 'com.apple.ttsbundle.Samantha-compact', name: 'Samantha', language: 'en-US', quality: 'Enhanced' },
    { identifier: 'com.apple.ttsbundle.Daniel-compact', name: 'Daniel', language: 'en-GB', quality: 'Enhanced' },
    { identifier: 'com.apple.ttsbundle.Aaron-premium', name: 'Aaron', language: 'en-US', quality: 'Enhanced' },
    { identifier: 'com.apple.speech.synthesis.voice.Alex', name: 'Alex', language: 'en-US', quality: 'Enhanced' },
  ] as never);

  assert.equal(id, 'com.apple.ttsbundle.Aaron-premium');
});

test('keeps Aaron as a fallback when clearer male voices are unavailable', () => {
  const id = pickMaleEnglishVoiceIdentifier([
    { identifier: 'com.apple.ttsbundle.Samantha-compact', name: 'Samantha', language: 'en-US', quality: 'Enhanced' },
    { identifier: 'com.apple.ttsbundle.Daniel-compact', name: 'Daniel', language: 'en-GB', quality: 'Enhanced' },
    { identifier: 'com.apple.ttsbundle.Aaron-premium', name: 'Aaron', language: 'en-US', quality: 'Enhanced' },
  ] as never);

  assert.equal(id, 'com.apple.ttsbundle.Aaron-premium');
});

test('honors forced TTS voice identifier when available', () => {
  const prev = process.env.EXPO_PUBLIC_TTS_VOICE_IDENTIFIER;
  process.env.EXPO_PUBLIC_TTS_VOICE_IDENTIFIER = 'forced-us-male';
  try {
    const id = pickMaleEnglishVoiceIdentifier([
      { identifier: 'forced-us-male', name: 'Custom Male', language: 'en-US', quality: 'Default' },
      { identifier: 'aaron', name: 'Aaron', language: 'en-US', quality: 'Enhanced' },
    ] as never);
    assert.equal(id, 'forced-us-male');
  } finally {
    if (prev == null) delete process.env.EXPO_PUBLIC_TTS_VOICE_IDENTIFIER;
    else process.env.EXPO_PUBLIC_TTS_VOICE_IDENTIFIER = prev;
  }
});

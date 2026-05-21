import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  formatSdkNavigationVoiceCue,
  navigationVoiceCueBucket,
  navigationVoiceCueKey,
  shouldSpeakTurnVoiceCue,
} from './navVoiceCuePolicy';

test('navigationVoiceCueBucket only allows 0.2 mile and close cues', () => {
  assert.equal(navigationVoiceCueBucket(400), null);
  assert.equal(navigationVoiceCueBucket(322), 'advance');
  assert.equal(navigationVoiceCueBucket(89), 'advance');
  assert.equal(navigationVoiceCueBucket(88), 'imminent');
});

test('navigationVoiceCueKey dedupes per leg, step, and bucket', () => {
  const a = navigationVoiceCueKey({ legIndex: 0, stepIndex: 3, bucket: 'advance' });
  const b = navigationVoiceCueKey({ legIndex: 0, stepIndex: 3, bucket: 'advance' });
  const c = navigationVoiceCueKey({ legIndex: 0, stepIndex: 3, bucket: 'imminent' });
  assert.equal(a, b);
  assert.notEqual(a, c);
});

test('formatSdkNavigationVoiceCue keeps imminent cue short without personality', () => {
  const out = formatSdkNavigationVoiceCue({
    text: 'In 200 feet, turn left onto Main Street.',
    bucket: 'imminent',
    kind: 'turn_left',
    seed: '0|3',
    userName: 'Ryan Ahmed',
  });
  assert.equal(out, 'Turn left.');
  assert.doesNotMatch(out, /villain|drama|refunds|Main Street/i);
});

test('shouldSpeakTurnVoiceCue allows advance only (one Orion line per maneuver)', () => {
  assert.equal(shouldSpeakTurnVoiceCue('advance'), true);
  assert.equal(shouldSpeakTurnVoiceCue('imminent'), false);
  assert.equal(shouldSpeakTurnVoiceCue(null), false);
});

test('formatSdkNavigationVoiceCue prepends personality on advance only', () => {
  const out = formatSdkNavigationVoiceCue({
    text: 'In 800 feet, turn left onto Main Street.',
    bucket: 'advance',
    kind: 'turn_left',
    seed: '0|3|advance',
    userName: 'Ryan Ahmed',
  });
  assert.ok(out.length > 'In 800 feet, turn left onto Main Street.'.length);
  assert.match(out, /In 800 feet, turn left onto Main Street\.$/);
});

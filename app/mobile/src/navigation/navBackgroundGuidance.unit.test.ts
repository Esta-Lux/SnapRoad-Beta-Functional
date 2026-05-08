import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { NavigationProgress } from './navModel';
import {
  backgroundTurnGuidanceKey,
  buildBackgroundTurnNotificationContent,
} from './navBackgroundGuidance';

function progress(overrides: Partial<NavigationProgress> = {}): NavigationProgress {
  return {
    remainingDistance: 1000,
    remainingDuration: 300,
    currentStepIndex: 0,
    nextStepDistanceMeters: 120,
    snapped: { lat: 40, lng: -83, segmentIndex: 0, distanceToRoute: 0, fraction: 0.2 },
    isOffRoute: false,
    instructionSource: 'js',
    banner: {
      primaryInstruction: 'Turn right on Summit Street',
      secondaryInstruction: 'Then continue for half a mile',
      maneuverKind: 'turn_right',
    },
    nextStep: {
      index: 1,
      instruction: 'Turn right on Summit Street',
      distanceMeters: 120,
      durationSeconds: 20,
      maneuver: 'right',
      lat: 40.001,
      lng: -83.001,
      name: 'Summit Street',
      kind: 'turn_right',
      rawType: 'turn',
      rawModifier: 'right',
      lanes: [],
      shields: [],
      signal: null,
      roundaboutExitNumber: null,
      voiceAnnouncement: null,
    },
    currentStep: null,
    followingStep: null,
    ...overrides,
  } as NavigationProgress;
}

test('buildBackgroundTurnNotificationContent returns a gray-card style turn prompt near maneuvers', () => {
  const content = buildBackgroundTurnNotificationContent(progress());
  assert.ok(content);
  assert.match(content.title, /^SnapRoad turn/);
  assert.match(content.title, /ft/i);
  assert.match(content.body, /Turn right on Summit Street/);
  assert.match(content.body, /Then continue/);
});

test('buildBackgroundTurnNotificationContent skips far-away turns', () => {
  assert.equal(buildBackgroundTurnNotificationContent(progress({ nextStepDistanceMeters: 900 })), null);
});

test('backgroundTurnGuidanceKey is stable for the same maneuver', () => {
  const a = backgroundTurnGuidanceKey(progress({ nativeStepIdentity: { legIndex: 0, stepIndex: 4 } }));
  const b = backgroundTurnGuidanceKey(progress({ nativeStepIdentity: { legIndex: 0, stepIndex: 4 }, nextStepDistanceMeters: 60 }));
  assert.equal(a, b);
});

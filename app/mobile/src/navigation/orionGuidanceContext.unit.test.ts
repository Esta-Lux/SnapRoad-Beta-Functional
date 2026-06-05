import assert from 'node:assert/strict';
import test from 'node:test';
import type { DirectionsStep } from '../lib/directions';
import type { NavigationProgress } from './navModel';
import { buildOrionGuidanceRouteSnapshot } from './orionGuidanceContext';

const restStep = (instruction: string, distanceMeters = 100): DirectionsStep => ({
  instruction,
  distance: `${distanceMeters} m`,
  distanceMeters,
  duration: '1 min',
  durationSeconds: 60,
  maneuver: 'turn',
  lat: 1,
  lng: 2,
});

const sdkProgress = (overrides: Partial<NavigationProgress> = {}): NavigationProgress =>
  ({
    instructionSource: 'sdk',
    nextStepDistanceMeters: 120,
    banner: {
      primaryInstruction: 'Turn left onto Native Ave',
      primaryDistanceMeters: 120,
      primaryStreet: 'Native Ave',
      secondaryInstruction: 'Then keep right',
    },
    nextStep: {
      index: 4,
      displayInstruction: 'SDK fallback turn',
      instruction: 'SDK fallback turn',
      streetName: 'Native Ave',
    },
    followingStep: {
      index: 5,
      displayInstruction: 'Continue on Bridge St',
      instruction: 'Continue on Bridge St',
      streetName: 'Bridge St',
    },
    nativeStepIdentity: { legIndex: 1, stepIndex: 4 },
    ...overrides,
  }) as NavigationProgress;

test('Orion guidance snapshot prefers SDK/native guidance over REST rows during SDK trips', () => {
  const snap = buildOrionGuidanceRouteSnapshot({
    progress: sdkProgress(),
    fallbackSteps: [
      restStep('REST current should not win'),
      restStep('REST next should not win'),
    ],
    currentStepIndex: 0,
  });

  assert.equal(snap.guidanceInstructionSource, 'sdk');
  assert.equal(snap.currentRoad, 'Turn left onto Native Ave');
  assert.equal(snap.nextManeuver, 'Then keep right');
  assert.equal(snap.nextStepDistanceMeters, 120);
  assert.equal(snap.guidanceStepIdentity, '1:4');
});

test('Orion guidance snapshot falls back to REST rows while SDK is waiting', () => {
  const snap = buildOrionGuidanceRouteSnapshot({
    progress: sdkProgress({
      instructionSource: 'sdk_waiting',
      nextStepDistanceMeters: 0,
      banner: null,
      nextStep: null,
      followingStep: null,
      nativeStepIdentity: undefined,
    }),
    fallbackSteps: [
      restStep('Head north on Mission St', 200),
      restStep('Turn right onto Market St', 400),
    ],
    currentStepIndex: 0,
  });

  assert.equal(snap.guidanceInstructionSource, 'sdk_waiting');
  assert.equal(snap.currentRoad, 'Head north on Mission St');
  assert.equal(snap.nextManeuver, 'Turn right onto Market St');
  assert.equal(snap.nextStepDistanceMeters, 400);
});

test('Orion guidance snapshot marks critical windows for step changes and near maneuvers', () => {
  const changed = buildOrionGuidanceRouteSnapshot({
    progress: sdkProgress(),
    previousGuidanceStepIdentity: '1:3',
  });
  const near = buildOrionGuidanceRouteSnapshot({
    progress: sdkProgress({ nextStepDistanceMeters: 300 }),
  });
  const far = buildOrionGuidanceRouteSnapshot({
    progress: sdkProgress({ nextStepDistanceMeters: 600 }),
  });

  assert.equal(changed.criticalTurnTransition, true);
  assert.equal(near.criticalTurnTransition, true);
  assert.equal(far.criticalTurnTransition, false);
});

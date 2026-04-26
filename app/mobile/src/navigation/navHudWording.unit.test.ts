import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildNavBanner } from './navBanner';
import { hudPhraseForManeuverKind } from './spokenManeuver';
import { buildActivePrimary, buildChainInstruction } from './turnCardModel';
import { minimalNavStep } from './__tests__/navStepTestFixtures';

test('turn banner uses action wording while keeping road as visual context', () => {
  const left = minimalNavStep({
    index: 1,
    segmentIndex: 0,
    kind: 'turn_left',
    distanceMetersFromStart: 100,
    distanceMetersToNext: 48,
    durationSeconds: 12,
    displayInstruction: 'Turn left onto Silver Dust Lane',
    instruction: 'Turn left onto Silver Dust Lane',
    streetName: 'Silver Dust Lane',
  });
  const right = minimalNavStep({
    index: 2,
    segmentIndex: 1,
    kind: 'turn_right',
    distanceMetersFromStart: 160,
    distanceMetersToNext: 60,
    durationSeconds: 10,
    displayInstruction: 'Turn right onto Cactus Road',
    instruction: 'Turn right onto Cactus Road',
    streetName: 'Cactus Road',
  });

  const banner = buildNavBanner(left, right, 48);

  assert.equal(banner?.primaryInstruction, 'Turn left');
  assert.equal(banner?.primaryStreet, 'Silver Dust Lane');
  assert.equal(banner?.secondaryInstruction, 'Then turn right');
  assert.doesNotMatch(banner?.primaryInstruction ?? '', /Silver Dust Lane/);
  assert.doesNotMatch(banner?.secondaryInstruction ?? '', /Cactus Road/);
});

test('active HUD primary and chained turn text stay aligned with spoken maneuver phrase', () => {
  const step = minimalNavStep({
    index: 1,
    segmentIndex: 0,
    kind: 'turn_left',
    distanceMetersFromStart: 100,
    distanceMetersToNext: 50,
    durationSeconds: 12,
    displayInstruction: 'Turn left onto Silver Dust Lane',
    instruction: 'Turn left onto Silver Dust Lane',
    streetName: 'Silver Dust Lane',
    nextManeuverKind: 'turn_right',
    nextManeuverStreet: 'Cactus Road',
    nextManeuverDistanceMeters: 80,
  });

  assert.equal(buildActivePrimary(null, null, step), 'Turn left');
  assert.equal(buildChainInstruction(step), 'Then turn right');
});

test('roundabout exit wording is shared by HUD and voice action phrase', () => {
  assert.equal(hudPhraseForManeuverKind('roundabout_right', 2), 'Take the second exit');

  const step = minimalNavStep({
    index: 1,
    segmentIndex: 0,
    kind: 'roundabout_right',
    distanceMetersFromStart: 100,
    distanceMetersToNext: 50,
    durationSeconds: 12,
    roundaboutExitNumber: 2,
    displayInstruction: 'At the roundabout, take the second exit onto Loop Road',
    instruction: 'At the roundabout, take the second exit onto Loop Road',
    streetName: 'Loop Road',
  });

  assert.equal(buildActivePrimary(null, null, step), 'Take the second exit');
});

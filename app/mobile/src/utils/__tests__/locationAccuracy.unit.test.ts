import test from 'node:test';
import assert from 'node:assert/strict';
import {
  accuracyQualityFactor,
  plausibleMaxStepMeters,
  shouldHoldBlendForOutlierStep,
  headingDeltaDeg,
  extrapolateForDisplay,
  coordinateSeparationMeters,
} from '../locationAccuracy';

test('accuracyQualityFactor degrades with poor horizontal accuracy', () => {
  assert.equal(accuracyQualityFactor(null), 1);
  assert.equal(accuracyQualityFactor(10), 1);
  assert.ok(accuracyQualityFactor(50) < accuracyQualityFactor(20));
  assert.ok(accuracyQualityFactor(100) < 0.4);
});

test('plausibleMaxStepMeters grows with speed and dt', () => {
  const a = plausibleMaxStepMeters(0, 1, true, 20);
  const b = plausibleMaxStepMeters(60, 1, true, 20);
  assert.ok(b > a);
  const c = plausibleMaxStepMeters(60, 2, true, 20);
  assert.ok(c >= b);
});

test('shouldHoldBlendForOutlierStep flags teleports at low speed', () => {
  assert.equal(shouldHoldBlendForOutlierStep(400, 3, 30), true);
  assert.equal(shouldHoldBlendForOutlierStep(40, 30, 60), false);
});

test('headingDeltaDeg wraps', () => {
  assert.equal(headingDeltaDeg(350, 10), 20);
  assert.equal(headingDeltaDeg(90, 90), 0);
});

test('extrapolateForDisplay returns same coord when slow or turning', () => {
  const c = { lat: 40.7, lng: -74.0 };
  assert.deepEqual(extrapolateForDisplay(c, 90, 10, 0.65, true, 90), c);
  assert.deepEqual(extrapolateForDisplay(c, 90, 55, 0.65, true, 200), c);
});

test('extrapolateForDisplay moves ahead when fast and stable heading', () => {
  const c = { lat: 40.7, lng: -74.0 };
  const out = extrapolateForDisplay(c, 90, 65, 0.65, true, 88);
  assert.ok(coordinateSeparationMeters(c, out) > 4);
  assert.ok(coordinateSeparationMeters(c, out) <= 40);
});

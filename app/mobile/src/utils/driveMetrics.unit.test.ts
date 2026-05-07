import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  avgSpeedMph,
  estimateFuelCostUsd,
  estimateFuelGallons,
  estimateMileageDeductionUsd,
  formatUsd,
  sanitizeTripAverageSpeedMph,
  sanitizeTripDistanceMiles,
  sanitizeTripSpeedMph,
} from './driveMetrics';

test('avgSpeedMph uses miles and elapsed seconds', () => {
  assert.equal(avgSpeedMph(30, 3600), 30);
  assert.equal(avgSpeedMph(12, 1800), 24);
  assert.equal(avgSpeedMph(12, 0), 0);
});

test('trip speed sanitizers reject impossible GPS spikes', () => {
  assert.equal(sanitizeTripSpeedMph(300), 160);
  assert.equal(sanitizeTripSpeedMph(-12), 0);
  assert.equal(sanitizeTripDistanceMiles(10, 120, 72), 2.4);
  assert.equal(sanitizeTripAverageSpeedMph(10, 120, 72), 72);
  assert.equal(sanitizeTripAverageSpeedMph(10, 120), 130);
});

test('fuel and service mileage estimates are bounded and deterministic', () => {
  assert.equal(estimateFuelGallons(50, 25), 2);
  assert.equal(estimateFuelCostUsd(50, 25, 3.5), 7);
  assert.equal(estimateMileageDeductionUsd(10, 0.67), 6.7);
  assert.equal(estimateFuelGallons(50, 0), 0);
});

test('formatUsd keeps small costs useful and larger costs compact', () => {
  assert.equal(formatUsd(4.25), '$4.25');
  assert.equal(formatUsd(12.1), '$12');
});

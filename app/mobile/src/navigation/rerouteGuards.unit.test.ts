import test from 'node:test';
import assert from 'node:assert/strict';

import { shouldCountRerouteCandidate } from './rerouteGuards';

const highway = [
  { lat: 40.0, lng: -83.0 },
  { lat: 40.02, lng: -83.0 },
  { lat: 40.04, lng: -83.0 },
];

test('reroute candidate debounce ignores ramp-like samples still aligned with the highway', () => {
  const current = { lat: 40.01, lng: -82.99935 };
  const previous = { lat: 40.009, lng: -82.99935 };
  assert.equal(
    shouldCountRerouteCandidate({
      current,
      previous,
      route: highway,
      lateralMeters: 62,
      thresholdMeters: 52,
      speedMps: 22,
      courseDeg: 2,
    }),
    false,
  );
});

test('reroute candidate counts when the user is clearly diverging from route bearing', () => {
  const current = { lat: 40.01, lng: -82.99935 };
  const previous = { lat: 40.01, lng: -83.0001 };
  assert.equal(
    shouldCountRerouteCandidate({
      current,
      previous,
      route: highway,
      lateralMeters: 62,
      thresholdMeters: 52,
      speedMps: 22,
      courseDeg: 90,
    }),
    true,
  );
});

test('reroute candidate counts severe lateral misses immediately', () => {
  assert.equal(
    shouldCountRerouteCandidate({
      current: { lat: 40.01, lng: -82.998 },
      previous: { lat: 40.009, lng: -82.998 },
      route: highway,
      lateralMeters: 110,
      thresholdMeters: 52,
      speedMps: 22,
      courseDeg: 2,
    }),
    true,
  );
});

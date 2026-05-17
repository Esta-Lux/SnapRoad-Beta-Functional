/**
 * Turn-card geometry helpers: upcoming step must match the active route step index
 * (polyline-aligned index points at the maneuver being executed, not the segment behind it).
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { DirectionsStep } from '../lib/directions';
import { getUpcomingManeuverStep } from './routeGeometry';

test('getUpcomingManeuverStep prefers actionable step at current index', () => {
  const steps = [
    { maneuver: 'depart', lat: 0, lng: 0, instruction: 'Head north' },
    { maneuver: 'turn-right', lat: 1, lng: 1, instruction: 'Turn right onto Oak' },
    { maneuver: 'turn-left', lat: 2, lng: 2, instruction: 'Turn left onto Pine' },
  ] as DirectionsStep[];

  assert.equal(getUpcomingManeuverStep(steps, 1)?.instruction, 'Turn right onto Oak');
});

test('getUpcomingManeuverStep skips depart and uses first actionable maneuver', () => {
  const steps = [
    { maneuver: 'depart', lat: 0, lng: 0, instruction: 'Head north' },
    { maneuver: 'turn-right', lat: 1, lng: 1, instruction: 'Turn right onto Oak' },
  ] as DirectionsStep[];

  assert.equal(getUpcomingManeuverStep(steps, 0)?.instruction, 'Turn right onto Oak');
});

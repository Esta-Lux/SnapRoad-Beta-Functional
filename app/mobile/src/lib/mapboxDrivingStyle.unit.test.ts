import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DRIVING_MODES } from '../constants/modes';
import { effectiveNavRouteColors } from './mapboxDrivingStyle';

test('navigation route core stays SnapRoad blue across driving modes', () => {
  for (const mode of ['calm', 'adaptive', 'sport'] as const) {
    const day = effectiveNavRouteColors(DRIVING_MODES[mode], 'day', false, mode);
    const night = effectiveNavRouteColors(DRIVING_MODES[mode], 'night', false, mode);

    assert.equal(day.routeColor, '#0A84FF');
    assert.equal(night.routeColor, '#0A84FF');
  }
});

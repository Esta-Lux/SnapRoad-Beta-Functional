import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DRIVING_MODES } from '../constants/modes';
import { effectiveNavRouteColors } from './mapboxDrivingStyle';

test('navigation route stays vivid on day; high-luminance blue on night basemap', () => {
  for (const mode of ['calm', 'adaptive', 'sport'] as const) {
    const day = effectiveNavRouteColors(DRIVING_MODES[mode], 'day', false, mode);
    const night = effectiveNavRouteColors(DRIVING_MODES[mode], 'night', false, mode);

    if (mode === 'sport') {
      assert.equal(day.routeColor, '#38BDF8');
      assert.equal(day.routeGlowColor, '#BAE6FD');
      assert.ok(day.routeGlowOpacity >= 0.54);
    } else {
      assert.equal(day.routeColor, '#0A84FF');
      assert.equal(day.routeGlowColor, '#5EBBFF');
    }
    assert.equal(night.routeColor, '#38BDF8');
    assert.equal(night.routeGlowColor, '#BAE6FD');
    assert.ok(night.routeGlowOpacity >= day.routeGlowOpacity);
  }
});

test('navigation modes render live congestion colors over the blue route', () => {
  for (const mode of ['calm', 'adaptive', 'sport'] as const) {
    assert.equal(DRIVING_MODES[mode].showCongestion, true);
  }
});

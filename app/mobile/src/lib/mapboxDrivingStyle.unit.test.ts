import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DRIVING_MODES } from '../constants/modes';
import {
  effectiveAlternateRouteLineColor,
  effectiveNavRouteColors,
  standardBasemapStyleImportConfig,
} from './mapboxDrivingStyle';

test('navigation route stays vivid on day; high-luminance blue on night basemap', () => {
  for (const mode of ['calm', 'adaptive', 'sport'] as const) {
    const day = effectiveNavRouteColors(DRIVING_MODES[mode], 'day', false, mode);
    const night = effectiveNavRouteColors(DRIVING_MODES[mode], 'night', false, mode);

    if (mode === 'sport') {
      assert.equal(day.routeColor, '#5EE9FF');
      assert.equal(day.routeGlowColor, '#E0F9FF');
      assert.ok(day.routeGlowOpacity >= 0.54);
    } else {
      assert.equal(day.routeColor, '#0A84FF');
      assert.equal(day.routeGlowColor, '#5EBBFF');
    }
    assert.equal(night.routeColor, '#5EE9FF');
    assert.equal(night.routeGlowColor, '#E0F9FF');
    assert.ok(night.routeGlowOpacity >= day.routeGlowOpacity);
  }
});

test('navigation modes render live congestion colors over the blue route', () => {
  for (const mode of ['calm', 'adaptive', 'sport'] as const) {
    assert.equal(DRIVING_MODES[mode].showCongestion, true);
  }
});

test('alternate route preview uses high-visibility ink on dark basemap / satellite', () => {
  assert.equal(effectiveAlternateRouteLineColor('day', false), 'rgba(10,132,255,0.55)');
  assert.equal(effectiveAlternateRouteLineColor('night', false), 'rgba(94,233,255,0.72)');
  assert.equal(effectiveAlternateRouteLineColor('day', true), 'rgba(94,233,255,0.72)');
});

test('Standard basemap: night boosts POI label contrast; nav run hides 3d trees for building read', () => {
  const explore = standardBasemapStyleImportConfig('night', false, 'sport', false);
  assert.equal(explore.densityPointOfInterestLabels, '5');
  assert.equal(explore.colorModePointOfInterestLabels, 'single');
  assert.equal(explore.show3dTrees, 'true');

  const nav = standardBasemapStyleImportConfig('night', false, 'sport', true);
  assert.equal(nav.show3dTrees, 'false');
  assert.equal(nav.show3dBuildings, 'true');
});

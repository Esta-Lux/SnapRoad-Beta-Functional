import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DRIVING_MODES } from '../constants/modes';
import {
  effectiveAlternateRouteLineColor,
  effectiveNavRouteColors,
  standardBasemapStyleImportConfig,
} from './mapboxDrivingStyle';

test('navigation route uses Apple-style iOS blue on day AND on night/Sport (with white halo casing)', () => {
  for (const mode of ['calm', 'adaptive', 'sport'] as const) {
    const day = effectiveNavRouteColors(DRIVING_MODES[mode], 'day', false, mode);
    const night = effectiveNavRouteColors(DRIVING_MODES[mode], 'night', false, mode);

    // Core ink is iOS system blue on every basemap; only the casing/glow re-tune.
    assert.equal(night.routeColor, '#0A84FF');
    if (mode === 'sport') {
      // Sport pins to high-vis stack regardless of the caller's preset.
      assert.equal(day.routeColor, '#0A84FF');
      assert.equal(day.routeCasing, '#FFFFFF');
      assert.equal(day.routeGlowColor, '#5EBBFF');
      assert.ok(day.routeGlowOpacity >= 0.42);
    } else {
      assert.equal(day.routeColor, '#0A84FF');
      assert.equal(day.routeCasing, '#032C66');
    }
    // Night/dusk/Sport gets the white halo so the line reads on dark Standard.
    assert.equal(night.routeCasing, '#FFFFFF');
    assert.equal(night.routeGlowColor, '#5EBBFF');
    assert.ok(night.routeGlowOpacity >= 0.36);
  }
});

test('satellite still uses the high-vis Apple blue stack with white halo', () => {
  const sat = effectiveNavRouteColors(DRIVING_MODES.adaptive, 'day', true, 'adaptive');
  assert.equal(sat.routeColor, '#0A84FF');
  assert.equal(sat.routeCasing, '#FFFFFF');
  assert.ok(sat.routeGlowOpacity >= 0.4);
});

test('navigation modes render live congestion colors over the blue route', () => {
  for (const mode of ['calm', 'adaptive', 'sport'] as const) {
    assert.equal(DRIVING_MODES[mode].showCongestion, true);
  }
});

test('alternate route preview is dimmed iOS blue on day; brighter blue on dark / satellite', () => {
  assert.equal(effectiveAlternateRouteLineColor('day', false), 'rgba(10,132,255,0.55)');
  assert.equal(effectiveAlternateRouteLineColor('night', false), 'rgba(94,168,255,0.7)');
  assert.equal(effectiveAlternateRouteLineColor('day', true), 'rgba(94,168,255,0.7)');
});

test('Standard basemap config keeps full POI variety; nav run hides 3D trees for clean buildings', () => {
  const explore = standardBasemapStyleImportConfig('night', false, 'sport', false);
  assert.equal(explore.densityPointOfInterestLabels, '5');
  assert.equal(explore.showLandmarkIcons, 'true');
  // Must NOT collapse POIs into single-color dots — that read as "POIs missing".
  assert.equal(explore.colorModePointOfInterestLabels, undefined);
  assert.equal(explore.backgroundPointOfInterestLabels, undefined);
  assert.equal(explore.show3dTrees, 'true');

  const nav = standardBasemapStyleImportConfig('night', false, 'sport', true);
  assert.equal(nav.show3dTrees, 'false');
  assert.equal(nav.show3dBuildings, 'true');
});

test('Sport driving mode locks the Mapbox Standard light preset to night', () => {
  assert.equal(DRIVING_MODES.sport.lightPreset, 'night');
});

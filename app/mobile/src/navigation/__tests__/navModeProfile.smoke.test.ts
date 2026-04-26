import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getProgressTuning,
  getCameraConfig,
  buildNavModeProfile,
  getTurnCardNavTuning,
} from '../navModeProfile';
import { getLookAheadMeters } from '../navigationCamera';

test('sport lead cap is greater than calm (snappier puck)', () => {
  assert.ok(
    getProgressTuning('sport').leadCapMeters > getProgressTuning('calm').leadCapMeters,
  );
});

test('camera look-ahead aligns with mode intent (sport > calm)', () => {
  const speed = 20;
  assert.ok(
    getCameraConfig('sport', speed).lookAheadMeters > getCameraConfig('calm', speed).lookAheadMeters,
  );
});

test('buildNavModeProfile bundles consistent mode slices', () => {
  const p = buildNavModeProfile('adaptive');
  assert.equal(p.progress.snapLookaheadSegments, 52);
  assert.ok(p.offRoute.maxSnapMeters > 0);
  assert.ok(p.turnCard.activeManeuverMeters > 0);
  assert.ok(p.voice.preparatoryMaxM > p.voice.advanceMaxM);
});

test('turn card: sport activates maneuver window sooner than calm', () => {
  assert.ok(
    getTurnCardNavTuning('sport').activeManeuverMeters <
      getTurnCardNavTuning('calm').activeManeuverMeters,
  );
});

test('camera look-ahead freezes when stopped and stays mode ordered at speed', () => {
  assert.equal(getLookAheadMeters('calm', 0), 0);
  assert.equal(getLookAheadMeters('adaptive', 0), 0);
  assert.equal(getLookAheadMeters('sport', 0), 0);

  const speedMps = 18;
  const calm = getLookAheadMeters('calm', speedMps);
  const adaptive = getLookAheadMeters('adaptive', speedMps);
  const sport = getLookAheadMeters('sport', speedMps);
  assert.ok(calm > 0);
  assert.ok(adaptive > calm);
  assert.ok(sport > adaptive);
});

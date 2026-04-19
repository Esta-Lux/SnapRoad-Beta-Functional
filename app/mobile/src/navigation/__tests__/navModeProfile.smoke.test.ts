import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getProgressTuning,
  getCameraConfig,
  buildNavModeProfile,
  getTurnCardNavTuning,
} from '../navModeProfile';

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

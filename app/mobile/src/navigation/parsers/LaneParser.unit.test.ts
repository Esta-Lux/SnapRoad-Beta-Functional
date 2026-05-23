import test from 'node:test';
import assert from 'node:assert/strict';
import { mapIndicationsToArrow, parseLanes } from './LaneParser';

test('mapIndicationsToArrow maps Mapbox lane indications to forward-facing arrows', () => {
  assert.equal(mapIndicationsToArrow(['straight']), 'up');
  assert.equal(mapIndicationsToArrow(['slight right']), 'slight-right');
  assert.equal(mapIndicationsToArrow(['right']), 'right');
  assert.equal(mapIndicationsToArrow(['uturn']), 'uturn');
});

test('parseLanes preserves valid and recommended lane state', () => {
  const parsed = parseLanes({
    lanes: [
      { indications: ['left'], valid: false },
      { indications: ['straight', 'right'], valid: true },
      { indications: ['right'], valid: true, active: true },
    ],
  });

  assert.ok(parsed);
  assert.equal(parsed.totalLanes, 3);
  assert.equal(parsed.recommendedLaneIndex, 2);
  assert.equal(parsed.showGuidance, true);
  assert.deepEqual(parsed.lanes.map((lane) => lane.isValid), [false, true, true]);
});

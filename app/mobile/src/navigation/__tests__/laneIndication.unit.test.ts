import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLaneIndication, primaryLaneGlyph } from '../laneIndication';
import type { LaneInfo } from '../navModel';

test('parseLaneIndication: sharp + merge map to left/right', () => {
  assert.equal(parseLaneIndication('sharp left'), 'left');
  assert.equal(parseLaneIndication('sharp right'), 'right');
  assert.equal(parseLaneIndication('merge left'), 'left');
  assert.equal(parseLaneIndication('merge right'), 'right');
});

test('parseLaneIndication: hyphenated uturn', () => {
  assert.equal(parseLaneIndication('u-turn'), 'uturn');
});

test('primaryLaneGlyph prefers displayIndication over indications[0]', () => {
  const lane: LaneInfo = {
    indications: ['straight', 'left'],
    displayIndication: 'left',
    active: true,
    preferred: true,
  };
  assert.equal(primaryLaneGlyph(lane), 'left');
});

test('primaryLaneGlyph falls back to first indication', () => {
  const lane: LaneInfo = {
    indications: ['slight_right'],
    active: true,
    preferred: false,
  };
  assert.equal(primaryLaneGlyph(lane), 'slight_right');
});

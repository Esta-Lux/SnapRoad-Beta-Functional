import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatManeuverDistanceForCard } from './distanceFormatter';

test('formatManeuverDistanceForCard uses tenths of a mile above 0.1 mi', () => {
  assert.deepEqual(formatManeuverDistanceForCard(1931), { value: '1.2', unit: 'MI' });
  assert.deepEqual(formatManeuverDistanceForCard(483), { value: '0.3', unit: 'MI' });
});

test('formatManeuverDistanceForCard uses whole miles at 10 miles and above', () => {
  assert.deepEqual(formatManeuverDistanceForCard(16_093.44), { value: '10', unit: 'MI' });
  assert.deepEqual(formatManeuverDistanceForCard(160_934.4), { value: '100', unit: 'MI' });
});

test('formatManeuverDistanceForCard rounds feet to 50 ft and uses Now near turn', () => {
  assert.deepEqual(formatManeuverDistanceForCard(122), { value: '400', unit: 'FT' });
  assert.deepEqual(formatManeuverDistanceForCard(14), { value: 'Now', unit: '' });
});

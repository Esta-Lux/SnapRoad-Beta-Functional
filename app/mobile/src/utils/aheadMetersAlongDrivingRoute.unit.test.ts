import assert from 'node:assert/strict';
import { test } from 'node:test';
import { aheadMetersAlongDrivingRoute } from './distance';
import type { Coordinate } from '../types';

function line(a: Coordinate, b: Coordinate): Coordinate[] {
  return [a, b];
}

test('ahead: target further along segment returns distance', () => {
  const poly = line({ lat: 40, lng: -83 }, { lat: 40.1, lng: -83 });
  const ahead = aheadMetersAlongDrivingRoute(poly, { lat: 40.01, lng: -83 }, { lat: 40.06, lng: -83 });
  assert.ok(ahead != null && ahead > 4000 && ahead < 6500);
});

test('ahead: behind user returns null', () => {
  const poly = line({ lat: 40, lng: -83 }, { lat: 40.1, lng: -83 });
  const behind = aheadMetersAlongDrivingRoute(poly, { lat: 40.06, lng: -83 }, { lat: 40.02, lng: -83 });
  assert.equal(behind, null);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cumulativeRouteMeters,
  snapToRoute,
  snapToRouteFullRoute,
} from '../navGeometry';

test('snapToRouteFullRoute finds nearest segment outside local lookahead window', () => {
  const route: { lat: number; lng: number }[] = [];
  for (let i = 0; i < 100; i++) {
    route.push({ lat: 40 + i * 0.0001, lng: -83.0 });
  }
  const cumulative = cumulativeRouteMeters(route);
  const raw = {
    lat: 40 + 78 * 0.0001,
    lng: -83.0,
    speedMps: 5,
    accuracy: 10,
  };
  const local = snapToRoute(raw, route, cumulative, 20, 35);
  const full = snapToRouteFullRoute(raw, route, cumulative);
  assert.ok(local && full);
  assert.ok(full.segmentIndex >= 76 && full.segmentIndex <= 78);
  assert.ok(local!.segmentIndex <= 55);
  assert.ok(full.distanceMeters + 1e-6 < local!.distanceMeters);
});

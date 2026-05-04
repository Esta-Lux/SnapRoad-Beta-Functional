/**
 * Arc-length invariants for native route trim + map puck (`navSdkMinimalAdapter` + MapScreen
 * `routeOverlayFraction`). Avoids importing the adapter here so Node tests do not pull
 * `navSdkProgressAdapter` → `react-native` (tsx/esbuild transform edge on some runners).
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildRouteSplitRingsFromProgress,
  coordinateAtCumulativeMeters,
  polylineLengthMeters,
} from '../utils/distance';
import type { Coordinate } from '../types';

test('halfway point on segment is independent of off-route GPS (polyline authority)', () => {
  const poly: Coordinate[] = [
    { lat: 37.77, lng: -122.42 },
    { lat: 37.78, lng: -122.42 },
  ];
  const len = polylineLengthMeters(poly);
  const onLine = coordinateAtCumulativeMeters(poly, 0.5 * len);
  assert.ok(onLine);
  assert.ok(Math.abs(onLine.lat - (poly[0]!.lat + poly[1]!.lat) / 2) < 1e-5);
  assert.ok(Math.abs(onLine.lng - (poly[0]!.lng + poly[1]!.lng) / 2) < 1e-5);
});

test('overlay fraction = cumulativeMeters / polylineLength matches native fraction', () => {
  const poly: Coordinate[] = [
    { lat: 37.77, lng: -122.42 },
    { lat: 37.78, lng: -122.42 },
  ];
  const len = polylineLengthMeters(poly);
  const fraction = 0.25;
  const cumulativeMeters = fraction * len;
  const overlayFrac = cumulativeMeters / len;
  assert.ok(Math.abs(overlayFrac - fraction) < 1e-9);
  const p = coordinateAtCumulativeMeters(poly, cumulativeMeters);
  assert.ok(p);
  const p2 = coordinateAtCumulativeMeters(poly, overlayFrac * len);
  assert.ok(p2);
  assert.ok(Math.abs(p.lat - p2.lat) < 1e-9);
});

test('route split ahead ring starts at split so colored route does not lead behind puck', () => {
  const poly: Coordinate[] = [
    { lat: 40.0, lng: -83.0 },
    { lat: 40.0, lng: -82.99 },
    { lat: 40.0, lng: -82.98 },
  ];
  const rings = buildRouteSplitRingsFromProgress(poly, 0, 0.5);
  assert.ok(rings);
  assert.deepEqual(rings!.aheadLngLat[0], [-82.995, 40.0]);
  assert.equal(rings!.firstAheadEdgeIndex, 0);
});

/**
 * `tangentBearingAlongPolyline` unit tests — this is the forward-looking
 * bearing along the nav route, used as the authoritative camera / puck
 * bearing seed whenever the SDK `course` sample is unreliable (stationary,
 * start of trip, GPS outage). Apple Maps / native Mapbox Navigation do the
 * same: they never fall through to device compass during active nav.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { tangentBearingAlongPolyline } from './distance';

const EPS = 1.5; // degrees

function approxEq(a: number, b: number, eps = EPS): boolean {
  const d = Math.abs(((a - b + 540) % 360) - 180);
  return d <= eps;
}

test('returns null for a degenerate polyline', () => {
  assert.equal(tangentBearingAlongPolyline([], 0), null);
  assert.equal(
    tangentBearingAlongPolyline([{ lat: 37.77, lng: -122.42 }], 0),
    null,
  );
});

test('east-pointing polyline reports bearing ~90°', () => {
  const poly = [
    { lat: 37.77, lng: -122.42 },
    { lat: 37.77, lng: -122.40 },
  ];
  const b = tangentBearingAlongPolyline(poly, 50)!;
  assert.ok(approxEq(b, 90), `expected ~90°, got ${b}`);
});

test('north-pointing polyline reports bearing ~0°', () => {
  const poly = [
    { lat: 37.77, lng: -122.42 },
    { lat: 37.78, lng: -122.42 },
  ];
  const b = tangentBearingAlongPolyline(poly, 50)!;
  assert.ok(approxEq(b, 0), `expected ~0°, got ${b}`);
});

test('south-pointing polyline reports bearing ~180°', () => {
  const poly = [
    { lat: 37.78, lng: -122.42 },
    { lat: 37.77, lng: -122.42 },
  ];
  const b = tangentBearingAlongPolyline(poly, 50)!;
  assert.ok(approxEq(b, 180), `expected ~180°, got ${b}`);
});

test('uses look-ahead window to smooth bearing at a polyline vertex', () => {
  // L-shaped route: east 100 m, then north 100 m. Midway through the first
  // leg, bearing should still look east (the look-ahead hasn't reached the
  // vertex yet). Near the end of the first leg, it should blend eastward
  // -> northward, landing between 0° and 90°.
  const poly = [
    { lat: 37.77, lng: -122.42 },
    { lat: 37.77, lng: -122.4188 }, // ~105 m east (approx)
    { lat: 37.7709, lng: -122.4188 }, // ~100 m north of the elbow
  ];
  const earlyBearing = tangentBearingAlongPolyline(poly, 20)!;
  assert.ok(approxEq(earlyBearing, 90, 5), `early east expected, got ${earlyBearing}`);

  const nearElbow = tangentBearingAlongPolyline(poly, 95, 20)!;
  // Window of 20 m straddles the turn — expect something between 0° and 90°
  assert.ok(
    nearElbow > 5 && nearElbow < 89,
    `elbow blending failed, got ${nearElbow}`,
  );
});

test('past end of route falls back to last-segment bearing', () => {
  const poly = [
    { lat: 37.77, lng: -122.42 },
    { lat: 37.78, lng: -122.42 },
  ];
  const b = tangentBearingAlongPolyline(poly, 99999)!;
  assert.ok(approxEq(b, 0), `expected last-segment north bearing, got ${b}`);
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildMinimalNavigationProgressFromSdk } from './navSdkMinimalAdapter';

const baseProgress = {
  distanceRemaining: 900,
  distanceTraveled: 0,
  durationRemaining: 120,
  fractionTraveled: 0.2,
  stepIndex: 1,
  primaryInstruction: 'Turn right',
  distanceToNextManeuverMeters: 80,
  maneuverType: 'turn',
  maneuverDirection: 'right',
};

test('minimal adapter uses native matched lat/lng for puck when location is present', () => {
  const polyline = [
    { lat: 40.0, lng: -74.0 },
    { lat: 40.01, lng: -74.01 },
    { lat: 40.02, lng: -74.02 },
  ];
  const location = {
    latitude: 40.015,
    longitude: -74.012,
    course: 88,
    speed: 12,
    horizontalAccuracy: 4,
    timestamp: Date.now(),
  };
  const r = buildMinimalNavigationProgressFromSdk({
    progress: baseProgress,
    location,
    routePolyline: polyline,
  });
  assert.equal(r.puckCoord.lat, location.latitude);
  assert.equal(r.puckCoord.lng, location.longitude);
  assert.equal(r.displayCoord.lat, location.latitude);
  assert.equal(r.displayCoord.heading, 88);
  assert.ok(typeof r.snapped.distanceMeters === 'number');
});

test('minimal adapter falls back to on-polyline point when location is null', () => {
  const polyline = [
    { lat: 40.0, lng: -74.0 },
    { lat: 40.1, lng: -74.1 },
  ];
  const r = buildMinimalNavigationProgressFromSdk({
    progress: { ...baseProgress, fractionTraveled: 0 },
    location: null,
    routePolyline: polyline,
  });
  assert.equal(r.puckCoord.lat, polyline[0]!.lat);
  assert.equal(r.puckCoord.lng, polyline[0]!.lng);
  assert.equal(r.snapped.distanceMeters, 0);
});

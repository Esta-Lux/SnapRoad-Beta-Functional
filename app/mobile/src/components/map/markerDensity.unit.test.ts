import assert from 'node:assert/strict';
import { test } from 'node:test';

import { approxVisibleRadiusMeters, markerCapForZoom, sortAndCapMarkers } from './markerDensity';

test('markerCapForZoom uses permissive camera caps so OHGO cameras are not culled', () => {
  // Browse zoom — must be generous enough to show a statewide camera feed without
  // looking like “half the cameras are missing”.
  assert.ok(markerCapForZoom('camera', 9) >= 100, 'state-level browse cap should be >= 100');
  assert.ok(markerCapForZoom('camera', 12) >= 180, 'regional browse cap should be >= 180');
  // Driving zoom — full density so cameras remain readable during navigation.
  assert.ok(markerCapForZoom('camera', 16) >= 360, 'driving zoom cap should be >= 360');
});

test('markerCapForZoom boosts camera density while navigating', () => {
  for (const z of [10, 12, 14.5, 16]) {
    assert.ok(
      markerCapForZoom('cameraNavigating', z) >= markerCapForZoom('camera', z),
      `nav-kind camera cap must be >= browse cap at zoom ${z}`,
    );
  }
  // At low zoom the boost must be meaningful (browsing cap was the tightest).
  assert.ok(markerCapForZoom('cameraNavigating', 10) >= markerCapForZoom('camera', 10) + 40);
});

test('markerCapForZoom tightens caps for sparse kinds when zoomed out', () => {
  assert.equal(markerCapForZoom('offer', 12.5), 44);
  assert.equal(markerCapForZoom('friend', 13), 16);
  assert.equal(markerCapForZoom('friend', 16), 40);
});

test('approxVisibleRadiusMeters shrinks with higher zoom', () => {
  assert.ok(approxVisibleRadiusMeters(17) < approxVisibleRadiusMeters(14));
  assert.ok(approxVisibleRadiusMeters(14) < approxVisibleRadiusMeters(12));
  assert.equal(approxVisibleRadiusMeters(12), 22000);
});

test('sortAndCapMarkers sorts nearest-first and respects caps', () => {
  const markers = [
    { lat: 40.0, lng: -83.0, id: 'near' },
    { lat: 40.02, lng: -83.0, id: 'mid' },
    { lat: 40.05, lng: -83.0, id: 'far' },
  ];
  const sorted = sortAndCapMarkers(markers, { lat: 40.0, lng: -83.0 }, 12, 'camera');
  assert.equal(sorted[0]?.id, 'near');
  assert.ok(sorted.length <= markerCapForZoom('camera', 12));
});

test('sortAndCapMarkers keeps far-away OHGO cameras at browse zoom (big radius)', () => {
  // Simulate a dense state-sized camera feed — 300 cameras spaced ~550 m apart
  // radiating north from (40,-83). At zoom 11 the visible-radius policy allows
  // ~65 km, so ~120 cameras should fall inside; we must keep all of them
  // (well below the per-zoom cap of 140) and never regress to the old cap of 52.
  const markers = Array.from({ length: 300 }, (_, i) => ({
    id: `cam-${i}`,
    lat: 40 + i * 0.005,
    lng: -83,
  }));
  const kept = sortAndCapMarkers(markers, { lat: 40, lng: -83 }, 11, 'camera');
  assert.ok(
    kept.length >= 100,
    `expected >=100 cameras at zoom 11 (was 52 before the fix), got ${kept.length}`,
  );
  assert.ok(kept.length <= markerCapForZoom('camera', 11));
  // Nav variant must keep at least as many.
  const keptNav = sortAndCapMarkers(markers, { lat: 40, lng: -83 }, 11, 'cameraNavigating');
  assert.ok(keptNav.length >= kept.length);
});

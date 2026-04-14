import assert from 'node:assert/strict';
import { test } from 'node:test';

import { approxVisibleRadiusMeters, markerCapForZoom, sortAndCapMarkers } from './markerDensity';

test('markerCapForZoom tightens caps when zoomed out', () => {
  assert.equal(markerCapForZoom('camera', 12), 68);
  assert.equal(markerCapForZoom('camera', 16), 132);
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

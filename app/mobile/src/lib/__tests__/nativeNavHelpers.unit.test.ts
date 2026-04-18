import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  bearingDegrees,
  bearingDelta,
  extractCameraList,
  haversineMeters,
  pickCameraAhead,
  camerasForNativeMapOverlay,
  shouldSuppressSdkCameraInstructionLine,
} from '../nativeNavHelpers';

test('haversineMeters returns 0 for identical coords', () => {
  assert.equal(haversineMeters(40, -83, 40, -83), 0);
});

test('haversineMeters ~111km per degree of latitude', () => {
  const m = haversineMeters(40, -83, 41, -83);
  assert.ok(Math.abs(m - 111_195) < 500, `got ${m}`);
});

test('bearingDegrees: due east ≈ 90°', () => {
  const b = bearingDegrees(40, -83, 40, -82);
  assert.ok(Math.abs(b - 90) < 0.5, `got ${b}`);
});

test('bearingDegrees: due north ≈ 0°', () => {
  const b = bearingDegrees(40, -83, 41, -83);
  assert.ok(Math.abs(b) < 0.5 || Math.abs(b - 360) < 0.5, `got ${b}`);
});

test('bearingDelta handles wrap-around correctly', () => {
  assert.equal(bearingDelta(10, 350), 20);
  assert.equal(bearingDelta(350, 10), 20);
  assert.equal(bearingDelta(180, 0), 180);
  assert.equal(bearingDelta(90, 90), 0);
});

test('shouldSuppressSdkCameraInstructionLine: flags common camera banner noise', () => {
  assert.equal(shouldSuppressSdkCameraInstructionLine('Speed camera ahead'), true);
  assert.equal(shouldSuppressSdkCameraInstructionLine('Traffic camera in 500 feet'), true);
  assert.equal(shouldSuppressSdkCameraInstructionLine('Turn left onto Main St'), false);
});

test('camerasForNativeMapOverlay builds id/name/lat/lng', () => {
  const out = camerasForNativeMapOverlay([
    { lat: 40.1, lng: -82.2, id: 'c1', name: 'Cam A' },
    { lat: NaN, lng: 1 },
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0]!.id, 'c1');
  assert.equal(out[0]!.name, 'Cam A');
  assert.equal(out[0]!.lat, 40.1);
  assert.equal(out[0]!.lng, -82.2);
});

test('extractCameraList handles wrapped {data:[...]}', () => {
  const out = extractCameraList({ data: [{ lat: 1, lng: 2 }] });
  assert.equal(out.length, 1);
  assert.equal(out[0]!.lat, 1);
});

test('extractCameraList handles bare array', () => {
  const out = extractCameraList([{ lat: 3, lng: 4 }]);
  assert.equal(out.length, 1);
});

test('extractCameraList returns [] for garbage shapes', () => {
  assert.deepEqual(extractCameraList(null), []);
  assert.deepEqual(extractCameraList('nope'), []);
  assert.deepEqual(extractCameraList({}), []);
});

test('pickCameraAhead: prefers camera ahead on course over closer one behind', () => {
  // Driver at (40, -83) heading north (course = 0°).
  // Camera A: 0.5mi SOUTH (behind). Camera B: 2mi NORTH (ahead).
  const camA = { id: 'a', name: 'Behind cam', lat: 39.9928, lng: -83 }; // south
  const camB = { id: 'b', name: 'Ahead cam', lat: 40.029, lng: -83 }; // north ~2mi
  const chosen = pickCameraAhead(40, -83, 0, [camA, camB]);
  assert.equal(chosen?.id, 'b');
});

test('pickCameraAhead: returns null when only camera is behind', () => {
  const camBehind = { id: 'x', name: 'Behind', lat: 39.99, lng: -83 };
  const chosen = pickCameraAhead(40, -83, 0 /* heading N */, [camBehind]);
  assert.equal(chosen, null);
});

test('pickCameraAhead: with unknown course, returns closest camera within cap', () => {
  const a = { id: 'a', name: 'a', lat: 40.01, lng: -83 };
  const b = { id: 'b', name: 'b', lat: 40.05, lng: -83 };
  const chosen = pickCameraAhead(40, -83, null, [a, b]);
  assert.equal(chosen?.id, 'a');
});

test('pickCameraAhead: respects maxDistanceMiles', () => {
  const far = { id: 'far', name: 'far', lat: 40.5, lng: -83 }; // ~35mi
  const chosen = pickCameraAhead(40, -83, 0, [far], { maxDistanceMiles: 6 });
  assert.equal(chosen, null);
});

test('pickCameraAhead: falls back to name when title missing', () => {
  const c = { id: 'c', lat: 40.02, lng: -83, name: 'SR-35 @ Mile 12' };
  const chosen = pickCameraAhead(40, -83, 0, [c]);
  assert.equal(chosen?.name, 'SR-35 @ Mile 12');
});

test('pickCameraAhead: falls back to "Traffic camera" when no title/name', () => {
  const c = { id: 'c', lat: 40.02, lng: -83 };
  const chosen = pickCameraAhead(40, -83, 0, [c]);
  assert.equal(chosen?.name, 'Traffic camera');
});

test('pickCameraAhead: skips cameras with non-numeric coords', () => {
  const bad = { id: 'bad', lat: 'not a number', lng: -83 };
  const good = { id: 'good', lat: 40.01, lng: -83, name: 'ok' };
  const chosen = pickCameraAhead(40, -83, 0, [bad, good]);
  assert.equal(chosen?.id, 'good');
});

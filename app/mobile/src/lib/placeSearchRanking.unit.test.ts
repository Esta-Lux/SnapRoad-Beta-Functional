/**
 * Tests for the pure place-search ranking helpers. These pin down the
 * contract that fixed two real bugs:
 *
 *   - "Closest result not surfaced": the sorter must use server-supplied
 *     `distance_meters` when the row carries no usable lat/lng.
 *   - "Tap pulls up wrong place": dedupe must collapse Google-vs-Mapbox
 *     duplicates of the same POI; details geometry must always win over a
 *     potentially stale row coord; map-tap must pick the *closest*
 *     candidate to the tap, not the first within radius.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  __testOnly__,
  dedupeGeocodeResults,
  effectiveDistanceMeters,
  formatRowDistance,
  pickBestPlaceLocation,
  pickNearestNearby,
  sortGeocodeByEffectiveDistance,
} from './placeSearchRanking';
import type { GeocodeResult } from './directions';

const SF = { lat: 37.7749, lng: -122.4194 };

function row(over: Partial<GeocodeResult>): GeocodeResult {
  return {
    name: 'Test',
    address: '',
    lat: 0,
    lng: 0,
    ...over,
  };
}

/* ─── effectiveDistanceMeters ───────────────────────────────────────── */

test('effectiveDistanceMeters: real coords → haversine', () => {
  const r = row({ lat: SF.lat + 0.001, lng: SF.lng });
  const d = effectiveDistanceMeters(r, SF);
  assert.ok(d > 90 && d < 130, `~111m expected, got ${d}`);
});

test('effectiveDistanceMeters: no row coords falls back to distance_meters', () => {
  const r = row({ distance_meters: 400 });
  assert.equal(effectiveDistanceMeters(r, SF), 400);
});

test('effectiveDistanceMeters: row coords prefer over distance_meters when both present', () => {
  const r = row({ lat: SF.lat + 0.001, lng: SF.lng, distance_meters: 1234 });
  const d = effectiveDistanceMeters(r, SF);
  assert.ok(d > 90 && d < 130, 'real coords win');
});

test('effectiveDistanceMeters: nothing known → infinity', () => {
  assert.equal(effectiveDistanceMeters(row({}), SF), Number.POSITIVE_INFINITY);
  assert.equal(effectiveDistanceMeters(row({}), null), Number.POSITIVE_INFINITY);
});

test('effectiveDistanceMeters: no user fix but distance_meters present → use it', () => {
  const r = row({ distance_meters: 700 });
  assert.equal(effectiveDistanceMeters(r, null), 700);
});

/* ─── sortGeocodeByEffectiveDistance ────────────────────────────────── */

test('sort: server distance_meters surfaces closest Google prediction above farther saved', () => {
  // Bug repro: a saved/recent row at 800m would float above a Google
  // prediction at 50m because the prediction had (0,0) coords.
  const closeGoogle = row({ name: 'Coffee', distance_meters: 50, place_id: 'g1' });
  const farSaved = row({ name: 'Home', lat: SF.lat + 0.007, lng: SF.lng }); // ~770m
  const out = sortGeocodeByEffectiveDistance([farSaved, closeGoogle], SF);
  assert.equal(out[0]!.name, 'Coffee');
  assert.equal(out[1]!.name, 'Home');
});

test('sort: stable for ties (preserves input order within bucket)', () => {
  const a = row({ name: 'A', distance_meters: 100 });
  const b = row({ name: 'B', distance_meters: 100 });
  const c = row({ name: 'C', distance_meters: 100 });
  const out = sortGeocodeByEffectiveDistance([a, b, c], SF);
  assert.deepEqual(out.map((r) => r.name), ['A', 'B', 'C']);
});

test('sort: no user fix → original order preserved (no-op)', () => {
  const a = row({ name: 'A', lat: 1, lng: 2 });
  const b = row({ name: 'B', lat: 3, lng: 4 });
  const out = sortGeocodeByEffectiveDistance([a, b], null);
  // distance_meters is null, no user fix; both fall to infinity, stable sort keeps order.
  assert.deepEqual(out.map((r) => r.name), ['A', 'B']);
});

/* ─── formatRowDistance ─────────────────────────────────────────────── */

test('formatRowDistance: ft under 160m', () => {
  const r = row({ distance_meters: 50 });
  const s = formatRowDistance(r, SF);
  assert.equal(s, '164 ft');
});

test('formatRowDistance: mi above 160m', () => {
  const r = row({ distance_meters: 1609 });
  const s = formatRowDistance(r, SF);
  assert.equal(s, '1.0 mi');
});

test('formatRowDistance: null when nothing known', () => {
  assert.equal(formatRowDistance(row({}), SF), null);
});

/* ─── dedupeGeocodeResults ──────────────────────────────────────────── */

test('dedupe: same place_id collapses to first occurrence', () => {
  const a = row({ name: 'A', place_id: 'p1' });
  const b = row({ name: 'B', place_id: 'p1' });
  const out = dedupeGeocodeResults([a, b]);
  assert.equal(out.length, 1);
  assert.equal(out[0]!.name, 'A');
});

test('dedupe: same name + nearby coords (Google + Mapbox) collapses', () => {
  // Mapbox row arrives first (no place_id), Google row second (with pid)
  // — should keep one entry that carries the place_id (rich detail tap).
  const mapboxA = row({ name: 'Blue Bottle', lat: SF.lat, lng: SF.lng });
  const googleA = row({ name: 'Blue Bottle', lat: SF.lat + 0.0001, lng: SF.lng + 0.0001, place_id: 'g99' });
  const out = dedupeGeocodeResults([mapboxA, googleA]);
  assert.equal(out.length, 1, 'duplicates collapsed');
  assert.equal(out[0]!.place_id, 'g99', 'place_id promoted onto kept row');
  assert.equal(out[0]!.name, 'Blue Bottle');
});

test('dedupe: different names with similar coords are kept separate', () => {
  const a = row({ name: 'Cafe A', lat: SF.lat, lng: SF.lng });
  const b = row({ name: 'Cafe B', lat: SF.lat, lng: SF.lng });
  const out = dedupeGeocodeResults([a, b]);
  assert.equal(out.length, 2);
});

test('dedupe: same name with far-apart coords kept separate (chain branches)', () => {
  // ~5 km apart — different Starbucks locations.
  const a = row({ name: 'Starbucks', lat: SF.lat, lng: SF.lng });
  const b = row({ name: 'Starbucks', lat: SF.lat + 0.045, lng: SF.lng });
  const out = dedupeGeocodeResults([a, b]);
  assert.equal(out.length, 2);
});

test('dedupe: same name, missing coords on one side → treat as same', () => {
  const a = row({ name: 'Joe Coffee' });
  const b = row({ name: 'Joe Coffee', lat: SF.lat, lng: SF.lng, place_id: 'gj' });
  const out = dedupeGeocodeResults([a, b]);
  assert.equal(out.length, 1);
  assert.equal(out[0]!.place_id, 'gj');
});

/* ─── pickNearestNearby (map tap) ───────────────────────────────────── */

test('pickNearestNearby: returns closest within radius, not first', () => {
  const tap = SF;
  const candidates = [
    { name: 'Far', lat: SF.lat + 0.0004, lng: SF.lng }, // ~44 m
    { name: 'Closest', lat: SF.lat + 0.00005, lng: SF.lng }, // ~5.5 m
    { name: 'Mid', lat: SF.lat + 0.0002, lng: SF.lng }, // ~22 m
  ];
  const got = pickNearestNearby(candidates, tap, 60);
  assert.ok(got);
  assert.equal(got!.row.name, 'Closest');
  assert.ok(got!.distanceMeters < 10);
});

test('pickNearestNearby: returns null when none within radius', () => {
  const tap = SF;
  const candidates = [
    { name: 'A', lat: SF.lat + 0.001, lng: SF.lng }, // ~111 m
    { name: 'B', lat: SF.lat + 0.002, lng: SF.lng }, // ~222 m
  ];
  assert.equal(pickNearestNearby(candidates, tap, 50), null);
});

test('pickNearestNearby: skips invalid candidates', () => {
  const tap = SF;
  const candidates = [
    { name: 'Bad', lat: 0, lng: 0 }, // null-island
    { name: 'Good', lat: SF.lat + 0.0001, lng: SF.lng },
  ];
  const got = pickNearestNearby(candidates, tap, 60);
  assert.ok(got);
  assert.equal(got!.row.name, 'Good');
});

/* ─── pickBestPlaceLocation (click handler) ─────────────────────────── */

test('pickBestPlaceLocation: details geometry always wins when valid', () => {
  // Bug repro: row had stale coords pointing at a different POI; details
  // returned the correct ones. Old code kept row coords; new code uses details.
  const out = pickBestPlaceLocation(SF.lat, SF.lng, SF.lat + 0.01, SF.lng + 0.01);
  assert.equal(out!.lat, SF.lat + 0.01);
  assert.equal(out!.lng, SF.lng + 0.01);
});

test('pickBestPlaceLocation: row coords used when details missing', () => {
  const out = pickBestPlaceLocation(SF.lat, SF.lng, null, null);
  assert.equal(out!.lat, SF.lat);
});

test('pickBestPlaceLocation: details with NaN/zero falls back to row', () => {
  const out = pickBestPlaceLocation(SF.lat, SF.lng, 0, 0);
  assert.equal(out!.lat, SF.lat);
});

test('pickBestPlaceLocation: nothing valid → null (caller surfaces error)', () => {
  assert.equal(pickBestPlaceLocation(0, 0, null, null), null);
  assert.equal(pickBestPlaceLocation(NaN, NaN, NaN, NaN), null);
});

/* ─── sameCanonicalPlace (private invariants) ──────────────────────── */

test('normalizeName: strips, lowercases, collapses whitespace', () => {
  assert.equal(__testOnly__.normalizeName('  Blue   Bottle  '), 'blue bottle');
  assert.equal(__testOnly__.normalizeName(undefined), '');
});

/**
 * Tests for `navPuckSync` — the pure stationary-lock + true-location-leash +
 * heading-stabilizer helpers that sit between the navigation pipeline and
 * the visible HUD puck. These guarantee the chevron does not drift while
 * parked, jump to a parallel road, or spin to the wrong direction.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  HEADING_FLIP_REJECT_DEG,
  HEADING_MAX_STEP_DEG,
  INITIAL_STATIONARY_LOCK,
  LEASH_HARD_MAX_M,
  MOTION_RELEASE_DWELL_MS,
  MOTION_RELEASE_SPEED_MPH,
  STATIONARY_DWELL_MS,
  STATIONARY_RAW_SPEED_MPS,
  STATIONARY_SPEED_MPH,
  resolvePuckCoord,
  resolvePuckHeading,
  updateStationaryLock,
} from './navPuckSync';

const SF = { lat: 37.78, lng: -122.42 };

/* ── Stationary lock ───────────────────────────────────────────────── */

test('stationary lock: does not engage before dwell elapses', () => {
  const t0 = 1_000_000;
  let s = updateStationaryLock(INITIAL_STATIONARY_LOCK, {
    speedMph: 0.4,
    rawSpeedMps: 0.1,
    matched: SF,
    trueLoc: SF,
    heading: 90,
    nowMs: t0,
  });
  assert.equal(s.locked, false);
  s = updateStationaryLock(s, {
    speedMph: 0.4,
    rawSpeedMps: 0.1,
    matched: SF,
    trueLoc: SF,
    heading: 90,
    nowMs: t0 + STATIONARY_DWELL_MS - 50,
  });
  assert.equal(s.locked, false);
});

test('stationary lock: engages after dwell, anchors matched + heading', () => {
  const t0 = 2_000_000;
  let s = updateStationaryLock(INITIAL_STATIONARY_LOCK, {
    speedMph: 0.5,
    rawSpeedMps: 0.05,
    matched: SF,
    trueLoc: SF,
    heading: 87,
    nowMs: t0,
  });
  s = updateStationaryLock(s, {
    speedMph: 0.5,
    rawSpeedMps: 0.05,
    matched: SF,
    trueLoc: SF,
    heading: 87,
    nowMs: t0 + STATIONARY_DWELL_MS + 1,
  });
  assert.equal(s.locked, true);
  assert.deepEqual(s.anchor, SF);
  assert.equal(s.anchorHeading, 87);
});

test('stationary lock: requires both smoothed and raw speed below thresholds', () => {
  const t0 = 3_000_000;
  let s = updateStationaryLock(INITIAL_STATIONARY_LOCK, {
    speedMph: STATIONARY_SPEED_MPH - 0.1,
    rawSpeedMps: STATIONARY_RAW_SPEED_MPS + 0.5,
    matched: SF,
    trueLoc: SF,
    heading: 0,
    nowMs: t0,
  });
  s = updateStationaryLock(s, {
    speedMph: STATIONARY_SPEED_MPH - 0.1,
    rawSpeedMps: STATIONARY_RAW_SPEED_MPS + 0.5,
    matched: SF,
    trueLoc: SF,
    heading: 0,
    nowMs: t0 + STATIONARY_DWELL_MS + 1000,
  });
  assert.equal(s.locked, false);
});

test('stationary lock: releases only after motion-release dwell at speed', () => {
  const t0 = 4_000_000;
  let s = updateStationaryLock(INITIAL_STATIONARY_LOCK, {
    speedMph: 0.5,
    rawSpeedMps: 0.05,
    matched: SF,
    trueLoc: SF,
    heading: 0,
    nowMs: t0,
  });
  s = updateStationaryLock(s, {
    speedMph: 0.5,
    rawSpeedMps: 0.05,
    matched: SF,
    trueLoc: SF,
    heading: 0,
    nowMs: t0 + STATIONARY_DWELL_MS + 1,
  });
  assert.equal(s.locked, true);
  s = updateStationaryLock(s, {
    speedMph: MOTION_RELEASE_SPEED_MPH + 1,
    rawSpeedMps: 1.5,
    matched: SF,
    trueLoc: SF,
    heading: 90,
    nowMs: t0 + STATIONARY_DWELL_MS + 100,
  });
  assert.equal(s.locked, true, 'still locked until motion dwell');
  s = updateStationaryLock(s, {
    speedMph: MOTION_RELEASE_SPEED_MPH + 1,
    rawSpeedMps: 1.5,
    matched: SF,
    trueLoc: SF,
    heading: 90,
    nowMs: t0 + STATIONARY_DWELL_MS + 100 + MOTION_RELEASE_DWELL_MS + 1,
  });
  assert.equal(s.locked, false);
});

test('stationary lock: instant-lock fires when raw mps ≈ 0 AND anchorOverride is finite', () => {
  const t0 = 5_000_000;
  const route = { lat: SF.lat + 0.0001, lng: SF.lng };
  const s = updateStationaryLock(INITIAL_STATIONARY_LOCK, {
    speedMph: 0.4,
    rawSpeedMps: 0.05,
    matched: SF,
    trueLoc: SF,
    heading: 92,
    nowMs: t0,
    anchorOverride: route,
  });
  assert.equal(s.locked, true, 'instant lock engages on first sample with anchor override');
  assert.deepEqual(s.anchor, route, 'anchor uses the override (route-snapped point)');
  assert.equal(s.anchorHeading, 92);
});

test('stationary lock: no instant-lock without anchorOverride (preserves dwell)', () => {
  const t0 = 6_000_000;
  const s = updateStationaryLock(INITIAL_STATIONARY_LOCK, {
    speedMph: 0.4,
    rawSpeedMps: 0.05,
    matched: SF,
    trueLoc: SF,
    heading: 92,
    nowMs: t0,
  });
  assert.equal(s.locked, false, 'without override, dwell is still required');
});

test('stationary lock: anchor override is honored after dwell completes', () => {
  const t0 = 7_000_000;
  const route = { lat: SF.lat + 0.0001, lng: SF.lng };
  let s = updateStationaryLock(INITIAL_STATIONARY_LOCK, {
    speedMph: 0.5,
    rawSpeedMps: 0.4, // above instant threshold; dwell required
    matched: SF,
    trueLoc: SF,
    heading: 92,
    nowMs: t0,
    anchorOverride: route,
  });
  s = updateStationaryLock(s, {
    speedMph: 0.5,
    rawSpeedMps: 0.4,
    matched: SF,
    trueLoc: SF,
    heading: 92,
    nowMs: t0 + STATIONARY_DWELL_MS + 1,
    anchorOverride: route,
  });
  assert.equal(s.locked, true);
  assert.deepEqual(s.anchor, route);
});

/* ── Coord resolver ────────────────────────────────────────────────── */

test('resolvePuckCoord: locked → returns anchor regardless of fresh inputs', () => {
  const lock = {
    ...INITIAL_STATIONARY_LOCK,
    locked: true,
    anchor: SF,
    anchorHeading: 0,
  };
  const matched = { lat: SF.lat + 0.001, lng: SF.lng + 0.001 };
  const out = resolvePuckCoord({ matched, trueLoc: SF, prevPublished: null, lock });
  assert.deepEqual(out, SF);
});

test('resolvePuckCoord: small divergence → matched as-is', () => {
  // 0.0001 deg lat ≈ 11 m — well within soft leash.
  const matched = { lat: SF.lat + 0.0001, lng: SF.lng };
  const out = resolvePuckCoord({
    matched,
    trueLoc: SF,
    prevPublished: null,
    lock: INITIAL_STATIONARY_LOCK,
  });
  assert.deepEqual(out, matched);
});

test('resolvePuckCoord: large divergence → snaps to true GPS', () => {
  // 0.002 deg lat ≈ 222 m — beyond hard leash.
  const matched = { lat: SF.lat + 0.002, lng: SF.lng };
  const out = resolvePuckCoord({
    matched,
    trueLoc: SF,
    prevPublished: null,
    lock: INITIAL_STATIONARY_LOCK,
  });
  assert.deepEqual(out, SF);
});

test('resolvePuckCoord: missing matched falls back to true GPS, then prev', () => {
  const a = resolvePuckCoord({
    matched: null,
    trueLoc: SF,
    prevPublished: null,
    lock: INITIAL_STATIONARY_LOCK,
  });
  assert.deepEqual(a, SF);
  const prev = { lat: 1, lng: 2 };
  const b = resolvePuckCoord({
    matched: null,
    trueLoc: null,
    prevPublished: prev,
    lock: INITIAL_STATIONARY_LOCK,
  });
  assert.deepEqual(b, prev);
  const c = resolvePuckCoord({
    matched: null,
    trueLoc: null,
    prevPublished: null,
    lock: INITIAL_STATIONARY_LOCK,
  });
  assert.equal(c, null);
});

test('resolvePuckCoord: hard leash widens with poor accuracy', () => {
  // Same divergence (~120 m) — hard reject with good accuracy, blended with bad.
  const matched = { lat: SF.lat + 0.00108, lng: SF.lng };
  const tight = resolvePuckCoord({
    matched,
    trueLoc: SF,
    prevPublished: null,
    lock: INITIAL_STATIONARY_LOCK,
    accuracyM: 5,
  });
  // ~120m > LEASH_HARD_MAX_M (110) with tight accuracy → trueLoc
  assert.deepEqual(tight, SF);

  const loose = resolvePuckCoord({
    matched,
    trueLoc: SF,
    prevPublished: null,
    lock: INITIAL_STATIONARY_LOCK,
    accuracyM: 80,
  });
  // With loose accuracy hard threshold becomes ~158m → still in blend band
  assert.notDeepEqual(loose, SF);
  assert.notDeepEqual(loose, matched);
});

/* ── Heading resolver ──────────────────────────────────────────────── */

test('resolvePuckHeading: locked + anchor heading wins', () => {
  const lock = {
    ...INITIAL_STATIONARY_LOCK,
    locked: true,
    anchor: SF,
    anchorHeading: 75,
  };
  const out = resolvePuckHeading({
    candidate: 200,
    prevHeading: 80,
    speedMph: 0,
    lock,
  });
  assert.equal(out, 75);
});

test('resolvePuckHeading: low speed holds prev', () => {
  const out = resolvePuckHeading({
    candidate: 280,
    prevHeading: 30,
    speedMph: 3, // < 5 mph freeze
    lock: INITIAL_STATIONARY_LOCK,
  });
  assert.equal(out, 30);
});

test('resolvePuckHeading: rejects hard flips at low speed', () => {
  const out = resolvePuckHeading({
    candidate: 200,
    prevHeading: 10,
    speedMph: 8, // below 12 mph but above freeze
    lock: INITIAL_STATIONARY_LOCK,
  });
  // Delta ≈ 170° → reject, stay at prev
  assert.equal(out, 10);
});

test('resolvePuckHeading: rate-limits change to max step at speed', () => {
  const out = resolvePuckHeading({
    candidate: 100,
    prevHeading: 0,
    speedMph: 30,
    lock: INITIAL_STATIONARY_LOCK,
  });
  // Move at most HEADING_MAX_STEP_DEG toward 100°
  assert.equal(out, HEADING_MAX_STEP_DEG);
});

test('resolvePuckHeading: small change passes through normalized', () => {
  const out = resolvePuckHeading({
    candidate: 8,
    prevHeading: 0,
    speedMph: 30,
    lock: INITIAL_STATIONARY_LOCK,
  });
  assert.equal(out, 8);
});

test('resolvePuckHeading: invalid candidate holds prev', () => {
  const out = resolvePuckHeading({
    candidate: -1,
    prevHeading: 250,
    speedMph: 50,
    lock: INITIAL_STATIONARY_LOCK,
  });
  assert.equal(out, 250);
});

test('constants sanity', () => {
  assert.ok(HEADING_FLIP_REJECT_DEG > HEADING_MAX_STEP_DEG);
  assert.ok(LEASH_HARD_MAX_M > 0);
});

/**
 * Tests for the pure helpers behind `ProfileInsightsDashboard`. Locking
 * down the math here means we can keep iterating on the dashboard UI
 * without re-verifying KPI / sparkline / delta arithmetic by hand.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  bucketizeDaily,
  computeDeltas,
  computeKpis,
  filterGemTxInRange,
  filterTripsInRange,
  formatPctDelta,
  getPresetRange,
  getPreviousRange,
  startOfDayMs,
} from './insightsAggregations';
import type { ProfileGemTxItem, ProfileTripHistoryItem } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

function trip(
  daysAgo: number,
  fields: Partial<ProfileTripHistoryItem> = {},
  base: number = Date.parse('2026-04-30T12:00:00.000Z'),
): ProfileTripHistoryItem {
  const ms = base - daysAgo * DAY_MS;
  return {
    id: `t${daysAgo}-${Math.random().toString(36).slice(2, 6)}`,
    date: new Date(ms).toISOString().slice(0, 10),
    time: '12:00',
    origin: 'A',
    destination: 'B',
    distance_miles: 5,
    duration_minutes: 10,
    gems_earned: 3,
    xp_earned: 50,
    safety_score: 90,
    avg_speed_mph: 30,
    max_speed_mph: 55,
    fuel_used_gallons: 0.2,
    hard_braking_events: 0,
    speeding_events: 0,
    tripEndedAtIso: new Date(ms).toISOString(),
    ...fields,
  };
}

/* ── Range helpers ─────────────────────────────────────────────────── */

test('getPresetRange: day starts at local midnight', () => {
  const now = Date.parse('2026-04-30T16:30:00');
  const r = getPresetRange('day', '', '', now);
  assert.equal(r.endMs, now);
  assert.equal(r.startMs, startOfDayMs(new Date(now)));
});

test('getPresetRange: week is 7 days back from now', () => {
  const now = 1_700_000_000_000;
  const r = getPresetRange('week', '', '', now);
  assert.equal(r.endMs, now);
  assert.equal(r.startMs, now - 7 * DAY_MS);
});

test('getPresetRange: invalid custom falls back to week', () => {
  const now = 2_000_000_000_000;
  const r = getPresetRange('custom', '', '', now);
  assert.equal(r.startMs, now - 7 * DAY_MS);
});

test('getPreviousRange: equal length and ends at start', () => {
  const r = { startMs: 1_000, endMs: 5_000 };
  const prev = getPreviousRange(r);
  assert.equal(prev.endMs, r.startMs);
  assert.equal(prev.endMs - prev.startMs, r.endMs - r.startMs);
});

/* ── Filters ───────────────────────────────────────────────────────── */

test('filterTripsInRange / filterGemTxInRange: only inside range', () => {
  const now = Date.parse('2026-04-30T12:00:00.000Z');
  const r = { startMs: now - 3 * DAY_MS, endMs: now };
  const trips: ProfileTripHistoryItem[] = [trip(0, {}, now), trip(2, {}, now), trip(10, {}, now)];
  const filtered = filterTripsInRange(trips, r);
  assert.equal(filtered.length, 2);

  const tx: ProfileGemTxItem[] = [
    { id: '1', type: 'earned', amount: 5, source: 'trip', date: new Date(now - 1 * DAY_MS).toISOString() },
    { id: '2', type: 'spent', amount: 3, source: 'offer', date: new Date(now - 6 * DAY_MS).toISOString() },
  ];
  const inRange = filterGemTxInRange(tx, r);
  assert.equal(inRange.length, 1);
  assert.equal(inRange[0]!.id, '1');
});

test('filterTripsInRange: falls back to startedAtIso when tripEndedAtIso missing', () => {
  const now = Date.parse('2026-04-30T12:00:00.000Z');
  const r = { startMs: now - 3 * DAY_MS, endMs: now };
  const startedMs = now - DAY_MS;
  const trips: ProfileTripHistoryItem[] = [
    trip(2, {
      tripEndedAtIso: undefined,
      startedAtIso: new Date(startedMs).toISOString(),
    }, now),
  ];
  assert.equal(filterTripsInRange(trips, r).length, 1);
});

/* ── KPI math ──────────────────────────────────────────────────────── */

test('computeKpis: empty list yields zeros', () => {
  const k = computeKpis([]);
  assert.equal(k.trips, 0);
  assert.equal(k.miles, 0);
  assert.equal(k.avgSafety, 0);
  assert.equal(k.topSpeedMph, 0);
});

test('computeKpis: aggregates, top speed is max, avg is mile-weighted', () => {
  const trips: ProfileTripHistoryItem[] = [
    trip(0, { distance_miles: 10, avg_speed_mph: 60, max_speed_mph: 75, gems_earned: 6, xp_earned: 100 }),
    trip(1, { distance_miles: 2, avg_speed_mph: 20, max_speed_mph: 35, gems_earned: 1, xp_earned: 10 }),
  ];
  const k = computeKpis(trips);
  assert.equal(k.trips, 2);
  assert.equal(k.miles, 12);
  assert.equal(k.gemsFromTrips, 7);
  assert.equal(k.xpFromTrips, 110);
  assert.equal(k.topSpeedMph, 75);
  assert.equal(k.longestTripMiles, 10);
  // weighted by miles → (60*10 + 20*2) / 12 ≈ 53.33
  assert.ok(Math.abs(k.avgSpeedMph - 53.333) < 0.01);
});

test('computeKpis: avg safety ignores 0/missing scores', () => {
  const trips: ProfileTripHistoryItem[] = [
    trip(0, { safety_score: 100 }),
    trip(1, { safety_score: 0 }), // counted as missing
    trip(2, { safety_score: 80 }),
  ];
  const k = computeKpis(trips);
  assert.equal(k.avgSafety, 90);
});

/* ── Deltas ────────────────────────────────────────────────────────── */

test('computeDeltas: standard up / down %', () => {
  const cur = computeKpis([trip(0, { distance_miles: 12, gems_earned: 6 })]);
  const prev = computeKpis([trip(0, { distance_miles: 6, gems_earned: 3 })]);
  const d = computeDeltas(cur, prev);
  assert.equal(d.miles, 1); // +100%
  assert.equal(d.gems, 1);
});

test('computeDeltas: previous zero → null (no division)', () => {
  const cur = computeKpis([trip(0)]);
  const prev = computeKpis([]);
  const d = computeDeltas(cur, prev);
  assert.equal(d.trips, null);
  assert.equal(d.miles, null);
});

/* ── Daily sparkline ───────────────────────────────────────────────── */

test('bucketizeDaily: 7-day range produces 7 ascending buckets', () => {
  const now = Date.parse('2026-04-30T12:00:00.000Z');
  const r = { startMs: now - 6 * DAY_MS, endMs: now };
  const trips: ProfileTripHistoryItem[] = [
    trip(0, { distance_miles: 5 }, now),
    trip(0, { distance_miles: 7 }, now),
    trip(3, { distance_miles: 12 }, now),
    trip(8, { distance_miles: 99 }, now), // out of range, ignored
  ];
  const pts = bucketizeDaily(trips, r);
  assert.equal(pts.length, 7);
  for (let i = 1; i < pts.length; i += 1) {
    assert.ok(pts[i]!.dayStartMs > pts[i - 1]!.dayStartMs);
  }
  const totalMiles = pts.reduce((s, p) => s + p.miles, 0);
  assert.equal(totalMiles, 24);
});

test('bucketizeDaily: clamps to maxBuckets', () => {
  const now = Date.parse('2026-04-30T12:00:00.000Z');
  const r = { startMs: now - 60 * DAY_MS, endMs: now };
  const pts = bucketizeDaily([], r, 31);
  assert.equal(pts.length, 31);
});

/* ── Formatters ────────────────────────────────────────────────────── */

test('formatPctDelta: rounds and prefixes sign', () => {
  assert.equal(formatPctDelta(0.123), '+12%');
  assert.equal(formatPctDelta(-0.456), '-46%');
  assert.equal(formatPctDelta(0), '0%');
  assert.equal(formatPctDelta(null), '—');
});

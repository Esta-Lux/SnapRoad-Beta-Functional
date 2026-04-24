/**
 * Tests the pure hysteresis helpers used by `NavigationStatusStrip` and
 * `TurnInstructionCard`. These were carved out of the components so we can
 * lock down the Apple-Maps-stable behaviour (no minute ping-pong, no
 * single-frame text flips, no 29↔30 mph dance) without a React renderer.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ARRIVAL_DWELL_MS,
  ARRIVAL_JUMP_MS,
  SPEED_MPH_DELTA,
  TEXT_STABLE_MS,
  resolveStableArrival,
  resolveStableManeuverDisplayMeters,
  resolveStableSpeedMph,
  resolveStableText,
  type ManeuverDisplayMetersState,
  type StableTextState,
} from './navDisplayHysteresis';

// ─── Arrival-minute hysteresis ───────────────────────────────────────────────

test('arrival: first commit seeds the snapshot', () => {
  const out = resolveStableArrival(null, 1_700_000_000_000, 0);
  assert.equal(out.epoch, 1_700_000_000_000);
  assert.equal(out.updatedAt, 0);
});

test('arrival: holds previous minute when new is same-minute', () => {
  const prev = { epoch: 1_700_000_000_000, updatedAt: 0 }; // 00:00:00.000
  const nextSameMin = resolveStableArrival(prev, prev.epoch + 10_000, 3_000); // +10 s, still within minute
  assert.strictEqual(nextSameMin, prev, 'same-minute should hold previous');
});

test('arrival: commits new minute after dwell elapsed', () => {
  const prev = { epoch: 1_700_000_000_000, updatedAt: 0 };
  const rawNext = prev.epoch + 61_000; // crosses minute boundary
  const out = resolveStableArrival(prev, rawNext, ARRIVAL_DWELL_MS + 10);
  assert.equal(out.epoch, rawNext);
  assert.equal(out.updatedAt, ARRIVAL_DWELL_MS + 10);
});

test('arrival: holds when new minute differs but dwell NOT elapsed', () => {
  const prev = { epoch: 1_700_000_000_000, updatedAt: 0 };
  const rawNext = prev.epoch + 61_000;
  const out = resolveStableArrival(prev, rawNext, ARRIVAL_DWELL_MS - 200); // too early
  assert.strictEqual(out, prev, 'dwell guard missed');
});

test('arrival: jump > 2 min commits immediately (reroute / traffic)', () => {
  const prev = { epoch: 1_700_000_000_000, updatedAt: 0 };
  const rawNext = prev.epoch + ARRIVAL_JUMP_MS + 1_000;
  const out = resolveStableArrival(prev, rawNext, 500); // before dwell
  assert.equal(out.epoch, rawNext);
  assert.equal(out.updatedAt, 500);
});

test('arrival: non-finite input holds previous', () => {
  const prev = { epoch: 1_700_000_000_000, updatedAt: 0 };
  const out = resolveStableArrival(prev, Number.NaN, 3_000);
  assert.strictEqual(out, prev);
});

// ─── Speed mph hysteresis ────────────────────────────────────────────────────

test('speed: tiny change does not update displayed', () => {
  const out = resolveStableSpeedMph(30, 30.4);
  assert.equal(out, 30);
});

test('speed: ≥ SPEED_MPH_DELTA change commits Math.round of the new speed', () => {
  const out = resolveStableSpeedMph(30, 30 + SPEED_MPH_DELTA + 0.01);
  assert.equal(out, 31);
});

test('speed: downward change ≥ threshold commits rounded value', () => {
  const out = resolveStableSpeedMph(30, 30 - SPEED_MPH_DELTA - 0.01);
  assert.equal(out, 29);
});

test('speed: negative input is treated as unknown and holds display', () => {
  const out = resolveStableSpeedMph(5, -10);
  assert.equal(out, 5, 'invalid reading must not flip display');
});

test('speed: non-finite holds current', () => {
  const out = resolveStableSpeedMph(42, Number.NaN);
  assert.equal(out, 42);
});

// ─── Stable text hold ────────────────────────────────────────────────────────

function seed(text = '', key: string | number = 'k0'): StableTextState {
  return { displayed: text, pending: null, pendingSince: 0, resetKey: key };
}

test('text: empty initial + empty incoming stays empty', () => {
  const out = resolveStableText(seed(), '', 'k0', 1000);
  assert.equal(out.displayed, '');
});

test('text: empty initial + non-empty commits immediately', () => {
  const out = resolveStableText(seed(), 'Turn left', 'k0', 1000);
  assert.equal(out.displayed, 'Turn left');
});

test('text: incoming equals displayed is a no-op', () => {
  const prev: StableTextState = {
    displayed: 'Turn left',
    pending: null,
    pendingSince: 0,
    resetKey: 'k0',
  };
  const out = resolveStableText(prev, 'Turn left', 'k0', 1000);
  assert.strictEqual(out, prev);
});

test('text: different incoming starts pending, holds displayed', () => {
  const prev: StableTextState = {
    displayed: 'Turn left',
    pending: null,
    pendingSince: 0,
    resetKey: 'k0',
  };
  const out = resolveStableText(prev, 'Keep left', 'k0', 1000);
  assert.equal(out.displayed, 'Turn left', 'must hold while pending');
  assert.equal(out.pending, 'Keep left');
  assert.equal(out.pendingSince, 1000);
});

test('text: pending older than TEXT_STABLE_MS commits', () => {
  const prev: StableTextState = {
    displayed: 'Turn left',
    pending: 'Keep left',
    pendingSince: 1000,
    resetKey: 'k0',
  };
  const out = resolveStableText(prev, 'Keep left', 'k0', 1000 + TEXT_STABLE_MS);
  assert.equal(out.displayed, 'Keep left');
  assert.equal(out.pending, null);
});

test('text: incoming reverts to displayed cancels pending', () => {
  const prev: StableTextState = {
    displayed: 'Turn left',
    pending: 'Keep left',
    pendingSince: 1000,
    resetKey: 'k0',
  };
  const out = resolveStableText(prev, 'Turn left', 'k0', 1050);
  assert.equal(out.displayed, 'Turn left');
  assert.equal(out.pending, null);
});

test('text: resetKey change accepts incoming immediately (step advance)', () => {
  const prev: StableTextState = {
    displayed: 'Turn left',
    pending: null,
    pendingSince: 0,
    resetKey: 'k0',
  };
  const out = resolveStableText(prev, 'Turn right onto Elm', 'k1', 1050);
  assert.equal(out.displayed, 'Turn right onto Elm');
  assert.equal(out.resetKey, 'k1');
});

test('text: resetKey change + empty incoming keeps displayed', () => {
  const prev: StableTextState = {
    displayed: 'Turn left',
    pending: null,
    pendingSince: 0,
    resetKey: 'k0',
  };
  const out = resolveStableText(prev, '', 'k1', 1050);
  assert.equal(out.displayed, 'Turn left', 'never blank on real step change');
  assert.equal(out.resetKey, 'k1');
});

test('text: empty incoming never blanks the card under same key', () => {
  const prev: StableTextState = {
    displayed: 'Turn left',
    pending: null,
    pendingSince: 0,
    resetKey: 'k0',
  };
  const out = resolveStableText(prev, '', 'k0', 1050);
  assert.strictEqual(out, prev);
});

test('text: rapid flip A→B→A within TEXT_STABLE_MS stays on A', () => {
  let s: StableTextState = seed('A', 'k0');
  s = resolveStableText(s, 'B', 'k0', 1000); // pending B
  s = resolveStableText(s, 'A', 'k0', 1050); // back to A cancels pending
  s = resolveStableText(s, 'B', 'k0', 1060); // pending B again
  s = resolveStableText(s, 'A', 'k0', 1100); // back to A
  assert.equal(s.displayed, 'A', 'flicker must not cross the 120 ms gate');
});

test('text: custom dwellMs delays commit longer than default', () => {
  const custom = 500;
  const prev: StableTextState = {
    displayed: 'Turn left',
    pending: 'Keep left',
    pendingSince: 1000,
    resetKey: 'k0',
  };
  const at150 = resolveStableText(prev, 'Keep left', 'k0', 1000 + 150, custom);
  assert.equal(at150.displayed, 'Turn left', '150ms is not enough for 500ms dwell');
  const at600 = resolveStableText(prev, 'Keep left', 'k0', 1000 + 600, custom);
  assert.equal(at600.displayed, 'Keep left');
  assert.equal(at600.pending, null);
});

// ─── Native maneuver distance (crawl) ───────────────────────────────────────

test('maneuver dist: key change seeds raw', () => {
  const a = resolveStableManeuverDisplayMeters(null, 37, 0, '0|L', 3.2);
  assert.equal(a.displayed, 37);
});

test('maneuver dist: crawl 37↔40 buckets to 6m grid with hold', () => {
  let s: ManeuverDisplayMetersState | null = null;
  s = resolveStableManeuverDisplayMeters(s, 37, 0, '0|L', 3.2);
  assert.equal(s.displayed, 37);
  const t1 = resolveStableManeuverDisplayMeters(s, 40, 100, '0|L', 3.2);
  assert.equal(t1.displayed, 37, 'within hold window, ignore bounce');
  const t2 = resolveStableManeuverDisplayMeters(s, 40, 900, '0|L', 3.2);
  assert.equal(t2.displayed, 42);
});

test('maneuver dist: monotonic approach commits without full hold', () => {
  let s: ManeuverDisplayMetersState | null = null;
  s = resolveStableManeuverDisplayMeters(s, 30, 0, '0|L', 2);
  const down = resolveStableManeuverDisplayMeters(s, 19, 300, '0|L', 2);
  assert.equal(down.displayed, 18);
});

test('maneuver dist: crawl 45/47/48 share one 6m bucket', () => {
  const mph = 2.1;
  let s: ManeuverDisplayMetersState | null = null;
  s = resolveStableManeuverDisplayMeters(s, 45, 0, '0|L', mph);
  assert.equal(s.displayed, 45);
  s = resolveStableManeuverDisplayMeters(s, 47, 0, '0|L', mph);
  assert.equal(s.displayed, 45);
  s = resolveStableManeuverDisplayMeters(s, 48, 800, '0|L', mph);
  assert.equal(s.displayed, 48);
});

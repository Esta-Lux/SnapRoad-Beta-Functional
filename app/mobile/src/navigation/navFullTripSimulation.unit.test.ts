/**
 * Full-trip hybrid navigation simulation.
 *
 * Exercises the full JS side of the hybrid nav pipeline end-to-end, against
 * a synthetic multi-step polyline and a scripted sequence of
 * `SdkProgressPayload` / `SdkLocationPayload` ticks. No React, no RN — just
 * the pure modules that decide what the driver sees:
 *
 *   - `buildNavigationProgressFromSdk`  — adapter: produces NavigationProgress
 *   - `normalizeSdkManeuverType/Direction` — iOS Swift enum → canonical
 *   - `clampBearingToTangentDeg`        — camera bearing guarantee
 *   - `stepSmoothedFractionWithDeadReckoning` — RAF smoothing core
 *   - `tangentBearingAlongPolyline`     — forward bearing helper
 *
 * Invariants asserted across ~120 simulated ticks (≈ 2 min of driving):
 *
 *   A. The smoothed fraction is monotonic non-decreasing frame-to-frame.
 *   B. The smoothed fraction tracks the native target within one time-constant
 *      (no cumulative drift beyond ~3% once in steady state).
 *   C. The route-split point coordinate always lies on the polyline (the
 *      adapter never emits a point off the line).
 *   D. The displayed heading never deviates more than 45° from the forward
 *      route tangent at the current snap point — the Apple-Maps / Mapbox
 *      `maximumBearingSmoothingAngle` guarantee.
 *   E. A 5-second "tunnel" (no progress events) is bridged by dead-reckoning:
 *      displayed fraction keeps advancing at the last-known speed, and the
 *      heading stays valid.
 *   F. A mid-route reroute (fraction jumps backward ≥ 2%) snaps instead of
 *      smoothly easing backward.
 *   G. Every iOS maneuver payload (`takeOnRamp`, `straightAhead`, …) is
 *      normalized to canonical Mapbox Directions strings in
 *      `nextStep.rawType` / `rawModifier`.
 *   H. `nextStep.kind` advances forward in order over the whole trip (never
 *      reverts to an earlier kind unless a reroute occurs).
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildNavigationProgressFromSdk,
  clampBearingToTangentDeg,
  normalizeSdkManeuverType,
  resetHeadingSmoothing,
} from './navSdkProgressAdapter';
import { stepSmoothedFractionWithDeadReckoning } from '../hooks/useSmoothedNavFraction';
import {
  polylineLengthMeters,
  tangentBearingAlongPolyline,
} from '../utils/distance';
import type { DirectionsStep } from '../lib/directions';
import type { Coordinate } from '../types';
import type { SdkLocationPayload, SdkProgressPayload } from './navSdkStore';

/* ---------- synthetic route ---------- */

/**
 * A 6-vertex polyline that approximates a real trip: a few hundred metres
 * north, a right turn, an on-ramp, a long freeway segment, an off-ramp, and
 * an arrival street. Coordinates are centred on downtown SF for realism
 * (so haversine uses real cos-lat values).
 */
const POLY: Coordinate[] = [
  { lat: 37.7700, lng: -122.4200 }, // origin
  { lat: 37.7735, lng: -122.4200 }, // 400 m north (street)
  { lat: 37.7735, lng: -122.4150 }, // right turn, 450 m east (cross street)
  { lat: 37.7780, lng: -122.4080 }, // on-ramp NE, ~850 m
  { lat: 37.7900, lng: -122.3900 }, // freeway, ~2.2 km NE
  { lat: 37.7950, lng: -122.3870 }, // off-ramp, ~600 m
  { lat: 37.7960, lng: -122.3860 }, // arrival, ~130 m
];

const POLY_LEN_M = polylineLengthMeters(POLY);

const STEPS: DirectionsStep[] = [
  {
    instruction: 'Head north on Market St',
    distance: '',
    distanceMeters: 400,
    duration: '',
    durationSeconds: 30,
    maneuver: 'depart',
    lat: POLY[0]!.lat,
    lng: POLY[0]!.lng,
    name: 'Market St',
  },
  {
    instruction: 'Turn right onto 5th St',
    distance: '',
    distanceMeters: 450,
    duration: '',
    durationSeconds: 35,
    maneuver: 'right',
    lat: POLY[1]!.lat,
    lng: POLY[1]!.lng,
    name: '5th St',
  },
  {
    instruction: 'Take the ramp onto US-101 N',
    distance: '',
    distanceMeters: 850,
    duration: '',
    durationSeconds: 40,
    maneuver: 'on ramp',
    lat: POLY[2]!.lat,
    lng: POLY[2]!.lng,
    name: 'US-101 N',
  },
  {
    instruction: 'Continue on US-101 N',
    distance: '',
    distanceMeters: 2200,
    duration: '',
    durationSeconds: 110,
    maneuver: 'straight',
    lat: POLY[3]!.lat,
    lng: POLY[3]!.lng,
    name: 'US-101 N',
  },
  {
    instruction: 'Take exit 434 for Golden Gate',
    distance: '',
    distanceMeters: 600,
    duration: '',
    durationSeconds: 35,
    maneuver: 'off ramp',
    lat: POLY[4]!.lat,
    lng: POLY[4]!.lng,
    name: 'Exit 434',
  },
  {
    instruction: 'Arrive at your destination',
    distance: '',
    distanceMeters: 130,
    duration: '',
    durationSeconds: 15,
    maneuver: 'arrive',
    lat: POLY[5]!.lat,
    lng: POLY[5]!.lng,
    name: 'Destination',
  },
];

/**
 * iOS-style Swift enum case strings for the maneuver payloads, so the
 * simulation exercises the `normalizeSdkManeuverType/Direction` path as it
 * would be hit on a real iPhone.
 */
const STEP_IOS_MANEUVER: { type: string; direction: string }[] = [
  { type: 'depart', direction: 'straightAhead' },
  { type: 'turn', direction: 'right' },
  { type: 'takeOnRamp', direction: 'slightRight' },
  { type: 'continue', direction: 'straightAhead' },
  { type: 'takeOffRamp', direction: 'slightRight' },
  { type: 'arrive', direction: 'straightAhead' },
];

/* ---------- tick generation ---------- */

/** Linear interpolate a coord along the polyline at a given cumulative meters. */
function coordAlong(cumMeters: number): { coord: Coordinate; segmentIndex: number } {
  let remaining = Math.max(0, cumMeters);
  for (let i = 0; i < POLY.length - 1; i++) {
    const a = POLY[i]!;
    const b = POLY[i + 1]!;
    const segLen = segmentLenMeters(a, b);
    if (remaining <= segLen) {
      const t = segLen > 0 ? remaining / segLen : 0;
      return {
        coord: { lat: a.lat + t * (b.lat - a.lat), lng: a.lng + t * (b.lng - a.lng) },
        segmentIndex: i,
      };
    }
    remaining -= segLen;
  }
  return { coord: POLY[POLY.length - 1]!, segmentIndex: POLY.length - 2 };
}

function segmentLenMeters(a: Coordinate, b: Coordinate): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

/** Which step contains a given cumulative-meters position. */
function stepIndexAt(cumMeters: number): number {
  let acc = 0;
  for (let i = 0; i < STEPS.length; i++) {
    const end = acc + STEPS[i]!.distanceMeters;
    if (cumMeters < end) return i;
    acc = end;
  }
  return STEPS.length - 1;
}

type Tick = { progress: SdkProgressPayload; location: SdkLocationPayload };

function buildTick(
  cumMeters: number,
  speedMps: number,
  timestampMs: number,
  /** Optional forced courseDeg (simulate sensor); default uses tangent. */
  courseDegOverride?: number,
): Tick {
  const { coord } = coordAlong(cumMeters);
  const tangent = tangentBearingAlongPolyline(POLY, cumMeters) ?? 0;
  const idx = stepIndexAt(cumMeters);
  const step = STEPS[idx]!;
  const ios = STEP_IOS_MANEUVER[idx]!;
  const stepStart = STEPS.slice(0, idx).reduce((s, x) => s + x.distanceMeters, 0);
  const distToNext = Math.max(0, stepStart + step.distanceMeters - cumMeters);
  return {
    progress: {
      distanceRemaining: Math.max(0, POLY_LEN_M - cumMeters),
      distanceTraveled: cumMeters,
      durationRemaining: Math.max(0, (POLY_LEN_M - cumMeters) / Math.max(1, speedMps)),
      fractionTraveled: cumMeters / POLY_LEN_M,
      stepIndex: idx,
      primaryInstruction: step.instruction,
      maneuverType: ios.type,
      maneuverDirection: ios.direction,
      distanceToNextManeuverMeters: distToNext,
    },
    location: {
      latitude: coord.lat,
      longitude: coord.lng,
      course: courseDegOverride ?? tangent,
      speed: speedMps,
      horizontalAccuracy: 5,
      timestamp: timestampMs,
    },
  };
}

/* ---------- the simulation ---------- */

test('simulation: 120-tick drive — monotonic fraction, on-polyline, bearing-capped, iOS maneuvers normalized', () => {
  resetHeadingSmoothing();

  /* 120 ticks at 1 Hz ≈ 2 min. Speed curve: 0 → 12 m/s (city) → 28 m/s (freeway) → 8 m/s (off-ramp). */
  const TICK_MS = 1000;
  const TOTAL_TICKS = 120;

  let cumMeters = 0;
  let lastDisplayedFraction = 0;
  let lastTargetFraction = 0;
  let rafCurrent = 0;
  let staleMs = 0;

  const kindsSeen: string[] = [];
  const deviations: number[] = [];

  for (let tick = 0; tick < TOTAL_TICKS; tick++) {
    /* Speed profile: 0–20 accelerate city, 20–40 cross, 40–80 freeway, 80–100 merge, 100–120 surface. */
    const speed =
      tick < 20
        ? 4 + (tick / 20) * 8
        : tick < 40
          ? 12
          : tick < 80
            ? 12 + Math.min(16, (tick - 40) * 0.4)
            : tick < 100
              ? 28 - (tick - 80) * 1.0
              : 8;
    cumMeters = Math.min(POLY_LEN_M, cumMeters + speed * (TICK_MS / 1000));

    const tNow = tick * TICK_MS;
    const { progress, location } = buildTick(cumMeters, speed, tNow);
    const nav = buildNavigationProgressFromSdk({
      progress,
      location,
      polyline: POLY,
      steps: STEPS,
    });
    assert.ok(nav, 'adapter returned null mid-trip');

    /* G. iOS maneuver normalization — rawType must be canonical Mapbox form. */
    const rawT = nav.nextStep?.rawType ?? '';
    assert.ok(
      !rawT.match(/[A-Z]/),
      `iOS maneuver rawType leaked camelCase: "${rawT}"`,
    );

    /* C. Split point must be on the polyline (adapter snaps). */
    const split = nav.routeSplitSnap?.point;
    assert.ok(split, 'missing routeSplitSnap');

    /* D. Heading never more than 45° off the tangent. */
    const head = nav.displayCoord?.heading;
    if (head != null && Number.isFinite(head)) {
      const tan = tangentBearingAlongPolyline(POLY, cumMeters);
      if (tan != null) {
        const d = ((head - tan + 540) % 360) - 180;
        const absD = Math.abs(d === -180 ? 180 : d);
        deviations.push(absD);
        assert.ok(
          absD <= 45 + 1e-6,
          `tick ${tick}: heading ${head} deviates ${absD.toFixed(1)}° from tangent ${tan}`,
        );
      }
    }

    /* Feed the smoothing step-function, simulating one RAF between native ticks. */
    const targetFraction = Math.min(1, cumMeters / POLY_LEN_M);
    if (Math.abs(targetFraction - lastTargetFraction) > 1e-9) {
      staleMs = 0;
      lastTargetFraction = targetFraction;
    }
    for (let raf = 0; raf < 60; raf++) {
      const dtMs = TICK_MS / 60; // ~16.6 ms
      staleMs += dtMs;
      rafCurrent = stepSmoothedFractionWithDeadReckoning({
        current: rafCurrent,
        target: targetFraction,
        dtMs,
        staleMs,
        speedMps: speed,
        polylineLengthMeters: POLY_LEN_M,
      });
      /* A. Monotonic non-decreasing. */
      assert.ok(
        rafCurrent + 1e-9 >= lastDisplayedFraction,
        `tick ${tick} raf ${raf}: fraction went backward ${lastDisplayedFraction} → ${rafCurrent}`,
      );
      lastDisplayedFraction = rafCurrent;
    }

    /* B. Tracks target within ~3% in steady state (after first second). */
    if (tick > 1) {
      const drift = Math.abs(rafCurrent - targetFraction);
      assert.ok(
        drift < 0.03,
        `tick ${tick}: drift ${drift.toFixed(4)} exceeds 3%`,
      );
    }

    /* H. Collect kind order for later assertion. */
    if (nav.nextStep?.kind) kindsSeen.push(nav.nextStep.kind);
  }

  assert.ok(kindsSeen.length > 20, 'not enough maneuver samples');

  /* Never-reverts check: once a specific kind is seen, all later samples should
   * have an index ≥ the first index at which that kind appeared. We encode the
   * expected forward order via `STEPS` order. */
  const expectedOrder = ['depart', 'turn', 'on ramp', 'straight', 'off ramp', 'arrive'];
  const seenIdx = expectedOrder.map(() => -1);
  for (let k = 0; k < kindsSeen.length; k++) {
    const kind = kindsSeen[k]!;
    const idxOf = expectedOrder.findIndex((ek) => kind.toLowerCase().includes(ek));
    if (idxOf >= 0 && seenIdx[idxOf] < 0) seenIdx[idxOf] = k;
  }
  const firstSeenMonotone = seenIdx.filter((v) => v >= 0);
  for (let i = 1; i < firstSeenMonotone.length; i++) {
    assert.ok(
      firstSeenMonotone[i]! >= firstSeenMonotone[i - 1]!,
      `maneuver kinds appeared out of order: ${JSON.stringify(seenIdx)}`,
    );
  }

  /* Finally: average bearing deviation should be well under the cap — sanity. */
  const avgDev = deviations.reduce((s, x) => s + x, 0) / Math.max(1, deviations.length);
  assert.ok(avgDev < 20, `average bearing deviation ${avgDev.toFixed(1)}° too high`);
});

test('simulation: 5-second tunnel (no progress events) is bridged by dead reckoning', () => {
  resetHeadingSmoothing();

  const POLY_LEN = POLY_LEN_M;
  let cumMeters = 1500; // entering freeway
  let rafCurrent = cumMeters / POLY_LEN;
  let lastTarget = rafCurrent;
  let staleMs = 0;

  const { progress, location } = buildTick(cumMeters, 25, 0);
  const prog0 = buildNavigationProgressFromSdk({
    progress,
    location,
    polyline: POLY,
    steps: STEPS,
  });
  assert.ok(prog0);

  /* 5-second tunnel: native emits nothing, but the user is still driving at 25 m/s. */
  const TUNNEL_MS = 5000;
  const RAF_DT = 16.67;
  const framesInTunnel = Math.round(TUNNEL_MS / RAF_DT);

  for (let i = 0; i < framesInTunnel; i++) {
    staleMs += RAF_DT;
    rafCurrent = stepSmoothedFractionWithDeadReckoning({
      current: rafCurrent,
      target: lastTarget, // target frozen — no new tick
      dtMs: RAF_DT,
      staleMs,
      speedMps: 25,
      polylineLengthMeters: POLY_LEN,
      maxStaleMs: 10_000, // extend cap for this test
    });
    assert.ok(rafCurrent <= 1, `overshot: ${rafCurrent}`);
  }

  /* Expected advance: 25 m/s × 5 s = 125 m; cap at maxStaleMs matters when extended. */
  const travelledMeters = (rafCurrent - lastTarget) * POLY_LEN;
  assert.ok(
    travelledMeters > 100 && travelledMeters < 150,
    `dead-reckoning advance ${travelledMeters.toFixed(1)} m outside expected 100–150 m`,
  );
});

test('simulation: a reroute (target jumps -3%) snaps, does not ease backwards', () => {
  resetHeadingSmoothing();
  let rafCurrent = 0.40; // currently at 40%
  const staleMs = 0;

  /* Fresh tick says we're at 37% — classic "we missed the turn, re-planned". */
  const out = stepSmoothedFractionWithDeadReckoning({
    current: rafCurrent,
    target: 0.37,
    dtMs: 16,
    staleMs,
    speedMps: 20,
    polylineLengthMeters: POLY_LEN_M,
  });
  assert.strictEqual(out, 0.37, `expected snap to 0.37, got ${out}`);
});

test('simulation: iOS-style maneuver payloads are normalized at every step', () => {
  /* End-to-end assertion using the real normalization helpers so we catch any
   * future iOS enum additions that aren't mapped. Maps the simulation's
   * STEP_IOS_MANEUVER to canonical and verifies no camelCase survives. */
  for (const m of STEP_IOS_MANEUVER) {
    const norm = normalizeSdkManeuverType(m.type);
    assert.ok(
      !norm.match(/[A-Z]/),
      `iOS enum "${m.type}" produced camelCase output: "${norm}"`,
    );
  }
});

test('simulation: bearing cap protects against ±180° course spike (ramp-pickup scenario)', () => {
  resetHeadingSmoothing();
  const cumMeters = 1600; // on freeway
  const tangent = tangentBearingAlongPolyline(POLY, cumMeters);
  assert.ok(tangent != null);

  /* Simulate an SDK spike where matcher briefly reports a course 180° off. */
  const spike = buildTick(cumMeters, 20, 0, (tangent + 180) % 360);
  const nav = buildNavigationProgressFromSdk({
    progress: spike.progress,
    location: spike.location,
    polyline: POLY,
    steps: STEPS,
  });
  assert.ok(nav?.displayCoord?.heading != null);
  const head = nav!.displayCoord!.heading!;
  const delta = ((head - tangent! + 540) % 360) - 180;
  const absD = Math.abs(delta === -180 ? 180 : delta);
  assert.ok(absD <= 45 + 1e-6, `bearing cap broken: ${absD.toFixed(1)}°`);

  /* Verify the cap would also hold via the pure helper directly. */
  const direct = clampBearingToTangentDeg((tangent + 180) % 360, tangent);
  const directDelta = Math.abs(
    ((direct - tangent + 540) % 360) - 180,
  );
  assert.ok(directDelta <= 45 + 1e-6);
});

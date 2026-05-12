import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeTripCompleteResponse, unwrapTripCompleteData, raceWithTimeout } from '../../lib/tripComplete';
import type { TripSummary } from '../useDriveNavigation';

function baseSummary(overrides: Partial<TripSummary> = {}): TripSummary {
  return {
    distance: 2.3,
    duration: 8,
    safety_score: 85,
    gems_earned: 5,
    xp_earned: 100,
    origin: 'Current Location',
    destination: 'Work',
    date: '2025-01-01',
    counted: true,
    arrivedAtDestination: false,
    ...overrides,
  };
}

test('mergeTripCompleteResponse: wrapped server body merges gems/xp/safety', () => {
  const body = {
    success: true,
    data: {
      trip_id: 'trip-abc',
      counted: true,
      gems_earned: 17,
      xp_earned: 225,
      safety_score: 92.4,
      distance_miles: 2.3,
      profile: { total_miles: 105, total_trips: 42, gems: 1234, xp: 9876 },
    },
  };
  const merged = mergeTripCompleteResponse(baseSummary(), body);
  assert.equal(merged.gems_earned, 17);
  assert.equal(merged.xp_earned, 225);
  assert.equal(merged.safety_score, 92.4);
  assert.equal(merged.counted, true);
  assert.equal(merged.profile_totals?.total_miles, 105);
  assert.equal(merged.profile_totals?.gems, 1234);
});

test('mergeTripCompleteResponse: bare body (no outer data) still works', () => {
  const body = {
    trip_id: 't1',
    counted: true,
    gems_earned: 3,
    xp_earned: 50,
    safety_score: 80,
  };
  const merged = mergeTripCompleteResponse(baseSummary(), body);
  assert.equal(merged.gems_earned, 3);
  assert.equal(merged.counted, true);
});

test('mergeTripCompleteResponse: merges tracking metrics used by trip summary', () => {
  const body = {
    data: {
      trip_id: 'trip-metrics',
      counted: true,
      distance_miles: 12.45,
      duration_seconds: 1840,
      avg_speed_mph: 24.36,
      max_speed_mph: 58.5,
      fuel_used_gallons: 0.5,
      fuel_cost_estimate: 1.8,
      mileage_value_estimate: 8.34,
      baseline_fuel_estimate_gallons: 0.6,
      route_fuel_savings_gallons: 0.1,
      route_savings_dollars: 0.36,
      baseline_duration_seconds: 1980,
      time_saved_seconds: 140,
      savings_model_version: 'route-v1-distance-mpg',
      origin: 'Downtown pickup',
      destination: 'Airport dropoff',
    },
  };
  const merged = mergeTripCompleteResponse(baseSummary(), body);
  assert.equal(merged.distance, 12.45);
  assert.equal(merged.duration_seconds, 1840);
  assert.equal(merged.avg_speed_mph, 24.36);
  assert.equal(merged.max_speed_mph, 58.5);
  assert.equal(merged.fuel_used_gallons, 0.5);
  assert.equal(merged.fuel_cost_estimate, 1.8);
  assert.equal(merged.mileage_value_estimate, 8.34);
  assert.equal(merged.baseline_fuel_estimate_gallons, 0.6);
  assert.equal(merged.route_fuel_savings_gallons, 0.1);
  assert.equal(merged.route_savings_dollars, 0.36);
  assert.equal(merged.route_savings_usd, 0.36);
  assert.equal(merged.baseline_duration_seconds, 1980);
  assert.equal(merged.time_saved_seconds, 140);
  assert.equal(merged.savings_model_version, 'route-v1-distance-mpg');
  assert.equal(merged.origin, 'Downtown pickup');
  assert.equal(merged.destination, 'Airport dropoff');
});

test('mergeTripCompleteResponse: sanitizes impossible speed spikes before summary display', () => {
  const merged = mergeTripCompleteResponse(baseSummary(), {
    data: {
      trip_id: 'trip-spike',
      counted: true,
      distance_miles: 10,
      duration_seconds: 120,
      avg_speed_mph: 300,
      max_speed_mph: 72,
      speeding_events: 1,
    },
  });

  assert.equal(merged.distance, 2.4);
  assert.equal(merged.avg_speed_mph, 72);
  assert.equal(merged.max_speed_mph, 72);
  assert.equal(merged.speeding_events, 1);
});

test('mergeTripCompleteResponse: counted=false when trip_id is null', () => {
  const body = {
    data: {
      trip_id: null,
      counted: false,
      gems_earned: 0,
      xp_earned: 0,
      safety_score: 85,
    },
  };
  const merged = mergeTripCompleteResponse(baseSummary(), body);
  assert.equal(merged.counted, false);
  assert.equal(merged.gems_earned, 0);
});

test('mergeTripCompleteResponse: preserves base values when server fields missing', () => {
  const body = { data: { trip_id: 'x', counted: true } };
  const base = baseSummary({ gems_earned: 9, xp_earned: 150, safety_score: 77 });
  const merged = mergeTripCompleteResponse(base, body);
  assert.equal(merged.gems_earned, 9);
  assert.equal(merged.xp_earned, 150);
  assert.equal(merged.safety_score, 77);
});

test('mergeTripCompleteResponse: returns base untouched for garbage bodies', () => {
  const base = baseSummary();
  assert.deepEqual(mergeTripCompleteResponse(base, null), base);
  assert.deepEqual(mergeTripCompleteResponse(base, 'oops'), base);
  assert.deepEqual(mergeTripCompleteResponse(base, undefined), base);
});

test('mergeTripCompleteResponse: missing profile keeps existing profile_totals', () => {
  const base = baseSummary({
    profile_totals: { total_miles: 50, total_trips: 20, gems: 500, xp: 5000 },
  });
  const body = { data: { trip_id: 'x', counted: true } };
  const merged = mergeTripCompleteResponse(base, body);
  assert.equal(merged.profile_totals?.total_miles, 50);
});

test('unwrapTripCompleteData: returns empty object for non-objects', () => {
  assert.deepEqual(unwrapTripCompleteData(null), {});
  assert.deepEqual(unwrapTripCompleteData('x'), {});
  assert.deepEqual(unwrapTripCompleteData(42), {});
});

test('raceWithTimeout: resolves with the promise value when it wins', async () => {
  const p = new Promise<string>((r) => setTimeout(() => r('done'), 20));
  const out = await raceWithTimeout(p, 200);
  assert.equal(out, 'done');
});

test('raceWithTimeout: returns null when the timer wins', async () => {
  const p = new Promise<string>((r) => setTimeout(() => r('too-late'), 200));
  const out = await raceWithTimeout(p, 20);
  assert.equal(out, null);
});

test('raceWithTimeout: returns null when the promise rejects', async () => {
  const p = Promise.reject(new Error('nope'));
  const out = await raceWithTimeout(p, 200);
  assert.equal(out, null);
});

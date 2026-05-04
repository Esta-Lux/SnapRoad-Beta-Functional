import { strict as assert } from 'node:assert';
import test from 'node:test';
import { mapProfileTripHistoryItem, recentTripsListFromPayload } from './tripHistoryMapping';

test('recentTripsListFromPayload unwraps current and legacy trip envelopes', () => {
  const rows = [{ id: 'trip-1' }];

  assert.equal(recentTripsListFromPayload(rows), rows);
  assert.deepEqual(recentTripsListFromPayload({ recent_trips: rows }), rows);
  assert.deepEqual(recentTripsListFromPayload({ data: { recent_trips: rows } }), rows);
  assert.deepEqual(recentTripsListFromPayload({ data: rows }), rows);
  assert.deepEqual(recentTripsListFromPayload({ data: { data: rows } }), rows);
});

test('mapProfileTripHistoryItem carries summary card metrics into recap details', () => {
  const mapped = mapProfileTripHistoryItem({
    trip_id: 'trip-rich',
    ended_at: '2026-05-03T06:39:03Z',
    started_at: '2026-05-03T06:37:00Z',
    origin: '971 Summit Street, Columbus, Ohio 43201, United States',
    destination: '5407 Silver Dust Ln, Hilliard, OH 43026, USA',
    distance_miles: '1.06',
    duration_seconds: 123,
    safety_score: 85,
    gems_earned: 5,
    xp_earned: 20,
    avg_speed_mph: 42,
    max_speed_mph: 72,
    fuel_used_gallons: 0.04,
    fuel_cost_estimate: 0.14,
    mileage_value_estimate: 0.71,
  });

  assert.equal(mapped.id, 'trip-rich');
  assert.equal(mapped.origin, '971 Summit Street, Columbus, Ohio 43201, United States');
  assert.equal(mapped.destination, '5407 Silver Dust Ln, Hilliard, OH 43026, USA');
  assert.equal(mapped.distance_miles, 1.06);
  assert.equal(mapped.duration_minutes, 2);
  assert.equal(mapped.duration_seconds, 123);
  assert.equal(mapped.safety_score, 85);
  assert.equal(mapped.gems_earned, 5);
  assert.equal(mapped.xp_earned, 20);
  assert.equal(mapped.avg_speed_mph, 42);
  assert.equal(mapped.max_speed_mph, 72);
  assert.equal(mapped.fuel_used_gallons, 0.04);
  assert.equal(mapped.fuel_cost_estimate, 0.14);
  assert.equal(mapped.mileage_value_estimate, 0.71);
  assert.ok(mapped.tripEndedAtIso?.startsWith('2026-05-03T06:39:03'));
});

test('mapProfileTripHistoryItem accepts legacy route and speed aliases', () => {
  const mapped = mapProfileTripHistoryItem({
    id: 'trip-alias',
    date: '2026-05-03',
    time: '02:37:00',
    origin_label: 'Summit Street',
    dest_label: 'Silver Dust Lane',
    distance: 0.4,
    duration: 60,
    safety: 90,
    gems: 5,
    xp: 9,
    avg_speed: 24,
    max_speed: 52,
    fuel_gallons: 0.02,
    mileage_value: 0.27,
    hard_brakes: 1,
  });

  assert.equal(mapped.origin, 'Summit Street');
  assert.equal(mapped.destination, 'Silver Dust Lane');
  assert.equal(mapped.distance_miles, 0.4);
  assert.equal(mapped.duration_minutes, 1);
  assert.equal(mapped.safety_score, 90);
  assert.equal(mapped.gems_earned, 5);
  assert.equal(mapped.xp_earned, 9);
  assert.equal(mapped.avg_speed_mph, 24);
  assert.equal(mapped.max_speed_mph, 52);
  assert.equal(mapped.fuel_used_gallons, 0.02);
  assert.equal(mapped.mileage_value_estimate, 0.27);
  assert.equal(mapped.hard_braking_events, 1);
});

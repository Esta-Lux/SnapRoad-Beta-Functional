import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gemTransactionsFromTrips, mergeCompletedTripRows } from './localCompletedTrips';

test('mergeCompletedTripRows keeps local trip when server history is empty', () => {
  const local = [{
    id: 'local:1',
    ended_at: '2026-05-22T04:10:00Z',
    destination: 'Airport',
    distance: 3.2,
    gems_earned: 5,
  }];
  const merged = mergeCompletedTripRows([], local);
  assert.equal(merged.length, 1);
  assert.deepEqual(merged[0], local[0]);
});

test('mergeCompletedTripRows lets server rows win over matching local recap rows', () => {
  const server = [{
    id: 'server-trip',
    ended_at: '2026-05-22T04:10:12Z',
    destination: 'Airport',
    distance_miles: 3.2,
    gems_earned: 5,
  }];
  const local = [{
    id: 'local:1',
    ended_at: '2026-05-22T04:10:00Z',
    destination: 'Airport',
    distance: 3.2,
    gems_earned: 5,
  }];
  const merged = mergeCompletedTripRows(server, local);
  assert.equal(merged.length, 1);
  assert.deepEqual(merged[0], server[0]);
});

test('gemTransactionsFromTrips derives earned rows from completed trip rewards', () => {
  const tx = gemTransactionsFromTrips([
    { id: 't1', ended_at: '2026-05-22T04:10:00Z', gems_earned: 5 },
    { id: 't2', ended_at: '2026-05-22T04:20:00Z', gems_earned: 0 },
  ]);
  assert.equal(tx.length, 1);
  assert.equal(tx[0]?.amount, 5);
  assert.equal(tx[0]?.type, 'earned');
});

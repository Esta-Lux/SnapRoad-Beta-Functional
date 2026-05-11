import test from 'node:test';
import assert from 'node:assert/strict';

import { destinationCrowMeters, shouldAcceptFinalDestinationArrival } from './navArrivalGuard';

const destination = { lat: 39.9612, lng: -82.9988 };

test('SDK arrival callback is ignored when ETA and distance still show minutes away', () => {
  const farAway = { lat: 39.984, lng: -83.012 };
  assert.equal(
    shouldAcceptFinalDestinationArrival({
      destination,
      matched: farAway,
      fallback: null,
      remainingMeters: 420,
      remainingSeconds: 240,
    }),
    false,
  );
});

test('SDK arrival callback is accepted only when physically near or route progress is terminal', () => {
  const near = { lat: 39.96122, lng: -82.99882 };
  assert.ok(destinationCrowMeters(destination, near, null) < 5);
  assert.equal(
    shouldAcceptFinalDestinationArrival({
      destination,
      matched: near,
      fallback: null,
      remainingMeters: 300,
      remainingSeconds: 180,
    }),
    true,
  );

  const almostDone = { lat: 39.96175, lng: -82.9991 };
  assert.equal(
    shouldAcceptFinalDestinationArrival({
      destination,
      matched: almostDone,
      fallback: null,
      remainingMeters: 28,
      remainingSeconds: 18,
    }),
    true,
  );
});

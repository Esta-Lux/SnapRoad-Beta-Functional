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

test('SDK arrival callback is ignored when physically near but route progress is not terminal', () => {
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
    false,
  );
});

test('SDK arrival callback is accepted only when route progress is terminal at the destination', () => {
  const almostDone = { lat: 39.96135, lng: -82.9989 };
  assert.equal(
    shouldAcceptFinalDestinationArrival({
      destination,
      matched: almostDone,
      fallback: null,
      remainingMeters: 20,
      remainingSeconds: 18,
    }),
    true,
  );
});

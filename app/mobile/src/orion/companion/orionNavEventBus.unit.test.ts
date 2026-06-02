import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import {
  publishOrionNavigationEvent,
  resetOrionNavigationEventBusForTests,
  subscribeOrionNavigationEvents,
  type OrionNavigationEvent,
} from './orionNavEventBus';

afterEach(() => {
  resetOrionNavigationEventBusForTests();
});

test('orion nav event bus publishes events in order', () => {
  const seen: OrionNavigationEvent[] = [];
  const unsubscribe = subscribeOrionNavigationEvents((event) => {
    seen.push(event);
  });

  publishOrionNavigationEvent({ type: 'navigation_started', tripId: 'trip-1' });
  publishOrionNavigationEvent({ type: 'reroute' });
  unsubscribe();

  assert.deepEqual(seen, [
    { type: 'navigation_started', tripId: 'trip-1' },
    { type: 'reroute' },
  ]);
});

test('orion nav event bus unsubscribe stops delivery', () => {
  let count = 0;
  const unsubscribe = subscribeOrionNavigationEvents(() => {
    count += 1;
  });

  publishOrionNavigationEvent({ type: 'heavy_traffic' });
  unsubscribe();
  publishOrionNavigationEvent({ type: 'arrival' });

  assert.equal(count, 1);
});

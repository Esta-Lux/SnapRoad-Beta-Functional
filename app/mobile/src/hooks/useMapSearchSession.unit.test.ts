import test from 'node:test';
import assert from 'node:assert/strict';

import { dedupeGeocodeResults, localMatchesForSearchQuery } from './useMapSearchSession';

test('dedupeGeocodeResults removes duplicate place ids', () => {
  const input = [
    { place_id: 'p1', name: 'A', address: '1', lat: 1, lng: 1 },
    { place_id: 'p1', name: 'A2', address: '2', lat: 2, lng: 2 },
  ];
  const out = dedupeGeocodeResults(input as any);
  assert.equal(out.length, 1);
  assert.equal(out[0].place_id, 'p1');
});

test('localMatchesForSearchQuery includes matching saved and recent', () => {
  const out = localMatchesForSearchQuery(
    'home',
    [{ id: 1, name: 'Home', address: 'Main', category: 'home', lat: 1, lng: 1 }],
    [{ name: 'Home Depot', address: 'Town', lat: 2, lng: 2 }],
  );
  assert.equal(out.length, 2);
});

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  mapFriendsApiToLocations,
  mergeLiveLocationUpdate,
} from './useMapFriendPresence';

test('mapFriendsApiToLocations normalizes friend rows', () => {
  const rows = [
    {
      friend_id: 'u1',
      name: 'Alex',
      lat: 40.1,
      lng: -82.9,
      speed_mph: 22,
      is_sharing: true,
    },
  ];
  const out = mapFriendsApiToLocations(rows);
  assert.equal(out.length, 1);
  assert.equal(out[0].id, 'u1');
  assert.equal(out[0].name, 'Alex');
  assert.equal(out[0].speedMph, 22);
});

test('mergeLiveLocationUpdate updates only matching friend', () => {
  const prev = [
    { id: 'u1', name: 'A', lat: 1, lng: 1, heading: 0, speedMph: 0, isNavigating: false, lastUpdated: '', isSharing: true },
    { id: 'u2', name: 'B', lat: 2, lng: 2, heading: 0, speedMph: 0, isNavigating: false, lastUpdated: '', isSharing: true },
  ];
  const next = mergeLiveLocationUpdate(prev, {
    friend_id: 'u2',
    lat: 9,
    lng: 8,
    speed_mph: 35,
    is_navigating: true,
  });
  assert.equal(next[0].lat, 1);
  assert.equal(next[1].lat, 9);
  assert.equal(next[1].speedMph, 35);
  assert.equal(next[1].isNavigating, true);
});

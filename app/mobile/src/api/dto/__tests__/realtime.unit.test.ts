import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLiveLocationUpdate } from '../realtime';

test('parseLiveLocationUpdate maps Supabase user_id to friend id', () => {
  const u = parseLiveLocationUpdate({
    user_id: '11111111-1111-1111-1111-111111111111',
    lat: 40.7,
    lng: -74.0,
    is_sharing: true,
    last_updated: '2026-01-01T00:00:00Z',
  });
  assert.ok(u);
  assert.equal(u.friendId, '11111111-1111-1111-1111-111111111111');
  assert.equal(u.lat, 40.7);
});

test('parseLiveLocationUpdate accepts legacy friend_id', () => {
  const u = parseLiveLocationUpdate({
    friend_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    lat: 1,
    lng: 2,
  });
  assert.ok(u);
  assert.equal(u.friendId, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
});

test('parseLiveLocationUpdate returns null without user_id or friend_id', () => {
  assert.equal(parseLiveLocationUpdate({ lat: 1, lng: 2 }), null);
});

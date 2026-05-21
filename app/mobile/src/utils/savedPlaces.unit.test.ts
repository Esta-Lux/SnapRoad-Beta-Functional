import assert from 'node:assert/strict';
import test from 'node:test';
import {
  findSavedPlaceNearCoords,
  hasSavedPlaceCoords,
  isQuickAccessSavedPlace,
  normalizeSavedLocation,
  parseSavedLocationsPayload,
  unwrapSavedLocationFromWriteResponse,
} from './savedPlaces';

test('parses nested API list and normalizes categories', () => {
  const rows = parseSavedLocationsPayload({
    success: true,
    data: [{ id: '7', name: 'Cafe', address: 'Main', category: 'Favorite', lat: '40.1', lng: '-83.0' }],
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.category, 'favorite');
  assert.equal(rows[0]?.lat, 40.1);
});

test('matches favorites near coordinates', () => {
  const match = findSavedPlaceNearCoords(
    [{ id: 1, name: 'Cafe', address: '', category: 'favorite', lat: 40.1, lng: -83.0 }],
    40.10001,
    -83.00001,
  );
  assert.equal(match?.id, 1);
});

test('rejects null island coordinates', () => {
  assert.equal(hasSavedPlaceCoords(0, 0), false);
  const saved = normalizeSavedLocation({
    id: 1,
    name: 'X',
    address: '',
    category: 'favorite',
    lat: 0,
    lng: 0,
  });
  assert.equal(saved?.lat, 0);
});

test('unwraps write response payload', () => {
  const saved = unwrapSavedLocationFromWriteResponse({
    success: true,
    data: { id: 3, name: 'Home', address: '1 Main', category: 'favorite', lat: 41, lng: -82 },
  });
  assert.equal(saved?.id, 3);
});

test('treats quick-access categories case-insensitively', () => {
  assert.equal(isQuickAccessSavedPlace({ id: 1, name: 'A', address: '', category: 'Work' }), true);
  assert.equal(isQuickAccessSavedPlace({ id: 2, name: 'B', address: '', category: 'commute' }), false);
});

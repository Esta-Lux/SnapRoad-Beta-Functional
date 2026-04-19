import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OPEN_NOW_DISPLAY_TTL_MS,
  parseOpenNowBooleanFromDetailsPayload,
  openBooleanToKind,
  isOpenNowFresh,
  migratePersistedRecentSearch,
  formatOpenLabelForSearchRow,
} from '../placeHours';
import type { GeocodeResult } from '../../lib/directions';

test('parseOpenNowBooleanFromDetailsPayload reads top-level open_now', () => {
  assert.equal(parseOpenNowBooleanFromDetailsPayload({ open_now: true }), true);
  assert.equal(parseOpenNowBooleanFromDetailsPayload({ open_now: false }), false);
});

test('parseOpenNowBooleanFromDetailsPayload reads opening_hours.open_now', () => {
  assert.equal(parseOpenNowBooleanFromDetailsPayload({ opening_hours: { open_now: true } }), true);
  assert.equal(parseOpenNowBooleanFromDetailsPayload({ opening_hours: { open_now: false } }), false);
});

test('top-level open_now wins when both present', () => {
  assert.equal(
    parseOpenNowBooleanFromDetailsPayload({ open_now: false, opening_hours: { open_now: true } }),
    false,
  );
});

test('business_status CLOSED_PERMANENTLY is closed', () => {
  assert.equal(
    parseOpenNowBooleanFromDetailsPayload({ business_status: 'CLOSED_PERMANENTLY', open_now: true }),
    false,
  );
});

test('missing hours → null → unknown kind', () => {
  assert.equal(parseOpenNowBooleanFromDetailsPayload({}), null);
  assert.equal(openBooleanToKind(null), 'unknown');
  assert.equal(openBooleanToKind(undefined), 'unknown');
});

test('isOpenNowFresh respects TTL', () => {
  const now = 1_000_000;
  assert.equal(isOpenNowFresh(now - OPEN_NOW_DISPLAY_TTL_MS, now), true);
  assert.equal(isOpenNowFresh(now - OPEN_NOW_DISPLAY_TTL_MS - 1, now), false);
  assert.equal(isOpenNowFresh(undefined, now), false);
});

test('migratePersistedRecentSearch drops stale open_now', () => {
  const row: GeocodeResult = {
    name: 'X',
    lat: 1,
    lng: 2,
    place_id: 'pid',
    open_now: true,
    open_now_last_updated_at: 0,
  };
  const m = migratePersistedRecentSearch(row);
  assert.equal(m.open_now, undefined);
  assert.equal(m.open_now_last_updated_at, undefined);
});

test('formatOpenLabelForSearchRow recent: fresh true → Open now', () => {
  const row: GeocodeResult = {
    name: 'Cafe',
    lat: 1,
    lng: 2,
    place_id: 'p1',
    open_now: true,
    open_now_last_updated_at: Date.now(),
  };
  const o = formatOpenLabelForSearchRow(row, true);
  assert.equal(o.label, 'Open now');
  assert.equal(o.variant, 'open');
});

test('formatOpenLabelForSearchRow recent: stale → Check hours', () => {
  const row: GeocodeResult = {
    name: 'Cafe',
    lat: 1,
    lng: 2,
    place_id: 'p1',
    open_now: true,
    open_now_last_updated_at: Date.now() - OPEN_NOW_DISPLAY_TTL_MS - 60_000,
  };
  const o = formatOpenLabelForSearchRow(row, true);
  assert.equal(o.label, 'Check hours');
  assert.equal(o.variant, 'neutral');
});

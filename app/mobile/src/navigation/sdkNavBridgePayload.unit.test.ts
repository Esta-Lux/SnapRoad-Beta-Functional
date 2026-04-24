import assert from 'node:assert/strict';
import { test } from 'node:test';
import { nativeFormattedDistanceFromProgressPayload } from './sdkNavBridgePayload';

test('nativeFormatted: formattedDistance + unit wins over primaryDistanceFormatted', () => {
  const r = nativeFormattedDistanceFromProgressPayload({
    formattedDistance: '500',
    formattedDistanceUnit: 'ft',
    primaryDistanceFormatted: '0.1 mi',
  });
  assert.deepEqual(r, { value: '500', unit: 'ft' });
});

test('nativeFormatted: uses primaryDistanceFormatted when split fields absent', () => {
  const r = nativeFormattedDistanceFromProgressPayload({
    primaryDistanceFormatted: '0.2 mi',
  });
  assert.deepEqual(r, { value: '0.2 mi', unit: '' });
});

test('nativeFormatted: trims value; empty/missing returns null', () => {
  assert.deepEqual(
    nativeFormattedDistanceFromProgressPayload({ formattedDistance: '  500  ', formattedDistanceUnit: ' ft ' }),
    { value: '500', unit: 'ft' },
  );
  assert.equal(nativeFormattedDistanceFromProgressPayload({}), null);
  assert.equal(
    nativeFormattedDistanceFromProgressPayload({ primaryDistanceFormatted: '   ' }),
    null,
  );
  assert.equal(nativeFormattedDistanceFromProgressPayload({ formattedDistance: '   ' }), null);
});

test('nativeFormatted: primary with empty string formattedDistance falls through to primary', () => {
  const r = nativeFormattedDistanceFromProgressPayload({
    formattedDistance: '',
    primaryDistanceFormatted: '1/4 mi',
  });
  assert.deepEqual(r, { value: '1/4 mi', unit: '' });
});

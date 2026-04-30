import test from 'node:test';
import assert from 'node:assert/strict';

import { extractLocationSharingState, extractLocationSharingValue, getApiErrorMessage } from './locationSharing';

test('extractLocationSharingValue reads nested data envelope', () => {
  assert.equal(extractLocationSharingValue({ data: { is_sharing: true } }), true);
  assert.equal(extractLocationSharingValue({ data: { is_sharing: false } }), false);
});

test('extractLocationSharingValue reads flat payload and rejects invalid shapes', () => {
  assert.equal(extractLocationSharingValue({ is_sharing: true }), true);
  assert.equal(extractLocationSharingValue({ is_sharing: 'true' }), null);
  assert.equal(extractLocationSharingValue(null), null);
});

test('extractLocationSharingState normalizes share modes', () => {
  assert.deepEqual(
    extractLocationSharingState({ data: { is_sharing: true, sharing_mode: 'always_follow' } }),
    { isSharing: true, sharingMode: 'always_follow' },
  );
  assert.deepEqual(
    extractLocationSharingState({ is_sharing: true, sharing_mode: 'unexpected' }),
    { isSharing: true, sharingMode: 'while_using' },
  );
  assert.deepEqual(
    extractLocationSharingState({ is_sharing: false, sharing_mode: 'always_follow' }),
    { isSharing: false, sharingMode: 'off' },
  );
});

test('getApiErrorMessage returns null on success and fallback on empty failures', () => {
  assert.equal(getApiErrorMessage({ success: true }, 'fallback'), null);
  assert.equal(getApiErrorMessage({ success: false, error: 'Boom' }, 'fallback'), 'Boom');
  assert.equal(getApiErrorMessage({ success: false, error: '' }, 'fallback'), 'fallback');
});

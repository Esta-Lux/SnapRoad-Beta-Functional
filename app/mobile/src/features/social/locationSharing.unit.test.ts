import test from 'node:test';
import assert from 'node:assert/strict';

import { extractLocationSharingValue, getApiErrorMessage } from './locationSharing';

test('extractLocationSharingValue reads nested data envelope', () => {
  assert.equal(extractLocationSharingValue({ data: { is_sharing: true } }), true);
  assert.equal(extractLocationSharingValue({ data: { is_sharing: false } }), false);
});

test('extractLocationSharingValue reads flat payload and rejects invalid shapes', () => {
  assert.equal(extractLocationSharingValue({ is_sharing: true }), true);
  assert.equal(extractLocationSharingValue({ is_sharing: 'true' }), null);
  assert.equal(extractLocationSharingValue(null), null);
});

test('getApiErrorMessage returns null on success and fallback on empty failures', () => {
  assert.equal(getApiErrorMessage({ success: true }, 'fallback'), null);
  assert.equal(getApiErrorMessage({ success: false, error: 'Boom' }, 'fallback'), 'Boom');
  assert.equal(getApiErrorMessage({ success: false, error: '' }, 'fallback'), 'fallback');
});

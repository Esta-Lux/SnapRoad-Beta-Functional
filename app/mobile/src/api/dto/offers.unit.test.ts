import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseNearbyOffers,
  parseRedeemOfferPayload,
  unwrapApiData,
} from './offers';

test('unwrapApiData handles nested data shape', () => {
  const payload = { data: { data: [{ id: 1 }] } };
  assert.deepEqual(unwrapApiData(payload), [{ id: 1 }]);
});

test('parseNearbyOffers returns empty list for non-array', () => {
  assert.deepEqual(parseNearbyOffers({ data: { total: 1 } }), []);
});

test('parseRedeemOfferPayload parses important fields', () => {
  const parsed = parseRedeemOfferPayload({
    data: {
      data: {
        gem_cost: 45,
        new_gem_total: 120,
        redemption_id: 'abc',
      },
    },
  });
  assert.equal(parsed.gem_cost, 45);
  assert.equal(parsed.new_gem_total, 120);
  assert.equal(parsed.redemption_id, 'abc');
});

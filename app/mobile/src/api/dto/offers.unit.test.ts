import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseNearbyOffers,
  parseRedeemOfferPayload,
  unwrapApiData,
} from './offers';
import { parseProfilePatch } from './profileWallet';

test('unwrapApiData handles nested data shape', () => {
  const payload = { data: { data: [{ id: 1 }] } };
  assert.deepEqual(unwrapApiData(payload), [{ id: 1 }]);
});

test('parseNearbyOffers returns empty list for non-array', () => {
  assert.deepEqual(parseNearbyOffers({ data: { total: 1 } }), []);
});

test('parseNearbyOffers accepts envelope with nested offers array', () => {
  const payload = { data: { offers: [{ id: 'a' }, { id: 'b' }] } };
  assert.deepEqual(parseNearbyOffers(payload), [{ id: 'a' }, { id: 'b' }]);
});

test('parseNearbyOffers accepts envelope with nested items array', () => {
  const payload = { data: { items: [{ id: 'x' }] } };
  assert.deepEqual(parseNearbyOffers(payload), [{ id: 'x' }]);
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

test('parseProfilePatch maps numeric scalars', () => {
  const patch = parseProfilePatch({
    data: {
      gems: 240,
      level: 3,
      total_miles: 128.4,
      total_trips: 17,
      safety_score: 92,
      xp: 1580,
      streak: 5,
    },
  });
  assert.equal(patch.gems, 240);
  assert.equal(patch.level, 3);
  assert.equal(patch.totalMiles, 128.4);
  assert.equal(patch.totalTrips, 17);
  assert.equal(patch.safetyScore, 92);
  assert.equal(patch.xp, 1580);
  assert.equal(patch.streak, 5);
});

test('parseProfilePatch derives isPremium from plan=premium', () => {
  const patch = parseProfilePatch({ data: { plan: 'premium' } });
  assert.equal(patch.plan, 'premium');
  assert.equal(patch.isPremium, true);
  assert.equal(patch.isFamilyPlan, false);
});

test('parseProfilePatch derives isFamilyPlan + isPremium from plan=family', () => {
  const patch = parseProfilePatch({ data: { plan: 'family' } });
  assert.equal(patch.plan, 'family');
  assert.equal(patch.isPremium, true);
  assert.equal(patch.isFamilyPlan, true);
});

test('parseProfilePatch falls back to is_premium when plan is absent', () => {
  const patch = parseProfilePatch({ data: { is_premium: true } });
  assert.equal(patch.isPremium, true);
  // No plan string -> isFamilyPlan must NOT be emitted (avoids silent demotion).
  assert.equal(patch.isFamilyPlan, undefined);
  assert.equal(patch.plan, undefined);
});

test('parseProfilePatch does NOT emit isPremium when server sent neither plan nor is_premium', () => {
  // Important: a partial payload that omits plan must not silently flip premium off.
  const patch = parseProfilePatch({ data: { gems: 10 } });
  assert.equal(patch.gems, 10);
  assert.equal(patch.isPremium, undefined);
  assert.equal(patch.plan, undefined);
  assert.equal(patch.isFamilyPlan, undefined);
});

import test from 'node:test';
import assert from 'node:assert/strict';

import { buildConfiguredSkuSet, pickPurchasesToRestore } from './appleIapSkus';

const PREMIUM_ASC_ID = 'com.snaproad.app.premium.monthly.plan';

test('buildConfiguredSkuSet collects premium SKU (and optional legacy family when set)', () => {
  const skus = buildConfiguredSkuSet({
    appleIapPremiumProductId: PREMIUM_ASC_ID,
    appleIapFamilyProductId: 'com.legacy.family',
  });
  assert.equal(skus.size, 2);
  assert.ok(skus.has(PREMIUM_ASC_ID));
  assert.ok(skus.has('com.legacy.family'));
});

test('buildConfiguredSkuSet is premium-only when family is blank', () => {
  const skus = buildConfiguredSkuSet({
    appleIapPremiumProductId: `   ${PREMIUM_ASC_ID}   `,
    appleIapFamilyProductId: '',
  });
  assert.equal(skus.size, 1);
  assert.ok(skus.has(PREMIUM_ASC_ID));
});

test('buildConfiguredSkuSet returns an empty set when nothing is configured', () => {
  assert.equal(buildConfiguredSkuSet({}).size, 0);
  assert.equal(
    buildConfiguredSkuSet({
      appleIapPremiumProductId: undefined,
      appleIapFamilyProductId: undefined,
    }).size,
    0,
  );
});

test('pickPurchasesToRestore keeps only purchases whose productId is in the allow-list', () => {
  const purchases = [
    { productId: PREMIUM_ASC_ID, transactionId: 't1' },
    { productId: 'com.othersapp.pro', transactionId: 't2' },
    { productId: 'com.legacy.family', transactionId: 't3' },
  ];
  const skus = new Set([PREMIUM_ASC_ID, 'com.legacy.family']);
  const out = pickPurchasesToRestore(purchases, skus);
  assert.equal(out.length, 2);
  assert.deepEqual(
    out.map((p) => p.transactionId),
    ['t1', 't3'],
  );
});

test('pickPurchasesToRestore returns an empty array when no purchase matches', () => {
  const purchases = [{ productId: 'com.othersapp.pro' }];
  const skus = new Set([PREMIUM_ASC_ID]);
  assert.deepEqual(pickPurchasesToRestore(purchases, skus), []);
});

test('pickPurchasesToRestore returns an empty array when the allow-list is empty', () => {
  const purchases = [{ productId: PREMIUM_ASC_ID }];
  assert.deepEqual(pickPurchasesToRestore(purchases, new Set()), []);
});

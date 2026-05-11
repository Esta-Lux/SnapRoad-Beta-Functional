import test from 'node:test';
import assert from 'node:assert/strict';

import { buildConfiguredSkuSet, pickPurchasesToRestore } from './appleIapSkus';

test('buildConfiguredSkuSet collects the configured premium + family SKUs', () => {
  const skus = buildConfiguredSkuSet({
    appleIapPremiumProductId: 'com.snaproad.premium.monthly',
    appleIapFamilyProductId: 'com.snaproad.family.monthly',
  });
  assert.equal(skus.size, 2);
  assert.ok(skus.has('com.snaproad.premium.monthly'));
  assert.ok(skus.has('com.snaproad.family.monthly'));
});

test('buildConfiguredSkuSet trims whitespace and ignores blank entries', () => {
  const skus = buildConfiguredSkuSet({
    appleIapPremiumProductId: '   com.snaproad.premium.monthly   ',
    appleIapFamilyProductId: '',
  });
  assert.equal(skus.size, 1);
  assert.ok(skus.has('com.snaproad.premium.monthly'));
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
    { productId: 'com.snaproad.premium.monthly', transactionId: 't1' },
    { productId: 'com.othersapp.pro', transactionId: 't2' },
    { productId: 'com.snaproad.family.monthly', transactionId: 't3' },
  ];
  const skus = new Set(['com.snaproad.premium.monthly', 'com.snaproad.family.monthly']);
  const out = pickPurchasesToRestore(purchases, skus);
  assert.equal(out.length, 2);
  assert.deepEqual(
    out.map((p) => p.transactionId),
    ['t1', 't3'],
  );
});

test('pickPurchasesToRestore returns an empty array when no purchase matches', () => {
  const purchases = [{ productId: 'com.othersapp.pro' }];
  const skus = new Set(['com.snaproad.premium.monthly']);
  assert.deepEqual(pickPurchasesToRestore(purchases, skus), []);
});

test('pickPurchasesToRestore returns an empty array when the allow-list is empty', () => {
  const purchases = [{ productId: 'com.snaproad.premium.monthly' }];
  assert.deepEqual(pickPurchasesToRestore(purchases, new Set()), []);
});

/**
 * Pure helpers for the Apple IAP path that don't touch `react-native` so
 * they can be unit-tested under Node's native test runner without mocking
 * StoreKit / `react-native-iap`.
 */

/**
 * Build the SKU allow-list from a flat config object (the shape we keep in
 * `Constants.expoConfig.extra`). Anything missing or empty is omitted, so
 * dev builds without a configured SKU never restore an unintended product.
 */
export function buildConfiguredSkuSet(config: {
  appleIapPremiumProductId?: string;
  appleIapFamilyProductId?: string;
}): Set<string> {
  const out = new Set<string>();
  const p = config.appleIapPremiumProductId?.trim();
  const f = config.appleIapFamilyProductId?.trim();
  if (p) out.add(p);
  if (f) out.add(f);
  return out;
}

/**
 * Select past purchases that belong to our app and are candidates for the
 * "Restore Purchases" flow. Anything outside the configured SKU allow-list
 * is skipped — restoring an unrelated subscription would be both a UX
 * surprise and a privilege-escalation risk.
 */
export function pickPurchasesToRestore<T extends { productId: string }>(
  purchases: readonly T[],
  skus: ReadonlySet<string>,
): T[] {
  return purchases.filter((p) => skus.has(p.productId));
}

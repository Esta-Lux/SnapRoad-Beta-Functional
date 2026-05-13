import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { Purchase } from 'react-native-iap';
import {
  endConnection,
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
} from 'react-native-iap';

import { api } from '../api/client';
import { buildConfiguredSkuSet, pickPurchasesToRestore } from './appleIapSkus';

export { buildConfiguredSkuSet, pickPurchasesToRestore };

/** StoreKit-backed strings for App Store subscription disclosure (Guideline 3.1.2). */
export type AppleSubscriptionPaywallLine = {
  displayPrice: string | null;
  periodLabel: string | null;
};

function productIdFromStoreRow(p: unknown): string {
  const o = p as { id?: unknown; productId?: unknown };
  return String(o.id ?? o.productId ?? '').trim();
}

function displayPriceFromStoreRow(p: unknown): string | null {
  const o = p as {
    displayPrice?: unknown;
    localizedPrice?: unknown;
    priceString?: unknown;
  };
  const raw = o.displayPrice ?? o.localizedPrice ?? o.priceString;
  const s = typeof raw === 'string' ? raw.trim() : '';
  return s || null;
}

function labelFromPeriodUnit(unitRaw: string, numberRaw: unknown): string | null {
  const unit = unitRaw.trim().toLowerCase();
  const n = Math.max(1, Math.floor(Number(numberRaw) || 1));
  if (!unit) return null;
  if (unit === 'day' && n === 1) return 'Daily';
  if (unit === 'day' && n === 7) return 'Weekly';
  if (unit === 'week' && n === 1) return 'Weekly';
  if (unit === 'month' && n === 1) return 'Monthly';
  if (unit === 'month' && n === 3) return 'Every 3 months';
  if (unit === 'month' && n === 6) return 'Every 6 months';
  if (unit === 'year' && n === 1) return 'Yearly';
  if (n === 1) return `${unit.charAt(0).toUpperCase()}${unit.slice(1)}`;
  return `Every ${n} ${unit}s`;
}

function iso8601DurationToLabel(iso: string): string | null {
  const s = iso.trim().toUpperCase();
  const inner = s.startsWith('P') ? s.slice(1) : s;
  const y = /(\d+)Y/i.exec(inner)?.[1];
  const mo = /(\d+)M/i.exec(inner)?.[1];
  const w = /(\d+)W/i.exec(inner)?.[1];
  const d = /(\d+)D/i.exec(inner)?.[1];
  if (y && !mo && !w && !d) return Number(y) === 1 ? 'Yearly' : `Every ${y} years`;
  if (mo && !y && !w && !d) return Number(mo) === 1 ? 'Monthly' : `Every ${mo} months`;
  if (w && !y && !mo && !d) return Number(w) === 1 ? 'Weekly' : `Every ${w} weeks`;
  if (d && !y && !mo && !w) return Number(d) === 1 ? 'Daily' : `Every ${d} days`;
  return null;
}

function subscriptionPeriodLabelFromStoreRow(p: unknown): string | null {
  const o = p as Record<string, unknown>;
  const unit = String(
    o.subscriptionPeriodUnitIOS ?? o.subscriptionPeriodUnit ?? '',
  ).trim();
  const num = o.subscriptionPeriodNumberIOS ?? o.subscriptionPeriodNumber;
  if (unit) {
    return labelFromPeriodUnit(unit, num);
  }
  const sub = o.subscription as Record<string, unknown> | undefined;
  const iso = sub?.subscriptionPeriod;
  if (typeof iso === 'string' && iso.trim()) {
    return iso8601DurationToLabel(iso);
  }
  const iosSub = o.subscriptionInfoIOS as Record<string, unknown> | undefined;
  const iso2 = iosSub?.subscriptionPeriod;
  if (typeof iso2 === 'string' && iso2.trim()) {
    return iso8601DurationToLabel(iso2);
  }
  return null;
}

function storeRowToPaywallLine(row: unknown): AppleSubscriptionPaywallLine {
  return {
    displayPrice: displayPriceFromStoreRow(row),
    periodLabel: subscriptionPeriodLabelFromStoreRow(row),
  };
}

/**
 * Fetches localized subscription price and period from the App Store for paywall copy.
 * Safe to call on every modal open; returns null entries when StoreKit is unavailable.
 */
export async function fetchAppleSubscriptionPaywallLines(): Promise<{
  premium: AppleSubscriptionPaywallLine | null;
  family: AppleSubscriptionPaywallLine | null;
}> {
  if (Platform.OS !== 'ios') {
    return { premium: null, family: null };
  }

  const extra = Constants.expoConfig?.extra as
    | { appleIapPremiumProductId?: string; appleIapFamilyProductId?: string }
    | undefined;
  const premiumSku = extra?.appleIapPremiumProductId?.trim();
  const familySku = extra?.appleIapFamilyProductId?.trim();
  const skus = [premiumSku, familySku].filter(Boolean) as string[];
  if (skus.length === 0) {
    return { premium: null, family: null };
  }

  try {
    await bootstrapAppleIap();
    const products = await fetchProducts({ skus, type: 'subs' });
    const list = Array.isArray(products) ? products : [];
    const find = (sku: string | undefined): AppleSubscriptionPaywallLine | null => {
      if (!sku) return null;
      const row = list.find((item) => productIdFromStoreRow(item) === sku);
      return row ? storeRowToPaywallLine(row) : null;
    };
    return { premium: find(premiumSku), family: find(familySku) };
  } catch {
    return { premium: null, family: null };
  }
}

let bootstrapped = false;
let purchaseSub: { remove: () => void } | null = null;
let errorSub: { remove: () => void } | null = null;

type Pending = { skus: Set<string>; resolve: () => void; reject: (e: Error) => void };
let pending: Pending | null = null;

function configuredSkus(): Set<string> {
  const extra = Constants.expoConfig?.extra as
    | { appleIapPremiumProductId?: string; appleIapFamilyProductId?: string }
    | undefined;
  return buildConfiguredSkuSet(extra ?? {});
}

async function deliverVerifiedPurchase(purchase: Purchase): Promise<void> {
  const tid = purchase.transactionId?.trim();
  if (!tid) {
    throw new Error('Missing transaction id from App Store.');
  }
  const res = await api.post<{ success?: boolean }>('/api/payments/apple/sync', { transaction_id: tid });
  if (!res.success) {
    throw new Error(res.error || 'Could not verify this subscription with SnapRoad.');
  }
  await finishTransaction({ purchase });
}

async function assertAppleIapServerReady(): Promise<void> {
  const res = await api.get<{ data?: { configured?: boolean }; configured?: boolean }>('/api/payments/apple/status');
  if (!res.success) {
    throw new Error(res.error || 'Could not check Apple subscription setup.');
  }
  const body = res.data as { data?: { configured?: boolean }; configured?: boolean } | undefined;
  const configured = Boolean(body?.data?.configured ?? body?.configured);
  if (!configured) {
    throw new Error('Apple In-App Purchase is not configured on the server yet.');
  }
}

function hasStoreProduct(products: unknown, sku: string): boolean {
  return Array.isArray(products) && products.some((p) => {
    const row = p as { id?: unknown; productId?: unknown };
    return String(row?.id ?? row?.productId ?? '').trim() === sku;
  });
}

async function handlePurchaseUpdate(purchase: Purchase): Promise<void> {
  const allowed = configuredSkus();
  if (!allowed.has(purchase.productId)) {
    return;
  }

  const matchesPending = pending !== null && pending.skus.has(purchase.productId);

  try {
    await deliverVerifiedPurchase(purchase);
    if (matchesPending && pending) {
      pending.resolve();
      pending = null;
    }
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    if (matchesPending && pending) {
      pending.reject(err);
      pending = null;
    }
    console.warn('[IAP] sync/finish failed', err);
  }
}

/**
 * Call once on iOS app start (StoreKit hybrid + listeners). Safe to call again — no-op.
 */
export async function bootstrapAppleIap(): Promise<void> {
  if (Platform.OS !== 'ios' || bootstrapped) {
    return;
  }
  bootstrapped = true;

  await initConnection();

  purchaseSub = purchaseUpdatedListener((purchase) => {
    void handlePurchaseUpdate(purchase);
  });

  errorSub = purchaseErrorListener((err) => {
    if (!pending) return;
    pending.reject(new Error(err.message || 'Purchase was cancelled or failed.'));
    pending = null;
  });
}

export async function shutdownAppleIap(): Promise<void> {
  if (Platform.OS !== 'ios' || !bootstrapped) {
    return;
  }
  purchaseSub?.remove();
  errorSub?.remove();
  purchaseSub = null;
  errorSub = null;
  await endConnection().catch(() => {});
  bootstrapped = false;
}

/**
 * Start an auto-renewable subscription purchase. Completes when Apple reports a transaction
 * and the server accepts `/api/payments/apple/sync`.
 */
export function startAppleSubscriptionPurchase(
  plan: 'premium' | 'family',
  appAccountToken: string,
): Promise<void> {
  if (Platform.OS !== 'ios') {
    return Promise.reject(new Error('Apple In-App Purchases are only available on iOS.'));
  }

  const extra = Constants.expoConfig?.extra as
    | { appleIapPremiumProductId?: string; appleIapFamilyProductId?: string }
    | undefined;
  const sku =
    plan === 'family'
      ? extra?.appleIapFamilyProductId?.trim()
      : extra?.appleIapPremiumProductId?.trim();

  if (!sku) {
    return Promise.reject(
      new Error(
        plan === 'family'
          ? 'Family subscription is not configured. Set EXPO_PUBLIC_APPLE_IAP_FAMILY for this build.'
          : 'Premium subscription is not configured. Set EXPO_PUBLIC_APPLE_IAP_PREMIUM for this build.',
      ),
    );
  }

  return (async () => {
    await bootstrapAppleIap();
    await assertAppleIapServerReady();
    const products = await fetchProducts({ skus: [sku], type: 'subs' });
    if (!hasStoreProduct(products, sku)) {
      throw new Error(`Apple could not find the ${plan} subscription product (${sku}) for this app build.`);
    }

    await new Promise<void>((resolve, reject) => {
      pending = { skus: new Set([sku]), resolve, reject };

      void requestPurchase({
        type: 'subs',
        request: {
          apple: {
            sku,
            appAccountToken,
            andDangerouslyFinishTransactionAutomatically: false,
          },
        },
      }).catch((e: unknown) => {
        if (pending) {
          pending.reject(e instanceof Error ? e : new Error(String(e)));
          pending = null;
        }
      });
    });
  })();
}

/**
 * Outcome of a "Restore Purchases" run, exposed so the UI can show a
 * specific toast / Alert instead of a generic success message.
 */
export type RestoreApplePurchasesResult = {
  /** Number of past Apple transactions discovered for our configured SKUs. */
  matched: number;
  /** Subset of `matched` that we successfully re-validated with `/api/payments/apple/sync`. */
  delivered: number;
  /** Surface-level reason when zero deliveries occurred (used for UX copy). */
  reason?: 'unsupported' | 'none_found' | 'sync_failed' | 'unknown';
  /** Last error message bubbled up from a per-transaction sync failure. */
  message?: string;
};

/**
 * "Restore Purchases" — required by Apple to be one tap away on every IAP
 * paywall. Walks through `getAvailablePurchases` (the StoreKit-backed
 * receipt-history call) and re-runs our server-side verification for every
 * transaction that matches one of our configured SKUs.
 *
 * Idempotent: hitting `/api/payments/apple/sync` with a transaction the
 * server has already seen is a no-op on the backend.
 */
export async function restoreApplePurchases(): Promise<RestoreApplePurchasesResult> {
  if (Platform.OS !== 'ios') {
    return { matched: 0, delivered: 0, reason: 'unsupported' };
  }

  await bootstrapAppleIap();

  let purchases: Purchase[];
  try {
    purchases = await getAvailablePurchases();
  } catch (e) {
    return {
      matched: 0,
      delivered: 0,
      reason: 'unknown',
      message: e instanceof Error ? e.message : String(e),
    };
  }

  const skus = configuredSkus();
  const ours = pickPurchasesToRestore(purchases, skus);
  if (ours.length === 0) {
    return { matched: 0, delivered: 0, reason: 'none_found' };
  }

  let delivered = 0;
  let lastError: string | undefined;
  for (const purchase of ours) {
    try {
      await deliverVerifiedPurchase(purchase);
      delivered += 1;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      console.warn('[IAP] restore: sync failed for', purchase.productId, lastError);
    }
  }

  return {
    matched: ours.length,
    delivered,
    reason: delivered === 0 ? 'sync_failed' : undefined,
    message: delivered === 0 ? lastError : undefined,
  };
}

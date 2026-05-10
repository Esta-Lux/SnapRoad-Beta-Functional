import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { Purchase } from 'react-native-iap';
import {
  endConnection,
  finishTransaction,
  getAvailablePurchases,
  getSubscriptions,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestSubscription,
  setup,
} from 'react-native-iap';

import { api } from '../api/client';
import { buildConfiguredSkuSet, pickPurchasesToRestore } from './appleIapSkus';

export { buildConfiguredSkuSet, pickPurchasesToRestore };

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

  setup({ storekitMode: 'STOREKIT_HYBRID_MODE' });
  await initConnection();

  purchaseSub = purchaseUpdatedListener(
    (purchase) => {
      void handlePurchaseUpdate(purchase);
    },
    (err) => console.warn('[IAP] purchaseUpdatedListener errorCallback', err),
  );

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
    await getSubscriptions({ skus: [sku] });

    await new Promise<void>((resolve, reject) => {
      pending = { skus: new Set([sku]), resolve, reject };

      void requestSubscription({
        sku,
        appAccountToken,
        andDangerouslyFinishTransactionAutomaticallyIOS: false,
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

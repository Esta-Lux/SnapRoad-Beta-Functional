import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { Purchase } from 'react-native-iap';
import {
  endConnection,
  finishTransaction,
  getSubscriptions,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestSubscription,
  setup,
} from 'react-native-iap';

import { api } from '../api/client';

let bootstrapped = false;
let purchaseSub: { remove: () => void } | null = null;
let errorSub: { remove: () => void } | null = null;

type Pending = { skus: Set<string>; resolve: () => void; reject: (e: Error) => void };
let pending: Pending | null = null;

function configuredSkus(): Set<string> {
  const extra = Constants.expoConfig?.extra as
    | { appleIapPremiumProductId?: string; appleIapFamilyProductId?: string }
    | undefined;
  const out = new Set<string>();
  const p = extra?.appleIapPremiumProductId?.trim();
  const f = extra?.appleIapFamilyProductId?.trim();
  if (p) out.add(p);
  if (f) out.add(f);
  return out;
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

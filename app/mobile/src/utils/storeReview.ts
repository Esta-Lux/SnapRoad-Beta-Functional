import { Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as StoreReview from 'expo-store-review';

const TRIP_COUNT_KEY = 'snaproad_store_review_completed_trip_count';
const LAST_REQUESTED_KEY = 'snaproad_store_review_last_requested_at';
const MIN_COMPLETED_TRIPS = 2;
const DAYS_BETWEEN_PROMPTS = 90;

type ReviewMoment = {
  counted?: boolean;
  isNavigating?: boolean;
  distanceMiles?: number | null;
};

function nowMs(): number {
  return Date.now();
}

async function numberFromStorage(key: string): Promise<number> {
  const raw = await AsyncStorage.getItem(key);
  const n = raw == null ? 0 : Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function daysAgo(ms: number): number {
  return ms / (24 * 60 * 60 * 1000);
}

function getStoreIds(): { iosAppStoreId?: string; androidPackage?: string } {
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;
  return {
    iosAppStoreId: typeof extra.iosAppStoreId === 'string' ? extra.iosAppStoreId : undefined,
    androidPackage: typeof extra.androidPackage === 'string' ? extra.androidPackage : undefined,
  };
}

export async function maybeRequestStoreReviewAfterTrip(moment: ReviewMoment): Promise<void> {
  if (Platform.OS === 'web') return;
  if (moment.isNavigating) return;
  if (moment.counted === false) return;
  if (typeof moment.distanceMiles === 'number' && moment.distanceMiles < 0.5) return;

  try {
    const completedTrips = (await numberFromStorage(TRIP_COUNT_KEY)) + 1;
    await AsyncStorage.setItem(TRIP_COUNT_KEY, String(completedTrips));
    if (completedTrips < MIN_COMPLETED_TRIPS) return;

    const lastRequestedAt = await numberFromStorage(LAST_REQUESTED_KEY);
    if (lastRequestedAt > 0 && daysAgo(nowMs() - lastRequestedAt) < DAYS_BETWEEN_PROMPTS) return;

    const [available, hasAction] = await Promise.all([
      StoreReview.isAvailableAsync(),
      StoreReview.hasAction(),
    ]);
    if (!available || !hasAction) return;

    await AsyncStorage.setItem(LAST_REQUESTED_KEY, String(nowMs()));
    await StoreReview.requestReview();
  } catch {
    /* Review prompts are best-effort and must never interrupt the trip recap. */
  }
}

export async function openStoreReviewPage(): Promise<void> {
  const directStoreUrl = StoreReview.storeUrl();
  if (directStoreUrl) {
    await Linking.openURL(directStoreUrl);
    return;
  }

  const ids = getStoreIds();
  if (Platform.OS === 'ios' && ids.iosAppStoreId) {
    await Linking.openURL(`itms-apps://itunes.apple.com/app/viewContentsUserReviews/id${ids.iosAppStoreId}?action=write-review`);
    return;
  }
  if (Platform.OS === 'android' && ids.androidPackage) {
    await Linking.openURL(`market://details?id=${ids.androidPackage}&showAllReviews=true`);
  }
}

/**
 * React Navigation param lists (Layer 1 — app routing).
 * App.tsx boots to MainTabParamList for guest and signed-in users. Auth screens
 * live under Profile so free users can opt in when they need saved tracking.
 */
import type { CompositeNavigationProp, NavigatorScreenParams } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { TripSummary } from '../types/tripSummary';
import type { MapFocusFriendParams, NavigateToFriendParams } from '../types';
import type { NativeNavRouteParams } from './nativeNavGuard';

/** Public flow when `!isAuthenticated` */
export type PublicStackParamList = {
  Welcome: undefined;
  Auth: { mode?: 'signup' | 'signin' };
  ForgotPassword: undefined;
  ResetPassword: undefined;
};

export type DashboardStackParamList = {
  DashboardMain: { section?: 'friends' | 'family' } | undefined;
};

export type RewardsStackParamList = {
  RewardsMain: undefined;
};

export type OffersStackParamList = {
  OffersMain: undefined;
};

export type ProfileStackParamList = {
  ProfileMain:
    | {
        openCommuteReminders?: boolean;
        openSupport?: boolean;
      }
    | undefined;
  Auth: { mode?: 'signup' | 'signin'; referral_code?: string } | undefined;
  ForgotPassword: undefined;
  ResetPassword: undefined;
};

/** Params MapScreen reads on both MapMain and MapRedeem (same component). */
export type MapScreenSharedRouteParams = {
  offerId?: string;
  nativeNavResult?: { tripSummary: TripSummary; arrived: boolean };
  navigateToFriend?: NavigateToFriendParams;
  mapFocusFriend?: MapFocusFriendParams;
};

export type MapStackParamList = {
  MapMain: MapScreenSharedRouteParams | undefined;
  /** Redeem deep link requires `offerId`; other keys match MapMain for the shared screen. */
  MapRedeem: MapScreenSharedRouteParams & { offerId: string };
  NativeNavigation: NativeNavRouteParams & { reportHint?: string };
};

export type MainTabParamList = {
  Map: NavigatorScreenParams<MapStackParamList>;
  Offers: NavigatorScreenParams<OffersStackParamList>;
  Dashboards: NavigatorScreenParams<DashboardStackParamList>;
  Wallet: NavigatorScreenParams<RewardsStackParamList>;
  Profile: NavigatorScreenParams<ProfileStackParamList>;
};

/** Map tab: stack routes + sibling tab navigation (Profile, Wallet, …). */
export type MapStackScreenNavigationProp = CompositeNavigationProp<
  StackNavigationProp<MapStackParamList>,
  BottomTabNavigationProp<MainTabParamList>
>;

/** Profile tab: stack + sibling tabs. */
export type ProfileStackScreenNavigationProp = CompositeNavigationProp<
  StackNavigationProp<ProfileStackParamList>,
  BottomTabNavigationProp<MainTabParamList>
>;

/** Dashboard tab: stack + sibling tabs. */
export type DashboardStackScreenNavigationProp = CompositeNavigationProp<
  StackNavigationProp<DashboardStackParamList>,
  BottomTabNavigationProp<MainTabParamList>
>;

/** Wallet / Rewards tab: stack + sibling tabs. */
export type RewardsStackScreenNavigationProp = CompositeNavigationProp<
  StackNavigationProp<RewardsStackParamList>,
  BottomTabNavigationProp<MainTabParamList>
>;

/** Offers hub tab: stack + sibling tabs. */
export type OffersStackScreenNavigationProp = CompositeNavigationProp<
  StackNavigationProp<OffersStackParamList>,
  BottomTabNavigationProp<MainTabParamList>
>;

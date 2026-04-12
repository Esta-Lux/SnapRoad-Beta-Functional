/**
 * React Navigation param lists (Layer 1 — app routing).
 * Conditional auth tree in App.tsx: logged-out uses PublicStackParamList only;
 * logged-in uses MainTabParamList (no single RootParamList union at the container).
 */
import type { CompositeNavigationProp, NavigatorScreenParams } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { TripSummary } from '../hooks/useDriveNavigation';
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
  DashboardMain: undefined;
};

export type RewardsStackParamList = {
  RewardsMain: undefined;
};

export type ProfileStackParamList = {
  ProfileMain:
    | {
        status?: string;
        session_id?: string;
        openPlaceAlerts?: boolean;
        openCommuteReminders?: boolean;
      }
    | undefined;
  ProfileBilling:
    | {
        status?: string;
        session_id?: string;
      }
    | undefined;
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

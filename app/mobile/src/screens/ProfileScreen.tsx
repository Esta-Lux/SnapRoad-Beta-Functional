import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, View, Text, TouchableOpacity, StyleSheet, RefreshControl, Share, Linking, Platform, TextInput, KeyboardAvoidingView } from 'react-native';
import Modal from '../components/common/Modal';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, useFocusEffect, useIsFocused } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../hooks/useLocation';
import { api } from '../api/client';
import { PLANS, premiumSavingsPercent, PREMIUM_PUBLIC_MONTHLY } from '../constants/plans';
import { applySnapRoadFromProfilePayload } from '../utils/profileScore';
import FuelTracker from '../components/profile/FuelTracker';
import DriverSnapshotModal from '../components/profile/DriverSnapshotModal';
import ProfileInsightsDashboard from '../components/profile/ProfileInsightsDashboard';
import HelpSupport from '../components/profile/HelpSupport';
import SubmitConcern from '../components/profile/SubmitConcern';
import type { CommuteRoute, DrivingMode, PlanTier, SavedLocation, SavedRoute, User } from '../types';
import AddCommuteModal from '../components/profile/AddCommuteModal';
import {
  AboutCard,
  AddPlaceModal,
  AppearanceCard,
  DrivingModeCard,
  DeleteAccountButton,
  IncidentReportModal,
  LevelProgressModal,
  LeaderboardModal,
  NotificationsCard,
  PlacesCard,
  PlanCard,
  PlanModal,
  ProfileHeader,
  ProfileBadgeItem,
  ProfileGemTxItem,
  ProfileLeaderboardEntry,
  ProfileTripHistoryItem,
  ProfileWeeklyRecap,
  ProfileOverviewSection,
  MyCarRow,
  RoutesCard,
  CommuteRoutesSection,
  SectionHeader,
  SignOutButton,
  VehicleCard,
} from '../components/profile/ProfileSections';
import type { ProfileOverviewActionItem } from '../components/profile/types';
import { ProfileStatsStrip, ProfileTabBar } from '../components/profile/ProfileScreenBlocks';
import PlaceAlertsDashboardModal from '../components/profile/PlaceAlertsDashboardModal';

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const profileFocused = useIsFocused();
  const { location } = useLocation(false, { paused: !profileFocused });
  const { isLight, colors, toggleTheme } = useTheme();
  const { user, logout, updateUser, statsVersion } = useAuth();
  const updateUserRef = useRef(updateUser);
  const handledBillingStatusRef = useRef<string | null>(null);
  useEffect(() => {
    updateUserRef.current = updateUser;
  });
  const insets = useSafeAreaInsets();
  const bg = colors.background;
  const cardBg = colors.card;
  const text = colors.text;
  const sub = colors.textSecondary;

  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [places, setPlaces] = useState<SavedLocation[]>([]);
  const favoritePlaces = useMemo(
    () => places.filter((p) => (p.category || '').toLowerCase() === 'favorite'),
    [places],
  );
  const [routes, setRoutes] = useState<SavedRoute[]>([]);
  const [commutes, setCommutes] = useState<CommuteRoute[]>([]);
  const [commuteLimit, setCommuteLimit] = useState(5);
  const [showAddCommute, setShowAddCommute] = useState(false);
  const [notifSyncing, setNotifSyncing] = useState(false);

  const [placeAlerts, setPlaceAlerts] = useState<{ id: string; name: string; address?: string; alert_minutes_before: number; days_of_week: string[]; realtime_push?: boolean }[]>([]);
  const [placeAlertLimit, setPlaceAlertLimit] = useState(5);
  const [placeAlertPremium, setPlaceAlertPremium] = useState(false);

  const [vehicleType, setVehicleType] = useState<'car' | 'motorcycle'>('car');
  const [tallVehicle, setTallVehicle] = useState(false);
  const [vehicleHeight, setVehicleHeight] = useState('');
  const heightPresets = [
    { label: 'Van', value: '2.7' },
    { label: 'Sprinter', value: '3.0' },
    { label: 'Box Truck', value: '3.5' },
    { label: 'Semi', value: '4.0' },
  ];

  const [pushEnabled, setPushEnabled] = useState(true);
  const [friendRequests, setFriendRequests] = useState(true);
  const [offerAlerts, setOfferAlerts] = useState(true);
  const [speedAlerts, setSpeedAlerts] = useState(true);

  const [defaultMode, setDefaultMode] = useState<DrivingMode>('adaptive');
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showAddPlace, setShowAddPlace] = useState(false);
  const [newPlaceName, setNewPlaceName] = useState('');
  const [newPlaceAddress, setNewPlaceAddress] = useState('');
  const [newPlaceCategory] = useState('favorite');
  const [profileTab, setProfileTab] = useState<'overview' | 'settings'>('overview');
  const [showEditName, setShowEditName] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [canChangeUsername, setCanChangeUsername] = useState(true);
  const [usernameChangeAvailableAt, setUsernameChangeAvailableAt] = useState<string | null>(null);
  const [showLevelProgress, setShowLevelProgress] = useState(false);
  const [showInsightsDashboard, setShowInsightsDashboard] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showIncidentReport, setShowIncidentReport] = useState(false);
  const [showFuelTracker, setShowFuelTracker] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showConcern, setShowConcern] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showDriverSnapshot, setShowDriverSnapshot] = useState(false);
  const [showPlaceAlertsDashboard, setShowPlaceAlertsDashboard] = useState(false);
  const [weeklyRecap, setWeeklyRecap] = useState<ProfileWeeklyRecap>({
    totalTrips: 0,
    totalMiles: 0,
    gemsEarnedWeek: 0,
    avgSafetyScore: 0,
    aiTip: '',
    highlights: [],
    orionCommentary: null,
    behavior: { hard_braking_events_total: 0, speeding_events_total: 0 },
  });
  const [leaderboardRows, setLeaderboardRows] = useState<ProfileLeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState(0);
  const [tripHistoryRows, setTripHistoryRows] = useState<ProfileTripHistoryItem[]>([]);
  const [gemTxRows, setGemTxRows] = useState<ProfileGemTxItem[]>([]);
  const [badgeRows, setBadgeRows] = useState<ProfileBadgeItem[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<string>('');
  const [fuelSummary, setFuelSummary] = useState<{
    monthlyEstimate: number | null;
    avgMpg: number | null;
    costPerMile: number | null;
    lastOdometerMi: number | null;
    milesSinceLastFill: number | null;
  }>({
    monthlyEstimate: null,
    avgMpg: null,
    costPerMile: null,
    lastOdometerMi: null,
    milesSinceLastFill: null,
  });

  const handleDeleteAccount = useCallback(async () => {
    setDeletingAccount(true);
    try {
      const result = await api.delete<{ message?: string }>('/api/user/account');
      if (!result.success) {
        Alert.alert('Delete Account', result.error || 'Unable to delete your account right now.');
        return;
      }
      await logout();
      Alert.alert('Account Deleted', 'Your SnapRoad account has been deleted.');
      navigation.navigate('Welcome');
    } finally {
      setDeletingAccount(false);
    }
  }, [logout, navigation]);

  const loadData = useCallback(async (mode: 'initial' | 'refresh' | 'silent' = 'initial') => {
    if (mode === 'initial') setInitialLoading(true);
    else if (mode === 'refresh') setRefreshing(true);
    try {
      const safeGet = async (url: string) => {
        try { return await api.get<any>(url); } catch { return { success: false, data: null }; }
      };
      const profileRes = await api.getProfile().catch(() => ({ success: false, data: null }));
      const profilePayload = (profileRes?.data as any)?.data ?? profileRes?.data ?? {};
      const pp = profilePayload as Record<string, unknown>;
      const planStr = typeof pp.plan === 'string' ? pp.plan : '';
      const planLowerEarly = planStr.toLowerCase();
      const premiumByPlanEarly = planLowerEarly === 'premium' || planLowerEarly === 'family';
      const premiumByFlagEarly = pp.is_premium != null && Boolean(pp.is_premium);
      const isPremiumUser = premiumByPlanEarly || premiumByFlagEarly;
      const weeklyPromise = isPremiumUser ? safeGet('/api/weekly-recap') : Promise.resolve({ success: false, data: null });
      const leaderPromise = isPremiumUser
        ? safeGet('/api/leaderboard?time_filter=weekly&limit=10')
        : Promise.resolve({ success: false, data: null });
      const [locRes, routeRes, commuteRes, notifRes, weeklyRes, leaderRes, tripsHistoryRes, gemsRes, badgesRes, fuelStatsRes, fuelTrendsRes] = await Promise.all([
        safeGet('/api/locations'),
        safeGet('/api/routes'),
        safeGet('/api/commute-routes'),
        safeGet('/api/settings/notifications'),
        weeklyPromise,
        leaderPromise,
        safeGet('/api/trips/history/recent?limit=100'),
        safeGet('/api/gems/history'),
        safeGet('/api/badges'),
        safeGet('/api/fuel/stats'),
        safeGet('/api/fuel/trends'),
      ]);
      const unwrap = (r: any) => r?.data?.data ?? r?.data ?? [];
      const emailLower = String(pp.email ?? '').trim().toLowerCase();
      const rawName =
        typeof pp.name === 'string' && pp.name.trim()
          ? pp.name.trim()
          : typeof pp.full_name === 'string' && pp.full_name.trim()
            ? pp.full_name.trim()
            : '';
      const displayName =
        rawName && (!emailLower || rawName.toLowerCase() !== emailLower) ? rawName : undefined;
      setCanChangeUsername(pp.can_change_username !== false);
      setUsernameChangeAvailableAt(
        typeof pp.username_change_available_at === 'string' ? pp.username_change_available_at : null,
      );
      const userPatch: Partial<User> = {
        gems: Number(pp.gems ?? 0),
        level: Number(pp.level ?? 1),
        totalMiles: Number(pp.total_miles ?? 0),
        totalTrips: Number(pp.total_trips ?? 0),
        safetyScore: Number(pp.safety_score ?? 0),
        streak: Number(pp.streak ?? pp.safe_drive_streak ?? 0),
        xp: pp.xp != null ? Number(pp.xp) : undefined,
      };
      userPatch.name = displayName ?? 'Driver';
      const planLower = planStr.toLowerCase();
      const premiumByPlan = planLower === 'premium' || planLower === 'family';
      const premiumByFlag = pp.is_premium != null && Boolean(pp.is_premium);
      if (planStr) {
        userPatch.plan = planStr;
      }
      userPatch.isFamilyPlan = planLower === 'family';
      userPatch.isPremium = premiumByPlan || premiumByFlag;
      if (pp.gem_multiplier != null) {
        userPatch.gem_multiplier = Number(pp.gem_multiplier);
      }
      const pub = pp.promotion_access_until;
      if (typeof pub === 'string' && pub.trim()) {
        userPatch.promotion_access_until = pub.trim();
      } else {
        userPatch.promotion_access_until = undefined;
      }
      const pplan = pp.promotion_plan;
      if (typeof pplan === 'string' && pplan.trim()) {
        userPatch.promotion_plan = pplan.trim().toLowerCase();
      } else {
        userPatch.promotion_plan = undefined;
      }
      userPatch.promotion_active = pp.promotion_active === true;
      applySnapRoadFromProfilePayload(userPatch, pp);
      const statsBody = (fuelStatsRes?.data as any)?.data ?? fuelStatsRes?.data ?? {};
      const trendsBody = (fuelTrendsRes?.data as any)?.data ?? fuelTrendsRes?.data ?? {};
      const avgMpgRaw = statsBody.avg_mpg ?? statsBody.averageMpg;
      const avgMpg = avgMpgRaw != null && avgMpgRaw !== '' ? Number(avgMpgRaw) : null;
      const monthlyGallons = Number(trendsBody.monthly_avg_gallons ?? 0);
      const pricePerGal = Number(trendsBody.avg_price_per_gallon ?? 0);
      const monthlyEstimate =
        monthlyGallons > 0 && pricePerGal > 0 ? Math.round(monthlyGallons * pricePerGal) : null;
      const cpmRaw = statsBody.cost_per_mile;
      const costPerMile = cpmRaw != null && cpmRaw !== '' ? Number(cpmRaw) : null;
      const lastOm = statsBody.last_odometer_mi;
      const lastOdometerMi = lastOm != null && lastOm !== '' ? Number(lastOm) : null;
      const msf = statsBody.miles_since_last_fill;
      const milesSinceLastFill = msf != null && msf !== '' ? Number(msf) : null;
      setFuelSummary({
        monthlyEstimate,
        avgMpg,
        costPerMile,
        lastOdometerMi,
        milesSinceLastFill,
      });
      setPlaces(Array.isArray(unwrap(locRes)) ? unwrap(locRes) : []);
      setRoutes(Array.isArray(unwrap(routeRes)) ? unwrap(routeRes) : []);
      if (commuteRes.success && commuteRes.data) {
        const cw = commuteRes.data as { data?: CommuteRoute[]; limit?: number };
        setCommutes(Array.isArray(cw.data) ? cw.data : []);
        setCommuteLimit(Number(cw.limit ?? 5));
      }
      api.get<any>('/api/place-alerts').then((r) => {
        const d = r?.data?.data ?? r?.data ?? [];
        if (Array.isArray(d)) setPlaceAlerts(d);
        setPlaceAlertLimit(r?.data?.limit ?? 5);
        setPlaceAlertPremium(r?.data?.is_premium ?? false);
      }).catch(() => {});
      const notifPayload = (notifRes.data as any)?.data ?? notifRes.data ?? {};
      const push = notifPayload?.push_notifications ?? {};
      setPushEnabled(Boolean(push.trip_summary ?? true));
      setFriendRequests(Boolean(push.friend_activity ?? true));
      setOfferAlerts(Boolean(push.offers ?? true));
      setSpeedAlerts(Boolean(push.safety_alerts ?? true));
      if (!isPremiumUser) {
        setWeeklyRecap({
          totalTrips: 0,
          totalMiles: 0,
          gemsEarnedWeek: 0,
          avgSafetyScore: 0,
          aiTip: '',
          highlights: [],
          orionCommentary: null,
          behavior: { hard_braking_events_total: 0, speeding_events_total: 0 },
        });
        setLeaderboardRows([]);
        setMyRank(0);
        userPatch.rank = 0;
      } else {
        const weekly = weeklyRes?.data?.data ?? weeklyRes?.data ?? {};
        const beh = weekly.behavior;
        setWeeklyRecap({
          totalTrips: Number(weekly.total_trips ?? weekly.trips_this_week ?? 0),
          totalMiles: Number(weekly.total_miles ?? weekly.miles_this_week ?? 0),
          gemsEarnedWeek: Number(weekly.gems_earned ?? weekly.gems_earned_week ?? 0),
          avgSafetyScore: Number(weekly.safety_score_avg ?? weekly.avg_safety_score ?? 0),
          aiTip: '',
          highlights: Array.isArray(weekly.highlights) ? weekly.highlights.map((x: unknown) => String(x)) : [],
          orionCommentary: typeof weekly.orion_commentary === 'string' ? weekly.orion_commentary : null,
          behavior:
            beh && typeof beh === 'object'
              ? {
                  hard_braking_events_total: Number((beh as any).hard_braking_events_total ?? 0),
                  speeding_events_total: Number((beh as any).speeding_events_total ?? 0),
                }
              : { hard_braking_events_total: 0, speeding_events_total: 0 },
        });
        const lb = leaderRes?.data?.data ?? leaderRes?.data ?? {};
        const rows = Array.isArray(lb.leaderboard) ? lb.leaderboard : [];
        setLeaderboardRows(rows.map((r: any, i: number) => ({
          rank: Number(r.rank ?? i + 1),
          name: String(r.name ?? 'Driver'),
          safetyScore: Number(r.safety_score ?? 0),
          level: Number(r.level ?? 1),
          gems: Number(r.gems ?? 0),
        })));
        const rankNum = Number(lb.my_rank ?? 0);
        setMyRank(rankNum);
        userPatch.rank = rankNum;
      }
      const vtRaw = pp.vehicle_type;
      if (vtRaw === 'motorcycle' || vtRaw === 'car') {
        userPatch.vehicle_type = vtRaw;
        setVehicleType(vtRaw);
      }
      updateUserRef.current(userPatch);
      const historyRoot = tripsHistoryRes?.data?.data ?? tripsHistoryRes?.data;
      const recentTrips = Array.isArray(historyRoot) ? historyRoot : [];
      setTripHistoryRows(
        recentTrips.map((t: any, idx: number) => {
          const rawDate = String(t.date ?? '');
          let dateStr = '';
          let timeStr = '';
          let tripEndedAtIso = rawDate;
          try {
            const d = new Date(rawDate);
            if (!Number.isNaN(d.getTime())) {
              dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
              timeStr = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
              tripEndedAtIso = d.toISOString();
            }
          } catch {
            /* keep raw */
          }
          const dist =
            t.distance_miles != null ? Number(t.distance_miles) : Number(t.distance ?? 0);
          const durSec = Number(t.duration ?? 0);
          const durMin = t.duration_minutes != null ? Number(t.duration_minutes) : Math.round(durSec / 60);
          return {
            id: String(t.id ?? idx),
            date: dateStr || rawDate,
            time: timeStr,
            origin: String(t.origin ?? 'Start'),
            destination: String(t.destination ?? 'End'),
            distance_miles: dist,
            duration_minutes: durMin,
            gems_earned: Number(t.gems_earned ?? 0),
            safety_score: Number(t.safety_score ?? 0),
            tripEndedAtIso,
          };
        }),
      );
      const gemData = gemsRes?.data?.data ?? gemsRes?.data ?? {};
      const tx = Array.isArray(gemData.recent_transactions) ? gemData.recent_transactions : [];
      setGemTxRows(tx.map((item: any, idx: number) => ({
        id: String(idx),
        type: item.type === 'earned' || item.type === 'spent' ? item.type : 'unknown',
        amount: Number(item.amount ?? 0),
        source: String(item.source ?? 'Transaction'),
        date: String(item.date ?? new Date().toISOString()),
      })));
      const badgeData = badgesRes?.data?.data ?? badgesRes?.data ?? {};
      const badgeList = Array.isArray(badgeData.badges) ? badgeData.badges : Array.isArray(badgeData) ? badgeData : [];
      setBadgeRows(
        badgeList.map((b: any, idx: number) => ({
          id: b.id ?? idx,
          name: String(b.name ?? 'Badge'),
          earned: Boolean(b.earned),
          description: String(b.description ?? b.desc ?? ''),
          category: typeof b.category === 'string' ? b.category : undefined,
          progress: typeof b.progress === 'number' ? b.progress : undefined,
          icon: typeof b.icon === 'string' ? b.icon : undefined,
          gems: b.gems != null ? Number(b.gems) : undefined,
        })),
      );
      setLastSyncedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } finally {
      if (mode === 'initial') setInitialLoading(false);
      else if (mode === 'refresh') setRefreshing(false);
    }
  }, []);

  const skipProfileFocusSilentRef = useRef(true);

  useEffect(() => {
    loadData('initial');
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      if (skipProfileFocusSilentRef.current) {
        skipProfileFocusSilentRef.current = false;
        return;
      }
      void loadData('silent');
    }, [loadData]),
  );

  useEffect(() => {
    if (!statsVersion) return;
    void loadData('silent');
  }, [statsVersion, loadData]);

  useEffect(() => {
    if (route.params?.openPlaceAlerts) {
      setShowPlaceAlertsDashboard(true);
      navigation.setParams({ openPlaceAlerts: undefined });
    }
  }, [route.params?.openPlaceAlerts, navigation]);

  useEffect(() => {
    if (user?.vehicle_height_meters && user.vehicle_height_meters > 0) {
      setTallVehicle(true);
      setVehicleHeight(String(user.vehicle_height_meters));
    }
  }, [user?.vehicle_height_meters]);

  useEffect(() => {
    if (user?.vehicle_type === 'motorcycle' || user?.vehicle_type === 'car') {
      setVehicleType(user.vehicle_type);
    }
  }, [user?.vehicle_type]);

  const handleSaveVehicle = useCallback(async () => {
    const height = vehicleType === 'car' && tallVehicle ? parseFloat(vehicleHeight) : null;
    const res = await api.put('/api/user/profile', {
      vehicle_height_meters: Number.isFinite(height as number) ? height : null,
      vehicle_type: vehicleType,
    });
    if (res.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Saved', 'Vehicle settings updated.');
      updateUser({
        vehicle_height_meters: height ?? undefined,
        vehicle_type: vehicleType,
      } as any);
    } else {
      Alert.alert('Error', res.error ?? 'Could not save vehicle settings');
    }
  }, [vehicleType, tallVehicle, vehicleHeight, updateUser]);

  const handleDeletePlace = useCallback(async (id: number) => {
    Alert.alert('Delete Place', 'Remove this saved place?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await api.delete(`/api/locations/${id}`);
          setPlaces((prev) => prev.filter((p) => p.id !== id));
        },
      },
    ]);
  }, []);

  const handleDeleteCommute = useCallback(async (id: string) => {
    Alert.alert('Remove commute', 'Delete this commute alert?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await api.delete(`/api/commute-routes/${id}`);
          setCommutes((prev) => prev.filter((c) => c.id !== id));
        },
      },
    ]);
  }, []);

  const handleAddPlace = useCallback(async () => {
    if (!newPlaceName.trim() || !newPlaceAddress.trim()) return;
    const res = await api.post('/api/locations', {
      name: newPlaceName,
      address: newPlaceAddress,
      category: newPlaceCategory,
    });
    if (res.success) {
      setShowAddPlace(false);
      setNewPlaceName('');
      setNewPlaceAddress('');
      loadData('silent');
    }
  }, [newPlaceName, newPlaceAddress, newPlaceCategory, loadData]);

  const handleDeleteRoute = useCallback(async (id: number) => {
    await api.delete(`/api/routes/${id}`);
    setRoutes((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const handleSelectPlan = useCallback(async (plan: PlanTier) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (plan === 'basic') {
      updateUser({ isPremium: false, isFamilyPlan: false, plan: 'basic', gem_multiplier: 1 });
      try {
        await api.post('/api/user/plan', { plan: 'basic' });
      } catch { /* optimistic */ }
      setShowPlanModal(false);
      await loadData('silent');
      return;
    }

    try {
      const checkoutRes = await api.post<any>('/api/payments/checkout/session', {
        plan_id: plan,
        user_email: user?.email ?? undefined,
        return_url: Platform.OS === 'web' ? undefined : 'snaproad://billing',
      });
      if (checkoutRes.success) {
        const url = checkoutRes.data?.url ?? (checkoutRes.data as any)?.data?.url;
        if (url && typeof url === 'string') {
          await Linking.openURL(url);
          setShowPlanModal(false);
          return;
        }
      }
      Alert.alert('Upgrade Failed', checkoutRes.error ?? 'Could not start checkout. Please try again.');
    } catch (err) {
      Alert.alert('Upgrade Failed', 'Could not process upgrade right now. Check your connection and try again.');
    }
    setShowPlanModal(false);
    await loadData('silent');
  }, [updateUser, loadData, user?.email]);

  useEffect(() => {
    const status = typeof route.params?.status === 'string' ? route.params.status : '';
    const sessionId = typeof route.params?.session_id === 'string' ? route.params.session_id : '';
    const key = `${status}:${sessionId}`;
    if (!status || handledBillingStatusRef.current === key) return;
    handledBillingStatusRef.current = key;

    const finalizeBilling = async () => {
      if (status === 'success' && sessionId) {
        const result = await api.get(`/api/payments/checkout/status/${sessionId}`);
        if (!result.success) {
          Alert.alert('Subscription Update', result.error || 'Payment completed, but we could not refresh your plan yet.');
          return;
        }
        await loadData('silent');
        Alert.alert('Subscription Updated', 'Your subscription is active and your account has been refreshed.');
        return;
      }

      if (status === 'cancel') {
        Alert.alert('Checkout Cancelled', 'Your plan was not changed.');
        return;
      }

      if (status === 'portal') {
        await loadData('silent');
        Alert.alert('Billing Updated', 'Returned from the billing portal.');
      }
    };

    finalizeBilling().catch(() => {
      Alert.alert('Billing Update', 'Returned from billing, but the app could not refresh your account yet.');
    });
  }, [loadData, route.params?.session_id, route.params?.status]);

  const syncNotification = useCallback(async (setting: string, enabled: boolean) => {
    setNotifSyncing(true);
    try {
      await api.put(`/api/settings/notifications?category=push_notifications&setting=${setting}&enabled=${enabled}`);
    } finally {
      setNotifSyncing(false);
    }
  }, []);

  const currentPlan = user?.isFamilyPlan ? 'family' : user?.isPremium ? 'premium' : 'basic';
  const planConfig = PLANS[currentPlan];
  const initials = (user?.name ?? 'U').split(' ').filter(Boolean).map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  const badgeTotal = badgeRows.length || 1;
  const actionRows: ProfileOverviewActionItem[] = [
    {
      key: 'share_location',
      icon: 'locate-outline',
      label: 'Share My Location',
      value: user?.isPremium ? 'Premium enabled' : 'Track friends on the map',
      badgeText: user?.isPremium ? 'PREMIUM' : 'LOCKED',
      onPress: async () => {
        if (!user?.isPremium) {
          setShowPlanModal(true);
          return;
        }
        const { lat, lng } = location;
        const coords =
          Number.isFinite(lat) && Number.isFinite(lng)
            ? `Approx. lat ${lat.toFixed(4)}, lng ${lng.toFixed(4)}`
            : 'Location unavailable';
        try {
          await Share.share({
            message: `I'm sharing my location from SnapRoad — ${coords}. Friend tracking is on the Map tab.`,
            title: 'SnapRoad',
          });
        } catch {
          Alert.alert('Share', 'Could not open the share sheet.');
        }
      },
    },
    {
      key: 'achievements',
      icon: 'trophy-outline',
      label: 'Achievements',
      value: user?.isPremium
        ? `${badgeRows.filter((b) => b.earned).length}/${badgeTotal} badges · open Insights for full list`
        : `${badgeRows.filter((b) => b.earned).length}/${badgeTotal} badges · Insights is Premium`,
      onPress: () => (user?.isPremium ? setShowInsightsDashboard(true) : setShowPlanModal(true)),
    },
    {
      key: 'incidents',
      icon: 'warning-outline',
      label: 'Incidents',
      value: 'Report & verify',
      onPress: () => setShowIncidentReport(true),
    },
    {
      key: 'dashboards',
      icon: 'people-outline',
      label: 'Dashboards',
      value: user?.isPremium ? 'Friends · Family' : 'Premium — Friends & family hub',
      badgeText: user?.isPremium ? undefined : 'LOCKED',
      onPress: () => {
        if (user?.isPremium) navigation.getParent()?.navigate('Dashboards');
        else setShowPlanModal(true);
      },
    },
    {
      key: 'friends',
      icon: 'people-circle-outline',
      label: 'Friends',
      value: user?.isPremium ? 'Manage connections' : 'Live location & convoy — Premium',
      badgeText: user?.isPremium ? undefined : 'LOCKED',
      onPress: () => {
        if (user?.isPremium) navigation.getParent()?.navigate('Dashboards');
        else setShowPlanModal(true);
      },
    },
  ];
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top}
      >
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadData('refresh')} tintColor="#3B82F6" />
        }
      >
        <ProfileHeader user={user} initials={initials} planName={planConfig.name} level={user?.level ?? 1} />
        <ProfileStatsStrip
          cardBg={cardBg}
          text={text}
          sub={sub}
          gems={user?.gems ?? 0}
          rank={
            user?.isPremium
              ? myRank > 0
                ? myRank
                : user?.rank && user.rank > 0
                  ? user.rank
                  : 0
              : '—'
          }
          trips={user?.totalTrips ?? 0}
          miles={Math.round(user?.totalMiles ?? 0)}
        />
        <View style={styles.liveSyncRow}>
          <Text style={[styles.liveSyncText, { color: sub }]}>
            {initialLoading || refreshing
              ? 'Syncing profile data...'
              : `Live data ${lastSyncedAt ? `updated ${lastSyncedAt}` : 'connected'}`}
          </Text>
        </View>
        <ProfileTabBar activeTab={profileTab} onChange={setProfileTab} sub={sub} />

        {profileTab === 'overview' && (
          <>
            <SectionHeader title="Overview" isLight={isLight} />
            <MyCarRow cardBg={cardBg} text={text} sub={sub} accent={colors.primary} />
            <TouchableOpacity
              activeOpacity={0.92}
              onPress={() => {
                if (user?.isPremium) setShowInsightsDashboard(true);
                else setShowPlanModal(true);
              }}
              style={{ marginHorizontal: 16, marginBottom: 12, borderRadius: 16, overflow: 'hidden' }}
              accessibilityRole="button"
              accessibilityLabel={user?.isPremium ? 'Open Insights and Recap dashboard' : 'Upgrade to unlock Insights and Recap'}
            >
              <LinearGradient
                colors={user?.isPremium ? ['#1D4ED8', '#3B82F6'] : ['#475569', '#64748B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ paddingVertical: 16, paddingHorizontal: 16 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '800', letterSpacing: 0.8 }}>
                      INSIGHTS & RECAP {user?.isPremium ? '' : '· PREMIUM'}
                    </Text>
                    <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900', marginTop: 6 }}>
                      {user?.isPremium ? 'Your tracking dashboard' : 'Unlock with Premium'}
                    </Text>
                    <Text style={{ color: 'rgba(255,255,255,0.88)', fontSize: 13, marginTop: 6 }}>
                      {user?.isPremium
                        ? 'Trips · Safety · Gems · Fuel · Badges · Orion'
                        : 'Weekly recap, coaching, fuel trends, and badges explorer — upgrade to view.'}
                    </Text>
                  </View>
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: 10 }}>
                    <Ionicons name={user?.isPremium ? 'stats-chart' : 'lock-closed'} size={26} color="#fff" />
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.92}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setShowPlaceAlertsDashboard(true);
              }}
              style={[styles.placeAlertDash, { backgroundColor: cardBg, borderColor: colors.border, marginHorizontal: 16, marginBottom: 12 }]}
              accessibilityRole="button"
              accessibilityLabel="Open place alerts dashboard"
            >
              <View style={[styles.placeAlertIconWrap, { backgroundColor: 'rgba(59,130,246,0.12)' }]}>
                <Ionicons name="notifications-outline" size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.placeAlertDashTitle, { color: text }]}>Place alerts</Text>
                <Text style={[styles.placeAlertDashSub, { color: sub }]} numberOfLines={2}>
                  Starting point, destination, leave time, how early to warn, and repeat days. Premium adds real-time push for traffic ahead.
                  {placeAlerts.length > 0 ? ` ${placeAlerts.length} active.` : ''}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={sub} />
            </TouchableOpacity>
            <ProfileOverviewSection
              actions={actionRows}
              cardBg={cardBg}
              text={text}
              sub={sub}
              level={user?.level ?? 1}
              totalXp={user?.xp ?? 0}
              onPressLevelProgress={() => setShowLevelProgress(true)}
              onPressShareScore={() => setShowDriverSnapshot(true)}
            />

            <SectionHeader title={`Favorites (${favoritePlaces.length})`} isLight={isLight} />
            <Text style={{ color: sub, fontSize: 12, paddingHorizontal: 16, marginBottom: 6, marginTop: -6, lineHeight: 16 }}>
              Saved favorite locations. The Favorites chip next to Map search opens this same list for quick picks.
            </Text>
            <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
              <PlacesCard
                cardBg={cardBg}
                text={text}
                sub={sub}
                places={favoritePlaces}
                loading={initialLoading}
                onDelete={handleDeletePlace}
                onAdd={() => setShowAddPlace(true)}
              />
            </View>

            <SectionHeader title={`Commute reminders (${commutes.length}/${commuteLimit})`} isLight={isLight} />
            <Text style={{ color: sub, fontSize: 12, paddingHorizontal: 16, marginBottom: 6, marginTop: -6, lineHeight: 16 }}>
              Recurring commute routes with typical leave times. Use Place alerts above for one-off destinations and richer leave-time options.
            </Text>
            <CommuteRoutesSection
              cardBg={cardBg}
              text={text}
              sub={sub}
              border={colors.border}
              primary={colors.primary}
              routes={commutes}
              loading={initialLoading}
              limit={commuteLimit}
              onDelete={handleDeleteCommute}
              onAdd={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowAddCommute(true);
              }}
            />
          </>
        )}

        {profileTab === 'settings' && (
          <>
            <SectionHeader title="Account" isLight={isLight} />
            <TouchableOpacity
              style={{ marginHorizontal: 16, marginBottom: 12, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: cardBg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
              onPress={() => { setDraftName(user?.name ?? ''); setShowEditName(true); }}
              activeOpacity={0.75}
            >
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={{ color: sub, fontSize: 12, marginBottom: 4 }}>Username</Text>
                <Text style={{ color: text, fontSize: 16, fontWeight: '600' }}>{user?.name ?? 'Driver'}</Text>
                <Text style={{ color: sub, fontSize: 11, marginTop: 4 }}>Shown instead of your email. You can change it once every 14 days.</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={sub} />
            </TouchableOpacity>

            <SectionHeader title="Your Plan" isLight={isLight} />
            <PlanCard cardBg={cardBg} text={text} sub={sub} planName={planConfig.name} planPrice={planConfig.price} planFeatures={planConfig.features} currentPlan={currentPlan} onUpgrade={() => setShowPlanModal(true)} />

            <TouchableOpacity
              style={{
                marginHorizontal: 16,
                marginBottom: 12,
                paddingVertical: 16,
                paddingHorizontal: 16,
                borderRadius: 14,
                backgroundColor: isLight ? '#EFF6FF' : 'rgba(59,130,246,0.12)',
                borderWidth: 1,
                borderColor: colors.primary + '40',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
              onPress={() => setShowPlanModal(true)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Plans and billing"
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: text, fontSize: 16, fontWeight: '800' }}>Plans &amp; billing</Text>
                <Text style={{ color: sub, fontSize: 12, marginTop: 4, lineHeight: 16 }}>
                  {currentPlan === 'basic'
                    ? `${PLANS.premium.price} founders · reg. $${PREMIUM_PUBLIC_MONTHLY.toFixed(2)}/mo · ~${premiumSavingsPercent()}% off`
                    : 'View plans, compare features, or change subscription'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.primary} />
            </TouchableOpacity>

            {currentPlan !== 'basic' && (
              <TouchableOpacity
                style={{ marginHorizontal: 16, marginBottom: 12, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center', backgroundColor: cardBg }}
                onPress={async () => {
                  try {
                    const res = await api.post<{ success?: boolean; data?: { url?: string } }>('/api/payments/billing-portal', {
                      return_url: Platform.OS === 'web' ? undefined : 'snaproad://billing/portal',
                    });
                    if (!res.success) {
                      Alert.alert('Manage Subscription', res.error || 'Could not open billing portal.');
                      return;
                    }
                    const body = res.data as { success?: boolean; data?: { url?: string } } | undefined;
                    const url = body?.data?.url;
                    if (url) await Linking.openURL(url);
                    else Alert.alert('Manage Subscription', 'No billing link returned. Complete a subscription purchase once, or run DB migration 016_profiles_stripe_customer.sql and try again after checkout.');
                  } catch (e: any) {
                    Alert.alert('Error', e?.message || 'Could not open billing portal.');
                  }
                }}
                activeOpacity={0.7}
              >
                <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '600' }}>Manage Subscription</Text>
              </TouchableOpacity>
            )}

            <SectionHeader title="Vehicle" isLight={isLight} />
            <VehicleCard
              cardBg={cardBg}
              text={text}
              sub={sub}
              vehicleType={vehicleType}
              setVehicleType={setVehicleType}
              tallVehicle={tallVehicle}
              vehicleHeight={vehicleHeight}
              setTallVehicle={setTallVehicle}
              setVehicleHeight={setVehicleHeight}
              heightPresets={heightPresets}
              onSave={handleSaveVehicle}
            />

            <SectionHeader title={`Saved Places (${places.length})`} isLight={isLight} />
            <PlacesCard cardBg={cardBg} text={text} sub={sub} places={places} loading={initialLoading} onDelete={handleDeletePlace} onAdd={() => setShowAddPlace(true)} />

            <SectionHeader title={`Quick routes (${routes.length})`} isLight={isLight} />
            <Text style={{ color: sub, fontSize: 12, paddingHorizontal: 16, marginBottom: 8, marginTop: -6, lineHeight: 16 }}>
              Shortcuts for navigation—home, work, and places you drive to often (separate from Favorites and place alerts). Manage place alerts from the Overview tab.
            </Text>
            <RoutesCard cardBg={cardBg} text={text} sub={sub} routes={routes} loading={initialLoading} onDelete={handleDeleteRoute} />

            <SectionHeader title={notifSyncing ? 'Notifications (syncing...)' : 'Notifications'} isLight={isLight} />
            <NotificationsCard
              cardBg={cardBg}
              text={text}
              sub={sub}
              items={[
                { label: 'Push Notifications', val: pushEnabled, set: (v) => { setPushEnabled(v); syncNotification('trip_summary', v); } },
                { label: 'Friend Requests', val: friendRequests, set: (v) => { setFriendRequests(v); syncNotification('friend_activity', v); } },
                { label: 'Offer Alerts', val: offerAlerts, set: (v) => { setOfferAlerts(v); syncNotification('offers', v); } },
                { label: 'Speed Alerts', val: speedAlerts, set: (v) => { setSpeedAlerts(v); syncNotification('safety_alerts', v); } },
              ]}
            />

            <SectionHeader title="Appearance" isLight={isLight} />
            <AppearanceCard cardBg={cardBg} text={text} sub={sub} darkEnabled={!isLight} onToggle={toggleTheme} />

            <SectionHeader title="Default Driving Mode" isLight={isLight} />
            <DrivingModeCard cardBg={cardBg} text={text} defaultMode={defaultMode} setDefaultMode={setDefaultMode} />

            <SectionHeader title="Support" isLight={isLight} />
            <View style={{ paddingHorizontal: 16, gap: 8, marginBottom: 12 }}>
              <TouchableOpacity style={[styles.fuelBtn, { flexDirection: 'row', gap: 8, justifyContent: 'center' }]} onPress={() => setShowHelp(true)}>
                <Ionicons name="help-circle-outline" size={18} color="#fff" />
                <Text style={styles.fuelBtnText}>Help & Support</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.fuelBtn, { flexDirection: 'row', gap: 8, justifyContent: 'center', backgroundColor: '#7C3AED' }]} onPress={() => setShowConcern(true)}>
                <Ionicons name="chatbubble-ellipses-outline" size={18} color="#fff" />
                <Text style={styles.fuelBtnText}>Submit Concern</Text>
              </TouchableOpacity>
            </View>

            <SectionHeader title="About" isLight={isLight} />
            <AboutCard cardBg={cardBg} text={text} sub={sub} />

            <SignOutButton onSignOut={logout} />
            <DeleteAccountButton onDeleteAccount={handleDeleteAccount} isDeleting={deletingAccount} />
          </>
        )}
      </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showEditName} onClose={() => setShowEditName(false)}>
        <View style={{ paddingVertical: 8 }}>
          <Text style={{ color: text, fontWeight: '800', fontSize: 18, marginBottom: 12 }}>Edit username</Text>
          <Text style={{ color: sub, fontSize: 13, marginBottom: 10 }}>
            This is how you appear in SnapRoad. Your sign-in email stays the same. You may change your username once every 14 days.
          </Text>
          {!canChangeUsername && usernameChangeAvailableAt ? (
            <Text style={{ color: '#F59E0B', fontSize: 13, marginBottom: 10 }}>
              Next change available{' '}
              {(() => {
                try {
                  const d = new Date(usernameChangeAvailableAt);
                  return Number.isNaN(d.getTime()) ? usernameChangeAvailableAt : d.toLocaleString();
                } catch {
                  return usernameChangeAvailableAt;
                }
              })()}
            </Text>
          ) : null}
          <TextInput
            value={draftName}
            onChangeText={setDraftName}
            placeholder="Choose a username"
            placeholderTextColor={sub}
            autoCapitalize="words"
            editable={canChangeUsername}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 12,
              color: text,
              fontSize: 16,
              marginBottom: 16,
              backgroundColor: cardBg,
              opacity: canChangeUsername ? 1 : 0.55,
            }}
          />
          <TouchableOpacity
            style={{
              backgroundColor: colors.primary,
              paddingVertical: 14,
              borderRadius: 12,
              alignItems: 'center',
              opacity: savingName || !draftName.trim() || !canChangeUsername ? 0.5 : 1,
            }}
            disabled={savingName || !draftName.trim() || !canChangeUsername}
            onPress={async () => {
              setSavingName(true);
              try {
                const res = await api.put('/api/user/profile', { name: draftName.trim() });
                if (!res.success) {
                  Alert.alert('Could not update', res.error || 'Try again.');
                  return;
                }
                updateUser({ name: draftName.trim() });
                setShowEditName(false);
                await loadData('silent');
              } finally {
                setSavingName(false);
              }
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>{savingName ? 'Saving…' : 'Save'}</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <PlanModal
        visible={showPlanModal}
        onClose={() => setShowPlanModal(false)}
        cardBg={cardBg}
        text={text}
        sub={sub}
        currentPlan={currentPlan}
        onSelectPlan={handleSelectPlan}
        isLight={isLight}
      />
      <AddPlaceModal
        visible={showAddPlace}
        onClose={() => setShowAddPlace(false)}
        cardBg={cardBg}
        isLight={isLight}
        text={text}
        sub={sub}
        newPlaceName={newPlaceName}
        setNewPlaceName={setNewPlaceName}
        newPlaceAddress={newPlaceAddress}
        setNewPlaceAddress={setNewPlaceAddress}
        onSave={handleAddPlace}
      />
      <LevelProgressModal
        visible={showLevelProgress}
        onClose={() => setShowLevelProgress(false)}
        cardBg={cardBg}
        text={text}
        sub={sub}
        level={user?.level ?? 1}
        totalXp={user?.xp ?? 0}
      />
      <ProfileInsightsDashboard
        visible={showInsightsDashboard}
        onClose={() => setShowInsightsDashboard(false)}
        weeklyRecap={weeklyRecap}
        tripHistoryRows={tripHistoryRows}
        gemTxRows={gemTxRows}
        badgeRows={badgeRows}
        fuelSummary={fuelSummary}
        myRank={myRank}
        isPremium={Boolean(user?.isPremium)}
        onUpgrade={() => {
          setShowInsightsDashboard(false);
          setShowPlanModal(true);
        }}
        onOpenLeaderboard={() => {
          setShowInsightsDashboard(false);
          setShowLeaderboard(true);
        }}
        onOpenFuelTracker={() => {
          setShowInsightsDashboard(false);
          setShowFuelTracker(true);
        }}
      />
      <LeaderboardModal
        visible={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
        cardBg={cardBg}
        text={text}
        sub={sub}
        myRank={myRank}
        entries={leaderboardRows}
      />
      <DriverSnapshotModal
        visible={showDriverSnapshot}
        onClose={() => setShowDriverSnapshot(false)}
        user={user}
        weeklyRecap={weeklyRecap}
        myRank={myRank}
      />
      <IncidentReportModal
        visible={showIncidentReport}
        onClose={() => setShowIncidentReport(false)}
        onTakePhoto={async () => {
          try {
            const perm = await ImagePicker.requestCameraPermissionsAsync();
            if (!perm.granted) {
              Alert.alert('Permission required', 'Camera permission is needed to report with photo.');
              return;
            }
            const capture = await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: false });
            if (capture.canceled) return;
            const res = await api.post('/api/incidents/report', {
              type: 'hazard',
              lat: location.lat,
              lng: location.lng,
              description: `Photo report (${capture.assets?.[0]?.uri ?? 'camera'})`,
            });
            if (!res.success) {
              Alert.alert('Error', res.error || 'Could not submit incident.');
              return;
            }
            setShowIncidentReport(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {
            Alert.alert('Error', 'Could not submit incident right now.');
          }
        }}
        onPickGallery={async () => {
          try {
            const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!perm.granted) {
              Alert.alert('Permission required', 'Gallery permission is needed to report from library.');
              return;
            }
            const pick = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: false });
            if (pick.canceled) return;
            const res = await api.post('/api/incidents/report', {
              type: 'hazard',
              lat: location.lat,
              lng: location.lng,
              description: `Gallery photo report (${pick.assets?.[0]?.uri ?? 'gallery'})`,
            });
            if (!res.success) {
              Alert.alert('Error', res.error || 'Could not submit incident.');
              return;
            }
            setShowIncidentReport(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {
            Alert.alert('Error', 'Could not submit incident right now.');
          }
        }}
      />
      <PlaceAlertsDashboardModal
        visible={showPlaceAlertsDashboard}
        onClose={() => setShowPlaceAlertsDashboard(false)}
        places={places}
        userLocation={location}
        placeAlerts={placeAlerts}
        placeAlertLimit={placeAlertLimit}
        placeAlertPremium={placeAlertPremium}
        onRefresh={() => void loadData('silent')}
      />
      <AddCommuteModal
        visible={showAddCommute}
        onClose={() => setShowAddCommute(false)}
        cardBg={cardBg}
        text={text}
        sub={sub}
        primary={colors.primary}
        border={colors.border}
        places={places}
        originLat={location.lat}
        originLng={location.lng}
        onCreated={() => void loadData('silent')}
      />
      <FuelTracker visible={showFuelTracker} onClose={() => setShowFuelTracker(false)} />
      <HelpSupport visible={showHelp} onClose={() => setShowHelp(false)} />
      <SubmitConcern visible={showConcern} onClose={() => setShowConcern(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scoreCard: { marginHorizontal: 16, borderRadius: 14, padding: 14 },
  scoreTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  scoreLabel: { fontSize: 12, fontWeight: '600' },
  scoreValue: { fontSize: 34, fontWeight: '900', lineHeight: 36 },
  scoreOutOf: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  scoreTapHint: { fontSize: 13, fontWeight: '700', marginTop: 12, textAlign: 'right' },
  premiumChip: { backgroundColor: 'rgba(245,158,11,0.15)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },
  premiumChipText: { color: '#FF9500', fontSize: 10, fontWeight: '800' },
  scoreMetricRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  scoreMetricLabel: { width: 80, fontSize: 12, fontWeight: '600' },
  scoreTrack: { flex: 1, height: 8, borderRadius: 6, backgroundColor: 'rgba(148,163,184,0.25)', overflow: 'hidden' },
  scoreFill: { height: '100%', backgroundColor: '#007AFF', borderRadius: 6 },
  scoreMetricValue: { width: 30, textAlign: 'right', fontSize: 12, fontWeight: '700' },
  fuelCard: { marginHorizontal: 16, borderRadius: 14, padding: 14 },
  fuelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  fuelLabel: { fontSize: 13, fontWeight: '600' },
  fuelValue: { fontSize: 18, fontWeight: '800' },
  fuelBtn: { marginTop: 12, backgroundColor: '#007AFF', borderRadius: 12, alignItems: 'center', paddingVertical: 12 },
  fuelBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  fuelHint: { fontSize: 11, marginTop: 8, lineHeight: 15 },
  liveSyncRow: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginTop: 6,
    marginBottom: 8,
  },
  liveSyncText: { fontSize: 12, fontWeight: '600' },
  lifetimeHint: { fontSize: 11, fontWeight: '600', textAlign: 'center', marginTop: -4, marginBottom: 6, paddingHorizontal: 16 },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  alertName: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  alertSub: { fontSize: 12, fontWeight: '500' },
  upgradeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  upgradeSmallText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  placeAlertDash: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  placeAlertIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  placeAlertDashTitle: { fontSize: 16, fontWeight: '800' },
  placeAlertDashSub: { fontSize: 12, fontWeight: '500', marginTop: 2, lineHeight: 16 },
});

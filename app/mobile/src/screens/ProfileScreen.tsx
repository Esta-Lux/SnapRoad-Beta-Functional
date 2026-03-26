import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../hooks/useLocation';
import { api } from '../api/client';
import { PLANS } from '../constants/plans';
import type { DrivingMode, PlanTier, SavedLocation, SavedRoute } from '../types';
import {
  AboutCard,
  AddPlaceModal,
  AppearanceCard,
  BadgesModal,
  DrivingScoreModal,
  DrivingModeCard,
  GemHistoryModal,
  IncidentReportModal,
  LevelProgressModal,
  LeaderboardModal,
  NotificationsCard,
  PlacesCard,
  PlanCard,
  PlanModal,
  PremiumUpsellCard,
  ProfileHeader,
  ProfileBadgeItem,
  ProfileGemTxItem,
  ProfileLeaderboardEntry,
  ProfileTripHistoryItem,
  ProfileWeeklyRecap,
  ProfileOverviewSection,
  TripHistoryModal,
  WeeklyRecapModal,
  RoutesCard,
  SectionHeader,
  SignOutButton,
  VehicleCard,
} from '../components/profile/ProfileSections';
import type { ProfileOverviewActionItem } from '../components/profile/types';
import { ProfileStatsStrip, ProfileTabBar } from '../components/profile/ProfileScreenBlocks';

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { location } = useLocation();
  const { isLight, colors, toggleTheme } = useTheme();
  const { user, logout, updateUser } = useAuth();
  const bg = colors.background;
  const cardBg = colors.card;
  const text = colors.text;
  const sub = colors.textSecondary;

  const [loading, setLoading] = useState(true);
  const [places, setPlaces] = useState<SavedLocation[]>([]);
  const [routes, setRoutes] = useState<SavedRoute[]>([]);
  const [notifSyncing, setNotifSyncing] = useState(false);

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
  const [profileTab, setProfileTab] = useState<'overview' | 'score' | 'fuel' | 'settings'>('overview');
  const [showLevelProgress, setShowLevelProgress] = useState(false);
  const [showWeeklyRecap, setShowWeeklyRecap] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showTripHistory, setShowTripHistory] = useState(false);
  const [showGemHistory, setShowGemHistory] = useState(false);
  const [showBadges, setShowBadges] = useState(false);
  const [showIncidentReport, setShowIncidentReport] = useState(false);
  const [showDrivingScore, setShowDrivingScore] = useState(false);
  const [weeklyRecap, setWeeklyRecap] = useState<ProfileWeeklyRecap>({
    totalTrips: 0,
    totalMiles: 0,
    gemsEarnedWeek: 0,
    avgSafetyScore: 0,
    aiTip: '',
  });
  const [leaderboardRows, setLeaderboardRows] = useState<ProfileLeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState(0);
  const [tripHistoryRows, setTripHistoryRows] = useState<ProfileTripHistoryItem[]>([]);
  const [gemTxRows, setGemTxRows] = useState<ProfileGemTxItem[]>([]);
  const [badgeRows, setBadgeRows] = useState<ProfileBadgeItem[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [profileRes, locRes, routeRes, notifRes, weeklyRes, leaderRes, tripsHistoryRes, gemsRes, badgesRes] = await Promise.all([
        api.getProfile(),
        api.get<any>('/api/locations'),
        api.get<any>('/api/routes'),
        api.get<any>('/api/settings/notifications'),
        api.get<any>('/api/trips/weekly-insights'),
        api.get<any>('/api/leaderboard?time_filter=weekly&limit=10'),
        api.get<any>('/api/trips/history'),
        api.get<any>('/api/gems/history'),
        api.get<any>('/api/badges'),
      ]);
      const unwrap = (r: any) => r?.data?.data ?? r?.data ?? [];
      const profilePayload = (profileRes?.data as any)?.data ?? profileRes?.data ?? {};
      updateUser({
        gems: Number(profilePayload.gems ?? user?.gems ?? 0),
        level: Number(profilePayload.level ?? user?.level ?? 1),
        totalMiles: Number(profilePayload.total_miles ?? user?.totalMiles ?? 0),
        totalTrips: Number(profilePayload.total_trips ?? user?.totalTrips ?? 0),
        safetyScore: Number(profilePayload.safety_score ?? user?.safetyScore ?? 0),
      });
      setPlaces(Array.isArray(unwrap(locRes)) ? unwrap(locRes) : []);
      setRoutes(Array.isArray(unwrap(routeRes)) ? unwrap(routeRes) : []);
      const notifPayload = (notifRes.data as any)?.data ?? notifRes.data ?? {};
      const push = notifPayload?.push_notifications ?? {};
      setPushEnabled(Boolean(push.trip_summary ?? true));
      setFriendRequests(Boolean(push.friend_activity ?? true));
      setOfferAlerts(Boolean(push.offers ?? true));
      setSpeedAlerts(Boolean(push.safety_alerts ?? true));
      const weekly = weeklyRes?.data?.data ?? weeklyRes?.data ?? {};
      setWeeklyRecap({
        totalTrips: Number(weekly.total_trips ?? 0),
        totalMiles: Number(weekly.total_miles ?? 0),
        gemsEarnedWeek: Number(weekly.gems_earned_week ?? 0),
        avgSafetyScore: Number(weekly.safety_score_avg ?? 0),
        aiTip: String(weekly.ai_tip ?? ''),
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
      setMyRank(Number(lb.my_rank ?? 0));
      updateUser({ rank: Number(lb.my_rank ?? user?.rank ?? 0) });
      const historyData = tripsHistoryRes?.data?.data ?? tripsHistoryRes?.data ?? {};
      const recentTrips = Array.isArray(historyData.recent_trips) ? historyData.recent_trips : [];
      setTripHistoryRows(recentTrips.map((t: any, idx: number) => ({
        id: String(t.id ?? idx),
        date: String(t.date ?? ''),
        time: String(t.time ?? ''),
        origin: String(t.origin ?? 'Current Location'),
        destination: String(t.destination ?? 'Dropped pin'),
        distance_miles: Number(t.distance_miles ?? 0),
        duration_minutes: Number(t.duration_minutes ?? 0),
        gems_earned: Number(t.gems_earned ?? 0),
        safety_score: Number(t.safety_score ?? 0),
      })));
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
      setBadgeRows(badgeList.map((b: any, idx: number) => ({
        id: b.id ?? idx,
        name: String(b.name ?? 'Badge'),
        earned: Boolean(b.earned),
      })));
      if (user?.vehicle_height_meters && user.vehicle_height_meters > 0) {
        setTallVehicle(true);
        setVehicleHeight(String(user.vehicle_height_meters));
      }
    } finally {
      setLoading(false);
    }
  }, [updateUser, user?.gems, user?.level, user?.rank, user?.safetyScore, user?.totalMiles, user?.totalTrips, user?.vehicle_height_meters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveVehicle = useCallback(async () => {
    const height = tallVehicle ? parseFloat(vehicleHeight) : null;
    const res = await api.put('/api/user/profile', { vehicle_height_meters: height });
    if (res.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Saved', 'Vehicle settings updated.');
      updateUser({ vehicle_height_meters: height ?? undefined } as any);
    } else {
      Alert.alert('Error', res.error ?? 'Could not save vehicle settings');
    }
  }, [tallVehicle, vehicleHeight, updateUser]);

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
      loadData();
    }
  }, [newPlaceName, newPlaceAddress, newPlaceCategory, loadData]);

  const handleDeleteRoute = useCallback(async (id: number) => {
    await api.delete(`/api/routes/${id}`);
    setRoutes((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const handleSelectPlan = useCallback(async (plan: PlanTier) => {
    if (plan === 'basic') {
      Alert.alert('Basic Plan', 'You are already on the basic plan.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await api.post<any>('/api/payments/checkout/session', { plan_id: plan });
      const sessionData = (res.data as any)?.data ?? res.data;
      if (sessionData?.url) {
        Alert.alert('Checkout', 'Stripe session created. Native checkout handoff comes next.');
      } else {
        Alert.alert('Upgrade', `To upgrade to ${plan}, please visit the web app for now.`);
      }
    } catch {
      Alert.alert('Error', 'Could not start checkout. Try again.');
    }
    setShowPlanModal(false);
  }, []);

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
  const initials = (user?.name ?? 'U').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  const actionRows: ProfileOverviewActionItem[] = [
    {
      key: 'share_location',
      icon: 'locate-outline',
      label: 'Share My Location',
      value: user?.isPremium ? 'Premium enabled' : 'Track friends on the map',
      badgeText: user?.isPremium ? 'PREMIUM' : 'LOCKED',
      onPress: () => {
        if (!user?.isPremium) {
          setShowPlanModal(true);
          return;
        }
        navigation.getParent()?.navigate('Map');
      },
    },
    {
      key: 'achievements',
      icon: 'trophy-outline',
      label: 'Achievements',
      value: `${user?.badges ?? 0}/160 badges`,
      onPress: () => setShowBadges(true),
    },
    {
      key: 'incidents',
      icon: 'warning-outline',
      label: 'Incidents',
      value: 'Report & verify',
      onPress: () => setShowIncidentReport(true),
    },
    {
      key: 'driving_score',
      icon: 'speedometer-outline',
      label: 'Driving Score',
      value: user?.isPremium ? 'Detailed breakdown' : 'Unlock with Premium',
      badgeText: user?.isPremium ? undefined : 'PREMIUM',
      onPress: () => setShowDrivingScore(true),
    },
    {
      key: 'rank',
      icon: 'ribbon-outline',
      label: 'Rank & Leaderboard',
      value: `Current rank #${user?.rank ?? '--'}`,
      onPress: () => setShowLeaderboard(true),
    },
    {
      key: 'weekly_recap',
      icon: 'sparkles-outline',
      label: 'Weekly Recap',
      value: 'Analyzed by Orion',
      onPress: () => setShowWeeklyRecap(true),
    },
    {
      key: 'dashboards',
      icon: 'people-outline',
      label: 'Dashboards',
      value: 'Friends · Family',
      onPress: () => navigation.getParent()?.navigate('Dashboards'),
    },
    {
      key: 'trip_history',
      icon: 'time-outline',
      label: 'Trip History',
      value: `${user?.totalTrips ?? 0} recorded trips`,
      onPress: () => setShowTripHistory(true),
    },
    {
      key: 'gem_history',
      icon: 'diamond-outline',
      label: 'Gem History',
      value: 'View transactions',
      onPress: () => setShowGemHistory(true),
    },
    {
      key: 'friends',
      icon: 'people-circle-outline',
      label: 'Friends',
      value: 'Manage connections',
      onPress: () => navigation.getParent()?.navigate('Dashboards'),
    },
  ];
  const monthlyFuelCost = 186;
  const fuelEfficiency = 26.4;
  const scoreBreakdown = [
    { label: 'Speed', value: 98 },
    { label: 'Smoothness', value: 91 },
    { label: 'Focus', value: 88 },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <ProfileHeader user={user} initials={initials} colors={colors} planName={planConfig.name} />
        <ProfileStatsStrip
          cardBg={cardBg}
          text={text}
          sub={sub}
          gems={user?.gems ?? 0}
          rank={user?.rank ?? '--'}
          trips={user?.totalTrips ?? 0}
          miles={Math.round(user?.totalMiles ?? 0)}
        />
        <ProfileTabBar activeTab={profileTab} onChange={setProfileTab} sub={sub} />

        {profileTab === 'overview' && (
          <>
            <SectionHeader title="Overview" isLight={isLight} />
            <ProfileOverviewSection
              actions={actionRows}
              cardBg={cardBg}
              text={text}
              sub={sub}
              onPressLevelProgress={() => setShowLevelProgress(true)}
              onPressShareScore={() => setShowDrivingScore(true)}
            />
          </>
        )}

        {profileTab === 'score' && (
          <>
            <SectionHeader title="Driving Score" isLight={isLight} />
            {user?.isPremium ? (
              <View style={[styles.scoreCard, { backgroundColor: cardBg }]}>
                <View style={styles.scoreTopRow}>
                  <View>
                    <Text style={[styles.scoreLabel, { color: sub }]}>SnapRoad Score</Text>
                    <Text style={[styles.scoreValue, { color: '#3B82F6' }]}>{user?.safetyScore ?? 0}</Text>
                  </View>
                  <View style={styles.premiumChip}><Text style={styles.premiumChipText}>PREMIUM</Text></View>
                </View>
                {scoreBreakdown.map((s) => (
                  <View key={s.label} style={styles.scoreMetricRow}>
                    <Text style={[styles.scoreMetricLabel, { color: text }]}>{s.label}</Text>
                    <View style={styles.scoreTrack}>
                      <View style={[styles.scoreFill, { width: `${s.value}%` }]} />
                    </View>
                    <Text style={[styles.scoreMetricValue, { color: sub }]}>{s.value}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <PremiumUpsellCard cardBg={cardBg} onUpgrade={() => setShowPlanModal(true)} />
            )}
          </>
        )}

        {profileTab === 'fuel' && (
          <>
            <SectionHeader title="Fuel Tracker" isLight={isLight} />
            {user?.isPremium ? (
              <View style={[styles.fuelCard, { backgroundColor: cardBg }]}>
                <View style={styles.fuelRow}>
                  <Text style={[styles.fuelLabel, { color: sub }]}>Monthly Fuel Cost</Text>
                  <Text style={[styles.fuelValue, { color: text }]}>${monthlyFuelCost}</Text>
                </View>
                <View style={styles.fuelRow}>
                  <Text style={[styles.fuelLabel, { color: sub }]}>Efficiency</Text>
                  <Text style={[styles.fuelValue, { color: text }]}>{fuelEfficiency} MPG</Text>
                </View>
                <TouchableOpacity style={styles.fuelBtn}>
                  <Text style={styles.fuelBtnText}>Log Fuel Fill-up</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <PremiumUpsellCard cardBg={cardBg} onUpgrade={() => setShowPlanModal(true)} />
            )}
          </>
        )}

        {profileTab === 'settings' && (
          <>
            <SectionHeader title="Your Plan" isLight={isLight} />
            <PlanCard cardBg={cardBg} text={text} sub={sub} planName={planConfig.name} planPrice={planConfig.price} planFeatures={planConfig.features} currentPlan={currentPlan} onUpgrade={() => setShowPlanModal(true)} />

            <SectionHeader title="Vehicle" isLight={isLight} />
            <VehicleCard cardBg={cardBg} text={text} sub={sub} tallVehicle={tallVehicle} vehicleHeight={vehicleHeight} setTallVehicle={setTallVehicle} setVehicleHeight={setVehicleHeight} heightPresets={heightPresets} onSave={handleSaveVehicle} />

            <SectionHeader title={`Saved Places (${places.length})`} isLight={isLight} />
            <PlacesCard cardBg={cardBg} text={text} sub={sub} places={places} loading={loading} onDelete={handleDeletePlace} onAdd={() => setShowAddPlace(true)} />

            <SectionHeader title={`Saved Routes (${routes.length})`} isLight={isLight} />
            <RoutesCard cardBg={cardBg} text={text} sub={sub} routes={routes} loading={loading} onDelete={handleDeleteRoute} />

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

            <SectionHeader title="About" isLight={isLight} />
            <AboutCard cardBg={cardBg} text={text} sub={sub} />

            <SignOutButton onSignOut={logout} />
          </>
        )}
      </ScrollView>

      <PlanModal
        visible={showPlanModal}
        onClose={() => setShowPlanModal(false)}
        cardBg={cardBg}
        text={text}
        sub={sub}
        currentPlan={currentPlan}
        onSelectPlan={handleSelectPlan}
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
        totalXp={(user?.level ?? 1) * 1000}
      />
      <WeeklyRecapModal
        visible={showWeeklyRecap}
        onClose={() => setShowWeeklyRecap(false)}
        cardBg={cardBg}
        text={text}
        sub={sub}
        recap={weeklyRecap}
        isPremium={Boolean(user?.isPremium)}
        onUpgrade={() => setShowPlanModal(true)}
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
      <BadgesModal
        visible={showBadges}
        onClose={() => setShowBadges(false)}
        cardBg={cardBg}
        text={text}
        sub={sub}
        badges={badgeRows}
      />
      <TripHistoryModal
        visible={showTripHistory}
        onClose={() => setShowTripHistory(false)}
        trips={tripHistoryRows}
      />
      <GemHistoryModal
        visible={showGemHistory}
        onClose={() => setShowGemHistory(false)}
        tx={gemTxRows}
      />
      <DrivingScoreModal
        visible={showDrivingScore}
        onClose={() => setShowDrivingScore(false)}
        cardBg={cardBg}
        text={text}
        sub={sub}
        score={user?.safetyScore ?? 0}
        isPremium={Boolean(user?.isPremium)}
        onUpgrade={() => setShowPlanModal(true)}
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
            await api.post('/api/incidents/report', {
              type: 'camera',
              lat: location.lat,
              lng: location.lng,
              description: `OHGO photo incident report (${capture.assets?.[0]?.uri ?? 'camera'})`,
            });
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
            await api.post('/api/incidents/report', {
              type: 'camera',
              lat: location.lat,
              lng: location.lng,
              description: `OHGO gallery incident report (${pick.assets?.[0]?.uri ?? 'gallery'})`,
            });
            setShowIncidentReport(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {
            Alert.alert('Error', 'Could not submit incident right now.');
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scoreCard: { marginHorizontal: 16, borderRadius: 14, padding: 14 },
  scoreTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  scoreLabel: { fontSize: 12, fontWeight: '600' },
  scoreValue: { fontSize: 34, fontWeight: '900', lineHeight: 36 },
  premiumChip: { backgroundColor: 'rgba(245,158,11,0.15)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },
  premiumChipText: { color: '#F59E0B', fontSize: 10, fontWeight: '800' },
  scoreMetricRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  scoreMetricLabel: { width: 80, fontSize: 12, fontWeight: '600' },
  scoreTrack: { flex: 1, height: 8, borderRadius: 6, backgroundColor: 'rgba(148,163,184,0.25)', overflow: 'hidden' },
  scoreFill: { height: '100%', backgroundColor: '#3B82F6', borderRadius: 6 },
  scoreMetricValue: { width: 30, textAlign: 'right', fontSize: 12, fontWeight: '700' },
  fuelCard: { marginHorizontal: 16, borderRadius: 14, padding: 14 },
  fuelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  fuelLabel: { fontSize: 13, fontWeight: '600' },
  fuelValue: { fontSize: 18, fontWeight: '800' },
  fuelBtn: { marginTop: 12, backgroundColor: '#3B82F6', borderRadius: 10, alignItems: 'center', paddingVertical: 11 },
  fuelBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

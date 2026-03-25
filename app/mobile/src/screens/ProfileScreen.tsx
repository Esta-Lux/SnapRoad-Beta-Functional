import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/client';
import { PLANS } from '../constants/plans';
import type { DrivingMode, PlanTier, SavedLocation, SavedRoute } from '../types';
import {
  AboutCard,
  AddPlaceModal,
  AppearanceCard,
  DrivingModeCard,
  NotificationsCard,
  PlacesCard,
  PlanCard,
  PlanModal,
  ProfileHeader,
  ProfileOverviewSection,
  RoutesCard,
  SectionHeader,
  SignOutButton,
  VehicleCard,
} from '../components/profile/ProfileSections';
import type { ProfileOverviewActionItem } from '../components/profile/ProfileSections';

export default function ProfileScreen() {
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

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [locRes, routeRes, notifRes] = await Promise.all([
        api.get<any>('/api/locations'),
        api.get<any>('/api/routes'),
        api.get<any>('/api/settings/notifications'),
      ]);
      const unwrap = (r: any) => r?.data?.data ?? r?.data ?? [];
      setPlaces(Array.isArray(unwrap(locRes)) ? unwrap(locRes) : []);
      setRoutes(Array.isArray(unwrap(routeRes)) ? unwrap(routeRes) : []);
      const notifPayload = (notifRes.data as any)?.data ?? notifRes.data ?? {};
      const push = notifPayload?.push_notifications ?? {};
      setPushEnabled(Boolean(push.trip_summary ?? true));
      setFriendRequests(Boolean(push.friend_activity ?? true));
      setOfferAlerts(Boolean(push.offers ?? true));
      setSpeedAlerts(Boolean(push.safety_alerts ?? true));
      if (user?.vehicle_height_meters && user.vehicle_height_meters > 0) {
        setTallVehicle(true);
        setVehicleHeight(String(user.vehicle_height_meters));
      }
    } finally {
      setLoading(false);
    }
  }, [user?.vehicle_height_meters]);

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
    { key: 'share_location', icon: 'locate-outline', label: 'Share My Location', value: user?.isPremium ? 'Premium enabled' : 'Track friends on the map', badgeText: user?.isPremium ? 'PREMIUM' : 'LOCKED' },
    { key: 'achievements', icon: 'trophy-outline', label: 'Achievements', value: `${user?.badges ?? 0}/160 badges`, onPress: () => Alert.alert('Achievements', 'Open Rewards tab to view badges and achievements.') },
    { key: 'incidents', icon: 'warning-outline', label: 'Incidents', value: 'Report & verify', onPress: () => Alert.alert('Incidents', 'Use the Map tab report button to submit incidents.') },
    { key: 'dashboards', icon: 'people-outline', label: 'Dashboards', value: 'Friends · Family', onPress: () => Alert.alert('Dashboards', 'Open the Dashboards tab for Friends/Family.') },
    { key: 'trip_history', icon: 'time-outline', label: 'Trip History', value: `${user?.totalTrips ?? 0} recorded trips` },
    { key: 'gem_history', icon: 'diamond-outline', label: 'Gem History', value: 'View transactions', onPress: () => Alert.alert('Gem History', 'Open Rewards tab to view gem transactions.') },
    { key: 'friends', icon: 'people-circle-outline', label: 'Friends', value: 'Manage connections', onPress: () => Alert.alert('Friends', 'Open the Dashboards tab to manage friends.') },
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
        <View style={[styles.statsRow, { backgroundColor: cardBg }]}>
          <View style={styles.statCol}>
            <Text style={[styles.statVal, { color: text }]}>{user?.gems ?? 0}</Text>
            <Text style={[styles.statLbl, { color: sub }]}>Gems</Text>
          </View>
          <View style={styles.statCol}>
            <Text style={[styles.statVal, { color: text }]}>#{user?.rank ?? '--'}</Text>
            <Text style={[styles.statLbl, { color: sub }]}>Rank</Text>
          </View>
          <View style={styles.statCol}>
            <Text style={[styles.statVal, { color: text }]}>{user?.totalTrips ?? 0}</Text>
            <Text style={[styles.statLbl, { color: sub }]}>Trips</Text>
          </View>
          <View style={styles.statCol}>
            <Text style={[styles.statVal, { color: text }]}>{Math.round(user?.totalMiles ?? 0)}</Text>
            <Text style={[styles.statLbl, { color: sub }]}>Miles</Text>
          </View>
        </View>

        <View style={[styles.tabRow, { backgroundColor: colors.surfaceSecondary }]}>
          {([
            { id: 'overview', label: 'Overview' },
            { id: 'score', label: 'Score' },
            { id: 'fuel', label: 'Fuel' },
            { id: 'settings', label: 'Settings' },
          ] as const).map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tabBtn, profileTab === tab.id && styles.tabBtnActive]}
              onPress={() => setProfileTab(tab.id)}
            >
              <Text style={[styles.tabBtnText, { color: profileTab === tab.id ? '#fff' : sub }]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {profileTab === 'overview' && (
          <>
            <SectionHeader title="Overview" isLight={isLight} />
            <ProfileOverviewSection actions={actionRows} cardBg={cardBg} text={text} sub={sub} />
          </>
        )}

        {profileTab === 'score' && (
          <>
            <SectionHeader title="Driving Score" isLight={isLight} />
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
          </>
        )}

        {profileTab === 'fuel' && (
          <>
            <SectionHeader title="Fuel Tracker" isLight={isLight} />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tabRow: { flexDirection: 'row', marginHorizontal: 16, marginTop: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(148,163,184,0.35)' },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: '#3B82F6' },
  tabBtnText: { fontSize: 12, fontWeight: '700' },
  statsRow: { marginHorizontal: 16, marginBottom: 2, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 8, flexDirection: 'row' },
  statCol: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 18, fontWeight: '800' },
  statLbl: { fontSize: 11, marginTop: 2 },
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

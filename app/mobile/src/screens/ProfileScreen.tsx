import React, { useCallback, useEffect, useState } from 'react';
import { Alert, SafeAreaView, ScrollView } from 'react-native';
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
  RoutesCard,
  SectionHeader,
  SignOutButton,
  VehicleCard,
} from '../components/profile/ProfileSections';

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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <ProfileHeader user={user} initials={initials} colors={colors} planName={planConfig.name} />

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

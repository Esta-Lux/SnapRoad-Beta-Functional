import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch, TextInput,
  Alert, Modal, SafeAreaView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/client';
import Skeleton from '../components/common/Skeleton';
import { DRIVING_MODES } from '../constants/modes';
import { PLANS } from '../constants/plans';
import type { SavedLocation, SavedRoute, DrivingMode, PlanTier } from '../types';

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

  // Vehicle
  const [tallVehicle, setTallVehicle] = useState(false);
  const [vehicleHeight, setVehicleHeight] = useState('');
  const heightPresets = [
    { label: 'Van', value: '2.7' },
    { label: 'Sprinter', value: '3.0' },
    { label: 'Box Truck', value: '3.5' },
    { label: 'Semi', value: '4.0' },
  ];

  // Notifications
  const [pushEnabled, setPushEnabled] = useState(true);
  const [friendRequests, setFriendRequests] = useState(true);
  const [offerAlerts, setOfferAlerts] = useState(true);
  const [speedAlerts, setSpeedAlerts] = useState(true);

  // Driving mode
  const [defaultMode, setDefaultMode] = useState<DrivingMode>('adaptive');

  // Plan modal
  const [showPlanModal, setShowPlanModal] = useState(false);

  // Add place modal
  const [showAddPlace, setShowAddPlace] = useState(false);
  const [newPlaceName, setNewPlaceName] = useState('');
  const [newPlaceAddress, setNewPlaceAddress] = useState('');
  const [newPlaceCategory, setNewPlaceCategory] = useState('favorite');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [locRes, routeRes] = await Promise.all([
        api.get<any>('/api/locations'),
        api.get<any>('/api/routes'),
      ]);
      const unwrap = (r: any) => r?.data?.data ?? r?.data ?? [];
      setPlaces(Array.isArray(unwrap(locRes)) ? unwrap(locRes) : []);
      setRoutes(Array.isArray(unwrap(routeRes)) ? unwrap(routeRes) : []);
      if (user?.vehicle_height_meters && user.vehicle_height_meters > 0) {
        setTallVehicle(true);
        setVehicleHeight(String(user.vehicle_height_meters));
      }
    } catch {} finally { setLoading(false); }
  }, [user?.vehicle_height_meters]);

  useEffect(() => { loadData(); }, []);

  const handleSaveVehicle = useCallback(async () => {
    const height = tallVehicle ? parseFloat(vehicleHeight) : null;
    const res = await api.put('/api/user/profile', { vehicle_height_meters: height });
    if (res.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Saved', 'Vehicle settings updated.');
      if (height != null) updateUser({ vehicle_height_meters: height } as any);
    }
  }, [tallVehicle, vehicleHeight, updateUser]);

  const handleDeletePlace = useCallback(async (id: number) => {
    Alert.alert('Delete Place', 'Remove this saved place?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await api.delete(`/api/locations/${id}`);
        setPlaces((prev) => prev.filter((p) => p.id !== id));
      }},
    ]);
  }, []);

  const handleAddPlace = useCallback(async () => {
    if (!newPlaceName.trim() || !newPlaceAddress.trim()) return;
    const res = await api.post('/api/locations', { name: newPlaceName, address: newPlaceAddress, category: newPlaceCategory });
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
        Alert.alert('Checkout', 'Opening Stripe checkout. In production this opens the Stripe payment sheet.');
      } else {
        Alert.alert('Upgrade', `To upgrade to ${plan}, please visit the web app for now.`);
      }
    } catch {
      Alert.alert('Error', 'Could not start checkout. Try again.');
    }
    setShowPlanModal(false);
  }, []);

  const currentPlan = user?.isFamilyPlan ? 'family' : user?.isPremium ? 'premium' : 'basic';
  const planConfig = PLANS[currentPlan];

  const initials = (user?.name ?? 'U').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header -- gradient matching web sidebar */}
        <LinearGradient colors={[colors.gradientStart, colors.gradientEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.headerCard}>
          <TouchableOpacity style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </TouchableOpacity>
          <Text style={[styles.userName, { color: '#fff' }]}>{user?.name ?? 'Driver'}</Text>
          <Text style={[styles.userEmail, { color: 'rgba(255,255,255,0.7)' }]}>{user?.email ?? ''}</Text>
          <View style={[styles.planBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <Ionicons name="diamond-outline" size={12} color="#fff" />
            <Text style={styles.planBadgeText}>{planConfig.name}</Text>
          </View>
        </LinearGradient>

        {/* Plan */}
        <SectionHeader title="Your Plan" isLight={isLight} />
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <Text style={[styles.planName, { color: text }]}>{planConfig.name} — {planConfig.price}</Text>
          {planConfig.features.slice(0, 3).map((f, i) => (
            <Text key={i} style={{ color: sub, fontSize: 12, marginTop: 2 }}>• {f}</Text>
          ))}
          {currentPlan === 'basic' && (
            <TouchableOpacity style={styles.upgradeBtn} onPress={() => setShowPlanModal(true)}>
              <Text style={styles.upgradeBtnText}>Upgrade</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Vehicle */}
        <SectionHeader title="Vehicle" isLight={isLight} />
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <View style={styles.settingRow}>
            <Ionicons name="car-outline" size={18} color={text} />
            <Text style={[styles.settingLabel, { color: text }]}>I drive a tall vehicle</Text>
            <Switch value={tallVehicle} onValueChange={setTallVehicle} trackColor={{ false: '#ccc', true: '#3B82F6' }} />
          </View>
          {tallVehicle && (
            <>
              <View style={styles.presetsRow}>
                {heightPresets.map((p) => (
                  <TouchableOpacity key={p.value}
                    style={[styles.presetChip, vehicleHeight === p.value && styles.presetChipActive]}
                    onPress={() => setVehicleHeight(p.value)}>
                    <Text style={[styles.presetChipText, vehicleHeight === p.value && { color: '#fff' }]}>{p.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput style={[styles.heightInput, { color: text, borderColor: sub }]}
                value={vehicleHeight} onChangeText={setVehicleHeight}
                keyboardType="decimal-pad" placeholder="Height in meters" placeholderTextColor={sub} />
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveVehicle}>
                <Text style={styles.saveBtnText}>Save Vehicle Settings</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Saved Places */}
        <SectionHeader title={`Saved Places (${places.length})`} isLight={isLight} />
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          {loading ? <Skeleton width="100%" height={40} /> : places.length === 0 ? (
            <Text style={{ color: sub, fontSize: 13 }}>No saved places</Text>
          ) : (
            places.map((p) => (
              <View key={p.id} style={styles.listRow}>
                <Ionicons name="location-outline" size={16} color="#3B82F6" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.listTitle, { color: text }]}>{p.name}</Text>
                  <Text style={{ color: sub, fontSize: 11 }}>{p.address}</Text>
                </View>
                <TouchableOpacity onPress={() => handleDeletePlace(p.id)}>
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))
          )}
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddPlace(true)}>
            <Ionicons name="add" size={16} color="#3B82F6" /><Text style={styles.addBtnText}>Add Place</Text>
          </TouchableOpacity>
        </View>

        {/* Saved Routes */}
        <SectionHeader title={`Saved Routes (${routes.length})`} isLight={isLight} />
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          {loading ? <Skeleton width="100%" height={40} /> : routes.length === 0 ? (
            <Text style={{ color: sub, fontSize: 13 }}>No saved routes</Text>
          ) : (
            routes.map((r) => (
              <View key={r.id} style={styles.listRow}>
                <Ionicons name="git-branch-outline" size={16} color="#8B5CF6" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.listTitle, { color: text }]}>{r.name}</Text>
                  <Text style={{ color: sub, fontSize: 11 }}>{r.origin} → {r.destination}</Text>
                </View>
                <TouchableOpacity onPress={() => handleDeleteRoute(r.id)}>
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Notifications */}
        <SectionHeader title="Notifications" isLight={isLight} />
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          {[
            { label: 'Push Notifications', val: pushEnabled, set: setPushEnabled },
            { label: 'Friend Requests', val: friendRequests, set: setFriendRequests },
            { label: 'Offer Alerts', val: offerAlerts, set: setOfferAlerts },
            { label: 'Speed Alerts', val: speedAlerts, set: setSpeedAlerts },
          ].map((item, i) => (
            <View key={i} style={styles.settingRow}>
              <Ionicons name="notifications-outline" size={16} color={sub} />
              <Text style={[styles.settingLabel, { color: text }]}>{item.label}</Text>
              <Switch value={item.val} onValueChange={item.set} trackColor={{ false: '#ccc', true: '#3B82F6' }} />
            </View>
          ))}
        </View>

        {/* Appearance */}
        <SectionHeader title="Appearance" isLight={isLight} />
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <View style={styles.settingRow}>
            <Ionicons name="moon-outline" size={16} color={sub} />
            <Text style={[styles.settingLabel, { color: text }]}>Dark Mode</Text>
            <Switch value={!isLight} onValueChange={toggleTheme} trackColor={{ false: '#ccc', true: '#3B82F6' }} />
          </View>
        </View>

        {/* Driving Modes */}
        <SectionHeader title="Default Driving Mode" isLight={isLight} />
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          {(Object.entries(DRIVING_MODES) as [DrivingMode, any][]).map(([mode, config]) => (
            <TouchableOpacity key={mode} style={styles.modeRow} onPress={() => setDefaultMode(mode)}>
              <View style={[styles.modeDot, { backgroundColor: config.color }]} />
              <Text style={[styles.settingLabel, { color: text }]}>{config.label}</Text>
              {defaultMode === mode && <Ionicons name="star" size={16} color="#3B82F6" />}
            </TouchableOpacity>
          ))}
        </View>

        {/* About */}
        <SectionHeader title="About" isLight={isLight} />
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          {[
            { label: 'App Version', value: '1.0.0' },
            { label: 'Rate SnapRoad', link: true },
            { label: 'Contact Support', link: true },
            { label: 'Privacy Policy', link: true },
            { label: 'Terms of Service', link: true },
          ].map((item, i) => (
            <View key={i} style={styles.aboutRow}>
              <Text style={[styles.settingLabel, { color: text }]}>{item.label}</Text>
              {item.value ? <Text style={{ color: sub, fontSize: 13 }}>{item.value}</Text> : <Ionicons name="open-outline" size={14} color={sub} />}
            </View>
          ))}
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={() => {
          Alert.alert('Sign Out', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Out', style: 'destructive', onPress: logout },
          ]);
        }}>
          <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Plan comparison modal */}
      <Modal visible={showPlanModal} transparent animationType="slide" onRequestClose={() => setShowPlanModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowPlanModal(false)}>
          <View style={[styles.modalSheet, { backgroundColor: cardBg }]} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: text }]}>Choose Your Plan</Text>
            {(Object.entries(PLANS) as [PlanTier, any][]).map(([tier, plan]) => (
              <TouchableOpacity key={tier} style={[styles.planCard, currentPlan === tier && styles.planCardActive]}
                onPress={() => handleSelectPlan(tier)}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[styles.planCardName, { color: text }]}>{plan.name}</Text>
                  <Text style={[styles.planCardPrice, { color: '#3B82F6' }]}>{plan.price}</Text>
                </View>
                {plan.features.slice(0, 3).map((f: string, i: number) => (
                  <Text key={i} style={{ color: sub, fontSize: 11, marginTop: 2 }}>• {f}</Text>
                ))}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Add place modal */}
      <Modal visible={showAddPlace} transparent animationType="slide" onRequestClose={() => setShowAddPlace(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowAddPlace(false)}>
          <View style={[styles.modalSheet, { backgroundColor: cardBg }]} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: text }]}>Add Place</Text>
            <TextInput style={[styles.modalInput, { color: text, backgroundColor: isLight ? '#f5f5f7' : '#2a2a3e' }]}
              placeholder="Name" placeholderTextColor={sub} value={newPlaceName} onChangeText={setNewPlaceName} />
            <TextInput style={[styles.modalInput, { color: text, backgroundColor: isLight ? '#f5f5f7' : '#2a2a3e' }]}
              placeholder="Address" placeholderTextColor={sub} value={newPlaceAddress} onChangeText={setNewPlaceAddress} />
            <TouchableOpacity style={styles.saveBtn} onPress={handleAddPlace}>
              <Text style={styles.saveBtnText}>Save Place</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

function SectionHeader({ title, isLight }: { title: string; isLight: boolean }) {
  return <Text style={[sStyles.sectionTitle, { color: isLight ? '#111' : '#fff' }]}>{title}</Text>;
}

const sStyles = StyleSheet.create({
  sectionTitle: { fontSize: 16, fontWeight: '800', paddingHorizontal: 16, marginTop: 20, marginBottom: 8 },
});

const styles = StyleSheet.create({
  headerCard: { margin: 16, borderRadius: 16, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
  avatarCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '800' },
  userName: { fontSize: 22, fontWeight: '800', marginBottom: 2 },
  userEmail: { fontSize: 13, marginBottom: 8 },
  planBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  planBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  card: { marginHorizontal: 16, borderRadius: 12, padding: 16, marginBottom: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  settingLabel: { flex: 1, fontSize: 14, fontWeight: '500' },
  presetsRow: { flexDirection: 'row', gap: 6, marginVertical: 8 },
  presetChip: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(128,128,128,0.12)' },
  presetChipActive: { backgroundColor: '#3B82F6' },
  presetChipText: { fontSize: 12, fontWeight: '600', color: '#888' },
  heightInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, marginBottom: 8 },
  saveBtn: { backgroundColor: '#3B82F6', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  listRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(128,128,128,0.15)' },
  listTitle: { fontSize: 14, fontWeight: '600' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', marginTop: 10 },
  addBtnText: { color: '#3B82F6', fontSize: 14, fontWeight: '600' },
  modeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  modeDot: { width: 10, height: 10, borderRadius: 5 },
  aboutRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(128,128,128,0.15)' },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24, marginBottom: 20, marginHorizontal: 16, paddingVertical: 14, borderRadius: 12, backgroundColor: 'rgba(239,68,68,0.1)' },
  signOutText: { color: '#EF4444', fontSize: 15, fontWeight: '700' },
  planName: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  upgradeBtn: { backgroundColor: '#3B82F6', borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 12 },
  upgradeBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, maxHeight: '85%' },
  modalHandle: { width: 36, height: 4, backgroundColor: '#444', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 16 },
  modalInput: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, marginBottom: 12 },
  planCard: { borderRadius: 12, borderWidth: 1, borderColor: 'rgba(128,128,128,0.2)', padding: 16, marginBottom: 10 },
  planCardActive: { borderColor: '#3B82F6', borderWidth: 2 },
  planCardName: { fontSize: 16, fontWeight: '700' },
  planCardPrice: { fontSize: 16, fontWeight: '800' },
});

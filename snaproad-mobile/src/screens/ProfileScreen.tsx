// SnapRoad Mobile - Profile Screen (matches /driver web Profile tab)
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSizes, FontWeights, BorderRadius } from '../utils/theme';
import { useUserStore } from '../store';

type ProfileTab = 'overview' | 'score' | 'fuel' | 'settings';

const MENU_ITEMS = [
  { id: 'DriverAnalytics', icon: 'analytics-outline' as const, label: 'Analytics', sub: 'Performance insights' },
  { id: 'account', icon: 'settings-outline' as const, label: 'Account Info', sub: 'Personal details' },
  { id: 'TripLogs', icon: 'time-outline' as const, label: 'Trip History', sub: 'View past trips' },
  { id: 'FuelDashboard', icon: 'water-outline' as const, label: 'Fuel Dashboard', sub: 'Track expenses' },
  { id: 'routes', icon: 'location-outline' as const, label: 'Saved Routes', sub: 'Your favorites' },
  { id: 'Leaderboard', icon: 'trophy-outline' as const, label: 'Leaderboard', sub: 'Rankings' },
  { id: 'carstudio', icon: 'car-sport-outline' as const, label: 'Car Studio', sub: 'Customize your ride' },
];

const SETTINGS_ITEMS = [
  { id: 'PrivacyCenter', icon: 'shield-checkmark-outline' as const, label: 'Privacy', sub: 'Data & permissions' },
  { id: 'NotificationSettings', icon: 'notifications-outline' as const, label: 'Notifications', sub: 'Alert preferences' },
  { id: 'Help', icon: 'help-circle-outline' as const, label: 'Help & Support', sub: 'Get assistance' },
];

export const ProfileScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useUserStore();
  const userName = user?.name || 'John Doe';
  const gems = user?.gems || 2450;

  const handleNavigate = (screen: string) => {
    if (navigation?.navigate) navigation.navigate(screen);
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
        {/* Settings gear top right */}
        <TouchableOpacity style={s.gearBtn} onPress={() => handleNavigate('Settings')}>
          <Ionicons name="settings-outline" size={22} color={Colors.textMuted} />
        </TouchableOpacity>

        {/* Profile Card */}
        <View style={s.profileCard}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{userName.split(' ').map(n => n[0]).join('')}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{userName}</Text>
            <Text style={s.plan}>Premium Member</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <Ionicons name="diamond" size={14} color={Colors.primary} />
              <Text style={s.gemsText}>{gems.toLocaleString()} gems</Text>
            </View>
          </View>
        </View>

        {/* Stats Row */}
        <View style={s.statsRow}>
          <View style={s.statItem}>
            <Text style={s.statValue}>92</Text>
            <Text style={s.statLabel}>Safety Score</Text>
          </View>
          <View style={[s.statItem, s.statCenter]}>
            <Text style={s.statValue}>1,247</Text>
            <Text style={s.statLabel}>Miles Driven</Text>
          </View>
          <View style={s.statItem}>
            <Text style={s.statValue}>28</Text>
            <Text style={s.statLabel}>Badges</Text>
          </View>
        </View>

        {/* Menu Items */}
        <View style={s.menuSection}>
          {MENU_ITEMS.map(item => (
            <TouchableOpacity key={item.id} style={s.menuItem} onPress={() => handleNavigate(item.id)}>
              <View style={s.menuIcon}>
                <Ionicons name={item.icon} size={20} color={Colors.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.menuLabel}>{item.label}</Text>
                <Text style={s.menuSub}>{item.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textDim} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Settings Section */}
        <Text style={s.sectionTitle}>Settings</Text>
        <View style={s.menuSection}>
          {SETTINGS_ITEMS.map(item => (
            <TouchableOpacity key={item.id} style={s.menuItem} onPress={() => handleNavigate(item.id)}>
              <View style={s.menuIcon}>
                <Ionicons name={item.icon} size={20} color={Colors.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.menuLabel}>{item.label}</Text>
                <Text style={s.menuSub}>{item.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textDim} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity style={s.logoutBtn}>
          <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          <Text style={s.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E16' },
  gearBtn: { position: 'absolute', top: 12, right: 16, zIndex: 10, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  // Profile card
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 14, marginHorizontal: 16, marginTop: 16, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  avatar: { width: 56, height: 56, borderRadius: 16, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: FontWeights.bold },
  name: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
  plan: { color: Colors.textMuted, fontSize: FontSizes.xs },
  gemsText: { color: Colors.primary, fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
  // Stats
  statsRow: { flexDirection: 'row', marginHorizontal: 16, marginTop: 2, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statCenter: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  statValue: { color: Colors.text, fontSize: FontSizes.xl, fontWeight: FontWeights.bold },
  statLabel: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: 2 },
  // Menu
  menuSection: { marginHorizontal: 16, marginTop: 16, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 15, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  menuIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  menuLabel: { color: Colors.text, fontSize: FontSizes.sm, fontWeight: FontWeights.medium },
  menuSub: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: 1 },
  sectionTitle: { color: Colors.textMuted, fontSize: FontSizes.xs, fontWeight: FontWeights.medium, letterSpacing: 0.5, marginLeft: 16, marginTop: 20, marginBottom: -4 },
  // Logout
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 16, marginTop: 20, paddingVertical: 14, borderRadius: 14, backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.15)' },
  logoutText: { color: '#EF4444', fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
});

export default ProfileScreen;

// SnapRoad Mobile - Drawer Menu (matches /driver web hamburger menu)
import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSizes, FontWeights, BorderRadius } from '../utils/theme';
import { useUserStore } from '../store';

interface DrawerMenuProps {
  visible: boolean;
  onClose: () => void;
  navigation?: any;
}

const SOCIAL_ITEMS = [
  { icon: 'people-outline' as const, label: 'Friends Hub', screen: 'FriendsHub' },
  { icon: 'bar-chart-outline' as const, label: 'Leaderboard', screen: 'Leaderboard' },
];

const NAV_ITEMS = [
  { icon: 'map-outline' as const, label: 'Map', screen: 'Map' },
  { icon: 'git-branch-outline' as const, label: 'My Routes', screen: 'Routes' },
  { icon: 'star-outline' as const, label: 'Favorites', screen: 'Favorites' },
  { icon: 'layers-outline' as const, label: 'Map Widgets', screen: 'MapWidgets' },
];

const REWARDS_ITEMS = [
  { icon: 'gift-outline' as const, label: 'Offers', screen: 'Rewards' },
  { icon: 'ribbon-outline' as const, label: 'All Badges', screen: 'Badges' },
  { icon: 'car-sport-outline' as const, label: 'Car Studio', screen: 'CarStudio' },
];

const ANALYTICS_ITEMS = [
  { icon: 'water-outline' as const, label: 'Fuel Tracker', screen: 'FuelDashboard' },
  { icon: 'shield-checkmark-outline' as const, label: 'Driver Score', screen: 'DriverAnalytics' },
  { icon: 'analytics-outline' as const, label: 'Trip Analytics', screen: 'TripAnalytics' },
  { icon: 'map-outline' as const, label: 'Route History', screen: 'RouteHistory3D' },
];

const SETTINGS_ITEMS = [
  { icon: 'volume-high-outline' as const, label: 'Mute', screen: 'ToggleSound' },
  { icon: 'settings-outline' as const, label: 'Settings', screen: 'Settings' },
  { icon: 'help-circle-outline' as const, label: 'Help', screen: 'Help' },
];

export const DrawerMenu: React.FC<DrawerMenuProps> = ({ visible, onClose, navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, logout } = useUserStore();
  
  const userName = user?.name || 'Driver';
  const gems = user?.gems || 0;
  const safetyScore = user?.safetyScore || 100;
  const rank = user?.rank || 1;
  const level = user?.level || 1;
  const isPremium = user?.isPremium || false;
  const friendsCount = user?.friendsCount || 0;
  const userId = user?.id || '123456';

  const handleNavigate = (screen: string) => {
    onClose();
    if (screen === 'Map' || screen === 'Routes' || screen === 'Rewards' || screen === 'Profile') {
      navigation?.navigate('MainTabs', { screen });
    } else {
      navigation?.navigate(screen);
    }
  };

  const handleLogout = () => {
    logout();
    onClose();
    navigation?.reset({ index: 0, routes: [{ name: 'Welcome' }] });
  };

  const renderSection = (title: string, items: { icon: any; label: string; screen: string; badge?: string }[]) => (
    <>
      <Text style={s.sectionTitle}>{title}</Text>
      {items.map((item, i) => (
        <TouchableOpacity key={i} style={s.menuItem} onPress={() => handleNavigate(item.screen)}>
          <Ionicons name={item.icon} size={18} color={Colors.textMuted} />
          <Text style={s.menuLabel}>{item.label}</Text>
          {item.badge && (
            <View style={s.badge}>
              <Text style={s.badgeText}>{item.badge}</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <TouchableOpacity style={s.backdrop} onPress={onClose} activeOpacity={1} />
        <View style={[s.drawer, { paddingTop: insets.top }]}>
          {/* Header */}
          <LinearGradient colors={['#2563EB', '#3B82F6']} style={s.header}>
            <View style={s.headerRow}>
              <TouchableOpacity style={s.avatar} onPress={() => handleNavigate('CarStudio')}>
                <Ionicons name="car-sport" size={28} color="#fff" />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={s.userName}>{userName}</Text>
                <Text style={s.userLevel}>Level {level} • {isPremium ? '⚡ PRO' : 'Free'}</Text>
              </View>
            </View>

            {/* User ID Card */}
            <View style={s.idCard}>
              <View>
                <Text style={s.idLabel}>Your ID</Text>
                <Text style={s.idValue}>{userId}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={s.idLabel}>Friends</Text>
                <Text style={s.idValue}>{friendsCount}</Text>
              </View>
            </View>

            {/* Stats */}
            <View style={s.statsRow}>
              <View style={s.statItem}>
                <Text style={s.statValue}>{(gems / 1000).toFixed(1)}K</Text>
                <Text style={s.statLabel}>Gems</Text>
              </View>
              <View style={s.statItem}>
                <Text style={s.statValue}>{safetyScore}</Text>
                <Text style={s.statLabel}>Score</Text>
              </View>
              <View style={s.statItem}>
                <Text style={s.statValue}>#{rank}</Text>
                <Text style={s.statLabel}>Rank</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Menu Items */}
          <ScrollView style={s.menuScroll} showsVerticalScrollIndicator={false}>
            {renderSection('SOCIAL', SOCIAL_ITEMS)}
            {renderSection('NAVIGATION', NAV_ITEMS)}
            {renderSection('REWARDS', REWARDS_ITEMS)}
            {renderSection('ANALYTICS', ANALYTICS_ITEMS)}
            {renderSection('SETTINGS', SETTINGS_ITEMS)}
            <View style={{ height: 80 }} />
          </ScrollView>

          {/* Logout */}
          <View style={[s.logoutContainer, { paddingBottom: insets.bottom + 10 }]}>
            <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={18} color="#EF4444" />
              <Text style={s.logoutText}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  overlay: { flex: 1, flexDirection: 'row' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  drawer: { width: 280, backgroundColor: Colors.surface, height: '100%' },
  // Header
  header: { padding: 16, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 56, height: 56, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  userName: { color: '#fff', fontSize: FontSizes.md, fontWeight: FontWeights.semibold },
  userLevel: { color: 'rgba(191,219,254,1)', fontSize: FontSizes.xs },
  // ID Card
  idCard: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginTop: 12 },
  idLabel: { color: 'rgba(191,219,254,0.8)', fontSize: 10 },
  idValue: { color: '#fff', fontSize: FontSizes.lg, fontWeight: FontWeights.bold, letterSpacing: 1 },
  // Stats
  statsRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  statItem: { alignItems: 'center' },
  statValue: { color: '#fff', fontSize: FontSizes.sm, fontWeight: FontWeights.bold },
  statLabel: { color: 'rgba(191,219,254,0.8)', fontSize: 10 },
  // Menu
  menuScroll: { flex: 1, paddingHorizontal: 8 },
  sectionTitle: { color: Colors.textDim, fontSize: 10, fontWeight: FontWeights.semibold, letterSpacing: 0.5, paddingHorizontal: 12, paddingTop: 16, paddingBottom: 8 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 12 },
  menuLabel: { flex: 1, color: Colors.textSecondary, fontSize: FontSizes.sm },
  badge: { backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { color: Colors.textMuted, fontSize: FontSizes.xs },
  // Logout
  logoutContainer: { borderTopWidth: 1, borderColor: Colors.glassBorder, padding: 12 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12 },
  logoutText: { color: '#EF4444', fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
});

export default DrawerMenu;

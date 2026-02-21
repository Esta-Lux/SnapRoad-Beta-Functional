// SnapRoad Mobile - Premium Profile Screen
// Glass-morphism, neon accents, iPhone 17 optimized

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadows, FontSizes, FontWeights, BorderRadius } from '../utils/theme';
import { useUserStore } from '../store';

const MENU_ITEMS = [
  { id: 'DriverAnalytics', icon: 'pulse-outline' as const, label: 'Analytics', sub: 'Performance insights', color: Colors.primaryLight },
  { id: 'TripAnalytics', icon: 'bar-chart-outline' as const, label: 'Trip Analytics', sub: 'Fuel & trip data', color: Colors.secondary },
  { id: 'RouteHistory3D', icon: 'map-outline' as const, label: 'Route History', sub: '3D visualization', color: Colors.accent },
  { id: 'TripLogs', icon: 'time-outline' as const, label: 'Trip History', sub: 'Past trips', color: Colors.info },
  { id: 'FuelDashboard', icon: 'water-outline' as const, label: 'Fuel Dashboard', sub: 'Expenses & savings', color: '#F59E0B' },
  { id: 'Leaderboard', icon: 'trophy-outline' as const, label: 'Leaderboard', sub: 'Rankings', color: Colors.gold },
  { id: 'OrionCoach', icon: 'chatbubble-ellipses-outline' as const, label: 'Orion AI', sub: 'Driving coach', color: Colors.primary },
  { id: 'MyOffers', icon: 'gift-outline' as const, label: 'My Offers', sub: 'Saved & QR codes', color: Colors.secondary },
];

const SETTINGS_ITEMS = [
  { id: 'PrivacyCenter', icon: 'shield-checkmark-outline' as const, label: 'Privacy', sub: 'Data & permissions' },
  { id: 'NotificationSettings', icon: 'notifications-outline' as const, label: 'Notifications', sub: 'Alert preferences' },
  { id: 'Settings', icon: 'card-outline' as const, label: 'Subscription', sub: 'Manage plan' },
  { id: 'Settings', icon: 'help-circle-outline' as const, label: 'Help & Support', sub: 'Get assistance' },
];

export const ProfileScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useUserStore();
  const initials = user.name ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase() : 'JD';

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Header Gradient */}
        <View style={styles.headerBg}>
          <LinearGradient colors={['#1D4ED8', '#2563EB', '#38BDF8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          {/* Overlay glow circles */}
          <View style={styles.glowCircle1} />
          <View style={styles.glowCircle2} />
          <LinearGradient colors={['transparent','transparent', Colors.background]} style={styles.headerFade} />
          <TouchableOpacity style={[styles.settingsBtn, { top: insets.top + 8 }]} onPress={() => navigation.navigate('Settings')}>
            <Ionicons name="settings-outline" size={20} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        </View>

        {/* Profile Card */}
        <View style={styles.cardWrap}>
          <View style={styles.profileCard}>
            <View style={styles.profileRow}>
              <LinearGradient colors={Colors.gradientPrimary} style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </LinearGradient>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{user.name || 'John Doe'}</Text>
                <Text style={styles.profileTier}>{user.isPremium ? 'Premium' : 'Free'} Member</Text>
                <View style={styles.gemsRow}>
                  <Ionicons name="diamond" size={14} color={Colors.accent} />
                  <Text style={styles.gemsVal}>{user.gems?.toLocaleString() || '2,450'}</Text>
                  <Text style={styles.gemsUnit}>gems</Text>
                </View>
              </View>
            </View>
            <View style={styles.statsRow}>
              {[
                { val: user.safetyScore || 94, label: 'Safety', color: Colors.secondary },
                { val: user.totalMiles?.toLocaleString() || '1,247', label: 'Miles', color: Colors.primaryLight },
                { val: 28, label: 'Badges', color: Colors.gold },
              ].map((s, i) => (
                <View key={i} style={styles.statCol}>
                  <Text style={[styles.statVal, { color: s.color }]}>{s.val}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Menu */}
        <View style={styles.section}>
          <View style={styles.menuCard}>
            {MENU_ITEMS.map((item, i) => (
              <TouchableOpacity key={`${item.id}-${i}`} style={[styles.menuItem, i < MENU_ITEMS.length - 1 && styles.menuBorder]} onPress={() => navigation.navigate(item.id)}>
                <View style={[styles.menuIconBox, { backgroundColor: `${item.color}12` }]}>
                  <Ionicons name={item.icon} size={19} color={item.color} />
                </View>
                <View style={styles.menuText}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Text style={styles.menuSub}>{item.sub}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textDim} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SETTINGS</Text>
          <View style={styles.menuCard}>
            {SETTINGS_ITEMS.map((item, i) => (
              <TouchableOpacity key={`s-${i}`} style={[styles.menuItem, i < SETTINGS_ITEMS.length - 1 && styles.menuBorder]} onPress={() => navigation.navigate(item.id)}>
                <View style={styles.menuIconBoxDim}>
                  <Ionicons name={item.icon} size={19} color={Colors.textSecondary} />
                </View>
                <View style={styles.menuText}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Text style={styles.menuSub}>{item.sub}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textDim} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Sign Out */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.signOutBtn} onPress={() => navigation.navigate('Welcome')}>
            <Ionicons name="log-out-outline" size={18} color={Colors.error} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerBg: { height: 220, position: 'relative', overflow: 'hidden' },
  headerFade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 100 },
  glowCircle1: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(56,189,248,0.15)', top: -40, right: -40 },
  glowCircle2: { position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(6,214,160,0.1)', bottom: 10, left: -30 },
  settingsBtn: { position: 'absolute', right: 16, width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  cardWrap: { paddingHorizontal: 16, marginTop: -80, zIndex: 10 },
  profileCard: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.glassBorder, borderRadius: BorderRadius.xxl, padding: 24, ...Shadows.lg },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', ...Shadows.neon },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: FontWeights.bold, letterSpacing: 1 },
  profileInfo: { flex: 1 },
  profileName: { color: Colors.text, fontSize: FontSizes.xl, fontWeight: FontWeights.bold, letterSpacing: 0.3 },
  profileTier: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginTop: 2, letterSpacing: 0.5 },
  gemsRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  gemsVal: { color: Colors.accent, fontSize: FontSizes.md, fontWeight: FontWeights.bold },
  gemsUnit: { color: Colors.textMuted, fontSize: FontSizes.sm },
  statsRow: { flexDirection: 'row', marginTop: 24, paddingTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  statCol: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: FontSizes.xl, fontWeight: FontWeights.bold },
  statLabel: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: 4, letterSpacing: 0.8, textTransform: 'uppercase' },
  section: { paddingHorizontal: 16, marginTop: 24 },
  sectionTitle: { color: Colors.textMuted, fontSize: FontSizes.xs, fontWeight: FontWeights.semibold, letterSpacing: 1.5, marginBottom: 12, paddingHorizontal: 4 },
  menuCard: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.glassBorder, borderRadius: BorderRadius.xl, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  menuBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  menuIconBox: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  menuIconBoxDim: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center' },
  menuText: { flex: 1 },
  menuLabel: { color: Colors.text, fontSize: FontSizes.md, fontWeight: FontWeights.medium, letterSpacing: 0.2 },
  menuSub: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: 2, letterSpacing: 0.3 },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50, borderRadius: BorderRadius.lg, backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.15)' },
  signOutText: { color: Colors.error, fontSize: FontSizes.md, fontWeight: FontWeights.medium },
});

export default ProfileScreen;

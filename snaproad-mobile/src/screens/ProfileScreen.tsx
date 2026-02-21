// SnapRoad Mobile - Profile Screen
// Aligned with Figma UI: /app/frontend/src/components/figma-ui/mobile/Profile.tsx

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
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights } from '../utils/theme';
import { useUserStore } from '../store';

interface ProfileScreenProps {
  navigation: any;
}

const MENU_ITEMS = [
  { id: 'TripAnalytics', icon: 'analytics' as const, label: 'Analytics', subtitle: 'Performance insights' },
  { id: 'RouteHistory3D', icon: 'map' as const, label: 'Route History', subtitle: '3D route visualization' },
  { id: 'TripLogs', icon: 'time' as const, label: 'Trip History', subtitle: 'View past trips' },
  { id: 'FuelDashboard', icon: 'water' as const, label: 'Fuel Dashboard', subtitle: 'Track expenses' },
  { id: 'Leaderboard', icon: 'trophy' as const, label: 'Leaderboard', subtitle: 'Rankings' },
  { id: 'OrionCoach', icon: 'chatbubble-ellipses' as const, label: 'Orion AI Coach', subtitle: 'Get driving tips' },
  { id: 'MyOffers', icon: 'gift' as const, label: 'My Offers', subtitle: 'Saved offers & QR codes' },
];

const SETTINGS_ITEMS = [
  { id: 'Settings', icon: 'shield-checkmark' as const, label: 'Privacy', subtitle: 'Data & permissions' },
  { id: 'Settings', icon: 'notifications' as const, label: 'Notifications', subtitle: 'Alert preferences' },
  { id: 'Settings', icon: 'card' as const, label: 'Subscription', subtitle: 'Manage plan' },
  { id: 'Settings', icon: 'help-circle' as const, label: 'Help & Support', subtitle: 'Get assistance' },
];

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useUserStore();

  const initials = user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'JD';

  return (
    <View style={[styles.container, { paddingBottom: 100 }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Gradient Header */}
        <View style={styles.headerBg}>
          <LinearGradient
            colors={['#004A93', '#0084FF', '#00FFD7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          />
          <View style={styles.headerFade} />

          {/* Settings button */}
          <TouchableOpacity
            style={[styles.settingsBtn, { top: insets.top + 8 }]}
            onPress={() => navigation.navigate('Settings')}
            data-testid="profile-settings-btn"
          >
            <Ionicons name="settings-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Profile Card - Overlapping Header */}
        <View style={styles.profileCardWrapper}>
          <View style={styles.profileCard}>
            <View style={styles.profileRow}>
              {/* Avatar */}
              <LinearGradient
                colors={['#0084FF', '#00FFD7']}
                style={styles.avatar}
              >
                <Text style={styles.avatarText}>{initials}</Text>
              </LinearGradient>

              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{user.name || 'John Doe'}</Text>
                <Text style={styles.profileSub}>
                  {user.isPremium ? 'Premium Member' : 'Free Member'}
                </Text>
                <View style={styles.gemsRow}>
                  <Ionicons name="diamond" size={16} color="#00FFD7" />
                  <Text style={styles.gemsValue}>{user.gems?.toLocaleString() || '2,450'}</Text>
                  <Text style={styles.gemsLabel}>gems</Text>
                </View>
              </View>
            </View>

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{user.safetyScore || 92}</Text>
                <Text style={styles.statLabel}>Safety Score</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{user.totalMiles?.toLocaleString() || '1,247'}</Text>
                <Text style={styles.statLabel}>Miles Driven</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{user.badges || 28}</Text>
                <Text style={styles.statLabel}>Badges</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Main Menu */}
        <View style={styles.menuSection}>
          <View style={styles.menuCard}>
            {MENU_ITEMS.map((item, index) => (
              <TouchableOpacity
                key={`${item.id}-${index}`}
                style={[
                  styles.menuItem,
                  index < MENU_ITEMS.length - 1 && styles.menuItemBorder,
                ]}
                onPress={() => navigation.navigate(item.id)}
                data-testid={`profile-menu-${item.id.toLowerCase()}`}
              >
                <View style={styles.menuIconBox}>
                  <Ionicons name={item.icon} size={20} color="#0084FF" />
                </View>
                <View style={styles.menuTextColumn}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.3)" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Settings Menu */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <View style={styles.menuCard}>
            {SETTINGS_ITEMS.map((item, index) => (
              <TouchableOpacity
                key={`settings-${index}`}
                style={[
                  styles.menuItem,
                  index < SETTINGS_ITEMS.length - 1 && styles.menuItemBorder,
                ]}
                onPress={() => navigation.navigate(item.id)}
                data-testid={`profile-settings-${item.label.toLowerCase()}`}
              >
                <View style={styles.menuIconBox}>
                  <Ionicons name={item.icon} size={20} color="rgba(255,255,255,0.6)" />
                </View>
                <View style={styles.menuTextColumn}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.3)" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Sign Out Button */}
        <View style={styles.menuSection}>
          <TouchableOpacity
            style={styles.signOutBtn}
            onPress={() => navigation.navigate('Welcome')}
            data-testid="profile-logout-btn"
          >
            <Ionicons name="log-out-outline" size={18} color="#EF4444" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E16' },
  // Header
  headerBg: { height: 200, position: 'relative' },
  headerGradient: { ...StyleSheet.absoluteFillObject },
  headerFade: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 80,
    backgroundColor: 'transparent',
  },
  settingsBtn: {
    position: 'absolute', right: 16, width: 40, height: 40,
    borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center', zIndex: 10,
  },
  // Profile card
  profileCardWrapper: { paddingHorizontal: 16, marginTop: -96, zIndex: 10 },
  profileCard: {
    backgroundColor: '#1A1F2E', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 20,
  },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: {
    width: 72, height: 72, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 24, fontWeight: '700' },
  profileInfo: { flex: 1 },
  profileName: { color: '#fff', fontSize: 20, fontWeight: '700' },
  profileSub: { color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 2 },
  gemsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  gemsValue: { color: '#00FFD7', fontSize: 16, fontWeight: '600' },
  gemsLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 14 },
  // Stats
  statsRow: {
    flexDirection: 'row', marginTop: 20, paddingTop: 20,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { color: '#fff', fontSize: 20, fontWeight: '700' },
  statLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 4 },
  // Menus
  menuSection: { paddingHorizontal: 16, marginTop: 24 },
  sectionTitle: {
    color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: '500',
    paddingHorizontal: 8, marginBottom: 12,
  },
  menuCard: {
    backgroundColor: '#1A1F2E', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)', borderRadius: 16, overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12,
  },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  menuIconBox: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center', justifyContent: 'center',
  },
  menuTextColumn: { flex: 1 },
  menuLabel: { color: '#fff', fontSize: 15, fontWeight: '500' },
  menuSubtitle: { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 2 },
  // Sign Out
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 48, borderRadius: 12,
    backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
  },
  signOutText: { color: '#EF4444', fontSize: 15, fontWeight: '500' },
});

export default ProfileScreen;

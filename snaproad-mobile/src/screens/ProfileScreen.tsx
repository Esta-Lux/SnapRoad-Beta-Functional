// SnapRoad Mobile - Profile Screen (matches /driver web Profile tab with sub-tabs)
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSizes, FontWeights, BorderRadius } from '../utils/theme';
import { useUserStore } from '../store';

type ProfileTab = 'overview' | 'score' | 'fuel' | 'settings';

const QUICK_LINKS = [
  { icon: 'trophy-outline' as const, label: 'Achievements', value: '28/160 badges', screen: 'Badges', color: '#FEF3C7', iconColor: '#F59E0B' },
  { icon: 'ribbon-outline' as const, label: 'Community Badges', value: 'Help other drivers', screen: 'Badges', color: '#EDE9FE', iconColor: '#8B5CF6' },
  { icon: 'alert-triangle' as const, label: 'Road Reports', value: 'Report hazards', screen: 'HazardFeed', color: '#FFEDD5', iconColor: '#F97316' },
  { icon: 'git-branch-outline' as const, label: 'My Routes', value: '3 saved', screen: 'Routes', color: '#DBEAFE', iconColor: '#3B82F6' },
  { icon: 'time-outline' as const, label: 'Trip History', value: '47 trips', screen: 'TripHistory', color: '#F1F5F9', iconColor: '#64748B' },
  { icon: 'diamond-outline' as const, label: 'Gem History', value: '+2,450 this month', screen: 'GemHistory', color: '#CFFAFE', iconColor: '#0EA5E9' },
  { icon: 'people-outline' as const, label: 'Friends', value: '12 friends', screen: 'FriendsHub', color: '#DCFCE7', iconColor: '#22C55E' },
];

const SETTINGS_MENU = [
  { id: 'account', icon: 'person-outline' as const, label: 'Account', sub: 'Personal details', screen: 'Settings' },
  { id: 'PrivacyCenter', icon: 'shield-checkmark-outline' as const, label: 'Privacy', sub: 'Data & permissions', screen: 'PrivacyCenter' },
  { id: 'NotificationSettings', icon: 'notifications-outline' as const, label: 'Notifications', sub: 'Alert preferences', screen: 'NotificationSettings' },
  { id: 'Help', icon: 'help-circle-outline' as const, label: 'Help & Support', sub: 'Get assistance', screen: 'Help' },
];

export const ProfileScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, logout } = useUserStore();
  const [profileTab, setProfileTab] = useState<ProfileTab>('overview');
  
  const userName = user?.name || 'John Doe';
  const gems = user?.gems || 2450;
  const level = user?.level || 5;
  const isPremium = user?.isPremium || false;
  const safetyScore = user?.safetyScore || 92;
  const totalTrips = user?.totalTrips || 47;
  const totalMiles = user?.totalMiles || 1247;
  const rank = user?.rank || 42;

  const handleNavigate = (screen: string) => {
    if (navigation?.navigate) navigation.navigate(screen);
  };

  const handleLogout = () => {
    logout();
    navigation?.reset({ index: 0, routes: [{ name: 'Welcome' }] });
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <LinearGradient colors={['#2563EB', '#3B82F6']} style={s.header}>
          <View style={s.headerContent}>
            <TouchableOpacity style={s.avatar} onPress={() => handleNavigate('CarStudio')}>
              <Ionicons name="car-sport" size={32} color="#fff" />
              <View style={s.editOverlay}>
                <Ionicons name="pencil" size={10} color="#fff" />
              </View>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={s.userName}>{userName}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={s.userLevel}>Level {level}</Text>
                {isPremium ? (
                  <View style={s.premiumBadge}>
                    <Ionicons name="flash" size={10} color="#78350F" />
                    <Text style={s.premiumText}>PREMIUM</Text>
                  </View>
                ) : (
                  <View style={s.basicBadge}>
                    <Text style={s.basicText}>BASIC</Text>
                  </View>
                )}
              </View>
              {isPremium && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  <Ionicons name="diamond" size={12} color="#FCD34D" />
                  <Text style={s.multiplierText}>2× gem multiplier active</Text>
                </View>
              )}
            </View>
          </View>

          {/* Stats Grid */}
          <View style={s.statsGrid}>
            <View style={s.statCard}>
              <Text style={s.statEmoji}>💎</Text>
              <Text style={s.statValue}>{(gems / 1000).toFixed(1)}K</Text>
              <Text style={s.statLabel}>Gems</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statEmoji}>🏆</Text>
              <Text style={s.statValue}>#{rank}</Text>
              <Text style={s.statLabel}>Rank</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statEmoji}>🚗</Text>
              <Text style={s.statValue}>{totalTrips}</Text>
              <Text style={s.statLabel}>Trips</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statEmoji}>📍</Text>
              <Text style={s.statValue}>{(totalMiles / 1000).toFixed(1)}K</Text>
              <Text style={s.statLabel}>Miles</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Profile Tabs */}
        <View style={s.tabsContainer}>
          {(['overview', 'score', 'fuel', 'settings'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[s.tabBtn, profileTab === tab && s.tabBtnActive]}
              onPress={() => setProfileTab(tab)}
            >
              <Text style={[s.tabText, profileTab === tab && s.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        <View style={s.content}>
          {profileTab === 'overview' && (
            <>
              {/* Level Card */}
              <TouchableOpacity style={s.levelCard} onPress={() => handleNavigate('DriverAnalytics')}>
                <LinearGradient colors={['#4F46E5', '#6366F1']} style={s.levelGradient}>
                  <View style={s.levelCircle}>
                    <Text style={s.levelLabel}>LVL</Text>
                    <Text style={s.levelNum}>{level}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.levelTitle}>Level {level}</Text>
                    <Text style={s.levelXp}>4,250 XP total</Text>
                  </View>
                  <Text style={s.levelArrow}>View Progress →</Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Driving Score Card */}
              <TouchableOpacity style={s.scoreCard} onPress={() => handleNavigate('DriverAnalytics')}>
                <LinearGradient colors={isPremium ? ['#059669', '#10B981'] : ['#475569', '#64748B']} style={s.scoreGradient}>
                  <View style={s.scoreCircle}>
                    <Ionicons name="shield-checkmark" size={24} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={s.scoreTitle}>Driving Score</Text>
                      {!isPremium && (
                        <View style={s.premiumTag}>
                          <Text style={s.premiumTagText}>PREMIUM</Text>
                        </View>
                      )}
                    </View>
                    <Text style={s.scoreSubtitle}>
                      {isPremium ? 'View detailed insights & Orion tips' : 'Unlock with Premium'}
                    </Text>
                  </View>
                  <Text style={[s.scoreArrow, !isPremium && { color: '#FCD34D' }]}>
                    {isPremium ? 'View →' : 'Upgrade →'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Car Card */}
              <TouchableOpacity style={s.carCard} onPress={() => handleNavigate('CarStudio')}>
                <View style={s.carPreview}>
                  <Ionicons name="car-sport" size={48} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.carTitle}>My Car</Text>
                  <Text style={s.carSubtitle}>Midnight Black Sedan</Text>
                </View>
                <Text style={s.carArrow}>Customize →</Text>
              </TouchableOpacity>

              {/* Quick Links */}
              {QUICK_LINKS.map((item, i) => (
                <TouchableOpacity key={i} style={s.linkCard} onPress={() => handleNavigate(item.screen)}>
                  <View style={[s.linkIcon, { backgroundColor: item.color }]}>
                    <Ionicons name={item.icon} size={18} color={item.iconColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.linkLabel}>{item.label}</Text>
                    <Text style={s.linkValue}>{item.value}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={Colors.textDim} />
                </TouchableOpacity>
              ))}

              {/* Share Trip */}
              <TouchableOpacity style={s.shareCard}>
                <LinearGradient colors={['#3B82F6', '#6366F1']} style={s.shareGradient}>
                  <View style={s.shareIcon}>
                    <Ionicons name="share-social" size={18} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.shareTitle}>Share Trip Score</Text>
                    <Text style={s.shareSubtitle}>Show off your safe driving!</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}

          {profileTab === 'score' && (
            <View style={s.tabPlaceholder}>
              <View style={s.scoreDisplay}>
                <Text style={s.scoreNum}>{safetyScore}</Text>
                <Text style={s.scoreLabel}>Safety Score</Text>
              </View>
              <TouchableOpacity style={s.viewDetailsBtn} onPress={() => handleNavigate('DriverAnalytics')}>
                <Text style={s.viewDetailsBtnText}>View Detailed Analytics</Text>
              </TouchableOpacity>
            </View>
          )}

          {profileTab === 'fuel' && (
            <View style={s.tabPlaceholder}>
              <Ionicons name="water" size={48} color={Colors.primary} />
              <Text style={s.placeholderTitle}>Fuel Tracker</Text>
              <Text style={s.placeholderSubtitle}>Track your fuel consumption and costs</Text>
              <TouchableOpacity style={s.viewDetailsBtn} onPress={() => handleNavigate('FuelDashboard')}>
                <Text style={s.viewDetailsBtnText}>Open Fuel Dashboard</Text>
              </TouchableOpacity>
            </View>
          )}

          {profileTab === 'settings' && (
            <>
              {SETTINGS_MENU.map((item, i) => (
                <TouchableOpacity key={i} style={s.settingsItem} onPress={() => handleNavigate(item.screen)}>
                  <View style={s.settingsIcon}>
                    <Ionicons name={item.icon} size={20} color={Colors.textMuted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.settingsLabel}>{item.label}</Text>
                    <Text style={s.settingsSub}>{item.sub}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.textDim} />
                </TouchableOpacity>
              ))}

              {/* Logout */}
              <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={18} color="#EF4444" />
                <Text style={s.logoutText}>Sign Out</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  // Header
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 64, height: 64, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  editOverlay: { position: 'absolute', bottom: -4, right: -4, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  userName: { color: '#fff', fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
  userLevel: { color: '#BFDBFE', fontSize: FontSizes.xs },
  premiumBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'linear-gradient(90deg, #FCD34D, #F59E0B)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: '#FCD34D' },
  premiumText: { color: '#78350F', fontSize: 10, fontWeight: FontWeights.bold },
  basicBadge: { backgroundColor: '#475569', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  basicText: { color: '#CBD5E1', fontSize: 10, fontWeight: FontWeights.medium },
  multiplierText: { color: '#FCD34D', fontSize: 10 },
  // Stats Grid
  statsGrid: { flexDirection: 'row', gap: 8, marginTop: 16 },
  statCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 10, alignItems: 'center' },
  statEmoji: { fontSize: 14 },
  statValue: { color: '#fff', fontSize: FontSizes.sm, fontWeight: FontWeights.bold },
  statLabel: { color: '#BFDBFE', fontSize: 10 },
  // Tabs
  tabsContainer: { flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderBottomWidth: 1, borderColor: '#E2E8F0' },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center' },
  tabBtnActive: { borderBottomWidth: 2, borderColor: Colors.primary },
  tabText: { color: '#94A3B8', fontSize: FontSizes.xs, fontWeight: FontWeights.medium },
  tabTextActive: { color: Colors.primary },
  // Content
  content: { padding: 16, gap: 8 },
  // Level Card
  levelCard: { borderRadius: 16, overflow: 'hidden' },
  levelGradient: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  levelCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  levelLabel: { color: '#fff', fontSize: 10, fontWeight: FontWeights.medium },
  levelNum: { color: '#fff', fontSize: FontSizes.xl, fontWeight: FontWeights.bold },
  levelTitle: { color: '#fff', fontSize: FontSizes.md, fontWeight: FontWeights.semibold },
  levelXp: { color: '#C7D2FE', fontSize: FontSizes.xs },
  levelArrow: { color: '#C7D2FE', fontSize: FontSizes.xs },
  // Score Card
  scoreCard: { borderRadius: 16, overflow: 'hidden' },
  scoreGradient: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  scoreCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  scoreTitle: { color: '#fff', fontSize: FontSizes.md, fontWeight: FontWeights.semibold },
  scoreSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: FontSizes.xs, marginTop: 2 },
  scoreArrow: { color: 'rgba(255,255,255,0.7)', fontSize: FontSizes.xs },
  premiumTag: { backgroundColor: '#F59E0B', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  premiumTagText: { color: '#78350F', fontSize: 9, fontWeight: FontWeights.bold },
  // Car Card
  carCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 16, padding: 16, gap: 12 },
  carPreview: { width: 64, height: 48, alignItems: 'center', justifyContent: 'center' },
  carTitle: { color: '#fff', fontSize: FontSizes.md, fontWeight: FontWeights.semibold },
  carSubtitle: { color: '#94A3B8', fontSize: FontSizes.xs },
  carArrow: { color: '#FCD34D', fontSize: FontSizes.xs },
  // Link Card
  linkCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 14, gap: 12 },
  linkIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  linkLabel: { color: '#0F172A', fontSize: FontSizes.sm, fontWeight: FontWeights.medium },
  linkValue: { color: '#64748B', fontSize: FontSizes.xs },
  // Share Card
  shareCard: { borderRadius: 16, overflow: 'hidden', marginTop: 8 },
  shareGradient: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  shareIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  shareTitle: { color: '#fff', fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
  shareSubtitle: { color: '#BFDBFE', fontSize: FontSizes.xs },
  // Tab placeholders
  tabPlaceholder: { alignItems: 'center', paddingVertical: 40 },
  scoreDisplay: { alignItems: 'center', marginBottom: 20 },
  scoreNum: { color: '#22C55E', fontSize: 64, fontWeight: FontWeights.bold },
  scoreLabel: { color: '#64748B', fontSize: FontSizes.md },
  placeholderTitle: { color: '#0F172A', fontSize: FontSizes.lg, fontWeight: FontWeights.semibold, marginTop: 12 },
  placeholderSubtitle: { color: '#64748B', fontSize: FontSizes.sm, marginTop: 4 },
  viewDetailsBtn: { backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 20 },
  viewDetailsBtnText: { color: '#fff', fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
  // Settings
  settingsItem: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#fff', borderRadius: 14, padding: 15, marginBottom: 6 },
  settingsIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  settingsLabel: { color: '#0F172A', fontSize: FontSizes.sm, fontWeight: FontWeights.medium },
  settingsSub: { color: '#64748B', fontSize: FontSizes.xs, marginTop: 1 },
  // Logout
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16, paddingVertical: 14, borderRadius: 14, backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.15)' },
  logoutText: { color: '#EF4444', fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
});

export default ProfileScreen;

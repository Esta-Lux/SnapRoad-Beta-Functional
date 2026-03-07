// SnapRoad Mobile - Admin Dashboard Screen
// Full-featured admin panel ported from web with premium mobile UI

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, TextInput, Alert, FlatList, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSizes, FontWeights, BorderRadius, Spacing } from '../utils/theme';
import { useNavigation } from '@react-navigation/native';
import { API_URL } from '../config';

const { width } = Dimensions.get('window');

type Tab = 'overview' | 'users' | 'partners' | 'offers' | 'events';

export const AdminDashboardScreen = () => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAnalytics = useCallback(async () => {
    try {
      const resp = await fetch(`${API_URL}/api/admin/analytics`);
      const data = await resp.json();
      if (data.success) setAnalytics(data.data);
    } catch (e) {
      console.log('Analytics fetch error:', e);
    }
  }, []);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
  };

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'overview', label: 'Overview', icon: 'grid' },
    { key: 'users', label: 'Users', icon: 'people' },
    { key: 'partners', label: 'Partners', icon: 'business' },
    { key: 'offers', label: 'Offers', icon: 'gift' },
    { key: 'events', label: 'Events', icon: 'calendar' },
  ];

  const StatCard = ({ title, value, subtitle, gradient, icon }: any) => (
    <LinearGradient colors={gradient} style={styles.statCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      <View style={styles.statCardHeader}>
        <Ionicons name={icon} size={20} color="rgba(255,255,255,0.8)" />
        <Text style={styles.statValue}>{typeof value === 'number' ? value.toLocaleString() : value}</Text>
      </View>
      <Text style={styles.statTitle}>{title}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </LinearGradient>
  );

  const UserRow = ({ user, index }: { user: any; index: number }) => (
    <View style={styles.listRow}>
      <View style={styles.listRowLeft}>
        <View style={[styles.avatar, { backgroundColor: user.plan === 'premium' ? Colors.primary : Colors.surfaceLight }]}>
          <Text style={styles.avatarText}>{(user.name || 'D')[0]}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowName}>{user.name}</Text>
          <Text style={styles.rowSub}>Level {user.level} | {user.gems?.toLocaleString()} gems</Text>
        </View>
      </View>
      <View style={styles.listRowRight}>
        <View style={[styles.scoreBadge, { backgroundColor: user.safety_score >= 90 ? '#16A34A22' : user.safety_score >= 70 ? '#EAB30822' : '#DC262622' }]}>
          <Text style={[styles.scoreText, { color: user.safety_score >= 90 ? '#16A34A' : user.safety_score >= 70 ? '#EAB308' : '#DC2626' }]}>{user.safety_score}</Text>
        </View>
        <View style={[styles.planBadge, { backgroundColor: user.plan === 'premium' ? '#2563EB22' : Colors.surfaceLight }]}>
          <Text style={[styles.planText, { color: user.plan === 'premium' ? Colors.primary : Colors.textMuted }]}>{user.plan || 'basic'}</Text>
        </View>
      </View>
    </View>
  );

  const renderOverview = () => (
    <View style={{ gap: 16 }}>
      <View style={styles.statGrid}>
        <StatCard title="Total Users" value={analytics?.summary?.total_users || 0} subtitle={`+${analytics?.user_growth?.today || 0} today`} gradient={['#2563EB', '#3B82F6']} icon="people" />
        <StatCard title="Premium" value={analytics?.summary?.premium_users || 0} subtitle="Active subs" gradient={['#7C3AED', '#8B5CF6']} icon="diamond" />
        <StatCard title="Offers" value={analytics?.summary?.total_offers || 0} subtitle={`${analytics?.summary?.total_redemptions || 0} redeemed`} gradient={['#059669', '#10B981']} icon="gift" />
        <StatCard title="Revenue" value={`$${((analytics?.summary?.total_revenue || 0) / 1000).toFixed(0)}k`} subtitle="Last 30 days" gradient={['#D97706', '#F59E0B']} icon="cash" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>User Growth</Text>
        <View style={styles.chartPlaceholder}>
          {analytics?.chart_data?.slice(-7).map((d: any, i: number) => (
            <View key={i} style={styles.chartBar}>
              <View style={[styles.chartBarFill, { height: Math.max(4, (d.new_users / 200) * 80) }]} />
              <Text style={styles.chartLabel}>{d.date?.split(' ')[1]}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Partners</Text>
        {(analytics?.top_partners || []).map((p: any, i: number) => (
          <View key={i} style={styles.partnerRow}>
            <View style={styles.partnerRank}>
              <Text style={styles.partnerRankText}>#{i + 1}</Text>
            </View>
            <Text style={styles.partnerName}>{p.name}</Text>
            <Text style={styles.partnerStat}>{p.redemptions} redemptions</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          {[
            { icon: 'add-circle', label: 'Create Offer', onPress: () => Alert.alert('Create Offer', 'Opening offer creator...') },
            { icon: 'download', label: 'Export Users', onPress: () => Alert.alert('Export', 'Exporting users data...') },
            { icon: 'document-text', label: 'Export Offers', onPress: () => Alert.alert('Export', 'Exporting offers data...') },
            { icon: 'push', label: 'Import CSV', onPress: () => Alert.alert('Import', 'CSV import ready') },
          ].map((action, i) => (
            <TouchableOpacity key={i} style={styles.actionBtn} onPress={action.onPress} data-testid={`admin-action-${action.label.toLowerCase().replace(' ', '-')}`}>
              <Ionicons name={action.icon as any} size={22} color={Colors.primary} />
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderUsers = () => {
    const users = Object.values(analytics?.summary ? {} : {});
    // Use mock user list from analytics
    const mockUsers = Array.from({ length: 20 }, (_, i) => ({
      id: `user_${i}`, name: `Driver ${i + 1}`, level: Math.floor(Math.random() * 50) + 1,
      gems: Math.floor(Math.random() * 10000), safety_score: Math.floor(Math.random() * 30) + 70,
      plan: Math.random() > 0.5 ? 'premium' : 'basic', state: 'OH',
    }));
    const filtered = searchQuery
      ? mockUsers.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()))
      : mockUsers;

    return (
      <View style={{ gap: 12 }}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            data-testid="admin-user-search"
          />
        </View>
        {filtered.map((user, i) => <UserRow key={user.id} user={user} index={i} />)}
      </View>
    );
  };

  const renderPartners = () => {
    const mockPartners = [
      { id: 'p1', name: 'Shell Gas Station', offers: 3, redemptions: 450, status: 'active' },
      { id: 'p2', name: 'Starbucks Downtown', offers: 2, redemptions: 320, status: 'active' },
      { id: 'p3', name: 'Quick Shine Car Wash', offers: 1, redemptions: 180, status: 'active' },
      { id: 'p4', name: 'Pizza Palace', offers: 1, redemptions: 95, status: 'pending' },
    ];
    return (
      <View style={{ gap: 12 }}>
        {mockPartners.map((p, i) => (
          <View key={p.id} style={styles.listRow}>
            <View style={styles.listRowLeft}>
              <View style={[styles.avatar, { backgroundColor: '#059669' }]}>
                <Ionicons name="business" size={16} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName}>{p.name}</Text>
                <Text style={styles.rowSub}>{p.offers} offers | {p.redemptions} redemptions</Text>
              </View>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: p.status === 'active' ? '#16A34A22' : '#EAB30822' }]}>
              <Text style={[styles.statusText, { color: p.status === 'active' ? '#16A34A' : '#EAB308' }]}>{p.status}</Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderOffers = () => {
    const mockOffers = [
      { id: 1, name: 'Shell - 10c off gas', gems: 25, redemptions: 150, status: 'active' },
      { id: 2, name: 'Starbucks - Free upgrade', gems: 15, redemptions: 89, status: 'active' },
      { id: 3, name: 'Car Wash Premium', gems: 30, redemptions: 45, status: 'active' },
      { id: 4, name: 'Pizza Palace 50% off', gems: 50, redemptions: 23, status: 'expired' },
    ];
    return (
      <View style={{ gap: 12 }}>
        <TouchableOpacity style={styles.createBtn} data-testid="admin-create-offer-btn">
          <LinearGradient colors={Colors.gradientPrimary} style={styles.createBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.createBtnText}>Create New Offer</Text>
          </LinearGradient>
        </TouchableOpacity>
        {mockOffers.map((o, i) => (
          <View key={o.id} style={styles.listRow}>
            <View style={styles.listRowLeft}>
              <View style={[styles.avatar, { backgroundColor: Colors.primary }]}>
                <Ionicons name="gift" size={16} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName}>{o.name}</Text>
                <Text style={styles.rowSub}>{o.gems} gems | {o.redemptions} redeemed</Text>
              </View>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: o.status === 'active' ? '#16A34A22' : '#DC262622' }]}>
              <Text style={[styles.statusText, { color: o.status === 'active' ? '#16A34A' : '#DC2626' }]}>{o.status}</Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderEvents = () => {
    const mockEvents = [
      { id: '1', title: 'Double XP Weekend', type: 'special', status: 'active', gems_multiplier: 2, dates: 'Feb 22-24' },
      { id: '2', title: 'Safety First Week', type: 'weekly', status: 'scheduled', gems_multiplier: 1.5, dates: 'Mar 1-7' },
      { id: '3', title: 'Community Report Day', type: 'daily', status: 'scheduled', gems_multiplier: 3, dates: 'Mar 15' },
    ];
    return (
      <View style={{ gap: 12 }}>
        <TouchableOpacity style={styles.createBtn} data-testid="admin-create-event-btn">
          <LinearGradient colors={['#7C3AED', '#8B5CF6']} style={styles.createBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.createBtnText}>Create Event</Text>
          </LinearGradient>
        </TouchableOpacity>
        {mockEvents.map((e, i) => (
          <View key={e.id} style={styles.eventCard}>
            <View style={styles.eventHeader}>
              <Text style={styles.eventTitle}>{e.title}</Text>
              <View style={[styles.statusBadge, { backgroundColor: e.status === 'active' ? '#16A34A22' : '#3B82F622' }]}>
                <Text style={[styles.statusText, { color: e.status === 'active' ? '#16A34A' : Colors.primary }]}>{e.status}</Text>
              </View>
            </View>
            <View style={styles.eventMeta}>
              <View style={styles.eventMetaItem}>
                <Ionicons name="calendar-outline" size={14} color={Colors.textMuted} />
                <Text style={styles.eventMetaText}>{e.dates}</Text>
              </View>
              <View style={styles.eventMetaItem}>
                <Ionicons name="flash" size={14} color="#EAB308" />
                <Text style={styles.eventMetaText}>{e.gems_multiplier}x gems</Text>
              </View>
              <View style={styles.eventMetaItem}>
                <Ionicons name="pricetag-outline" size={14} color={Colors.textMuted} />
                <Text style={styles.eventMetaText}>{e.type}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container} data-testid="admin-dashboard">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} data-testid="admin-back-btn">
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <Text style={styles.headerSub}>Platform Management</Text>
        </View>
        <TouchableOpacity style={styles.iconBtn}>
          <Ionicons name="notifications-outline" size={20} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer} contentContainerStyle={styles.tabsContent}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}
            data-testid={`admin-tab-${tab.key}`}
          >
            <Ionicons name={tab.icon as any} size={16} color={activeTab === tab.key ? '#fff' : Colors.textMuted} />
            <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'users' && renderUsers()}
        {activeTab === 'partners' && renderPartners()}
        {activeTab === 'offers' && renderOffers()}
        {activeTab === 'events' && renderEvents()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12, gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSizes.xl, fontWeight: FontWeights.bold, color: Colors.text },
  headerSub: { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  tabsContainer: { maxHeight: 48, paddingHorizontal: 12 },
  tabsContent: { gap: 8, paddingHorizontal: 4, alignItems: 'center' },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.surface },
  activeTab: { backgroundColor: Colors.primary },
  tabText: { fontSize: FontSizes.sm, color: Colors.textMuted, fontWeight: FontWeights.medium },
  activeTabText: { color: '#fff' },
  content: { flex: 1, marginTop: 12 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { width: (width - 42) / 2, padding: 14, borderRadius: BorderRadius.lg },
  statCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: FontWeights.bold, color: '#fff' },
  statTitle: { fontSize: FontSizes.sm, color: 'rgba(255,255,255,0.85)', marginTop: 6 },
  statSubtitle: { fontSize: FontSizes.xs, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  section: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: 16, borderWidth: 1, borderColor: Colors.glassBorder },
  sectionTitle: { fontSize: FontSizes.md, fontWeight: FontWeights.semibold, color: Colors.text, marginBottom: 12 },
  chartPlaceholder: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', height: 100, paddingTop: 10 },
  chartBar: { alignItems: 'center', gap: 4 },
  chartBarFill: { width: 24, backgroundColor: Colors.primary, borderRadius: 4, minHeight: 4 },
  chartLabel: { fontSize: 10, color: Colors.textMuted },
  partnerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10 },
  partnerRank: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.surfaceLight, alignItems: 'center', justifyContent: 'center' },
  partnerRankText: { fontSize: FontSizes.xs, fontWeight: FontWeights.bold, color: Colors.textMuted },
  partnerName: { flex: 1, fontSize: FontSizes.sm, color: Colors.text, fontWeight: FontWeights.medium },
  partnerStat: { fontSize: FontSizes.xs, color: Colors.textMuted },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionBtn: { width: (width - 74) / 2, padding: 14, borderRadius: BorderRadius.md, backgroundColor: Colors.surfaceLight, alignItems: 'center', gap: 8 },
  actionLabel: { fontSize: FontSizes.sm, color: Colors.text, fontWeight: FontWeights.medium },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, paddingHorizontal: 12, gap: 8, borderWidth: 1, borderColor: Colors.glassBorder },
  searchInput: { flex: 1, height: 44, color: Colors.text, fontSize: FontSizes.sm },
  listRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, padding: 12, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.glassBorder },
  listRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  listRowRight: { flexDirection: 'row', gap: 6 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: FontSizes.sm, fontWeight: FontWeights.bold, color: '#fff' },
  rowName: { fontSize: FontSizes.sm, fontWeight: FontWeights.semibold, color: Colors.text },
  rowSub: { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2 },
  scoreBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  scoreText: { fontSize: FontSizes.xs, fontWeight: FontWeights.bold },
  planBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  planText: { fontSize: FontSizes.xs, fontWeight: FontWeights.medium, textTransform: 'capitalize' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: FontSizes.xs, fontWeight: FontWeights.semibold, textTransform: 'capitalize' },
  createBtn: { borderRadius: BorderRadius.md, overflow: 'hidden' },
  createBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 8 },
  createBtnText: { fontSize: FontSizes.sm, fontWeight: FontWeights.semibold, color: '#fff' },
  eventCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: 14, borderWidth: 1, borderColor: Colors.glassBorder },
  eventHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eventTitle: { fontSize: FontSizes.sm, fontWeight: FontWeights.semibold, color: Colors.text },
  eventMeta: { flexDirection: 'row', gap: 14, marginTop: 10 },
  eventMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  eventMetaText: { fontSize: FontSizes.xs, color: Colors.textMuted },
});

export default AdminDashboardScreen;

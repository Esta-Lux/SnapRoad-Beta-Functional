// SnapRoad Mobile - Partner Dashboard Screen
// Full-featured partner portal ported from web with premium mobile UI

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, TextInput, Alert, Dimensions, Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSizes, FontWeights, BorderRadius, Spacing } from '../utils/theme';
import { useNavigation } from '@react-navigation/native';
import { API_URL } from '../config';

const { width } = Dimensions.get('window');

type Tab = 'overview' | 'offers' | 'locations' | 'boosts' | 'analytics';

export const PartnerDashboardScreen = () => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);

  const fetchData = useCallback(async () => {
    try {
      const [profResp, offersResp, analyticsResp] = await Promise.all([
        fetch(`${API_URL}/api/partner/profile`),
        fetch(`${API_URL}/api/partner/offers`),
        fetch(`${API_URL}/api/analytics/dashboard`),
      ]);
      const [profData, offersData, analyticsData] = await Promise.all([profResp.json(), offersResp.json(), analyticsResp.json()]);
      if (profData.success) setProfile(profData.data);
      if (offersData.success) setOffers(offersData.data);
      if (analyticsData.success) setAnalytics(analyticsData.data);
    } catch (e) { console.log('Partner fetch error:', e); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'overview', label: 'Overview', icon: 'grid' },
    { key: 'offers', label: 'Offers', icon: 'gift' },
    { key: 'locations', label: 'Locations', icon: 'location' },
    { key: 'boosts', label: 'Boosts', icon: 'rocket' },
    { key: 'analytics', label: 'Analytics', icon: 'bar-chart' },
  ];

  const renderOverview = () => {
    const summary = analytics?.summary || {};
    return (
      <View style={{ gap: 16 }}>
        {/* Business Info */}
        <View style={styles.bizCard}>
          <LinearGradient colors={['#1E293B', '#334155']} style={styles.bizCardBg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={styles.bizHeader}>
              <View style={styles.bizIcon}>
                <Ionicons name="business" size={24} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.bizName}>{profile?.business_name || 'Your Business'}</Text>
                <Text style={styles.bizPlan}>{profile?.plan_info?.name || 'Starter'} Plan</Text>
              </View>
              <View style={styles.foundersBadge}>
                <Ionicons name="diamond" size={12} color="#EAB308" />
                <Text style={styles.foundersText}>Founder</Text>
              </View>
            </View>
            <View style={styles.bizStats}>
              <View style={styles.bizStat}>
                <Text style={styles.bizStatValue}>{profile?.location_count || 0}</Text>
                <Text style={styles.bizStatLabel}>Locations</Text>
              </View>
              <View style={styles.bizStatDivider} />
              <View style={styles.bizStat}>
                <Text style={styles.bizStatValue}>{offers.length}</Text>
                <Text style={styles.bizStatLabel}>Active Offers</Text>
              </View>
              <View style={styles.bizStatDivider} />
              <View style={styles.bizStat}>
                <Text style={styles.bizStatValue}>{summary.total_redemptions || 0}</Text>
                <Text style={styles.bizStatLabel}>Redemptions</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Stats Grid */}
        <View style={styles.statGrid}>
          <View style={styles.statCard}>
            <Ionicons name="eye-outline" size={20} color={Colors.primary} />
            <Text style={styles.statValue}>{(summary.total_views || 0).toLocaleString()}</Text>
            <Text style={styles.statLabel}>Views</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="hand-left-outline" size={20} color="#10B981" />
            <Text style={styles.statValue}>{(summary.total_clicks || 0).toLocaleString()}</Text>
            <Text style={styles.statLabel}>Clicks</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="cash-outline" size={20} color="#F59E0B" />
            <Text style={styles.statValue}>${summary.total_revenue || 0}</Text>
            <Text style={styles.statLabel}>Revenue</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="trending-up" size={20} color="#8B5CF6" />
            <Text style={styles.statValue}>{summary.ctr || 0}%</Text>
            <Text style={styles.statLabel}>CTR</Text>
          </View>
        </View>

        {/* Performance Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance (7 days)</Text>
          <View style={styles.chartArea}>
            {analytics?.chart_data?.map((d: any, i: number) => (
              <View key={i} style={styles.chartCol}>
                <View style={[styles.chartBarViews, { height: Math.max(4, (d.views / 200) * 60) }]} />
                <View style={[styles.chartBarClicks, { height: Math.max(4, (d.clicks / 80) * 40) }]} />
                <Text style={styles.chartDateLabel}>{d.date?.split(' ')[1]}</Text>
              </View>
            ))}
          </View>
          <View style={styles.chartLegend}>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: Colors.primary }]} /><Text style={styles.legendText}>Views</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#10B981' }]} /><Text style={styles.legendText}>Clicks</Text></View>
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {(analytics?.recent_activity || []).slice(0, 4).map((a: any, i: number) => (
            <View key={i} style={styles.activityRow}>
              <View style={[styles.activityIcon, { backgroundColor: a.type === 'redemption' ? '#10B98122' : a.type === 'click' ? '#3B82F622' : '#F59E0B22' }]}>
                <Ionicons name={a.type === 'redemption' ? 'checkmark-circle' : a.type === 'click' ? 'hand-left' : 'eye'} size={14} color={a.type === 'redemption' ? '#10B981' : a.type === 'click' ? Colors.primary : '#F59E0B'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.activityText}>{a.offer}</Text>
                <Text style={styles.activityTime}>{a.time} - {a.location}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderOffers = () => (
    <View style={{ gap: 12 }}>
      <TouchableOpacity style={styles.createBtn} onPress={() => Alert.alert('Create Offer', 'Select a location first')} data-testid="partner-create-offer-btn">
        <LinearGradient colors={Colors.gradientPrimary} style={styles.createBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.createBtnText}>Create New Offer</Text>
        </LinearGradient>
      </TouchableOpacity>

      {offers.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="gift-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No offers yet</Text>
          <Text style={styles.emptyDesc}>Create your first offer to attract SnapRoad drivers</Text>
        </View>
      ) : (
        offers.map((offer, i) => (
          <View key={offer.id} style={styles.offerCard}>
            <View style={styles.offerHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.offerTitle}>{offer.title || offer.description}</Text>
                <Text style={styles.offerBiz}>{offer.business_name} - {offer.location_name || 'Main Store'}</Text>
              </View>
              <View style={[styles.statusPill, { backgroundColor: offer.status === 'active' ? '#10B98122' : '#EAB30822' }]}>
                <View style={[styles.statusDot, { backgroundColor: offer.status === 'active' ? '#10B981' : '#EAB308' }]} />
                <Text style={[styles.statusLabel, { color: offer.status === 'active' ? '#10B981' : '#EAB308' }]}>{offer.status || 'active'}</Text>
              </View>
            </View>
            <View style={styles.offerStats}>
              <View style={styles.offerStatItem}>
                <Ionicons name="eye-outline" size={14} color={Colors.textMuted} />
                <Text style={styles.offerStatText}>{offer.views || 0} views</Text>
              </View>
              <View style={styles.offerStatItem}>
                <Ionicons name="checkmark-circle-outline" size={14} color={Colors.textMuted} />
                <Text style={styles.offerStatText}>{offer.redemption_count || 0} redeemed</Text>
              </View>
              <View style={styles.offerStatItem}>
                <Ionicons name="diamond-outline" size={14} color={Colors.textMuted} />
                <Text style={styles.offerStatText}>{offer.base_gems || offer.gems_reward || 0} gems</Text>
              </View>
            </View>
            <View style={styles.offerActions}>
              <TouchableOpacity style={styles.offerActionBtn}><Ionicons name="create-outline" size={16} color={Colors.primary} /><Text style={styles.offerActionText}>Edit</Text></TouchableOpacity>
              <TouchableOpacity style={styles.offerActionBtn}><Ionicons name="rocket-outline" size={16} color="#8B5CF6" /><Text style={[styles.offerActionText, { color: '#8B5CF6' }]}>Boost</Text></TouchableOpacity>
              <TouchableOpacity style={styles.offerActionBtn}><Ionicons name="pause-circle-outline" size={16} color="#EAB308" /><Text style={[styles.offerActionText, { color: '#EAB308' }]}>Pause</Text></TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </View>
  );

  const renderLocations = () => {
    const locations = profile?.locations || [];
    return (
      <View style={{ gap: 12 }}>
        <View style={styles.locationHeader}>
          <Text style={styles.locationCount}>{locations.length}/{profile?.max_locations || 5} locations</Text>
          <TouchableOpacity style={styles.addLocationBtn} data-testid="partner-add-location-btn">
            <Ionicons name="add" size={18} color={Colors.primary} />
            <Text style={styles.addLocationText}>Add Location</Text>
          </TouchableOpacity>
        </View>
        {locations.map((loc: any, i: number) => (
          <View key={loc.id} style={styles.locationCard}>
            <View style={styles.locationCardHeader}>
              <View style={styles.locationPin}>
                <Ionicons name="location" size={18} color={loc.is_primary ? Colors.primary : Colors.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.locationName}>{loc.name}</Text>
                  {loc.is_primary && <View style={styles.primaryBadge}><Text style={styles.primaryText}>Primary</Text></View>}
                </View>
                <Text style={styles.locationAddr}>{loc.address}</Text>
              </View>
              <TouchableOpacity><Ionicons name="ellipsis-vertical" size={18} color={Colors.textMuted} /></TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderBoosts = () => (
    <View style={{ gap: 12 }}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Boost Packages</Text>
        {[
          { name: 'Basic', price: '$9.99', duration: '24 hours', multiplier: '1.5x', color: '#3B82F6' },
          { name: 'Standard', price: '$19.99', duration: '3 days', multiplier: '2x', color: '#8B5CF6' },
          { name: 'Premium', price: '$39.99', duration: '7 days', multiplier: '3x', color: '#F59E0B' },
        ].map((pkg, i) => (
          <TouchableOpacity key={i} style={styles.boostPackage} data-testid={`partner-boost-${pkg.name.toLowerCase()}`}>
            <View style={[styles.boostIcon, { backgroundColor: pkg.color + '22' }]}>
              <Ionicons name="rocket" size={18} color={pkg.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.boostName}>{pkg.name} Boost</Text>
              <Text style={styles.boostMeta}>{pkg.duration} | {pkg.multiplier} visibility</Text>
            </View>
            <Text style={styles.boostPrice}>{pkg.price}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderAnalytics = () => {
    const summary = analytics?.summary || {};
    return (
      <View style={{ gap: 16 }}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Conversion Funnel</Text>
          {[
            { label: 'Impressions', value: summary.total_views || 0, pct: 100, color: Colors.primary },
            { label: 'Clicks', value: summary.total_clicks || 0, pct: summary.ctr || 0, color: '#10B981' },
            { label: 'Redemptions', value: summary.total_redemptions || 0, pct: summary.conversion_rate || 0, color: '#F59E0B' },
          ].map((step, i) => (
            <View key={i} style={styles.funnelRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.funnelLabel}>{step.label}</Text>
                <View style={styles.funnelBarBg}>
                  <View style={[styles.funnelBarFill, { width: `${step.pct}%`, backgroundColor: step.color }]} />
                </View>
              </View>
              <Text style={styles.funnelValue}>{step.value.toLocaleString()}</Text>
            </View>
          ))}
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Performing Areas</Text>
          {(analytics?.geo_data || []).map((area: any, i: number) => (
            <View key={i} style={styles.geoRow}>
              <Ionicons name="location" size={16} color={Colors.primary} />
              <Text style={styles.geoName}>{area.city}</Text>
              <Text style={styles.geoValue}>{area.redemptions} redemptions</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container} data-testid="partner-dashboard">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} data-testid="partner-back-btn">
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Partner Dashboard</Text>
          <Text style={styles.headerSub}>{profile?.business_name || 'Business Portal'}</Text>
        </View>
        <TouchableOpacity style={styles.iconBtn}>
          <Ionicons name="settings-outline" size={20} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer} contentContainerStyle={styles.tabsContent}>
        {tabs.map(tab => (
          <TouchableOpacity key={tab.key} style={[styles.tabPill, activeTab === tab.key && styles.activeTabPill]} onPress={() => setActiveTab(tab.key)} data-testid={`partner-tab-${tab.key}`}>
            <Ionicons name={tab.icon as any} size={16} color={activeTab === tab.key ? '#fff' : Colors.textMuted} />
            <Text style={[styles.tabPillText, activeTab === tab.key && styles.activeTabPillText]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'offers' && renderOffers()}
        {activeTab === 'locations' && renderLocations()}
        {activeTab === 'boosts' && renderBoosts()}
        {activeTab === 'analytics' && renderAnalytics()}
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
  tabPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.surface },
  activeTabPill: { backgroundColor: Colors.primary },
  tabPillText: { fontSize: FontSizes.sm, color: Colors.textMuted, fontWeight: FontWeights.medium },
  activeTabPillText: { color: '#fff' },
  content: { flex: 1, marginTop: 12 },
  bizCard: { borderRadius: BorderRadius.lg, overflow: 'hidden' },
  bizCardBg: { padding: 20 },
  bizHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bizIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(37,99,235,0.15)', alignItems: 'center', justifyContent: 'center' },
  bizName: { fontSize: FontSizes.lg, fontWeight: FontWeights.bold, color: '#fff' },
  bizPlan: { fontSize: FontSizes.xs, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  foundersBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(234,179,8,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  foundersText: { fontSize: FontSizes.xs, color: '#EAB308', fontWeight: FontWeights.semibold },
  bizStats: { flexDirection: 'row', marginTop: 20, justifyContent: 'space-around' },
  bizStat: { alignItems: 'center' },
  bizStatValue: { fontSize: FontSizes.xl, fontWeight: FontWeights.bold, color: '#fff' },
  bizStatLabel: { fontSize: FontSizes.xs, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  bizStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { width: (width - 42) / 2, backgroundColor: Colors.surface, padding: 14, borderRadius: BorderRadius.lg, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: Colors.glassBorder },
  statValue: { fontSize: FontSizes.lg, fontWeight: FontWeights.bold, color: Colors.text },
  statLabel: { fontSize: FontSizes.xs, color: Colors.textMuted },
  section: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: 16, borderWidth: 1, borderColor: Colors.glassBorder },
  sectionTitle: { fontSize: FontSizes.md, fontWeight: FontWeights.semibold, color: Colors.text, marginBottom: 12 },
  chartArea: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', height: 80 },
  chartCol: { alignItems: 'center', gap: 2 },
  chartBarViews: { width: 18, backgroundColor: Colors.primary, borderRadius: 3, opacity: 0.7 },
  chartBarClicks: { width: 18, backgroundColor: '#10B981', borderRadius: 3 },
  chartDateLabel: { fontSize: 9, color: Colors.textMuted, marginTop: 4 },
  chartLegend: { flexDirection: 'row', gap: 16, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: FontSizes.xs, color: Colors.textMuted },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  activityIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  activityText: { fontSize: FontSizes.sm, color: Colors.text },
  activityTime: { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2 },
  createBtn: { borderRadius: BorderRadius.md, overflow: 'hidden' },
  createBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 8 },
  createBtnText: { fontSize: FontSizes.sm, fontWeight: FontWeights.semibold, color: '#fff' },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyTitle: { fontSize: FontSizes.md, fontWeight: FontWeights.semibold, color: Colors.text },
  emptyDesc: { fontSize: FontSizes.sm, color: Colors.textMuted, textAlign: 'center' },
  offerCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: 14, borderWidth: 1, borderColor: Colors.glassBorder },
  offerHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  offerTitle: { fontSize: FontSizes.sm, fontWeight: FontWeights.semibold, color: Colors.text },
  offerBiz: { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusLabel: { fontSize: FontSizes.xs, fontWeight: FontWeights.semibold, textTransform: 'capitalize' },
  offerStats: { flexDirection: 'row', gap: 14, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.glassBorder },
  offerStatItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  offerStatText: { fontSize: FontSizes.xs, color: Colors.textMuted },
  offerActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  offerActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, backgroundColor: Colors.surfaceLight, borderRadius: 8 },
  offerActionText: { fontSize: FontSizes.xs, fontWeight: FontWeights.medium, color: Colors.primary },
  locationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  locationCount: { fontSize: FontSizes.sm, color: Colors.textMuted },
  addLocationBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 1, borderColor: Colors.primary },
  addLocationText: { fontSize: FontSizes.sm, color: Colors.primary, fontWeight: FontWeights.medium },
  locationCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: 14, borderWidth: 1, borderColor: Colors.glassBorder },
  locationCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  locationPin: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surfaceLight, alignItems: 'center', justifyContent: 'center' },
  locationName: { fontSize: FontSizes.sm, fontWeight: FontWeights.semibold, color: Colors.text },
  locationAddr: { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2 },
  primaryBadge: { backgroundColor: '#2563EB22', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  primaryText: { fontSize: 10, color: Colors.primary, fontWeight: FontWeights.semibold },
  boostPackage: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.glassBorder },
  boostIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  boostName: { fontSize: FontSizes.sm, fontWeight: FontWeights.semibold, color: Colors.text },
  boostMeta: { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2 },
  boostPrice: { fontSize: FontSizes.md, fontWeight: FontWeights.bold, color: Colors.text },
  funnelRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  funnelLabel: { fontSize: FontSizes.sm, color: Colors.text, marginBottom: 4 },
  funnelBarBg: { height: 6, backgroundColor: Colors.surfaceLight, borderRadius: 3, overflow: 'hidden' },
  funnelBarFill: { height: 6, borderRadius: 3 },
  funnelValue: { fontSize: FontSizes.sm, fontWeight: FontWeights.bold, color: Colors.text, minWidth: 60, textAlign: 'right' },
  geoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  geoName: { flex: 1, fontSize: FontSizes.sm, color: Colors.text },
  geoValue: { fontSize: FontSizes.xs, color: Colors.textMuted },
});

export default PartnerDashboardScreen;

// SnapRoad Mobile - Hazard Feed Screen
// Real-time community road intelligence

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadows, FontSizes, FontWeights, BorderRadius } from '../utils/theme';

const FILTERS = ['All', 'Crashes', 'Hazards', 'Construction', 'Weather', 'Police'];

const INCIDENTS = [
  { id: 1, type: 'crash', title: 'Multi-car accident', location: 'I-71 N near Exit 108', time: '3 min ago', severity: 'high', reports: 12, icon: 'car-outline' as const, color: Colors.error },
  { id: 2, type: 'construction', title: 'Lane closure', location: 'Broad St between 4th & 5th', time: '15 min ago', severity: 'medium', reports: 8, icon: 'construct-outline' as const, color: '#F59E0B' },
  { id: 3, type: 'hazard', title: 'Debris on road', location: 'US-23 S near Circleville', time: '22 min ago', severity: 'low', reports: 5, icon: 'warning-outline' as const, color: '#FF9F1C' },
  { id: 4, type: 'weather', title: 'Icy patches reported', location: 'SR-315 N bridge sections', time: '45 min ago', severity: 'medium', reports: 19, icon: 'rainy-outline' as const, color: Colors.primaryLight },
  { id: 5, type: 'police', title: 'Speed trap', location: 'I-270 W near Hilliard', time: '1 hr ago', severity: 'low', reports: 31, icon: 'shield-outline' as const, color: Colors.secondary },
  { id: 6, type: 'crash', title: 'Fender bender — right lane blocked', location: 'SR-161 near New Albany', time: '1 hr ago', severity: 'medium', reports: 7, icon: 'car-outline' as const, color: Colors.error },
];

export const HazardFeedScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState('All');
  const [refreshing, setRefreshing] = useState(false);

  const filtered = activeFilter === 'All' ? INCIDENTS : INCIDENTS.filter(i =>
    (activeFilter === 'Crashes' && i.type === 'crash') ||
    (activeFilter === 'Hazards' && i.type === 'hazard') ||
    (activeFilter === 'Construction' && i.type === 'construction') ||
    (activeFilter === 'Weather' && i.type === 'weather') ||
    (activeFilter === 'Police' && i.type === 'police')
  );

  const onRefresh = () => { setRefreshing(true); setTimeout(() => setRefreshing(false), 1000); };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Road Intel</Text>
        <TouchableOpacity onPress={() => navigation?.navigate('PhotoCapture')} style={s.reportBtn}>
          <Ionicons name="add" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
        {FILTERS.map(f => (
          <TouchableOpacity key={f} style={[s.filterChip, activeFilter === f && s.filterChipActive]} onPress={() => setActiveFilter(f)}>
            <Text style={[s.filterText, activeFilter === f && s.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Feed */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.feed}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primaryLight} />}
      >
        {/* Summary Banner */}
        <View style={s.summaryCard}>
          <LinearGradient colors={['rgba(37,99,235,0.12)', 'rgba(37,99,235,0.04)']} style={s.summaryGrad}>
            <Ionicons name="radio-outline" size={20} color={Colors.primaryLight} />
            <View style={{ flex: 1 }}>
              <Text style={s.summaryTitle}>{INCIDENTS.length} active reports nearby</Text>
              <Text style={s.summarySub}>Updated just now</Text>
            </View>
          </LinearGradient>
        </View>

        {filtered.map(inc => (
          <TouchableOpacity key={inc.id} style={s.incidentCard}>
            <View style={s.incidentRow}>
              <View style={[s.incidentIcon, { backgroundColor: `${inc.color}15` }]}>
                <Ionicons name={inc.icon} size={20} color={inc.color} />
              </View>
              <View style={s.incidentBody}>
                <Text style={s.incidentTitle}>{inc.title}</Text>
                <Text style={s.incidentLocation}>{inc.location}</Text>
                <View style={s.incidentMeta}>
                  <Text style={s.incidentTime}>{inc.time}</Text>
                  <View style={s.metaDot} />
                  <Ionicons name="people-outline" size={12} color={Colors.textMuted} />
                  <Text style={s.incidentReports}>{inc.reports} reports</Text>
                </View>
              </View>
              <View style={[s.severityBadge, { backgroundColor: inc.severity === 'high' ? `${Colors.error}15` : inc.severity === 'medium' ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.05)' }]}>
                <Text style={[s.severityText, { color: inc.severity === 'high' ? Colors.error : inc.severity === 'medium' ? '#F59E0B' : Colors.textMuted }]}>
                  {inc.severity.toUpperCase()}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: FontWeights.bold, letterSpacing: 0.5 },
  reportBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: `${Colors.primary}15`, alignItems: 'center', justifyContent: 'center' },
  filterScroll: { marginBottom: 12 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: BorderRadius.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.glassBorder },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { color: Colors.textMuted, fontSize: FontSizes.sm, fontWeight: FontWeights.medium },
  filterTextActive: { color: '#fff' },
  feed: { paddingHorizontal: 16 },
  summaryCard: { marginBottom: 16 },
  summaryGrad: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: BorderRadius.lg, padding: 16, borderWidth: 1, borderColor: Colors.glassBorder },
  summaryTitle: { color: Colors.text, fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
  summarySub: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: 2 },
  incidentCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.glassBorder, padding: 16, marginBottom: 12 },
  incidentRow: { flexDirection: 'row', gap: 14 },
  incidentIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  incidentBody: { flex: 1 },
  incidentTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: FontWeights.semibold, letterSpacing: 0.2 },
  incidentLocation: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginTop: 3 },
  incidentMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  incidentTime: { color: Colors.textMuted, fontSize: FontSizes.xs },
  metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: Colors.textDim },
  incidentReports: { color: Colors.textMuted, fontSize: FontSizes.xs },
  severityBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' },
  severityText: { fontSize: 10, fontWeight: FontWeights.bold, letterSpacing: 0.8 },
});

export default HazardFeedScreen;

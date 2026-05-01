import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

function formatGemsCompact(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function formatMilesCompact(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(Math.round(n));
}

type StatsProps = {
  cardBg: string;
  text: string;
  sub: string;
  gems: number;
  safetyScore: number;
  trips: number;
  miles: number;
};

export const ProfileStatsStrip = React.memo(function ProfileStatsStrip({ cardBg, text, sub, gems, safetyScore, trips, miles }: StatsProps) {
  const avgMiles = trips > 0 ? miles / trips : 0;
  const cols = [
    { icon: 'diamond-outline' as const, val: formatGemsCompact(gems), lbl: 'Gems' },
    {
      icon: 'shield-checkmark-outline' as const,
      val: safetyScore > 0 ? String(Math.round(safetyScore)) : '—',
      lbl: 'Safety',
    },
    { icon: 'car-outline' as const, val: String(trips), lbl: 'Trips' },
    { icon: 'briefcase-outline' as const, val: `${formatMilesCompact(miles)}`, lbl: 'Logged mi', sub: trips > 0 ? `${avgMiles.toFixed(1)} avg` : 'Ready' },
  ];
  return (
    <View style={[styles.statsRow, { backgroundColor: cardBg }]}>
      {cols.map((c) => (
        <View key={c.lbl} style={styles.statCol}>
          <Ionicons name={c.icon} size={14} color={sub} style={styles.statIcon} />
          <Text style={[styles.statVal, { color: text }]}>{c.val}</Text>
          <Text style={[styles.statLbl, { color: sub }]}>{c.lbl}</Text>
          {'sub' in c && c.sub ? <Text style={[styles.statSub, { color: sub }]}>{c.sub}</Text> : null}
        </View>
      ))}
    </View>
  );
});

type TabId = 'overview' | 'settings';

export const ProfileTabBar = React.memo(function ProfileTabBar({
  activeTab,
  onChange,
  sub,
}: {
  activeTab: TabId;
  onChange: (tab: TabId) => void;
  sub: string;
}) {
  return (
    <View style={styles.tabRow}>
      {([
        { id: 'overview', label: 'Overview' },
        { id: 'settings', label: 'Settings' },
      ] as const).map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={[styles.tabBtn, activeTab === tab.id && styles.tabBtnActive]}
          onPress={() => onChange(tab.id)}
        >
          <Text style={[styles.tabBtnText, { color: activeTab === tab.id ? '#fff' : sub }]}>{tab.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  tabRow: { flexDirection: 'row', marginHorizontal: 16, marginTop: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(148,163,184,0.35)' },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: '#3B82F6' },
  tabBtnText: { fontSize: 12, fontWeight: '700' },
  statsRow: { marginHorizontal: 16, marginBottom: 2, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 8, flexDirection: 'row', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(148,163,184,0.22)' },
  statCol: { flex: 1, alignItems: 'center' },
  statIcon: { marginBottom: 2 },
  statVal: { fontSize: 17, fontWeight: '800' },
  statLbl: { fontSize: 10, marginTop: 2, fontWeight: '600' },
  statSub: { fontSize: 9, marginTop: 1, fontWeight: '700', opacity: 0.82 },
});

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

type StatsProps = {
  cardBg: string;
  text: string;
  sub: string;
  gems: number;
  rank: number | string;
  trips: number;
  miles: number;
};

export function ProfileStatsStrip({ cardBg, text, sub, gems, rank, trips, miles }: StatsProps) {
  return (
    <View style={[styles.statsRow, { backgroundColor: cardBg }]}>
      <View style={styles.statCol}>
        <Text style={[styles.statVal, { color: text }]}>{gems}</Text>
        <Text style={[styles.statLbl, { color: sub }]}>Gems</Text>
      </View>
      <View style={styles.statCol}>
        <Text style={[styles.statVal, { color: text }]}>#{rank}</Text>
        <Text style={[styles.statLbl, { color: sub }]}>Rank</Text>
      </View>
      <View style={styles.statCol}>
        <Text style={[styles.statVal, { color: text }]}>{trips}</Text>
        <Text style={[styles.statLbl, { color: sub }]}>Trips</Text>
      </View>
      <View style={styles.statCol}>
        <Text style={[styles.statVal, { color: text }]}>{miles}</Text>
        <Text style={[styles.statLbl, { color: sub }]}>Miles</Text>
      </View>
    </View>
  );
}

type TabId = 'overview' | 'score' | 'fuel' | 'settings';

export function ProfileTabBar({
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
        { id: 'score', label: 'Score' },
        { id: 'fuel', label: 'Fuel' },
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
}

const styles = StyleSheet.create({
  tabRow: { flexDirection: 'row', marginHorizontal: 16, marginTop: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(148,163,184,0.35)' },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: '#3B82F6' },
  tabBtnText: { fontSize: 12, fontWeight: '700' },
  statsRow: { marginHorizontal: 16, marginBottom: 2, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 8, flexDirection: 'row' },
  statCol: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 18, fontWeight: '800' },
  statLbl: { fontSize: 11, marginTop: 2 },
});

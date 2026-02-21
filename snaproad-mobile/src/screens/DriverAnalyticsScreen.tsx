// SnapRoad Mobile - Premium Driver Analytics
// Neon blue glass-morphism, clean typography

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadows, FontSizes, FontWeights, BorderRadius } from '../utils/theme';

const STATS = [
  { label: 'Safety Score', value: '94', change: '+3%', icon: 'shield-checkmark-outline', color: Colors.secondary, bg: `${Colors.secondary}12` },
  { label: 'Total Miles', value: '1,247', change: '+12%', icon: 'navigate-outline', color: Colors.primaryLight, bg: `${Colors.primaryLight}12` },
  { label: 'Gems Earned', value: '2,450', change: '+8%', icon: 'diamond-outline', color: Colors.accent, bg: `${Colors.accent}12` },
  { label: 'Day Streak', value: '23', change: '', icon: 'flash-outline', color: Colors.gold, bg: `${Colors.gold}12` },
];

const METRICS = [
  { name: 'Smooth Braking', score: 92, color: Colors.secondary, icon: 'pulse-outline' },
  { name: 'Speed Control', score: 96, color: Colors.primaryLight, icon: 'speedometer-outline' },
  { name: 'Cornering', score: 88, color: '#F59E0B', icon: 'navigate-outline' },
  { name: 'Acceleration', score: 90, color: Colors.accent, icon: 'flash-outline' },
  { name: 'Phone Focus', score: 78, color: Colors.error, icon: 'phone-portrait-outline' },
  { name: 'Night Driving', score: 85, color: Colors.primaryLight, icon: 'moon-outline' },
];

const WEEKLY = [
  { day: 'M', score: 92 }, { day: 'T', score: 88 }, { day: 'W', score: 95 },
  { day: 'T', score: 91 }, { day: 'F', score: 94 }, { day: 'S', score: 97 }, { day: 'S', score: 96 },
];

export const DriverAnalyticsScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [range, setRange] = useState<'week'|'month'|'year'>('week');

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Analytics</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* Range Tabs */}
        <View style={s.rangeTabs}>
          {(['week','month','year'] as const).map(r => (
            <TouchableOpacity key={r} style={[s.rangeTab, range===r && s.rangeTabActive]} onPress={() => setRange(r)}>
              <Text style={[s.rangeText, range===r && s.rangeTextActive]}>{r.charAt(0).toUpperCase()+r.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats Grid */}
        <View style={s.grid}>
          {STATS.map((st,i) => (
            <View key={i} style={s.statCard}>
              <View style={[s.statIcon, { backgroundColor: st.bg }]}>
                <Ionicons name={st.icon as any} size={18} color={st.color} />
              </View>
              <Text style={s.statValue}>{st.value}</Text>
              <Text style={s.statLabel}>{st.label}</Text>
              {st.change ? <Text style={s.statChange}>{st.change}</Text> : null}
            </View>
          ))}
        </View>

        {/* Weekly Chart */}
        <View style={s.chartCard}>
          <Text style={s.cardTitle}>Weekly Performance</Text>
          <View style={s.barRow}>
            {WEEKLY.map((d,i) => {
              const h = ((d.score - 70) / 30) * 100;
              const clr = d.score >= 95 ? Colors.secondary : d.score >= 90 ? Colors.primaryLight : '#F59E0B';
              return (
                <View key={i} style={s.barCol}>
                  <View style={s.barTrack}>
                    <LinearGradient colors={[clr, `${clr}88`]} style={[s.barFill, { height: `${h}%` }]} />
                  </View>
                  <Text style={s.barDay}>{d.day}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Driving Breakdown */}
        <View style={s.metricsCard}>
          <Text style={s.cardTitle}>Driving Breakdown</Text>
          {METRICS.map((m,i) => (
            <View key={i} style={s.metricRow}>
              <View style={[s.metricIcon, { backgroundColor: `${m.color}12` }]}>
                <Ionicons name={m.icon as any} size={15} color={m.color} />
              </View>
              <View style={s.metricBody}>
                <View style={s.metricHead}>
                  <Text style={s.metricName}>{m.name}</Text>
                  <Text style={[s.metricScore, { color: m.color }]}>{m.score}</Text>
                </View>
                <View style={s.metricTrack}>
                  <View style={[s.metricFill, { width: `${m.score}%`, backgroundColor: m.color }]} />
                </View>
              </View>
            </View>
          ))}
        </View>
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
  scroll: { paddingHorizontal: 16 },
  rangeTabs: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: 4, marginBottom: 20, borderWidth: 1, borderColor: Colors.glassBorder },
  rangeTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  rangeTabActive: { backgroundColor: Colors.primary },
  rangeText: { color: Colors.textMuted, fontSize: FontSizes.sm, fontWeight: FontWeights.semibold, letterSpacing: 0.5 },
  rangeTextActive: { color: '#fff' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  statCard: { width: '47%', backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.glassBorder, padding: 18, ...Shadows.md },
  statIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  statValue: { color: Colors.text, fontSize: FontSizes.xxl, fontWeight: FontWeights.bold, letterSpacing: -0.5 },
  statLabel: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: 4, letterSpacing: 0.6, textTransform: 'uppercase' },
  statChange: { color: Colors.secondary, fontSize: FontSizes.xs, fontWeight: FontWeights.semibold, marginTop: 8 },
  chartCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.glassBorder, padding: 20, marginBottom: 20 },
  cardTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: FontWeights.bold, marginBottom: 20, letterSpacing: 0.3 },
  barRow: { flexDirection: 'row', justifyContent: 'space-around', height: 130 },
  barCol: { alignItems: 'center', flex: 1 },
  barTrack: { flex: 1, width: 18, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 9, overflow: 'hidden', justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: 9 },
  barDay: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: 8, fontWeight: FontWeights.medium },
  metricsCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.glassBorder, padding: 20 },
  metricRow: { flexDirection: 'row', gap: 12, marginBottom: 18 },
  metricIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  metricBody: { flex: 1 },
  metricHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  metricName: { color: Colors.text, fontSize: FontSizes.sm, fontWeight: FontWeights.medium, letterSpacing: 0.2 },
  metricScore: { fontSize: FontSizes.sm, fontWeight: FontWeights.bold },
  metricTrack: { height: 5, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 3, overflow: 'hidden' },
  metricFill: { height: '100%', borderRadius: 3 },
});

export default DriverAnalyticsScreen;

// SnapRoad Mobile - Premium Fuel Dashboard
// Neon blue glass-morphism, clean data visualization

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadows, FontSizes, FontWeights, BorderRadius } from '../utils/theme';

const MONTHLY_DATA = [
  { month: 'Sep', spent: 180, avg: 28.5 }, { month: 'Oct', spent: 165, avg: 30.2 },
  { month: 'Nov', spent: 195, avg: 27.8 }, { month: 'Dec', spent: 210, avg: 26.5 },
  { month: 'Jan', spent: 155, avg: 31.4 }, { month: 'Feb', spent: 142, avg: 32.1 },
];

const TIPS = [
  { icon: 'speedometer-outline' as const, title: 'Maintain steady speed', desc: 'Cruise control can improve MPG by 7-14%', color: Colors.primaryLight },
  { icon: 'leaf-outline' as const, title: 'Coast to stops', desc: 'Ease off gas early to save fuel', color: Colors.secondary },
  { icon: 'thermometer-outline' as const, title: 'Check tire pressure', desc: 'Low tires reduce efficiency by 3%', color: '#F59E0B' },
];

export const FuelDashboardScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const maxSpent = Math.max(...MONTHLY_DATA.map(d => d.spent));

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Fuel Dashboard</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* Hero Stats */}
        <View style={s.heroRow}>
          <View style={s.heroCard}>
            <LinearGradient colors={Colors.gradientPrimary} style={s.heroGrad}>
              <Ionicons name="water-outline" size={22} color="#fff" />
              <Text style={s.heroVal}>32.1</Text>
              <Text style={s.heroLabel}>Avg MPG</Text>
            </LinearGradient>
          </View>
          <View style={s.heroCard}>
            <LinearGradient colors={['#06D6A0', '#10B981']} style={s.heroGrad}>
              <Ionicons name="trending-up-outline" size={22} color="#fff" />
              <Text style={s.heroVal}>$47</Text>
              <Text style={s.heroLabel}>Saved / mo</Text>
            </LinearGradient>
          </View>
        </View>

        {/* Monthly Chart */}
        <View style={s.chartCard}>
          <Text style={s.cardTitle}>Monthly Fuel Spend</Text>
          <View style={s.barChart}>
            {MONTHLY_DATA.map((d, i) => {
              const h = (d.spent / maxSpent) * 100;
              const isLast = i === MONTHLY_DATA.length - 1;
              return (
                <View key={i} style={s.barCol}>
                  <View style={s.barTrack}>
                    <LinearGradient
                      colors={isLast ? Colors.gradientPrimary : [Colors.surfaceLight, Colors.surfaceLight]}
                      style={[s.barFill, { height: `${h}%` }]}
                    />
                  </View>
                  <Text style={[s.barLabel, isLast && { color: Colors.primaryLight }]}>{d.month}</Text>
                  <Text style={s.barValue}>${d.spent}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* MPG Stats */}
        <View style={s.mpgCard}>
          <Text style={s.cardTitle}>Efficiency Metrics</Text>
          {[
            { label: 'Current Avg', value: '32.1 MPG', color: Colors.secondary, icon: 'flash-outline' },
            { label: 'Best Trip', value: '38.4 MPG', color: Colors.gold, icon: 'trophy-outline' },
            { label: 'Worst Trip', value: '22.1 MPG', color: Colors.error, icon: 'alert-circle-outline' },
            { label: 'City Driving', value: '28.7 MPG', color: Colors.primaryLight, icon: 'business-outline' },
            { label: 'Highway', value: '35.2 MPG', color: Colors.accent, icon: 'trail-sign-outline' },
          ].map((m, i) => (
            <View key={i} style={[s.mpgRow, i < 4 && s.mpgBorder]}>
              <View style={[s.mpgIcon, { backgroundColor: `${m.color}12` }]}>
                <Ionicons name={m.icon as any} size={16} color={m.color} />
              </View>
              <Text style={s.mpgLabel}>{m.label}</Text>
              <Text style={[s.mpgValue, { color: m.color }]}>{m.value}</Text>
            </View>
          ))}
        </View>

        {/* Tips */}
        <View style={s.tipsCard}>
          <Text style={s.cardTitle}>Fuel-Saving Tips</Text>
          {TIPS.map((t, i) => (
            <View key={i} style={s.tipRow}>
              <View style={[s.tipIcon, { backgroundColor: `${t.color}12` }]}>
                <Ionicons name={t.icon} size={18} color={t.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.tipTitle}>{t.title}</Text>
                <Text style={s.tipDesc}>{t.desc}</Text>
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
  heroRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  heroCard: { flex: 1, borderRadius: BorderRadius.xl, overflow: 'hidden', ...Shadows.neon },
  heroGrad: { padding: 20, alignItems: 'center', gap: 6 },
  heroVal: { color: '#fff', fontSize: FontSizes.xxxl, fontWeight: FontWeights.bold, letterSpacing: -0.5 },
  heroLabel: { color: 'rgba(255,255,255,0.7)', fontSize: FontSizes.xs, letterSpacing: 0.5 },
  chartCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.glassBorder, padding: 20, marginBottom: 20 },
  cardTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: FontWeights.bold, marginBottom: 20, letterSpacing: 0.3 },
  barChart: { flexDirection: 'row', justifyContent: 'space-around', height: 130 },
  barCol: { alignItems: 'center', flex: 1 },
  barTrack: { flex: 1, width: 20, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10, overflow: 'hidden', justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: 10 },
  barLabel: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: 8, fontWeight: FontWeights.medium },
  barValue: { color: Colors.textDim, fontSize: 10, marginTop: 2 },
  mpgCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.glassBorder, padding: 20, marginBottom: 20 },
  mpgRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  mpgBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  mpgIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  mpgLabel: { flex: 1, color: Colors.textSecondary, fontSize: FontSizes.sm, fontWeight: FontWeights.medium },
  mpgValue: { fontSize: FontSizes.md, fontWeight: FontWeights.bold },
  tipsCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.glassBorder, padding: 20 },
  tipRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  tipIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tipTitle: { color: Colors.text, fontSize: FontSizes.sm, fontWeight: FontWeights.semibold, letterSpacing: 0.2 },
  tipDesc: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: 3, lineHeight: 18 },
});

export default FuelDashboardScreen;

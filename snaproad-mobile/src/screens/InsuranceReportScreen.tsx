// SnapRoad Mobile - Insurance Report Screen
// Safe driving summary exportable for insurance discounts

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadows, FontSizes, FontWeights, BorderRadius } from '../utils/theme';

const METRICS = [
  { label: 'Safety Score', value: '94/100', grade: 'A', color: Colors.secondary },
  { label: 'Hard Braking Events', value: '2 / month', grade: 'A+', color: Colors.secondary },
  { label: 'Speeding Events', value: '4 / month', grade: 'B+', color: Colors.primaryLight },
  { label: 'Phone Usage While Driving', value: '< 1 min / trip', grade: 'A', color: Colors.secondary },
  { label: 'Night Driving %', value: '12%', grade: 'A', color: Colors.secondary },
  { label: 'Average Speed', value: '34 mph', grade: 'A', color: Colors.secondary },
  { label: 'Total Safe Miles', value: '1,247 mi', grade: '-', color: Colors.primaryLight },
];

export const InsuranceReportScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Insurance Report</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* Hero */}
        <View style={s.heroCard}>
          <LinearGradient colors={['#059669', '#10B981']} style={s.heroGrad}>
            <Ionicons name="shield-checkmark" size={40} color="#fff" />
            <Text style={s.heroScore}>94</Text>
            <Text style={s.heroLabel}>Overall Safety Rating</Text>
            <Text style={s.heroSub}>Top 8% of drivers in Ohio</Text>
          </LinearGradient>
        </View>

        {/* Discount Estimate */}
        <View style={s.discountCard}>
          <View style={s.discountRow}>
            <View>
              <Text style={s.discountTitle}>Estimated Discount</Text>
              <Text style={s.discountSub}>Based on your driving data</Text>
            </View>
            <Text style={s.discountVal}>$20-40<Text style={s.discountPer}>/mo</Text></Text>
          </View>
          <View style={s.discountProviders}>
            <Text style={s.providersLabel}>Compatible with:</Text>
            <View style={s.providerRow}>
              {['Progressive', 'State Farm', 'Allstate', 'GEICO'].map(p => (
                <View key={p} style={s.providerChip}><Text style={s.providerText}>{p}</Text></View>
              ))}
            </View>
          </View>
        </View>

        {/* Metrics */}
        <Text style={s.sectionTitle}>DRIVING METRICS</Text>
        <View style={s.metricsCard}>
          {METRICS.map((m, i) => (
            <View key={i} style={[s.metricRow, i < METRICS.length - 1 && s.metricBorder]}>
              <View style={{ flex: 1 }}>
                <Text style={s.metricLabel}>{m.label}</Text>
                <Text style={s.metricValue}>{m.value}</Text>
              </View>
              <View style={[s.gradeBadge, { backgroundColor: `${m.color}15` }]}>
                <Text style={[s.gradeText, { color: m.color }]}>{m.grade}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Export Buttons */}
        <Text style={s.sectionTitle}>SHARE WITH INSURER</Text>
        <TouchableOpacity style={s.exportBtn}>
          <LinearGradient colors={Colors.gradientPrimary} style={s.exportGrad}>
            <Ionicons name="share-outline" size={20} color="#fff" />
            <Text style={s.exportText}>Share Report via Email</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity style={s.exportBtnOutline}>
          <Ionicons name="download-outline" size={20} color={Colors.primaryLight} />
          <Text style={s.exportOutlineText}>Download PDF Report</Text>
        </TouchableOpacity>

        <Text style={s.disclaimer}>Report covers last 90 days of driving data. Safety scores are calculated using accelerometer data, GPS speed, and phone usage detection.</Text>
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
  // Hero
  heroCard: { marginBottom: 20 },
  heroGrad: { borderRadius: BorderRadius.xxl, padding: 28, alignItems: 'center', ...Shadows.lg },
  heroScore: { color: '#fff', fontSize: 64, fontWeight: FontWeights.black, marginTop: 8, letterSpacing: -2 },
  heroLabel: { color: 'rgba(255,255,255,0.9)', fontSize: FontSizes.md, fontWeight: FontWeights.semibold, marginTop: 4 },
  heroSub: { color: 'rgba(255,255,255,0.6)', fontSize: FontSizes.sm, marginTop: 6, letterSpacing: 0.3 },
  // Discount
  discountCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.glassBorder, padding: 20, marginBottom: 24 },
  discountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  discountTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: FontWeights.semibold },
  discountSub: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: 3 },
  discountVal: { color: Colors.secondary, fontSize: FontSizes.xxl, fontWeight: FontWeights.bold },
  discountPer: { color: Colors.textMuted, fontSize: FontSizes.sm, fontWeight: FontWeights.regular },
  discountProviders: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)', paddingTop: 14 },
  providersLabel: { color: Colors.textMuted, fontSize: FontSizes.xs, marginBottom: 8, letterSpacing: 0.3 },
  providerRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  providerChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.full, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: Colors.glassBorder },
  providerText: { color: Colors.textSecondary, fontSize: FontSizes.xs, fontWeight: FontWeights.medium },
  // Metrics
  sectionTitle: { color: Colors.textMuted, fontSize: FontSizes.xs, fontWeight: FontWeights.semibold, letterSpacing: 1.5, marginBottom: 12 },
  metricsCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.glassBorder, overflow: 'hidden', marginBottom: 24 },
  metricRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  metricBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  metricLabel: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  metricValue: { color: Colors.text, fontSize: FontSizes.md, fontWeight: FontWeights.semibold, marginTop: 3 },
  gradeBadge: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  gradeText: { fontSize: FontSizes.md, fontWeight: FontWeights.bold },
  // Export
  exportBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: 12, ...Shadows.neon },
  exportGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 54 },
  exportText: { color: '#fff', fontSize: FontSizes.md, fontWeight: FontWeights.semibold },
  exportBtnOutline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 54, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.glassBorder, marginBottom: 20 },
  exportOutlineText: { color: Colors.primaryLight, fontSize: FontSizes.md, fontWeight: FontWeights.medium },
  disclaimer: { color: Colors.textDim, fontSize: FontSizes.xs, lineHeight: 18, letterSpacing: 0.2 },
});

export default InsuranceReportScreen;

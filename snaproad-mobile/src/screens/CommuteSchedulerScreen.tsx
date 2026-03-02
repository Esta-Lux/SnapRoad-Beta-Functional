// SnapRoad Mobile - Commute Scheduler Screen
// Set recurring commutes with smart departure alerts

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadows, FontSizes, FontWeights, BorderRadius } from '../utils/theme';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const COMMUTES = [
  { id: 1, name: 'Morning Commute', from: 'Home', to: 'Work', time: '7:30 AM', days: [0,1,2,3,4], eta: '22 min', alerts: true },
  { id: 2, name: 'Evening Return', from: 'Work', to: 'Home', time: '5:15 PM', days: [0,1,2,3,4], eta: '28 min', alerts: true },
  { id: 3, name: 'Saturday Gym', from: 'Home', to: 'LA Fitness', time: '9:00 AM', days: [5], eta: '12 min', alerts: false },
];

const TODAY_PREVIEW = {
  route: 'Home → Work',
  bestTime: '7:15 AM',
  currentEta: '24 min',
  traffic: 'Moderate',
  weather: 'Clear, 42°F',
  hazards: 1,
};

export const CommuteSchedulerScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Commute</Text>
        <TouchableOpacity style={s.addBtn}>
          <Ionicons name="add" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* Morning Preview */}
        <View style={s.previewCard}>
          <LinearGradient colors={['#1D4ED8', '#2563EB']} style={s.previewGrad}>
            <View style={s.previewHeader}>
              <Ionicons name="sunny-outline" size={22} color="#fff" />
              <Text style={s.previewTitle}>Morning Preview</Text>
            </View>
            <Text style={s.previewRoute}>{TODAY_PREVIEW.route}</Text>
            <View style={s.previewStats}>
              <View style={s.previewStat}>
                <Text style={s.previewStatVal}>{TODAY_PREVIEW.bestTime}</Text>
                <Text style={s.previewStatLabel}>Best Departure</Text>
              </View>
              <View style={s.previewStatDiv} />
              <View style={s.previewStat}>
                <Text style={s.previewStatVal}>{TODAY_PREVIEW.currentEta}</Text>
                <Text style={s.previewStatLabel}>Current ETA</Text>
              </View>
            </View>
            <View style={s.previewMeta}>
              <View style={s.metaChip}><Ionicons name="car-outline" size={13} color="rgba(255,255,255,0.8)" /><Text style={s.metaText}>{TODAY_PREVIEW.traffic}</Text></View>
              <View style={s.metaChip}><Ionicons name="partly-sunny-outline" size={13} color="rgba(255,255,255,0.8)" /><Text style={s.metaText}>{TODAY_PREVIEW.weather}</Text></View>
              {TODAY_PREVIEW.hazards > 0 && <View style={[s.metaChip, { backgroundColor: 'rgba(239,68,68,0.2)' }]}><Ionicons name="warning-outline" size={13} color="#EF4444" /><Text style={[s.metaText, { color: '#EF4444' }]}>{TODAY_PREVIEW.hazards} hazard</Text></View>}
            </View>
          </LinearGradient>
        </View>

        {/* Commutes List */}
        <Text style={s.sectionTitle}>YOUR COMMUTES</Text>
        {COMMUTES.map(c => (
          <View key={c.id} style={s.commuteCard}>
            <View style={s.commuteHeader}>
              <Text style={s.commuteName}>{c.name}</Text>
              <TouchableOpacity style={[s.alertToggle, c.alerts && s.alertToggleOn]}>
                <Ionicons name={c.alerts ? 'notifications' : 'notifications-off-outline'} size={14} color={c.alerts ? '#fff' : Colors.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={s.commuteRoute}>
              <View style={s.routeDotStart} />
              <View style={s.routeLine} />
              <View style={s.routeDotEnd} />
              <View style={s.routeLabels}>
                <Text style={s.routeFrom}>{c.from}</Text>
                <Text style={s.routeTo}>{c.to}</Text>
              </View>
            </View>
            <View style={s.commuteFooter}>
              <View style={s.timeRow}>
                <Ionicons name="time-outline" size={14} color={Colors.textMuted} />
                <Text style={s.timeText}>{c.time}</Text>
                <Text style={s.etaText}>~{c.eta}</Text>
              </View>
              <View style={s.daysRow}>
                {DAYS.map((d, i) => (
                  <View key={i} style={[s.dayDot, c.days.includes(i) && s.dayDotActive]}>
                    <Text style={[s.dayText, c.days.includes(i) && s.dayTextActive]}>{d[0]}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        ))}

        {/* Add Commute */}
        <TouchableOpacity style={s.addCommuteBtn}>
          <Ionicons name="add-circle-outline" size={20} color={Colors.primaryLight} />
          <Text style={s.addCommuteText}>Add New Commute</Text>
        </TouchableOpacity>
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
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: `${Colors.primary}15`, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 16 },
  // Preview
  previewCard: { marginBottom: 24 },
  previewGrad: { borderRadius: BorderRadius.xxl, padding: 24, ...Shadows.neon },
  previewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  previewTitle: { color: 'rgba(255,255,255,0.8)', fontSize: FontSizes.sm, fontWeight: FontWeights.semibold, letterSpacing: 0.5 },
  previewRoute: { color: '#fff', fontSize: FontSizes.xl, fontWeight: FontWeights.bold, marginBottom: 16 },
  previewStats: { flexDirection: 'row', marginBottom: 16 },
  previewStat: { flex: 1, alignItems: 'center' },
  previewStatVal: { color: '#fff', fontSize: FontSizes.xxl, fontWeight: FontWeights.bold },
  previewStatLabel: { color: 'rgba(255,255,255,0.6)', fontSize: FontSizes.xs, marginTop: 4, letterSpacing: 0.5 },
  previewStatDiv: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)' },
  previewMeta: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: BorderRadius.full, backgroundColor: 'rgba(255,255,255,0.1)' },
  metaText: { color: 'rgba(255,255,255,0.8)', fontSize: FontSizes.xs, fontWeight: FontWeights.medium },
  // Commutes
  sectionTitle: { color: Colors.textMuted, fontSize: FontSizes.xs, fontWeight: FontWeights.semibold, letterSpacing: 1.5, marginBottom: 12 },
  commuteCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.glassBorder, padding: 18, marginBottom: 12 },
  commuteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  commuteName: { color: Colors.text, fontSize: FontSizes.md, fontWeight: FontWeights.semibold, letterSpacing: 0.2 },
  alertToggle: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  alertToggleOn: { backgroundColor: Colors.primary },
  commuteRoute: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14, paddingLeft: 4 },
  routeDotStart: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primaryLight },
  routeLine: { width: 24, height: 2, backgroundColor: Colors.glassBorder },
  routeDotEnd: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.secondary },
  routeLabels: { flexDirection: 'row', gap: 20, flex: 1 },
  routeFrom: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  routeTo: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  commuteFooter: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)', paddingTop: 14, gap: 10 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeText: { color: Colors.text, fontSize: FontSizes.sm, fontWeight: FontWeights.medium },
  etaText: { color: Colors.textMuted, fontSize: FontSizes.xs },
  daysRow: { flexDirection: 'row', gap: 6 },
  dayDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center' },
  dayDotActive: { backgroundColor: `${Colors.primary}20` },
  dayText: { color: Colors.textDim, fontSize: 10, fontWeight: FontWeights.semibold },
  dayTextActive: { color: Colors.primaryLight },
  addCommuteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.glassBorder, borderStyle: 'dashed' },
  addCommuteText: { color: Colors.primaryLight, fontSize: FontSizes.sm, fontWeight: FontWeights.medium },
});

export default CommuteSchedulerScreen;

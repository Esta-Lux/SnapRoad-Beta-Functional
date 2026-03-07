// SnapRoad Mobile - Premium Notification Settings
// Clean glass UI, consistent with design system

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSizes, FontWeights, BorderRadius } from '../utils/theme';

export const NotificationSettingsScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState({ trips: true, safety: true, offers: true, leaderboard: false, gems: true, system: true });
  const toggle = (k: keyof typeof settings) => setSettings(p => ({ ...p, [k]: !p[k] }));

  const items = [
    { key: 'trips' as const, icon: 'car-outline' as const, label: 'Trip Alerts', desc: 'Start/end trip notifications', color: Colors.primaryLight },
    { key: 'safety' as const, icon: 'shield-checkmark-outline' as const, label: 'Safety Tips', desc: 'AI driving suggestions', color: Colors.secondary },
    { key: 'offers' as const, icon: 'gift-outline' as const, label: 'Nearby Offers', desc: 'Deals near partner locations', color: '#F59E0B' },
    { key: 'leaderboard' as const, icon: 'trophy-outline' as const, label: 'Leaderboard', desc: 'Rank changes & challenges', color: Colors.accent },
    { key: 'gems' as const, icon: 'diamond-outline' as const, label: 'Gem Updates', desc: 'Earnings & redemptions', color: Colors.gold },
    { key: 'system' as const, icon: 'settings-outline' as const, label: 'System Updates', desc: 'App updates & maintenance', color: Colors.textSecondary },
  ];

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {items.map(it => (
          <View key={it.key} style={s.card}>
            <View style={[s.icon, { backgroundColor: `${it.color}12` }]}>
              <Ionicons name={it.icon} size={20} color={it.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>{it.label}</Text>
              <Text style={s.desc}>{it.desc}</Text>
            </View>
            <TouchableOpacity style={[s.toggle, settings[it.key] && s.toggleOn]} onPress={() => toggle(it.key)}>
              <View style={[s.dot, settings[it.key] && s.dotOn]} />
            </TouchableOpacity>
          </View>
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
  scroll: { paddingHorizontal: 16 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.glassBorder, padding: 18, marginBottom: 12 },
  icon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  label: { color: Colors.text, fontSize: FontSizes.md, fontWeight: FontWeights.medium, letterSpacing: 0.2 },
  desc: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: 3, letterSpacing: 0.2 },
  toggle: { width: 44, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', paddingHorizontal: 2 },
  toggleOn: { backgroundColor: Colors.primary },
  dot: { width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotOn: { backgroundColor: '#fff', alignSelf: 'flex-end' },
});

export default NotificationSettingsScreen;

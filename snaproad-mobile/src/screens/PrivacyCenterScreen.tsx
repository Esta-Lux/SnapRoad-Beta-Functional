// SnapRoad Mobile - Premium Privacy Center
// Clean glass UI, neon blue accents

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadows, FontSizes, FontWeights, BorderRadius } from '../utils/theme';

export const PrivacyCenterScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState({ incognito: false, shareLogs: true, telemetry: true, localCache: true });
  const toggle = (k: keyof typeof settings) => setSettings(p => ({ ...p, [k]: !p[k] }));

  const items = [
    { key: 'incognito' as const, icon: 'eye-off-outline' as const, label: 'Incognito Mode', desc: 'Hide from leaderboard', color: Colors.accent },
    { key: 'shareLogs' as const, icon: 'share-outline' as const, label: 'Share Drive Logs', desc: 'Anonymous safety data', color: Colors.primaryLight },
    { key: 'telemetry' as const, icon: 'analytics-outline' as const, label: 'Telemetry', desc: 'Help improve SnapRoad', color: Colors.secondary },
    { key: 'localCache' as const, icon: 'folder-outline' as const, label: 'Local Cache', desc: 'Store data on device', color: '#F59E0B' },
  ];

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Privacy Center</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <LinearGradient colors={['#1D4ED8', '#2563EB']} style={s.banner}>
          <Ionicons name="shield-checkmark" size={36} color="#fff" />
          <Text style={s.bannerTitle}>Your Data is Protected</Text>
          <Text style={s.bannerSub}>End-to-end encryption. We never sell your data.</Text>
        </LinearGradient>

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

        <Text style={s.sectionTitle}>DATA MANAGEMENT</Text>
        <View style={s.dataCard}>
          <TouchableOpacity style={s.dataRow}>
            <Ionicons name="download-outline" size={20} color={Colors.primaryLight} />
            <Text style={s.dataLabel}>Download My Data</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textDim} />
          </TouchableOpacity>
          <View style={s.dataDiv} />
          <TouchableOpacity style={s.dataRow}>
            <Ionicons name="trash-outline" size={20} color={Colors.error} />
            <Text style={[s.dataLabel, { color: Colors.error }]}>Delete Account</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textDim} />
          </TouchableOpacity>
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
  banner: { borderRadius: BorderRadius.xxl, padding: 28, alignItems: 'center', marginBottom: 20, ...Shadows.neon },
  bannerTitle: { color: '#fff', fontSize: FontSizes.xl, fontWeight: FontWeights.bold, marginTop: 12 },
  bannerSub: { color: 'rgba(255,255,255,0.7)', fontSize: FontSizes.sm, textAlign: 'center', marginTop: 8, letterSpacing: 0.2 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.glassBorder, padding: 18, marginBottom: 12 },
  icon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  label: { color: Colors.text, fontSize: FontSizes.md, fontWeight: FontWeights.medium, letterSpacing: 0.2 },
  desc: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: 3, letterSpacing: 0.2 },
  toggle: { width: 44, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', paddingHorizontal: 2 },
  toggleOn: { backgroundColor: Colors.primary },
  dot: { width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotOn: { backgroundColor: '#fff', alignSelf: 'flex-end' },
  sectionTitle: { color: Colors.textMuted, fontSize: FontSizes.xs, fontWeight: FontWeights.semibold, letterSpacing: 1.5, marginTop: 12, marginBottom: 12 },
  dataCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.glassBorder, overflow: 'hidden' },
  dataRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18 },
  dataLabel: { flex: 1, color: Colors.text, fontSize: FontSizes.md, fontWeight: FontWeights.medium },
  dataDiv: { height: 1, backgroundColor: 'rgba(255,255,255,0.04)', marginLeft: 50 },
});

export default PrivacyCenterScreen;

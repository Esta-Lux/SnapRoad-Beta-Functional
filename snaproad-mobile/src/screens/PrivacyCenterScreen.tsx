// SnapRoad Mobile - Privacy Center Screen
// Aligned with Figma UI: /app/frontend/src/components/figma-ui/mobile/PrivacyCenter.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface PrivacyCenterScreenProps {
  navigation?: any;
  onNavigate?: (screen: string) => void;
}

export const PrivacyCenterScreen: React.FC<PrivacyCenterScreenProps> = ({ navigation, onNavigate }) => {
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState({
    incognito: false,
    shareLogs: true,
    telemetry: true,
    localCache: true,
  });

  const toggle = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleBack = () => {
    if (onNavigate) onNavigate('profile');
    else if (navigation) navigation.goBack();
  };

  const privacyItems = [
    { key: 'incognito' as const, icon: 'eye-off', label: 'Incognito Mode', desc: 'Hide your activity from leaderboard', color: '#9D4EDD' },
    { key: 'shareLogs' as const, icon: 'share', label: 'Share Drive Logs', desc: 'Share anonymous data to improve safety', color: '#0084FF' },
    { key: 'telemetry' as const, icon: 'analytics', label: 'Telemetry', desc: 'Help us improve SnapRoad', color: '#00DFA2' },
    { key: 'localCache' as const, icon: 'folder', label: 'Local Cache', desc: 'Store trip data on device', color: '#FFC24C' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Center</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Protection Banner */}
        <LinearGradient
          colors={['#0084FF', '#004A93']}
          style={styles.banner}
        >
          <Ionicons name="shield-checkmark" size={40} color="#fff" />
          <Text style={styles.bannerTitle}>Your Data is Protected</Text>
          <Text style={styles.bannerSub}>
            SnapRoad uses end-to-end encryption and never sells your data
          </Text>
        </LinearGradient>

        {/* Privacy Settings */}
        {privacyItems.map((item) => (
          <View key={item.key} style={styles.settingCard}>
            <View style={[styles.settingIcon, { backgroundColor: `${item.color}15` }]}>
              <Ionicons name={item.icon as any} size={22} color={item.color} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>{item.label}</Text>
              <Text style={styles.settingDesc}>{item.desc}</Text>
            </View>
            <TouchableOpacity
              style={[styles.toggleTrack, settings[item.key] && styles.toggleTrackActive]}
              onPress={() => toggle(item.key)}
            >
              <View style={[styles.toggleThumb, settings[item.key] && styles.toggleThumbActive]} />
            </TouchableOpacity>
          </View>
        ))}

        {/* Data Management */}
        <Text style={styles.sectionTitle}>Data Management</Text>
        <View style={styles.dataCard}>
          <TouchableOpacity style={styles.dataItem}>
            <Ionicons name="download" size={20} color="#0084FF" />
            <Text style={styles.dataLabel}>Download My Data</Text>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.3)" />
          </TouchableOpacity>
          <View style={styles.dataDivider} />
          <TouchableOpacity style={styles.dataItem}>
            <Ionicons name="trash" size={20} color="#FF5A5A" />
            <Text style={[styles.dataLabel, { color: '#FF5A5A' }]}>Delete Account</Text>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.3)" />
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E16' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: { padding: 8 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  scrollContent: { paddingHorizontal: 16 },
  // Banner
  banner: { borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 20 },
  bannerTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginTop: 12 },
  bannerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 14, textAlign: 'center', marginTop: 8 },
  // Settings
  settingCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#1A1F2E', borderRadius: 16, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)', padding: 16, marginBottom: 12,
  },
  settingIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  settingInfo: { flex: 1 },
  settingLabel: { color: '#fff', fontSize: 15, fontWeight: '500' },
  settingDesc: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 },
  toggleTrack: {
    width: 44, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', paddingHorizontal: 2,
  },
  toggleTrackActive: { backgroundColor: '#0084FF' },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.5)' },
  toggleThumbActive: { backgroundColor: '#fff', alignSelf: 'flex-end' },
  // Data management
  sectionTitle: { color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: '500', marginTop: 12, marginBottom: 12 },
  dataCard: {
    backgroundColor: '#1A1F2E', borderRadius: 16, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden',
  },
  dataItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  dataLabel: { flex: 1, color: '#fff', fontSize: 15 },
  dataDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginLeft: 48 },
});

export default PrivacyCenterScreen;

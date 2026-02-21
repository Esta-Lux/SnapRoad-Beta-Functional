// SnapRoad Mobile - Notification Settings Screen
// Aligned with Figma UI: /app/frontend/src/components/figma-ui/mobile/NotificationSettings.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface NotificationSettingsScreenProps {
  navigation?: any;
  onNavigate?: (screen: string) => void;
}

export const NotificationSettingsScreen: React.FC<NotificationSettingsScreenProps> = ({ navigation, onNavigate }) => {
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState({
    tripAlerts: true,
    safetyTips: true,
    offers: true,
    leaderboard: false,
    gemUpdates: true,
    systemUpdates: true,
  });

  const toggle = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleBack = () => {
    if (onNavigate) onNavigate('profile');
    else if (navigation) navigation.goBack();
  };

  const items = [
    { key: 'tripAlerts' as const, icon: 'car', label: 'Trip Alerts', desc: 'Start/end trip notifications', color: '#0084FF' },
    { key: 'safetyTips' as const, icon: 'shield-checkmark', label: 'Safety Tips', desc: 'AI-powered driving suggestions', color: '#00DFA2' },
    { key: 'offers' as const, icon: 'gift', label: 'Nearby Offers', desc: 'Deals when you drive near partners', color: '#FFB800' },
    { key: 'leaderboard' as const, icon: 'trophy', label: 'Leaderboard', desc: 'Rank changes and challenges', color: '#9D4EDD' },
    { key: 'gemUpdates' as const, icon: 'diamond', label: 'Gem Updates', desc: 'Earnings and redemptions', color: '#FF5A5A' },
    { key: 'systemUpdates' as const, icon: 'settings', label: 'System Updates', desc: 'App updates and maintenance', color: 'rgba(255,255,255,0.5)' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {items.map((item) => (
          <View key={item.key} style={styles.settingCard}>
            <View style={[styles.settingIcon, { backgroundColor: `${item.color}15` }]}>
              <Ionicons name={item.icon as any} size={20} color={item.color} />
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
  settingCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#1A1F2E', borderRadius: 16, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)', padding: 16, marginBottom: 12,
  },
  settingIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
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
});

export default NotificationSettingsScreen;

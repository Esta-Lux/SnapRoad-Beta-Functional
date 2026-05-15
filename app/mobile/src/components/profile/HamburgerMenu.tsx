import React from 'react';
import {
  Alert,
  InteractionManager,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Constants from 'expo-constants';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import type { AppActionAvailability } from '../../navigation/appActionContract';
import { APP_ACTION_AUDIT } from '../../navigation/appActionContract';

const DEFAULT_SHARE_URL =
  (Constants.expoConfig?.extra as { snaproadSiteUrl?: string } | undefined)?.snaproadSiteUrl ?? 'https://snaproad.app';

/** Let the menu Modal dismiss before opening another modal, navigating, or the system share sheet (avoids iOS freezes). */
function runAfterMenuClose(onClose: () => void, action: () => void, delayMs = 220) {
  onClose();
  InteractionManager.runAfterInteractions(() => {
    setTimeout(action, delayMs);
  });
}

export type HamburgerMenuTarget =
  | 'Map'
  | 'Friends'
  | 'Offers'
  | 'CommuteAlerts'
  | 'Wallet'
  | 'Profile'
  | 'Help'
  | 'Family';

interface Props {
  visible: boolean;
  onClose: () => void;
  isLight?: boolean;
  onNavigate: (screen: HamburgerMenuTarget) => void;
  onOfflineMaps?: () => void;
}

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  action: () => void;
  accent?: string;
  availability?: AppActionAvailability;
  badge?: string;
}

export default function HamburgerMenu({ visible, onClose, isLight, onNavigate, onOfflineMaps }: Props) {
  const cardBg = isLight ? '#ffffff' : '#1e293b';
  const text = isLight ? '#1e293b' : '#f8fafc';
  const sub = isLight ? '#64748b' : '#94a3b8';
  const border = isLight ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.08)';

  const actionMeta = (id: string) => APP_ACTION_AUDIT.find((a) => a.id === id);

  const items: MenuItem[] = [
    {
      icon: actionMeta('drive_map')?.icon ?? 'map-outline',
      label: actionMeta('drive_map')?.label ?? 'Drive',
      description: actionMeta('drive_map')?.description ?? 'Open the live map.',
      accent: '#38BDF8',
      availability: actionMeta('drive_map')?.availability,
      action: () => runAfterMenuClose(onClose, () => onNavigate('Map')),
    },
    {
      icon: 'cloud-download-outline',
      label: 'Offline maps',
      description: 'Download this map area for use without a data connection.',
      accent: '#0EA5E9',
      action: () =>
        onOfflineMaps
          ? runAfterMenuClose(onClose, onOfflineMaps)
          : runAfterMenuClose(onClose, () => {}),
    },
    {
      icon: actionMeta('social_dashboard')?.icon ?? 'people-outline',
      label: actionMeta('social_dashboard')?.label ?? 'Friends',
      description: actionMeta('social_dashboard')?.description ?? 'Preview trusted live sharing and meetups.',
      accent: '#0EA5E9',
      badge: 'Soon',
      availability: actionMeta('social_dashboard')?.availability,
      action: () => runAfterMenuClose(onClose, () => onNavigate('Friends')),
    },
    {
      icon: actionMeta('family')?.icon ?? 'shield-checkmark-outline',
      label: actionMeta('family')?.label ?? 'Family Safety',
      description: actionMeta('family')?.description ?? 'Preview family zones, teen insights, and SOS.',
      accent: '#2563EB',
      badge: 'Soon',
      availability: actionMeta('family')?.availability,
      action: () => runAfterMenuClose(onClose, () => onNavigate('Family')),
    },
    {
      icon: actionMeta('commute_alerts')?.icon ?? 'navigate-outline',
      label: actionMeta('commute_alerts')?.label ?? 'Commute Alerts',
      description: actionMeta('commute_alerts')?.description ?? 'Start, destination, traffic scans, and push alerts.',
      accent: '#10B981',
      availability: actionMeta('commute_alerts')?.availability,
      action: () => runAfterMenuClose(onClose, () => onNavigate('CommuteAlerts')),
    },
    {
      icon: actionMeta('offers_hub')?.icon ?? 'pricetag-outline',
      label: actionMeta('offers_hub')?.label ?? 'Offers',
      description: actionMeta('offers_hub')?.description ?? 'Local partners and online deals.',
      accent: '#F472B6',
      availability: actionMeta('offers_hub')?.availability,
      action: () => runAfterMenuClose(onClose, () => onNavigate('Offers')),
    },
    {
      icon: actionMeta('wallet')?.icon ?? 'wallet-outline',
      label: actionMeta('wallet')?.label ?? 'Wallet',
      description: actionMeta('wallet')?.description ?? 'Gems and redemptions.',
      accent: '#14B8A6',
      availability: actionMeta('wallet')?.availability,
      action: () => runAfterMenuClose(onClose, () => onNavigate('Wallet')),
    },
    {
      icon: actionMeta('support')?.icon ?? 'help-circle-outline',
      label: actionMeta('support')?.label ?? 'Help & Support',
      description: actionMeta('support')?.description ?? 'Support and concerns.',
      accent: '#64748B',
      availability: actionMeta('support')?.availability,
      action: () => runAfterMenuClose(onClose, () => onNavigate('Help')),
    },
    {
      icon: 'share-social-outline',
      label: 'Share SnapRoad',
      description: 'Invite someone to save time and fuel.',
      accent: '#0EA5E9',
      availability: 'works',
      action: () => {
        runAfterMenuClose(
          onClose,
          () => {
            void (async () => {
              try {
                const msg =
                  'Check out SnapRoad — the AI driving companion for safer, more rewarding drives.';
                const sharePayload =
                  Platform.OS === 'ios'
                    ? { title: 'SnapRoad', message: msg, url: DEFAULT_SHARE_URL }
                    : { title: 'SnapRoad', message: `${msg} ${DEFAULT_SHARE_URL}` };
                await Share.share(sharePayload);
              } catch {
                Alert.alert('Share', 'Could not open the share sheet. Try again in a moment.');
              }
            })();
          },
          320,
        );
      },
    },
    {
      icon: 'information-circle-outline',
      label: 'About',
      description: 'Version and product details.',
      availability: 'works',
      action: () => {
        runAfterMenuClose(onClose, () => {
          Alert.alert('SnapRoad', 'Version 1.0.0\n\n\u00A9 2025 SnapRoad Inc.\nAll rights reserved.');
        });
      },
    },
  ];

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <Animated.View
          entering={SlideInDown.duration(280).springify()}
          exiting={SlideOutDown.duration(220)}
          style={[styles.sheet, { backgroundColor: cardBg, borderColor: border }]}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={[styles.headerIcon, { backgroundColor: isLight ? 'rgba(15,23,42,0.06)' : 'rgba(255,255,255,0.08)' }]}>
              <Ionicons name="grid-outline" size={22} color={text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: text }]}>SnapRoad command center</Text>
              <Text style={[styles.subtitle, { color: sub }]}>Core actions, cleanly wired.</Text>
            </View>
          </View>

          <ScrollView style={styles.menuScroll} showsVerticalScrollIndicator={false}>
            {items.map((item) => (
              <TouchableOpacity
                key={item.label}
                style={[styles.menuItem, { borderBottomColor: border }]}
                onPress={item.action}
                activeOpacity={0.7}
              >
                <View style={[styles.iconWrap, item.accent ? { backgroundColor: `${item.accent}18` } : undefined]}>
                  <Ionicons name={item.icon} size={22} color={item.accent || '#3B82F6'} />
                </View>
                <View style={styles.menuText}>
                  <View style={styles.labelRow}>
                    <Text style={[styles.menuLabel, { color: text }]}>{item.label}</Text>
                    {!!item.badge && (
                      <View style={[styles.badge, item.availability === 'coming_soon' ? styles.soonBadge : styles.gatedBadge]}>
                        <Text style={styles.badgeText}>{item.badge}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.menuDescription, { color: sub }]} numberOfLines={2}>{item.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={sub} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  menuScroll: { maxHeight: 620 },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: 40,
    paddingHorizontal: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#444',
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 14,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 18, fontWeight: '900' },
  subtitle: { fontSize: 12, lineHeight: 16, marginTop: 2, fontWeight: '600' },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 62,
    paddingHorizontal: 4,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(59,130,246,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '800',
  },
  menuText: { flex: 1, minWidth: 0 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  menuDescription: { fontSize: 11, lineHeight: 15, marginTop: 2, fontWeight: '600' },
  badge: { borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
  gatedBadge: { backgroundColor: 'rgba(217,119,6,0.18)' },
  soonBadge: { backgroundColor: 'rgba(100,116,139,0.2)' },
  badgeText: { color: '#F59E0B', fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
});

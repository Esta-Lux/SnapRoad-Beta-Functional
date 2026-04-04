import React from 'react';
import {
  Alert,
  InteractionManager,
  Modal,
  Platform,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Constants from 'expo-constants';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

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
  | 'Social'
  | 'Convoy'
  | 'PlaceAlerts'
  | 'Profile'
  | 'Help';

interface Props {
  visible: boolean;
  onClose: () => void;
  isLight?: boolean;
  onNavigate: (screen: HamburgerMenuTarget) => void;
}

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  action: () => void;
  accent?: string;
}

export default function HamburgerMenu({ visible, onClose, isLight, onNavigate }: Props) {
  const cardBg = isLight ? '#ffffff' : '#1e293b';
  const text = isLight ? '#1e293b' : '#f8fafc';
  const sub = isLight ? '#64748b' : '#94a3b8';

  const items: MenuItem[] = [
    {
      icon: 'people-outline',
      label: 'Social',
      accent: '#8B5CF6',
      action: () => runAfterMenuClose(onClose, () => onNavigate('Social')),
    },
    {
      icon: 'car-sport-outline',
      label: 'Convoy',
      accent: '#F59E0B',
      action: () => runAfterMenuClose(onClose, () => onNavigate('Convoy')),
    },
    {
      icon: 'notifications-outline',
      label: 'Place alerts',
      accent: '#3B82F6',
      action: () => runAfterMenuClose(onClose, () => onNavigate('PlaceAlerts')),
    },
    {
      icon: 'share-social-outline',
      label: 'Share SnapRoad',
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
          style={[styles.sheet, { backgroundColor: cardBg }]}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.handle} />

          {items.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.menuItem}
              onPress={item.action}
              activeOpacity={0.7}
            >
              <View style={[styles.iconWrap, item.accent ? { backgroundColor: `${item.accent}18` } : undefined]}>
                <Ionicons name={item.icon} size={22} color={item.accent || '#3B82F6'} />
              </View>
              <Text style={[styles.menuLabel, { color: text }]}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={sub} />
            </TouchableOpacity>
          ))}
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
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: 40,
    paddingHorizontal: 16,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#444',
    alignSelf: 'center',
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(148,163,184,0.15)',
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
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
});

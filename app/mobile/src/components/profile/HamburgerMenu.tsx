import React from 'react';
import {
  Alert,
  Modal,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  visible: boolean;
  onClose: () => void;
  isLight?: boolean;
  onNavigate: (screen: string) => void;
}

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  action: () => void;
}

export default function HamburgerMenu({ visible, onClose, isLight, onNavigate }: Props) {
  const cardBg = isLight ? '#ffffff' : '#1e293b';
  const text = isLight ? '#1e293b' : '#f8fafc';
  const sub = isLight ? '#64748b' : '#94a3b8';

  const items: MenuItem[] = [
    {
      icon: 'settings-outline',
      label: 'Settings',
      action: () => { onClose(); onNavigate('Profile'); },
    },
    {
      icon: 'help-circle-outline',
      label: 'Help & Support',
      action: () => { onClose(); onNavigate('Help'); },
    },
    {
      icon: 'analytics-outline',
      label: 'Trip Analytics',
      action: () => { onClose(); onNavigate('TripAnalytics'); },
    },
    {
      icon: 'time-outline',
      label: 'Route History',
      action: () => { onClose(); onNavigate('RouteHistory'); },
    },
    {
      icon: 'share-social-outline',
      label: 'Share SnapRoad',
      action: () => {
        Share.share({
          message:
            'Check out SnapRoad — the AI driving companion that makes every trip safer and more rewarding! https://snaproad.app',
        }).catch(() => {});
      },
    },
    {
      icon: 'information-circle-outline',
      label: 'About',
      action: () => {
        Alert.alert('SnapRoad', 'Version 1.0.0\n\n© 2025 SnapRoad Inc.\nAll rights reserved.');
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
              <View style={styles.iconWrap}>
                <Ionicons name={item.icon} size={22} color="#3B82F6" />
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

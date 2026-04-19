import React, { type ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';

interface Props {
  children: ReactNode;
  featureName?: string;
  onUpgrade?: () => void;
}

export default function PremiumGate({ children, featureName, onUpgrade }: Props) {
  const { colors, isLight } = useTheme();
  const { user } = useAuth();

  if (user?.isPremium) {
    return <>{children}</>;
  }

  return (
    <View style={styles.container}>
      <View style={[styles.overlay, { backgroundColor: isLight ? 'rgba(255,255,255,0.85)' : 'rgba(15,23,42,0.85)' }]}>
        <View style={[styles.lockCircle, { backgroundColor: isLight ? '#EFF6FF' : 'rgba(59,130,246,0.15)' }]}>
          <Ionicons name="lock-closed" size={28} color="#3B82F6" />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Premium Feature</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {featureName ? `${featureName} is` : 'This feature is'} available with SnapRoad Premium
        </Text>
        <TouchableOpacity
          style={styles.upgradeBtn}
          onPress={onUpgrade}
          activeOpacity={0.85}
        >
          <Ionicons name="diamond" size={16} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.upgradeBtnText}>Upgrade to Premium</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'relative', minHeight: 120 },
  overlay: {
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 4 },
    }),
  },
  lockCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3, marginBottom: 6 },
  subtitle: { fontSize: 14, fontWeight: '500', textAlign: 'center', lineHeight: 20, marginBottom: 18, maxWidth: 260 },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
    ...Platform.select({
      ios: { shadowColor: '#3B82F6', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 6 },
    }),
  },
  upgradeBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

import React from 'react';
import { View, Text, Platform, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  colors: {
    rewardsGradientStart: string;
    rewardsGradientEnd: string;
  };
  gems: number;
  level: number;
  multiplier: string;
  miles: string | number;
};

function formatGems(n: number): string {
  if (!Number.isFinite(n)) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(Math.round(n));
}

export default function RewardsHeader({ colors, gems, level, multiplier, miles }: Props) {
  const glass = 'rgba(255,255,255,0.14)';
  const glassBorder = 'rgba(255,255,255,0.22)';

  const statPill = (icon: keyof typeof Ionicons.glyphMap, value: string, label: string, accent?: boolean) => (
    <View
      style={[
        styles.statPill,
        {
          backgroundColor: glass,
          borderColor: glassBorder,
          ...(accent ? styles.statPillAccent : null),
        },
      ]}
    >
      <Ionicons name={icon} size={17} color={accent ? '#FDE68A' : '#fff'} style={{ marginBottom: 2 }} />
      <Text style={[styles.statValue, accent && styles.statValueAccent]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );

  return (
    <LinearGradient
      colors={[colors.rewardsGradientStart, colors.rewardsGradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.wrap}
    >
      <View style={styles.topBadgeRow}>
        <View style={styles.eyebrowPill}>
          <Ionicons name="sparkles" size={12} color="rgba(255,255,255,0.95)" />
          <Text style={styles.eyebrowText}>REWARDS CENTER</Text>
        </View>
      </View>

      <View style={styles.heroGemRow}>
        <LinearGradient
          colors={['rgba(255,255,255,0.28)', 'rgba(255,255,255,0.08)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroGemDisc}
        >
          <Ionicons name="diamond" size={26} color="#FDE68A" />
        </LinearGradient>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={styles.gemNumber}>{formatGems(gems)}</Text>
          <Text style={styles.gemCaption}>gems balance</Text>
        </View>
      </View>

      <View style={styles.grid}>
        {statPill('star', `Lvl ${level}`, 'Level')}
        {statPill('flash-outline', multiplier, 'Multiplier', true)}
        {statPill('ribbon-outline', String(miles), 'Miles')}
        {statPill('gift-outline', 'Loot', 'Offers')}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginTop: 4,
    borderRadius: 22,
    paddingTop: 18,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    ...Platform.select({
      ios: {
        shadowColor: '#4c1d95',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.35,
        shadowRadius: 20,
      },
      android: { elevation: 10 },
      default: {},
    }),
  },
  topBadgeRow: { alignItems: 'center', marginBottom: 12 },
  eyebrowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  eyebrowText: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  heroGemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroGemDisc: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  gemNumber: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  gemCaption: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  statPill: {
    width: '47%' as const,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  statPillAccent: {
    backgroundColor: 'rgba(250,204,21,0.18)',
    borderColor: 'rgba(253,224,71,0.45)',
  },
  statValue: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },
  statValueAccent: { color: '#FEF9C3' },
  statLabel: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginTop: 2,
  },
});

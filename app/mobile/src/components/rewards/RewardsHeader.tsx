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
  multiplier: string;
};

function formatGems(n: number): string {
  if (!Number.isFinite(n)) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(Math.round(n));
}

/** Gem wallet hero: balance, multiplier, and ledger context line. */
export default function RewardsHeader({ colors, gems, multiplier }: Props) {
  const glass = 'rgba(255,255,255,0.1)';
  const glassBorder = 'rgba(255,255,255,0.18)';

  return (
    <LinearGradient
      colors={['#111827', '#1E293B']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.wrap}
    >
      <View style={styles.topBadgeRow}>
        <View style={styles.eyebrowPill}>
          <Ionicons name="wallet-outline" size={12} color="rgba(255,255,255,0.95)" />
          <Text style={styles.eyebrowText}>WALLET</Text>
        </View>
      </View>

      <Text style={styles.tagline}>Savings cockpit for gems, redemptions, fuel-minded offers, and every reward you earn on the road.</Text>

      <View style={styles.heroGemRow}>
        <LinearGradient
          colors={['rgba(255,255,255,0.28)', 'rgba(255,255,255,0.08)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroGemDisc}
        >
          <Ionicons name="diamond" size={26} color="#C7D2FE" />
        </LinearGradient>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={styles.gemNumber}>{formatGems(gems)}</Text>
          <Text style={styles.gemCaption}>available gems</Text>
        </View>
      </View>

      <View style={styles.pillRow}>
        <View style={[styles.statPill, { backgroundColor: glass, borderColor: glassBorder }]}>
          <Ionicons name="flash-outline" size={17} color="#C7D2FE" style={{ marginBottom: 2 }} />
          <Text style={[styles.statValue, styles.statValueAccent]} numberOfLines={1}>
            {multiplier}
          </Text>
          <Text style={styles.statLabel} numberOfLines={1}>
            Gem multiplier
          </Text>
        </View>
        <View style={[styles.statPill, { backgroundColor: glass, borderColor: glassBorder }]}>
          <Ionicons name="leaf-outline" size={17} color="#A7F3D0" style={{ marginBottom: 2 }} />
          <Text style={styles.statValue} numberOfLines={1}>
            Save
          </Text>
          <Text style={styles.statLabel} numberOfLines={1}>
            Time + fuel
          </Text>
        </View>
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
        shadowColor: '#0A2A5E',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.35,
        shadowRadius: 20,
      },
      android: { elevation: 10 },
      default: {},
    }),
  },
  topBadgeRow: { alignItems: 'center', marginBottom: 8 },
  tagline: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 14,
    paddingHorizontal: 8,
  },
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
    marginBottom: 14,
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
  pillRow: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  statPill: {
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    minWidth: 132,
  },
  statValue: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },
  statValueAccent: { color: '#E0E7FF' },
  statLabel: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginTop: 2,
  },
});

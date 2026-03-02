// SnapRoad Mobile - Premium Gems & Rewards
// Neon blue, glass cards, fluid transitions

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadows, FontSizes, FontWeights, BorderRadius } from '../utils/theme';

const OFFERS = [
  { id: 1, name: 'Blue Bottle Coffee', discount: '15% off any drink', gems: 50, expiry: '3d' },
  { id: 2, name: 'Auto Spa Pro', discount: 'Free premium wash', gems: 150, expiry: '5d' },
  { id: 3, name: 'Gas Plus', discount: '$0.15/gal off', gems: 75, expiry: '2d' },
];

const CHALLENGES = [
  { id: 1, name: 'Safe Driver Week', desc: 'No harsh braking for 7 days', reward: 200, progress: 65 },
  { id: 2, name: 'Early Bird', desc: 'Complete 5 morning trips', reward: 100, progress: 40 },
  { id: 3, name: 'Eco Warrior', desc: 'Maintain 30+ MPG average', reward: 150, progress: 80 },
];

const BADGES = [
  { id: 1, name: 'First Trip', icon: 'car-outline' as const, earned: true },
  { id: 2, name: 'Road Warrior', icon: 'trophy-outline' as const, earned: true },
  { id: 3, name: 'Safety Star', icon: 'star-outline' as const, earned: false },
  { id: 4, name: 'Night Owl', icon: 'moon-outline' as const, earned: true },
  { id: 5, name: 'Eco Driver', icon: 'leaf-outline' as const, earned: false },
  { id: 6, name: 'Speed King', icon: 'flash-outline' as const, earned: true },
];

export const GemsScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<'offers'|'challenges'|'badges'>('offers');

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>Gems & Rewards</Text>
          <View style={s.gemBadge}>
            <Ionicons name="diamond" size={16} color={Colors.accent} />
            <Text style={s.gemBadgeText}>2,450</Text>
          </View>
        </View>

        {/* Balance Hero */}
        <View style={s.heroWrap}>
          <LinearGradient colors={['#7C3AED', '#2563EB']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.heroCard}>
            <View style={s.heroGlow} />
            <Ionicons name="diamond" size={36} color="rgba(255,255,255,0.9)" />
            <Text style={s.heroAmount}>2,450</Text>
            <Text style={s.heroSub}>Total Gems Earned</Text>
            <View style={s.heroStats}>
              <View style={s.heroStat}>
                <Text style={s.heroStatVal}>150</Text>
                <Text style={s.heroStatLabel}>This Week</Text>
              </View>
              <View style={s.heroStatDiv} />
              <View style={s.heroStat}>
                <Text style={s.heroStatVal}>450</Text>
                <Text style={s.heroStatLabel}>Redeemed</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Tabs */}
        <View style={s.tabs}>
          {(['offers','challenges','badges'] as const).map(t => (
            <TouchableOpacity key={t} style={[s.tab, tab===t && s.tabActive]} onPress={() => setTab(t)}>
              <Text style={[s.tabText, tab===t && s.tabTextActive]}>{t.charAt(0).toUpperCase()+t.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Offers */}
        {tab === 'offers' && OFFERS.map(o => (
          <View key={o.id} style={s.offerCard}>
            <View style={s.offerBody}>
              <Text style={s.offerName}>{o.name}</Text>
              <Text style={s.offerDisc}>{o.discount}</Text>
            </View>
            <View style={s.offerRight}>
              <View style={s.offerGemRow}>
                <Ionicons name="diamond" size={14} color={Colors.accent} />
                <Text style={s.offerGemVal}>{o.gems}</Text>
              </View>
              <Text style={s.offerExpiry}>{o.expiry} left</Text>
            </View>
            <TouchableOpacity style={s.redeemBtn}>
              <LinearGradient colors={Colors.gradientPrimary} style={s.redeemGrad}>
                <Text style={s.redeemText}>Redeem</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ))}

        {/* Challenges */}
        {tab === 'challenges' && CHALLENGES.map(c => (
          <View key={c.id} style={s.challengeCard}>
            <View style={s.challengeHead}>
              <Text style={s.challengeName}>{c.name}</Text>
              <View style={s.challengeReward}>
                <Ionicons name="diamond-outline" size={13} color={Colors.accent} />
                <Text style={s.challengeRewardVal}>{c.reward}</Text>
              </View>
            </View>
            <Text style={s.challengeDesc}>{c.desc}</Text>
            <View style={s.progressTrack}>
              <LinearGradient colors={Colors.gradientPrimary} style={[s.progressFill, { width: `${c.progress}%` }]} />
            </View>
            <Text style={s.progressLabel}>{c.progress}% complete</Text>
          </View>
        ))}

        {/* Badges */}
        {tab === 'badges' && (
          <View style={s.badgeGrid}>
            {BADGES.map(b => (
              <View key={b.id} style={[s.badgeCard, !b.earned && s.badgeLocked]}>
                <View style={[s.badgeIconBox, b.earned && { backgroundColor: `${Colors.gold}15` }]}>
                  <Ionicons name={b.icon} size={28} color={b.earned ? Colors.gold : Colors.textDim} />
                </View>
                <Text style={[s.badgeName, !b.earned && { color: Colors.textDim }]}>{b.name}</Text>
                {!b.earned && <Ionicons name="lock-closed" size={10} color={Colors.textDim} style={{ marginTop: 2 }} />}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  title: { color: Colors.text, fontSize: FontSizes.xxl, fontWeight: FontWeights.bold, letterSpacing: -0.3 },
  gemBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surface, borderRadius: BorderRadius.full, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: Colors.glassBorder },
  gemBadgeText: { color: Colors.accent, fontSize: FontSizes.md, fontWeight: FontWeights.bold },
  // Hero
  heroWrap: { paddingHorizontal: 16, marginBottom: 20 },
  heroCard: { borderRadius: BorderRadius.xxl, padding: 28, alignItems: 'center', overflow: 'hidden', ...Shadows.lg },
  heroGlow: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.06)', top: -40, right: -40 },
  heroAmount: { color: '#fff', fontSize: 52, fontWeight: FontWeights.black, marginTop: 8, letterSpacing: -1 },
  heroSub: { color: 'rgba(255,255,255,0.7)', fontSize: FontSizes.sm, marginTop: 4, letterSpacing: 0.5 },
  heroStats: { flexDirection: 'row', marginTop: 24, gap: 40 },
  heroStat: { alignItems: 'center' },
  heroStatVal: { color: '#fff', fontSize: FontSizes.xl, fontWeight: FontWeights.bold },
  heroStatLabel: { color: 'rgba(255,255,255,0.5)', fontSize: FontSizes.xs, marginTop: 4, letterSpacing: 0.5 },
  heroStatDiv: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)' },
  // Tabs
  tabs: { flexDirection: 'row', marginHorizontal: 16, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: 4, marginBottom: 16, borderWidth: 1, borderColor: Colors.glassBorder },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { color: Colors.textMuted, fontSize: FontSizes.sm, fontWeight: FontWeights.semibold, letterSpacing: 0.5 },
  tabTextActive: { color: '#fff' },
  // Offers
  offerCard: { marginHorizontal: 16, marginBottom: 12, backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.glassBorder, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14, ...Shadows.sm },
  offerBody: { flex: 1 },
  offerName: { color: Colors.text, fontSize: FontSizes.md, fontWeight: FontWeights.semibold, letterSpacing: 0.2 },
  offerDisc: { color: Colors.secondary, fontSize: FontSizes.sm, marginTop: 4, fontWeight: FontWeights.medium },
  offerRight: { alignItems: 'flex-end', marginRight: 10 },
  offerGemRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  offerGemVal: { color: Colors.accent, fontSize: FontSizes.md, fontWeight: FontWeights.bold },
  offerExpiry: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: 4 },
  redeemBtn: { overflow: 'hidden', borderRadius: BorderRadius.md },
  redeemGrad: { paddingHorizontal: 16, paddingVertical: 10 },
  redeemText: { color: '#fff', fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
  // Challenges
  challengeCard: { marginHorizontal: 16, marginBottom: 12, backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.glassBorder, padding: 18 },
  challengeHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  challengeName: { color: Colors.text, fontSize: FontSizes.md, fontWeight: FontWeights.semibold },
  challengeReward: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  challengeRewardVal: { color: Colors.accent, fontSize: FontSizes.sm, fontWeight: FontWeights.bold },
  challengeDesc: { color: Colors.textMuted, fontSize: FontSizes.sm, marginTop: 6, letterSpacing: 0.2 },
  progressTrack: { height: 5, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 3, overflow: 'hidden', marginTop: 14 },
  progressFill: { height: '100%', borderRadius: 3 },
  progressLabel: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: 8, letterSpacing: 0.3 },
  // Badges
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16 },
  badgeCard: { width: '47%', backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.glassBorder, padding: 20, alignItems: 'center', gap: 8, ...Shadows.sm },
  badgeLocked: { opacity: 0.4 },
  badgeIconBox: { width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center' },
  badgeName: { color: Colors.text, fontSize: FontSizes.sm, fontWeight: FontWeights.medium, letterSpacing: 0.2 },
});

export default GemsScreen;

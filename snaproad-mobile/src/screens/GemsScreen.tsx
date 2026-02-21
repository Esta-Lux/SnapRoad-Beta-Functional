// SnapRoad Mobile - Gems & Rewards Screen
// Aligned with Figma UI: /app/frontend/src/components/figma-ui/mobile/Gems.tsx

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
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights } from '../utils/theme';

interface GemsScreenProps {
  navigation?: any;
  onNavigate?: (screen: string) => void;
}

const OFFERS = [
  { id: 1, name: 'Coffee House', discount: '15% off any drink', gems: 50, expiry: '3 days' },
  { id: 2, name: 'Auto Spa Pro', discount: 'Free premium wash', gems: 150, expiry: '5 days' },
  { id: 3, name: 'Gas Plus', discount: '$0.15 off per gallon', gems: 75, expiry: '2 days' },
];

const CHALLENGES = [
  { id: 1, name: 'Safe Driver Week', description: 'No harsh braking for 7 days', reward: 200, progress: 65 },
  { id: 2, name: 'Early Bird', description: 'Complete 5 morning trips', reward: 100, progress: 40 },
  { id: 3, name: 'Eco Warrior', description: 'Maintain 30+ MPG average', reward: 150, progress: 80 },
];

const BADGES = [
  { id: 1, name: 'First Trip', icon: 'car', earned: true },
  { id: 2, name: 'Road Warrior', icon: 'trophy', earned: true },
  { id: 3, name: 'Safety Star', icon: 'star', earned: false },
  { id: 4, name: 'Night Owl', icon: 'moon', earned: true },
];

export const GemsScreen: React.FC<GemsScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [activeSection, setActiveSection] = useState<'offers' | 'challenges' | 'badges'>('offers');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Gems & Rewards</Text>
          <View style={styles.gemBalance}>
            <Ionicons name="diamond" size={20} color="#FFB800" />
            <Text style={styles.gemBalanceText}>2,450</Text>
          </View>
        </View>

        {/* Gem Balance Card */}
        <View style={styles.balanceCard}>
          <LinearGradient
            colors={['#9D4EDD', '#6366f1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.balanceGradient}
          >
            <Ionicons name="diamond" size={40} color="#fff" />
            <Text style={styles.balanceAmount}>2,450</Text>
            <Text style={styles.balanceSub}>Total Gems Earned</Text>
            <View style={styles.balanceStats}>
              <View style={styles.balanceStat}>
                <Text style={styles.balanceStatValue}>150</Text>
                <Text style={styles.balanceStatLabel}>This Week</Text>
              </View>
              <View style={styles.balanceStatDivider} />
              <View style={styles.balanceStat}>
                <Text style={styles.balanceStatValue}>450</Text>
                <Text style={styles.balanceStatLabel}>Redeemed</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Section Tabs */}
        <View style={styles.sectionTabs}>
          {(['offers', 'challenges', 'badges'] as const).map((section) => (
            <TouchableOpacity
              key={section}
              style={[styles.sectionTab, activeSection === section && styles.sectionTabActive]}
              onPress={() => setActiveSection(section)}
            >
              <Text style={[styles.sectionTabText, activeSection === section && styles.sectionTabTextActive]}>
                {section.charAt(0).toUpperCase() + section.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Offers */}
        {activeSection === 'offers' && OFFERS.map((offer) => (
          <View key={offer.id} style={styles.offerCard}>
            <View style={styles.offerRow}>
              <View style={styles.offerInfo}>
                <Text style={styles.offerName}>{offer.name}</Text>
                <Text style={styles.offerDiscount}>{offer.discount}</Text>
              </View>
              <View style={styles.offerGems}>
                <Ionicons name="diamond" size={16} color="#FFB800" />
                <Text style={styles.offerGemsText}>{offer.gems}</Text>
              </View>
            </View>
            <View style={styles.offerFooter}>
              <Text style={styles.offerExpiry}>Expires in {offer.expiry}</Text>
              <TouchableOpacity style={styles.redeemBtn}>
                <Text style={styles.redeemBtnText}>Redeem</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Challenges */}
        {activeSection === 'challenges' && CHALLENGES.map((challenge) => (
          <View key={challenge.id} style={styles.challengeCard}>
            <View style={styles.challengeHeader}>
              <Text style={styles.challengeName}>{challenge.name}</Text>
              <View style={styles.challengeReward}>
                <Ionicons name="diamond" size={14} color="#FFB800" />
                <Text style={styles.challengeRewardText}>{challenge.reward}</Text>
              </View>
            </View>
            <Text style={styles.challengeDesc}>{challenge.description}</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${challenge.progress}%` }]} />
            </View>
            <Text style={styles.progressText}>{challenge.progress}% complete</Text>
          </View>
        ))}

        {/* Badges */}
        {activeSection === 'badges' && (
          <View style={styles.badgeGrid}>
            {BADGES.map((badge) => (
              <View key={badge.id} style={[styles.badgeCard, !badge.earned && styles.badgeCardLocked]}>
                <Ionicons
                  name={badge.icon as any}
                  size={32}
                  color={badge.earned ? '#FFB800' : 'rgba(255,255,255,0.2)'}
                />
                <Text style={[styles.badgeName, !badge.earned && styles.badgeNameLocked]}>
                  {badge.name}
                </Text>
                {!badge.earned && (
                  <Ionicons name="lock-closed" size={12} color="rgba(255,255,255,0.3)" />
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E16' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 16,
  },
  title: { color: '#fff', fontSize: 24, fontWeight: '700' },
  gemBalance: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  gemBalanceText: { color: '#FFB800', fontSize: 18, fontWeight: '700' },
  // Balance card
  balanceCard: { marginHorizontal: 16, marginBottom: 16 },
  balanceGradient: { borderRadius: 20, padding: 24, alignItems: 'center' },
  balanceAmount: { color: '#fff', fontSize: 48, fontWeight: '700', marginTop: 8 },
  balanceSub: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 4 },
  balanceStats: { flexDirection: 'row', marginTop: 20, gap: 32 },
  balanceStat: { alignItems: 'center' },
  balanceStatValue: { color: '#fff', fontSize: 18, fontWeight: '600' },
  balanceStatLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 },
  balanceStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  // Section tabs
  sectionTabs: {
    flexDirection: 'row', marginHorizontal: 16, backgroundColor: '#1A1F2E',
    borderRadius: 12, padding: 4, marginBottom: 16,
  },
  sectionTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  sectionTabActive: { backgroundColor: '#0084FF' },
  sectionTabText: { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '500' },
  sectionTabTextActive: { color: '#fff' },
  // Offers
  offerCard: {
    marginHorizontal: 16, marginBottom: 12, backgroundColor: '#1A1F2E',
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', padding: 16,
  },
  offerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  offerInfo: { flex: 1 },
  offerName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  offerDiscount: { color: '#00FFD7', fontSize: 14, marginTop: 4 },
  offerGems: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  offerGemsText: { color: '#FFB800', fontSize: 16, fontWeight: '600' },
  offerFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  offerExpiry: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  redeemBtn: { backgroundColor: '#0084FF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  redeemBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  // Challenges
  challengeCard: {
    marginHorizontal: 16, marginBottom: 12, backgroundColor: '#1A1F2E',
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', padding: 16,
  },
  challengeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  challengeName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  challengeReward: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  challengeRewardText: { color: '#FFB800', fontSize: 14, fontWeight: '600' },
  challengeDesc: { color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 6 },
  progressTrack: {
    height: 6, backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 3, overflow: 'hidden', marginTop: 12,
  },
  progressFill: { height: '100%', backgroundColor: '#0084FF', borderRadius: 3 },
  progressText: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 6 },
  // Badges
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16 },
  badgeCard: {
    width: '47%', backgroundColor: '#1A1F2E', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    padding: 20, alignItems: 'center', gap: 8,
  },
  badgeCardLocked: { opacity: 0.5 },
  badgeName: { color: '#fff', fontSize: 14, fontWeight: '500' },
  badgeNameLocked: { color: 'rgba(255,255,255,0.4)' },
});

export default GemsScreen;

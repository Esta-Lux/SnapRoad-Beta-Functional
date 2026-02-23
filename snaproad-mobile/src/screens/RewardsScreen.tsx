// SnapRoad Mobile - Rewards Screen (matches /driver web Rewards tab)
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSizes, FontWeights, BorderRadius } from '../utils/theme';
import { useUserStore } from '../store';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://privacy-first-app-3.preview.emergentagent.com';

type RewardsTab = 'offers' | 'challenges' | 'badges' | 'carstudio';

const CHALLENGES = [
  { id: 1, title: 'Safe Driver', desc: 'No hard brakes for 5 trips', progress: 3, total: 5, gems: 100, icon: 'shield-checkmark' },
  { id: 2, title: 'Explorer', desc: 'Visit 3 new locations', progress: 1, total: 3, gems: 75, icon: 'compass' },
  { id: 3, title: 'Eco Champion', desc: 'Drive 50 eco miles', progress: 32, total: 50, gems: 150, icon: 'leaf' },
];

const BADGES = [
  { id: 1, name: 'First Mile', icon: 'flag', earned: true, color: '#22C55E' },
  { id: 2, name: 'Night Owl', icon: 'moon', earned: true, color: '#8B5CF6' },
  { id: 3, name: 'Speed Limit', icon: 'speedometer', earned: true, color: '#0EA5E9' },
  { id: 4, name: 'Eco Driver', icon: 'leaf', earned: false, color: '#22C55E' },
  { id: 5, name: 'Social Star', icon: 'people', earned: false, color: '#F59E0B' },
  { id: 6, name: 'Road Master', icon: 'trophy', earned: false, color: '#EF4444' },
];

export const RewardsScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useUserStore();
  const [activeTab, setActiveTab] = useState<RewardsTab>('offers');
  const [offers, setOffers] = useState<any[]>([]);

  useEffect(() => { fetchOffers(); }, []);

  const fetchOffers = async () => {
    try {
      const res = await fetch(`${API_URL}/api/offers`);
      const data = await res.json();
      if (data.success) setOffers(data.data);
    } catch { /* ignore */ }
  };

  const handleRedeem = async (offerId: number) => {
    try {
      await fetch(`${API_URL}/api/offers/${offerId}/redeem`, { method: 'POST' });
      setOffers(prev => prev.map(o => o.id === offerId ? { ...o, redeemed: true } : o));
    } catch { /* ignore */ }
  };

  const tabs: { id: RewardsTab; label: string; icon: any }[] = [
    { id: 'offers', label: 'Offers', icon: 'gift-outline' },
    { id: 'challenges', label: 'Challenges', icon: 'flash-outline' },
    { id: 'badges', label: 'Badges', icon: 'ribbon-outline' },
    { id: 'carstudio', label: 'Car Studio', icon: 'car-sport-outline' },
  ];

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Gems & Rewards</Text>
        <TouchableOpacity style={s.marketplaceBtn}>
          <Text style={s.marketplaceText}>Marketplace</Text>
        </TouchableOpacity>
      </View>

      {/* Balance Card */}
      <View style={s.balanceCard}>
        <View>
          <Text style={s.balanceLabel}>Your Balance</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="diamond" size={24} color={Colors.primary} />
            <Text style={s.balanceValue}>{user?.gems || 2450}</Text>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={s.weeklyGems}>+125 this week</Text>
          <Text style={s.rankText}>Rank #42 in your area</Text>
        </View>
      </View>

      {/* Sub Tabs */}
      <View style={s.tabRow}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[s.tab, activeTab === tab.id && s.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Ionicons name={tab.icon} size={14} color={activeTab === tab.id ? '#fff' : Colors.textMuted} />
            <Text style={[s.tabText, activeTab === tab.id && s.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
        {/* Offers Tab */}
        {activeTab === 'offers' && offers.map(offer => (
          <View key={offer.id} style={s.offerRow}>
            <View style={s.offerIcon}>
              <Ionicons name="gift" size={18} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.offerName}>{offer.business_name}</Text>
              <Text style={s.offerDesc}>{offer.description}</Text>
              {offer.address && <Text style={s.offerAddr}>{offer.address}</Text>}
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="diamond" size={12} color={Colors.primary} />
                <Text style={s.gemCount}>{offer.gems_reward}</Text>
              </View>
              <TouchableOpacity
                style={[s.redeemBtn, offer.redeemed && s.redeemBtnDone]}
                onPress={() => !offer.redeemed && handleRedeem(offer.id)}
              >
                <Text style={s.redeemText}>{offer.redeemed ? 'Done' : 'Redeem'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Challenges Tab */}
        {activeTab === 'challenges' && CHALLENGES.map(ch => (
          <View key={ch.id} style={s.challengeCard}>
            <View style={s.challengeIcon}>
              <Ionicons name={ch.icon as any} size={20} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.challengeTitle}>{ch.title}</Text>
              <Text style={s.challengeDesc}>{ch.desc}</Text>
              <View style={s.progressBar}>
                <View style={[s.progressFill, { width: `${(ch.progress / ch.total) * 100}%` }]} />
              </View>
              <Text style={s.progressText}>{ch.progress}/{ch.total}</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Ionicons name="diamond" size={14} color="#F59E0B" />
              <Text style={s.challengeGems}>{ch.gems}</Text>
            </View>
          </View>
        ))}

        {/* Badges Tab */}
        {activeTab === 'badges' && (
          <View style={s.badgesGrid}>
            {BADGES.map(badge => (
              <View key={badge.id} style={[s.badgeCard, !badge.earned && s.badgeLocked]}>
                <View style={[s.badgeIcon, { backgroundColor: badge.earned ? `${badge.color}20` : 'rgba(255,255,255,0.04)' }]}>
                  <Ionicons name={badge.icon as any} size={24} color={badge.earned ? badge.color : Colors.textDim} />
                </View>
                <Text style={[s.badgeName, !badge.earned && { color: Colors.textDim }]}>{badge.name}</Text>
                {!badge.earned && <Ionicons name="lock-closed" size={12} color={Colors.textDim} style={{ marginTop: 4 }} />}
              </View>
            ))}
          </View>
        )}

        {/* Car Studio Tab */}
        {activeTab === 'carstudio' && (
          <View style={s.studioCard}>
            <View style={s.studioPreview}>
              <Ionicons name="car-sport" size={80} color={Colors.primary} />
            </View>
            <Text style={s.studioTitle}>Customize Your Ride</Text>
            <Text style={s.studioDesc}>Unlock colors and styles with gems</Text>
            <View style={s.colorRow}>
              {['#0EA5E9', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'].map(c => (
                <TouchableOpacity key={c} style={[s.colorDot, { backgroundColor: c }]} />
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E16' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  title: { color: Colors.text, fontSize: FontSizes.xl, fontWeight: FontWeights.bold },
  marketplaceBtn: { borderWidth: 1, borderColor: Colors.primary, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  marketplaceText: { color: Colors.primary, fontSize: FontSizes.xs, fontWeight: FontWeights.semibold },
  // Balance
  balanceCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 16, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  balanceLabel: { color: Colors.textMuted, fontSize: FontSizes.xs, marginBottom: 4 },
  balanceValue: { color: Colors.text, fontSize: 32, fontWeight: FontWeights.bold },
  weeklyGems: { color: '#22C55E', fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
  rankText: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: 2 },
  // Tabs
  tabRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, gap: 4 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)' },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { color: Colors.textMuted, fontSize: FontSizes.xs, fontWeight: FontWeights.medium },
  tabTextActive: { color: '#fff' },
  // Offers
  offerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 14, marginBottom: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  offerIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(14,165,233,0.1)', alignItems: 'center', justifyContent: 'center' },
  offerName: { color: Colors.text, fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
  offerDesc: { color: '#22C55E', fontSize: FontSizes.xs, marginTop: 2 },
  offerAddr: { color: Colors.textDim, fontSize: 10, marginTop: 1 },
  gemCount: { color: Colors.primary, fontSize: FontSizes.sm, fontWeight: FontWeights.bold },
  redeemBtn: { backgroundColor: Colors.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  redeemBtnDone: { backgroundColor: '#374151' },
  redeemText: { color: '#fff', fontSize: FontSizes.xs, fontWeight: FontWeights.bold },
  // Challenges
  challengeCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 14, marginBottom: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  challengeIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(14,165,233,0.1)', alignItems: 'center', justifyContent: 'center' },
  challengeTitle: { color: Colors.text, fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
  challengeDesc: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: 2 },
  progressBar: { height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2, marginTop: 8, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 2 },
  progressText: { color: Colors.textMuted, fontSize: 10, marginTop: 4 },
  challengeGems: { color: '#F59E0B', fontSize: FontSizes.xs, fontWeight: FontWeights.bold, marginTop: 2 },
  // Badges
  badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8 },
  badgeCard: { width: '30%', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  badgeLocked: { opacity: 0.5 },
  badgeIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  badgeName: { color: Colors.text, fontSize: FontSizes.xs, fontWeight: FontWeights.medium, textAlign: 'center' },
  // Car Studio
  studioCard: { marginHorizontal: 16, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  studioPreview: { width: 160, height: 100, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  studioTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
  studioDesc: { color: Colors.textMuted, fontSize: FontSizes.sm, marginTop: 4, marginBottom: 20 },
  colorRow: { flexDirection: 'row', gap: 12 },
  colorDot: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' },
});

export default RewardsScreen;

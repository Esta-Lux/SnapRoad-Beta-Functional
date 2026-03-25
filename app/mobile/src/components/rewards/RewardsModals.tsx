import React from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Skeleton from '../common/Skeleton';
import type { Badge, Offer } from '../../types';
import type { ChallengeHistoryItem, ChallengeHistoryStats, ChallengeModalTab } from './types';
import { rewardsStyles } from './styles';

type ThemeProps = {
  bg: string;
  cardBg: string;
  text: string;
  sub: string;
};

export function BadgeDetailModal({
  selectedBadge,
  cardBg,
  text,
  sub,
  onClose,
}: {
  selectedBadge: Badge | null;
  onClose: () => void;
} & Pick<ThemeProps, 'cardBg' | 'text' | 'sub'>) {
  return (
    <Modal visible={!!selectedBadge} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={rewardsStyles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={[rewardsStyles.modalCard, { backgroundColor: cardBg }]} onStartShouldSetResponder={() => true}>
          <Text style={{ fontSize: 48, textAlign: 'center' }}>{selectedBadge?.earned ? '🏆' : '🔒'}</Text>
          <Text style={[rewardsStyles.modalTitle, { color: text }]}>{selectedBadge?.name}</Text>
          <Text style={{ color: sub, textAlign: 'center', fontSize: 13 }}>{selectedBadge?.description}</Text>
          {!selectedBadge?.earned && <Text style={{ color: '#F59E0B', textAlign: 'center', fontSize: 12, marginTop: 8 }}>Progress: {selectedBadge?.progress}%</Text>}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

export function OfferDetailModal({
  selectedOffer,
  redeemingOfferId,
  cardBg,
  text,
  sub,
  onClose,
  onRedeem,
}: {
  selectedOffer: Offer | null;
  redeemingOfferId: number | null;
  onClose: () => void;
  onRedeem: (offer: Offer) => void;
} & Pick<ThemeProps, 'cardBg' | 'text' | 'sub'>) {
  return (
    <Modal visible={!!selectedOffer} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={rewardsStyles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={[rewardsStyles.modalSheet, { backgroundColor: cardBg }]} onStartShouldSetResponder={() => true}>
          <View style={rewardsStyles.modalHandle} />
          <Text style={[rewardsStyles.modalTitle, { color: text }]}>{selectedOffer?.business_name}</Text>
          <Text style={{ color: sub, fontSize: 14, marginBottom: 12 }}>{selectedOffer?.description ?? `${selectedOffer?.discount_percent}% off`}</Text>
          {!selectedOffer?.redeemed && (
            <TouchableOpacity
              style={[rewardsStyles.navBtn, redeemingOfferId === selectedOffer?.id && { opacity: 0.6 }]}
              disabled={redeemingOfferId === selectedOffer?.id}
              onPress={() => selectedOffer && onRedeem(selectedOffer)}
            >
              <Text style={rewardsStyles.navBtnText}>{redeemingOfferId === selectedOffer?.id ? 'Redeeming...' : 'Redeem Offer'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

export function AllOffersModal({
  visible,
  offers,
  bg,
  cardBg,
  text,
  sub,
  onClose,
  onSelectOffer,
}: {
  visible: boolean;
  offers: Offer[];
  onClose: () => void;
  onSelectOffer: (offer: Offer) => void;
} & ThemeProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={rewardsStyles.modalOverlay}>
        <View style={[rewardsStyles.fullSheet, { backgroundColor: bg }]}>
          <View style={rewardsStyles.sheetHeader}>
            <Text style={[rewardsStyles.sheetTitle, { color: text }]}>All Offers</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={sub} /></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
            {offers.map((o) => (
              <TouchableOpacity key={o.id} style={[rewardsStyles.offerCard, { backgroundColor: cardBg }]} onPress={() => onSelectOffer(o)}>
                <View style={{ flex: 1 }}>
                  <Text style={[rewardsStyles.offerBiz, { color: text }]}>{o.business_name}</Text>
                  <Text style={{ color: sub, fontSize: 12 }}>{o.description ?? `${o.discount_percent}% off`}</Text>
                </View>
                <Text style={{ color: o.redeemed ? '#22C55E' : '#16A34A', fontSize: 12, fontWeight: '700' }}>
                  {o.redeemed ? 'Redeemed' : `+${o.gems_reward ?? 0} gems`}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export function ChallengeHistoryModal({
  visible,
  historyLoading,
  challengeHistoryStats,
  challengeHistoryItems,
  badges,
  activeTab,
  bg,
  cardBg,
  text,
  sub,
  onClose,
  onTabChange,
  onSelectBadge,
}: {
  visible: boolean;
  historyLoading: boolean;
  challengeHistoryStats: ChallengeHistoryStats | null;
  challengeHistoryItems: ChallengeHistoryItem[];
  badges: Badge[];
  activeTab: ChallengeModalTab;
  onClose: () => void;
  onTabChange: (tab: ChallengeModalTab) => void;
  onSelectBadge: (badge: Badge) => void;
} & ThemeProps) {
  const wins = challengeHistoryStats?.wins ?? 0;
  const losses = challengeHistoryStats?.losses ?? 0;
  const winRate = challengeHistoryStats?.win_rate ?? 0;
  const netGems = (challengeHistoryStats?.total_gems_won ?? 0) - (challengeHistoryStats?.total_gems_lost ?? 0);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={rewardsStyles.modalOverlay}>
        <View style={[rewardsStyles.fullSheet, { backgroundColor: bg }]}>
          <LinearGradient
            colors={['#0F9D77', '#0B7A63']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[rewardsStyles.modalHero, { paddingTop: 8, paddingBottom: 12 }]}
          >
            <View style={rewardsStyles.sheetHeader}>
              <Text style={[rewardsStyles.modalHeroTitle, { fontSize: 34, marginBottom: 8 }]}>Challenge History</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={26} color="rgba(255,255,255,0.9)" />
              </TouchableOpacity>
            </View>
            <View style={rewardsStyles.modalHeroStatsRow}>
              <View style={[rewardsStyles.modalHeroStatCard, { paddingVertical: 9 }]}>
                <Text style={[rewardsStyles.modalHeroStatValue, { fontSize: 22 }]}>{wins}</Text>
                <Text style={[rewardsStyles.modalHeroStatLabel, { fontSize: 10 }]}>Wins</Text>
              </View>
              <View style={[rewardsStyles.modalHeroStatCard, { paddingVertical: 9 }]}>
                <Text style={[rewardsStyles.modalHeroStatValue, { fontSize: 22 }]}>{losses}</Text>
                <Text style={[rewardsStyles.modalHeroStatLabel, { fontSize: 10 }]}>Losses</Text>
              </View>
              <View style={[rewardsStyles.modalHeroStatCard, { paddingVertical: 9 }]}>
                <Text style={[rewardsStyles.modalHeroStatValue, { fontSize: 22 }]}>{Math.round(winRate)}%</Text>
                <Text style={[rewardsStyles.modalHeroStatLabel, { fontSize: 10 }]}>Win Rate</Text>
              </View>
              <View style={[rewardsStyles.modalHeroStatCard, { paddingVertical: 9 }]}>
                <Text style={[rewardsStyles.modalHeroStatValue, { fontSize: 22 }]}>{netGems}</Text>
                <Text style={[rewardsStyles.modalHeroStatLabel, { fontSize: 10 }]}>Net Gems</Text>
              </View>
            </View>
          </LinearGradient>
          <View style={[rewardsStyles.modalTabRow, { backgroundColor: cardBg }]}>
            <TouchableOpacity
              style={[rewardsStyles.modalTabBtn, activeTab === 'history' && rewardsStyles.modalTabBtnActive]}
              onPress={() => onTabChange('history')}
            >
              <Text style={[rewardsStyles.modalTabText, { color: activeTab === 'history' ? '#4F6BFF' : sub }]}>History</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[rewardsStyles.modalTabBtn, activeTab === 'badges' && rewardsStyles.modalTabBtnActive]}
              onPress={() => onTabChange('badges')}
            >
              <Text style={[rewardsStyles.modalTabText, { color: activeTab === 'badges' ? '#4F6BFF' : sub }]}>Badges</Text>
            </TouchableOpacity>
          </View>
          {historyLoading ? (
            <View style={{ paddingHorizontal: 16, gap: 8 }}>{[1, 2, 3].map((i) => <Skeleton key={i} width="100%" height={64} borderRadius={12} />)}</View>
          ) : (
            <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
              {activeTab === 'history' ? (
                <>
                  {!!challengeHistoryStats && (
                    <View style={[rewardsStyles.historyStats, { backgroundColor: cardBg }]}>
                      <Text style={[rewardsStyles.historyStatText, { color: text }]}>Current streak: {challengeHistoryStats.current_streak}</Text>
                      <Text style={[rewardsStyles.historyStatText, { color: text }]}>Best streak: {challengeHistoryStats.best_streak}</Text>
                    </View>
                  )}
                  {challengeHistoryItems.length === 0 ? (
                    <View style={[rewardsStyles.emptyCard, { backgroundColor: cardBg }]}><Text style={{ color: sub }}>No challenge history yet</Text></View>
                  ) : challengeHistoryItems.map((c) => (
                    <View key={c.id} style={[rewardsStyles.challengeCard, { backgroundColor: cardBg }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[rewardsStyles.challengeTitle, { color: text }]}>vs {c.opponent_name}</Text>
                        <Text style={{ color: sub, fontSize: 11 }}>{c.duration_hours}h · stake {c.stake} gems</Text>
                        <Text style={{ color: sub, fontSize: 11, marginTop: 2 }}>You {c.your_score} - {c.opponent_score} Them</Text>
                      </View>
                      <Text style={{ color: c.status === 'won' ? '#22C55E' : c.status === 'lost' ? '#EF4444' : '#64748B', fontSize: 12, fontWeight: '700' }}>
                        {String(c.status).toUpperCase()}
                      </Text>
                    </View>
                  ))}
                </>
              ) : (
                <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
                  {badges.length === 0 ? (
                    <View style={[rewardsStyles.emptyCard, { backgroundColor: cardBg }]}><Text style={{ color: sub }}>No badges yet</Text></View>
                  ) : badges.map((b) => (
                    <TouchableOpacity key={`history-badge-${b.id}`} style={[rewardsStyles.nativeBadgeCard, { backgroundColor: cardBg, opacity: b.earned ? 1 : 0.82 }]} onPress={() => onSelectBadge(b)}>
                      <View style={rewardsStyles.nativeBadgeIconWrap}>
                        <Text style={{ fontSize: 24, opacity: b.earned ? 1 : 0.55 }}>{b.earned ? '🏆' : '🔒'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[rewardsStyles.nativeBadgeTitle, { color: text }]}>{b.name}</Text>
                        <Text style={[rewardsStyles.nativeBadgeDesc, { color: sub }]}>{b.description}</Text>
                        {!b.earned && (
                          <>
                            <View style={rewardsStyles.nativeProgressTrack}>
                              <View style={[rewardsStyles.nativeProgressFill, { width: `${Math.min(100, Math.max(0, b.progress ?? 0))}%` }]} />
                            </View>
                            <Text style={[rewardsStyles.nativeProgressText, { color: sub }]}>{Math.round(b.progress ?? 0)}%</Text>
                          </>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

export function AllBadgesModal({
  visible,
  badges,
  bg,
  cardBg,
  text,
  sub,
  onClose,
  onSelectBadge,
}: {
  visible: boolean;
  badges: Badge[];
  onClose: () => void;
  onSelectBadge: (badge: Badge) => void;
} & ThemeProps) {
  const earnedCount = badges.filter((b) => b.earned).length;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={rewardsStyles.modalOverlay}>
        <View style={[rewardsStyles.fullSheet, { backgroundColor: bg }]}>
          <LinearGradient
            colors={['#873CEB', '#5D35C4']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={rewardsStyles.modalHero}
          >
            <View style={rewardsStyles.sheetHeader}>
              <Text style={rewardsStyles.modalHeroTitle}>All Badges</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={26} color="rgba(255,255,255,0.9)" />
              </TouchableOpacity>
            </View>
            <View style={rewardsStyles.modalHeroStatsRow}>
              <View style={rewardsStyles.modalHeroStatCard}>
                <Text style={rewardsStyles.modalHeroStatValue}>{earnedCount}</Text>
                <Text style={rewardsStyles.modalHeroStatLabel}>Earned</Text>
              </View>
              <View style={rewardsStyles.modalHeroStatCard}>
                <Text style={rewardsStyles.modalHeroStatValue}>{badges.length - earnedCount}</Text>
                <Text style={rewardsStyles.modalHeroStatLabel}>Locked</Text>
              </View>
              <View style={rewardsStyles.modalHeroStatCard}>
                <Text style={rewardsStyles.modalHeroStatValue}>{badges.length}</Text>
                <Text style={rewardsStyles.modalHeroStatLabel}>Total</Text>
              </View>
            </View>
          </LinearGradient>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
            <View style={rewardsStyles.badgesGrid}>
              {badges.map((b) => (
                <TouchableOpacity key={`all-${b.id}`} style={[rewardsStyles.badgeItem, { backgroundColor: cardBg, opacity: b.earned ? 1 : 0.4 }]} onPress={() => onSelectBadge(b)}>
                  <Text style={{ fontSize: 26 }}>{b.earned ? '🏆' : '🔒'}</Text>
                  <Text style={[rewardsStyles.badgeName, { color: text }]} numberOfLines={1}>{b.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

import React from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Skeleton from '../common/Skeleton';
import type { Badge, Offer } from '../../types';
import type { ChallengeHistoryItem, ChallengeHistoryStats, ChallengeModalTab, UserOfferRedemption } from './types';
import { displayOfferCategory } from '../../lib/offerCategories';
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
  primary,
  isLight,
  onClose,
}: {
  selectedBadge: Badge | null;
  onClose: () => void;
  primary: string;
  isLight: boolean;
} & Pick<ThemeProps, 'cardBg' | 'text' | 'sub'>) {
  const overlay = isLight ? 'rgba(15,23,42,0.45)' : 'rgba(2,6,23,0.72)';
  return (
    <Modal visible={!!selectedBadge} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={[rewardsStyles.modalOverlay, { backgroundColor: overlay }]} activeOpacity={1} onPress={onClose}>
        <View style={[rewardsStyles.modalCard, { backgroundColor: cardBg, borderWidth: 1, borderColor: `${primary}22` }]} onStartShouldSetResponder={() => true}>
          <View style={{ alignSelf: 'center', width: 72, height: 72, borderRadius: 22, backgroundColor: selectedBadge?.earned ? `${primary}18` : `${sub}22`, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <Ionicons name={selectedBadge?.earned ? 'trophy' : 'lock-closed'} size={36} color={selectedBadge?.earned ? primary : sub} />
          </View>
          <Text style={[rewardsStyles.modalTitle, { color: text }]}>{selectedBadge?.name}</Text>
          <Text style={{ color: sub, textAlign: 'center', fontSize: 13 }}>{selectedBadge?.description}</Text>
          {!selectedBadge?.earned && (
            <Text style={{ color: primary, textAlign: 'center', fontSize: 12, marginTop: 8, fontWeight: '700' }}>
              Progress: {selectedBadge?.progress}%
            </Text>
          )}
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
  primary,
  success,
  isLight,
  onClose,
  onRedeem,
}: {
  selectedOffer: Offer | null;
  redeemingOfferId: number | null;
  onClose: () => void;
  onRedeem: (offer: Offer) => void;
  primary: string;
  success: string;
  isLight: boolean;
} & Pick<ThemeProps, 'cardBg' | 'text' | 'sub'>) {
  const overlay = isLight ? 'rgba(15,23,42,0.45)' : 'rgba(2,6,23,0.72)';
  return (
    <Modal visible={!!selectedOffer} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={[rewardsStyles.modalOverlay, { backgroundColor: overlay }]} activeOpacity={1} onPress={onClose}>
        <View style={[rewardsStyles.modalSheet, { backgroundColor: cardBg, borderTopWidth: 1, borderColor: `${primary}22` }]} onStartShouldSetResponder={() => true}>
          <View style={[rewardsStyles.modalHandle, { backgroundColor: sub }]} />
          {selectedOffer?.image_url ? (
            <View style={{ width: '100%', height: 148, borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>
              <Image source={{ uri: selectedOffer.image_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            </View>
          ) : null}
          <Text style={[rewardsStyles.modalTitle, { color: text }]}>{selectedOffer?.business_name}</Text>
          <View style={{ alignSelf: 'flex-start', marginBottom: 10, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: `${sub}18` }}>
            <Text style={{ color: sub, fontSize: 12, fontWeight: '800' }}>{displayOfferCategory(selectedOffer ?? {})}</Text>
          </View>
          <Text style={{ color: sub, fontSize: 14, marginBottom: 16, lineHeight: 20 }}>{selectedOffer?.description ?? `${selectedOffer?.discount_percent}% off`}</Text>
          {selectedOffer?.address ? <Text style={{ color: sub, fontSize: 12, marginBottom: 14 }}>{selectedOffer.address}</Text> : null}
          <View style={{ alignItems: 'center', marginBottom: 14 }}>
            <Text style={{ color: primary, fontSize: 22, fontWeight: '900' }}>{selectedOffer?.gem_cost ?? selectedOffer?.gems_reward ?? 0} gems</Text>
            <Text style={{ color: sub, fontSize: 12, fontWeight: '700' }}>Redeem cost</Text>
          </View>
          {!selectedOffer?.redeemed && (
            <TouchableOpacity
              disabled={redeemingOfferId === selectedOffer?.id}
              onPress={() => selectedOffer && onRedeem(selectedOffer)}
              activeOpacity={0.85}
              style={{ opacity: redeemingOfferId === selectedOffer?.id ? 0.65 : 1 }}
            >
              <LinearGradient
                colors={[primary, `${primary}dd`]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={{ borderRadius: 14, paddingVertical: 15, alignItems: 'center' }}
              >
                <Text style={rewardsStyles.navBtnText}>{redeemingOfferId === selectedOffer?.id ? 'Redeeming...' : 'Redeem For Gems'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
          {selectedOffer?.redeemed && (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12 }}>
              <Ionicons name="checkmark-circle" size={22} color={success} />
              <Text style={{ color: success, fontSize: 15, fontWeight: '800' }}>Already redeemed</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

function redemptionWhenLabel(iso: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function RedemptionDetailModal({
  redemption,
  cardBg,
  text,
  sub,
  primary,
  success,
  warning,
  danger,
  isLight,
  onClose,
}: {
  redemption: UserOfferRedemption | null;
  onClose: () => void;
  primary: string;
  success: string;
  warning: string;
  danger: string;
  isLight: boolean;
} & Pick<ThemeProps, 'cardBg' | 'text' | 'sub'>) {
  const overlay = isLight ? 'rgba(15,23,42,0.45)' : 'rgba(2,6,23,0.72)';
  const r = redemption;
  return (
    <Modal visible={!!r} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={[rewardsStyles.modalOverlay, { backgroundColor: overlay }]} activeOpacity={1} onPress={onClose}>
        <View
          style={[rewardsStyles.modalSheet, { backgroundColor: cardBg, borderTopWidth: 1, borderColor: `${primary}22`, maxHeight: '88%' }]}
          onStartShouldSetResponder={() => true}
        >
          <View style={[rewardsStyles.modalHandle, { backgroundColor: sub }]} />
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {r?.image_url ? (
              <View style={{ width: '100%', height: 160, borderRadius: 16, overflow: 'hidden', marginBottom: 14 }}>
                <Image source={{ uri: r.image_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              </View>
            ) : null}
            <Text style={[rewardsStyles.modalTitle, { color: text, textAlign: 'left' }]}>{r?.business_name ?? 'Offer'}</Text>
            <View style={{ alignSelf: 'flex-start', marginTop: 8, marginBottom: 10, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: `${sub}18` }}>
              <Text style={{ color: sub, fontSize: 12, fontWeight: '800' }}>{r ? displayOfferCategory(r) : '—'}</Text>
            </View>
            <View
              style={{
                alignSelf: 'flex-start',
                marginTop: 8,
                marginBottom: 12,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 12,
                backgroundColor: r?.used_in_store ? `${success}22` : `${warning}20`,
              }}
            >
              <Text style={{ color: r?.used_in_store ? success : warning, fontSize: 12, fontWeight: '900', letterSpacing: 0.3 }}>
                {r?.used_in_store ? 'Used in store — partner scanned your QR' : 'Not scanned yet — show your QR at checkout'}
              </Text>
            </View>
            {r?.description ? <Text style={{ color: sub, fontSize: 14, lineHeight: 20, marginBottom: 12 }}>{r.description}</Text> : null}
            {r?.address ? (
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                <Ionicons name="location-outline" size={18} color={primary} />
                <Text style={{ color: sub, fontSize: 13, flex: 1, lineHeight: 18 }}>{r.address}</Text>
              </View>
            ) : null}
            <View style={{ borderRadius: 14, borderWidth: 1, borderColor: `${sub}35`, padding: 14, gap: 10, marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: sub, fontSize: 13, fontWeight: '700' }}>Redeemed</Text>
                <Text style={{ color: text, fontSize: 13, fontWeight: '800' }}>{redemptionWhenLabel(r?.redeemed_at ?? null)}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: sub, fontSize: 13, fontWeight: '700' }}>Gems spent</Text>
                <Text style={{ color: danger, fontSize: 13, fontWeight: '900' }}>−{r?.gem_cost ?? 0}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: sub, fontSize: 13, fontWeight: '700' }}>Your discount</Text>
                <Text style={{ color: text, fontSize: 13, fontWeight: '800' }}>
                  {r?.discount_percent ?? r?.discount_applied ?? 0}%
                  {r?.is_free_item ? ' · Free item' : ''}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: sub, fontSize: 13, fontWeight: '700' }}>Status</Text>
                <Text style={{ color: text, fontSize: 13, fontWeight: '800', textTransform: 'capitalize' }}>{r?.status ?? '—'}</Text>
              </View>
            </View>
            <Text style={{ color: sub, fontSize: 12, lineHeight: 17, marginBottom: 20 }}>
              SnapRoad records when you redeem with gems. When the business scans your code, this list shows “Used in store.” If you redeemed in the app only, complete your visit and ask staff to scan your QR.
            </Text>
          </ScrollView>
          <TouchableOpacity onPress={onClose} activeOpacity={0.85} style={{ marginBottom: 8 }}>
            <LinearGradient colors={[primary, `${primary}dd`]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}>
              <Text style={rewardsStyles.navBtnText}>Done</Text>
            </LinearGradient>
          </TouchableOpacity>
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
  border,
  primary,
  success,
  isLight,
  onClose,
  onSelectOffer,
}: {
  visible: boolean;
  offers: Offer[];
  onClose: () => void;
  onSelectOffer: (offer: Offer) => void;
  border: string;
  primary: string;
  success: string;
  isLight: boolean;
} & ThemeProps) {
  const overlay = isLight ? 'rgba(15,23,42,0.4)' : 'rgba(2,6,23,0.65)';
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[rewardsStyles.modalOverlay, { backgroundColor: overlay }]}>
        <View style={[rewardsStyles.fullSheet, { backgroundColor: bg, borderTopWidth: 1, borderColor: border }]}>
          <View style={[rewardsStyles.sheetHeader, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: border }]}>
            <Text style={[rewardsStyles.sheetTitle, { color: text }]}>All Offers</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}><Ionicons name="close" size={24} color={sub} /></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ paddingBottom: 24, paddingTop: 8 }}>
            {offers.length === 0 && (
              <Text style={[rewardsStyles.offerBiz, { color: sub, textAlign: 'center', paddingVertical: 28, paddingHorizontal: 16 }]}>
                No offers in range yet. Pull to refresh on Rewards, or move closer to a partner location (offers use your last known area).
              </Text>
            )}
            {offers.map((o) => (
              <TouchableOpacity key={o.id} style={[rewardsStyles.offerCard, { backgroundColor: cardBg, borderWidth: 1, borderColor: border }]} onPress={() => onSelectOffer(o)} activeOpacity={0.82}>
                {o.image_url ? (
                  <View style={{ width: 56, height: 56, borderRadius: 14, overflow: 'hidden', marginRight: 12 }}>
                    <Image source={{ uri: o.image_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  </View>
                ) : null}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <View style={{ backgroundColor: `${primary}20`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                      <Text style={{ color: primary, fontSize: 11, fontWeight: '900' }}>{o.discount_percent ?? 0}%</Text>
                    </View>
                    <Text style={[rewardsStyles.offerBiz, { color: text, flex: 1 }]} numberOfLines={1}>{o.business_name}</Text>
                  </View>
                  <Text style={{ color: sub, fontSize: 12 }} numberOfLines={2}>{o.description ?? `${o.discount_percent}% off`}</Text>
                  {o.address ? <Text style={{ color: sub, fontSize: 11, marginTop: 4 }} numberOfLines={1}>{o.address}</Text> : null}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Ionicons name={o.redeemed ? 'checkmark-done' : 'diamond-outline'} size={18} color={o.redeemed ? success : primary} />
                  <Text style={{ color: o.redeemed ? success : primary, fontSize: 12, fontWeight: '800' }}>
                    {o.redeemed ? 'Redeemed' : `${o.gem_cost ?? o.gems_reward ?? 0} gems`}
                  </Text>
                </View>
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
  primary,
  heroGradient,
  isLight,
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
  primary: string;
  heroGradient: readonly [string, string];
  isLight: boolean;
} & ThemeProps) {
  const wins = challengeHistoryStats?.wins ?? 0;
  const losses = challengeHistoryStats?.losses ?? 0;
  const winRate = challengeHistoryStats?.win_rate ?? 0;
  const netGems = (challengeHistoryStats?.total_gems_won ?? 0) - (challengeHistoryStats?.total_gems_lost ?? 0);

  const overlay = isLight ? 'rgba(15,23,42,0.4)' : 'rgba(2,6,23,0.65)';
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[rewardsStyles.modalOverlay, { backgroundColor: overlay }]}>
        <View style={[rewardsStyles.fullSheet, { backgroundColor: bg, borderTopWidth: 1, borderColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)' }]}>
          <LinearGradient
            colors={[...heroGradient]}
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
          <View style={[rewardsStyles.modalTabRow, { backgroundColor: cardBg, borderBottomColor: `${sub}35` }]}>
            <TouchableOpacity
              style={[rewardsStyles.modalTabBtn, activeTab === 'history' && [rewardsStyles.modalTabBtnActive, { borderBottomColor: primary }]]}
              onPress={() => onTabChange('history')}
            >
              <Text style={[rewardsStyles.modalTabText, { color: activeTab === 'history' ? primary : sub }]}>History</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[rewardsStyles.modalTabBtn, activeTab === 'badges' && [rewardsStyles.modalTabBtnActive, { borderBottomColor: primary }]]}
              onPress={() => onTabChange('badges')}
            >
              <Text style={[rewardsStyles.modalTabText, { color: activeTab === 'badges' ? primary : sub }]}>Badges</Text>
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
                    <TouchableOpacity key={`history-badge-${b.id}`} style={[rewardsStyles.nativeBadgeCard, { backgroundColor: cardBg, opacity: b.earned ? 1 : 0.82, borderColor: `${primary}28` }]} onPress={() => onSelectBadge(b)}>
                      <View style={[rewardsStyles.nativeBadgeIconWrap, { backgroundColor: b.earned ? `${primary}18` : undefined }]}>
                        <Ionicons name={b.earned ? 'trophy' : 'lock-closed'} size={26} color={b.earned ? primary : sub} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[rewardsStyles.nativeBadgeTitle, { color: text }]}>{b.name}</Text>
                        <Text style={[rewardsStyles.nativeBadgeDesc, { color: sub }]}>{b.description}</Text>
                        {!b.earned && (
                          <>
                            <View style={rewardsStyles.nativeProgressTrack}>
                              <LinearGradient colors={[primary, `${primary}99`]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={[rewardsStyles.nativeProgressFill, { width: `${Math.min(100, Math.max(0, b.progress ?? 0))}%` }]} />
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

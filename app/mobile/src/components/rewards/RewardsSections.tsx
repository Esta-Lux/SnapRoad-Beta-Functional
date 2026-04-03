import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Skeleton from '../common/Skeleton';
import type { Badge, Challenge, Offer, Trip, WeeklyInsights } from '../../types';
import type { GemTx, LeaderboardEntry } from './types';
import { rewardsStyles } from './styles';

type ThemeProps = {
  cardBg: string;
  text: string;
  sub: string;
  border: string;
  primary: string;
  success: string;
  danger: string;
  warning: string;
};

export function formatCompactGems(gems: number): string {
  if (!Number.isFinite(gems)) return '0';
  if (gems >= 1_000_000) return `${(gems / 1_000_000).toFixed(1)}M`;
  if (gems >= 10_000) return `${Math.round(gems / 1000)}k`;
  if (gems >= 1000) return `${(gems / 1000).toFixed(1)}k`;
  return String(Math.round(gems));
}

export function ViewAllButton({
  title,
  onPress,
  cardBg,
  text,
  sub,
  border,
  primary,
  success: _s,
  danger: _d,
  warning: _w,
}: ThemeProps & { title: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[rewardsStyles.viewAllBtn, { backgroundColor: cardBg, borderWidth: 1, borderColor: border }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: `${primary}18`, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="arrow-forward-circle" size={18} color={primary} />
        </View>
        <Text style={[rewardsStyles.viewAllBtnText, { color: text }]}>{title}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={sub} />
    </TouchableOpacity>
  );
}

export function SectionTitle({ title, text, accent }: { title: string; text: string; accent: string }) {
  return (
    <View style={{ paddingHorizontal: 16, marginTop: 22, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={{ width: 4, height: 22, borderRadius: 2, backgroundColor: accent }} />
      <Text style={[rewardsStyles.sectionTitle, { color: text, marginTop: 0, marginBottom: 0, paddingHorizontal: 0, flex: 1 }]}>{title}</Text>
    </View>
  );
}

export function ChallengesPreview({
  loading,
  challenges,
  claimingChallengeId,
  onClaim,
  cardBg,
  text,
  sub,
  border,
  primary,
  success,
  danger: _d,
  warning: _w,
}: ThemeProps & {
  loading: boolean;
  challenges: Challenge[];
  claimingChallengeId: string | null;
  onClaim: (challenge: Challenge) => void;
}) {
  if (loading) {
    return <View style={{ paddingHorizontal: 16, gap: 8 }}>{[1, 2].map((i) => <Skeleton key={i} width="100%" height={70} borderRadius={12} />)}</View>;
  }
  if (challenges.length === 0) {
    return (
      <View style={[rewardsStyles.emptyCard, { backgroundColor: cardBg, borderWidth: 1, borderColor: border }]}>
        <Ionicons name="flag-outline" size={36} color={sub} style={{ marginBottom: 8 }} />
        <Text style={{ color: sub, fontSize: 14, fontWeight: '600' }}>No active challenges</Text>
      </View>
    );
  }
  return (
    <>
      {challenges.slice(0, 6).map((c) => {
        const goal = Number(c.goal ?? c.target ?? 1);
        const claimed = Boolean(c.claimed);
        const pct = Math.min(100, (c.progress / goal) * 100);
        return (
          <View key={c.id} style={[rewardsStyles.challengeCard, { backgroundColor: cardBg, borderWidth: 1, borderColor: border }]}>
            <LinearGradient colors={[`${primary}50`, `${primary}08`]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, borderTopLeftRadius: 16, borderBottomLeftRadius: 16 }} />
            <View style={{ flex: 1 }}>
              <Text style={[rewardsStyles.challengeTitle, { color: text }]}>{c.title}</Text>
              <View style={[rewardsStyles.progressTrack, { overflow: 'hidden' }]}>
                <LinearGradient
                  colors={[primary, `${primary}bb`]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={{ height: 6, width: `${pct}%`, borderRadius: 3 }}
                />
              </View>
              <Text style={{ color: sub, fontSize: 11, fontWeight: '600' }}>{c.progress}/{goal} · +{c.gems} gems</Text>
            </View>
            {c.completed && !claimed ? (
              <TouchableOpacity
                style={[rewardsStyles.claimBtn, { backgroundColor: success }, claimingChallengeId === c.id && { opacity: 0.6 }]}
                disabled={claimingChallengeId === c.id}
                onPress={() => onClaim(c)}
              >
                <Text style={rewardsStyles.claimBtnText}>{claimingChallengeId === c.id ? 'Claiming...' : 'Claim'}</Text>
              </TouchableOpacity>
            ) : claimed ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="checkmark-circle" size={18} color={success} />
                <Text style={{ color: success, fontSize: 12, fontWeight: '800' }}>Claimed</Text>
              </View>
            ) : null}
          </View>
        );
      })}
    </>
  );
}

export function BadgesPreview({
  loading,
  badges,
  onPressBadge,
  cardBg,
  text,
  border,
  primary,
  sub,
  success: _s,
  danger: _d,
  warning: _w,
}: {
  loading: boolean;
  badges: Badge[];
  onPressBadge: (badge: Badge) => void;
} & Pick<ThemeProps, 'cardBg' | 'text' | 'border' | 'primary' | 'sub' | 'success' | 'danger' | 'warning'>) {
  if (loading) {
    return <View style={{ paddingHorizontal: 16, flexDirection: 'row', gap: 8 }}>{[1, 2, 3].map((i) => <Skeleton key={i} width={100} height={100} borderRadius={12} />)}</View>;
  }
  return (
    <View style={rewardsStyles.badgesGrid}>
      {badges.slice(0, 12).map((b) => (
        <TouchableOpacity
          key={b.id}
          style={[
            rewardsStyles.badgeItem,
            {
              backgroundColor: cardBg,
              opacity: b.earned ? 1 : 0.55,
              borderColor: b.earned ? `${primary}55` : border,
              borderWidth: 1,
            },
          ]}
          onPress={() => onPressBadge(b)}
          activeOpacity={0.8}
        >
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: b.earned ? `${primary}22` : `${sub}18`, justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name={b.earned ? 'trophy' : 'lock-closed'} size={24} color={b.earned ? primary : sub} />
          </View>
          <Text style={[rewardsStyles.badgeName, { color: text }]} numberOfLines={1}>{b.name}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function OffersPreview({
  loading,
  offers,
  onPressOffer,
  cardBg,
  text,
  sub,
  border,
  primary,
  success,
}: ThemeProps & {
  loading: boolean;
  offers: Offer[];
  onPressOffer: (offer: Offer) => void;
}) {
  if (loading) {
    return <View style={{ paddingHorizontal: 16, gap: 8 }}>{[1, 2].map((i) => <Skeleton key={i} width="100%" height={70} borderRadius={12} />)}</View>;
  }
  if (offers.length === 0) {
    return (
      <View style={[rewardsStyles.emptyCard, { backgroundColor: cardBg, borderWidth: 1, borderColor: border }]}>
        <Ionicons name="pricetag-outline" size={36} color={sub} style={{ marginBottom: 8 }} />
        <Text style={{ color: sub, fontSize: 14, fontWeight: '600' }}>No offers nearby</Text>
        <Text style={{ color: sub, fontSize: 12, marginTop: 4, opacity: 0.85 }}>Check the map for partner deals when you drive</Text>
      </View>
    );
  }
  return (
    <>
      {offers.slice(0, 6).map((o) => (
        <TouchableOpacity
          key={o.id}
          style={[rewardsStyles.offerCard, { backgroundColor: cardBg, borderWidth: 1, borderColor: border }]}
          onPress={() => onPressOffer(o)}
          activeOpacity={0.82}
        >
          <LinearGradient colors={[`${success}35`, `${success}08`]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, borderTopLeftRadius: 16, borderBottomLeftRadius: 16 }} />
          <View style={{ flex: 1, paddingLeft: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <View style={{ backgroundColor: `${primary}20`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                <Text style={{ color: primary, fontSize: 11, fontWeight: '900' }}>{o.discount_percent ?? 0}%</Text>
              </View>
              <Text style={[rewardsStyles.offerBiz, { color: text, flex: 1 }]} numberOfLines={1}>{o.business_name}</Text>
            </View>
            <Text style={{ color: sub, fontSize: 12 }} numberOfLines={2}>{o.description ?? `${o.discount_percent}% off`}</Text>
            {o.distance_km != null && <Text style={{ color: sub, fontSize: 11, marginTop: 4, fontWeight: '600' }}>{Number(o.distance_km).toFixed(1)} km away</Text>}
          </View>
          <View style={{ alignItems: 'flex-end', gap: 6, justifyContent: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${success}18`, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 }}>
              <Ionicons name="diamond-outline" size={14} color={success} />
              <Text style={{ color: success, fontSize: 13, fontWeight: '800' }}>+{o.gems_reward ?? 0}</Text>
            </View>
            <Text style={{ color: o.redeemed ? success : sub, fontSize: 11, fontWeight: '700' }}>{o.redeemed ? 'Redeemed' : 'Tap to view'}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </>
  );
}

export function GemActivityList({
  loading,
  gemTx,
  cardBg,
  text,
  sub,
  border,
  primary: _primary,
  success,
  danger,
  warning: _w,
}: ThemeProps & {
  loading: boolean;
  gemTx: GemTx[];
}) {
  if (loading) {
    return <View style={{ paddingHorizontal: 16, gap: 8 }}>{[1, 2].map((i) => <Skeleton key={i} width="100%" height={56} borderRadius={12} />)}</View>;
  }
  if (gemTx.length === 0) {
    return (
      <View style={[rewardsStyles.emptyCard, { backgroundColor: cardBg, borderWidth: 1, borderColor: border }]}>
        <Ionicons name="wallet-outline" size={32} color={sub} style={{ marginBottom: 8 }} />
        <Text style={{ color: sub, fontWeight: '600' }}>No gem activity yet</Text>
      </View>
    );
  }
  return (
    <>
      {gemTx.map((tx) => (
        <View key={tx.id} style={[rewardsStyles.tripCard, { backgroundColor: cardBg, borderWidth: 1, borderColor: border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: tx.type === 'spent' ? `${danger}15` : `${success}15`, justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name={tx.type === 'spent' ? 'arrow-down' : 'arrow-up'} size={20} color={tx.type === 'spent' ? danger : success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[rewardsStyles.tripRoute, { color: text }]} numberOfLines={1}>{tx.source}</Text>
              <Text style={{ color: sub, fontSize: 11, fontWeight: '600' }}>{tx.date ? new Date(tx.date).toLocaleString() : 'Recently'}</Text>
            </View>
          </View>
          <Text style={{ color: tx.type === 'spent' ? danger : success, fontWeight: '900', fontSize: 16 }}>
            {tx.type === 'spent' ? '-' : '+'}{tx.amount}
          </Text>
        </View>
      ))}
    </>
  );
}

export function TripsList({
  loading,
  trips,
  cardBg,
  text,
  sub,
  border,
  primary,
  success,
  warning,
}: ThemeProps & {
  loading: boolean;
  trips: Trip[];
}) {
  if (loading) {
    return <View style={{ paddingHorizontal: 16, gap: 8 }}>{[1, 2].map((i) => <Skeleton key={i} width="100%" height={60} borderRadius={12} />)}</View>;
  }
  if (trips.length === 0) {
    return (
      <View style={[rewardsStyles.emptyCard, { backgroundColor: cardBg, borderWidth: 1, borderColor: border }]}>
        <Ionicons name="car-outline" size={36} color={sub} style={{ marginBottom: 8 }} />
        <Text style={{ color: sub, fontWeight: '600' }}>No trips yet</Text>
      </View>
    );
  }
  return (
    <>
      {trips.slice(0, 5).map((t) => (
        <View key={t.id} style={[rewardsStyles.tripCard, { backgroundColor: cardBg, borderWidth: 1, borderColor: border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Ionicons name="navigate" size={16} color={primary} />
            <Text style={[rewardsStyles.tripRoute, { color: text, flex: 1 }]} numberOfLines={2}>{t.origin} → {t.destination}</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
            <Text style={{ color: sub, fontSize: 11, fontWeight: '600' }}>{t.distance_miles != null ? `${t.distance_miles.toFixed(1)} mi` : '—'}</Text>
            <Text style={{ color: sub, fontSize: 11, fontWeight: '600' }}>{t.duration_minutes ?? '—'} min</Text>
            <View style={{ backgroundColor: `${success}22`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
              <Text style={{ color: success, fontSize: 11, fontWeight: '800' }}>Safety {t.safety_score ?? '—'}</Text>
            </View>
            <View style={{ backgroundColor: `${warning}22`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
              <Text style={{ color: warning, fontSize: 11, fontWeight: '800' }}>+{t.gems_earned ?? 0} gems</Text>
            </View>
          </View>
        </View>
      ))}
    </>
  );
}

export function WeeklyInsightsSection({
  insights,
  cardBg,
  text,
  sub,
  border,
  primary,
  success,
  warning,
  danger: _danger,
}: ThemeProps & {
  insights: WeeklyInsights;
}) {
  return (
    <View style={[rewardsStyles.insightsCard, { backgroundColor: cardBg, borderWidth: 1, borderColor: border }]}>
      <LinearGradient colors={[`${primary}14`, 'transparent']} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 120, borderTopLeftRadius: 16, borderTopRightRadius: 16 }} pointerEvents="none" />
      <View style={rewardsStyles.insightsRow}>
        <View style={rewardsStyles.insightItem}><Text style={[rewardsStyles.insightVal, { color: text }]}>{insights.total_trips}</Text><Text style={{ color: sub, fontSize: 10, fontWeight: '600' }}>Trips</Text></View>
        <View style={rewardsStyles.insightItem}><Text style={[rewardsStyles.insightVal, { color: text }]}>{Math.round(insights.total_miles ?? 0)}</Text><Text style={{ color: sub, fontSize: 10, fontWeight: '600' }}>Miles</Text></View>
        <View style={rewardsStyles.insightItem}><Text style={[rewardsStyles.insightVal, { color: warning }]}>{insights.gems_earned_week}</Text><Text style={{ color: sub, fontSize: 10, fontWeight: '600' }}>Gems</Text></View>
        <View style={rewardsStyles.insightItem}><Text style={[rewardsStyles.insightVal, { color: success }]}>{insights.safety_score_avg}</Text><Text style={{ color: sub, fontSize: 10, fontWeight: '600' }}>Safety</Text></View>
      </View>
      {insights.ai_tip && (
        <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: border }}>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
            <Ionicons name="sparkles" size={16} color={primary} style={{ marginTop: 2 }} />
            <Text style={{ color: sub, fontSize: 13, lineHeight: 19, flex: 1, fontWeight: '500' }}>{insights.ai_tip}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

export type LeaderboardTimeFilter = 'all_time' | 'weekly' | 'monthly' | 'all';

export function LeaderboardPreview({
  loading,
  entries,
  myRank,
  myGems,
  text,
  sub,
  cardBg,
  border,
  primary,
  success: _success,
  danger: _danger,
  warning: _warning,
  timeFilter = 'weekly',
  onTimeFilterChange,
  headerGradient,
  gemsAccent,
}: {
  loading: boolean;
  entries: LeaderboardEntry[];
  myRank: number;
  myGems: number;
  timeFilter?: LeaderboardTimeFilter;
  onTimeFilterChange?: (t: LeaderboardTimeFilter) => void;
  headerGradient: readonly [string, string];
  gemsAccent: string;
} & ThemeProps) {
  const subLabels: Record<LeaderboardTimeFilter, string> = {
    all_time: 'Ranked by lifetime miles',
    weekly: 'Ranked by safety score',
    monthly: 'Ranked by level & gems',
    all: 'Ranked by gems · all states',
  };

  if (loading && entries.length === 0) {
    return <View style={{ paddingHorizontal: 16, gap: 8 }}>{[1, 2].map((i) => <Skeleton key={i} width="100%" height={68} borderRadius={14} />)}</View>;
  }
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3, 10);
  const first = top3.find((e) => e.rank === 1) || top3[0];
  const second = top3.find((e) => e.rank === 2);
  const third = top3.find((e) => e.rank === 3);

  const chips: { key: LeaderboardTimeFilter; label: string }[] = [
    { key: 'all_time', label: 'All Time' },
    { key: 'weekly', label: 'Week' },
    { key: 'monthly', label: 'Month' },
    { key: 'all', label: 'All' },
  ];

  const headerColors: [string, string] = [headerGradient[0], headerGradient[1]];
  return (
    <>
      <LinearGradient colors={headerColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={rewardsStyles.leaderboardHeader}>
        <Text style={rewardsStyles.leaderboardHeaderTitle}>Leaderboard</Text>
        <Text style={rewardsStyles.leaderboardSub}>{subLabels[timeFilter]}</Text>
        <View style={rewardsStyles.leaderboardChipRow}>
          {chips.map((c) => {
            const active = timeFilter === c.key;
            return (
              <TouchableOpacity
                key={c.key}
                activeOpacity={0.85}
                disabled={!onTimeFilterChange}
                onPress={() => onTimeFilterChange?.(c.key)}
                style={active ? rewardsStyles.leaderboardChipActive : rewardsStyles.leaderboardChip}
              >
                <Text style={rewardsStyles.leaderboardChipText}>{c.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={rewardsStyles.leaderboardRankRow}>
          <Text style={rewardsStyles.leaderboardRankText}>Your rank #{myRank || '--'}</Text>
          <Text style={rewardsStyles.leaderboardRankGems}>{myGems} gems</Text>
        </View>
      </LinearGradient>
      {!!first && (
        <View style={rewardsStyles.podiumRow}>
          <View style={rewardsStyles.podiumCol}>
            {second ? (
              <>
                <View style={[rewardsStyles.podiumAvatar, { backgroundColor: '#94A3B8' }]}><Text style={rewardsStyles.podiumLetter}>{second.name.charAt(0).toUpperCase()}</Text></View>
                <View style={[rewardsStyles.podiumBase, { height: 84, backgroundColor: '#94A3B8' }]}>
                  <Text style={rewardsStyles.podiumRank}>2</Text>
                </View>
                <Text style={[rewardsStyles.podiumName, { color: text }]} numberOfLines={1}>{second.name}</Text>
              </>
            ) : <View />}
          </View>
          <View style={rewardsStyles.podiumCol}>
            <View style={[rewardsStyles.podiumAvatar, { backgroundColor: '#EAB308' }]}><Text style={rewardsStyles.podiumLetter}>{first.name.charAt(0).toUpperCase()}</Text></View>
            <View style={[rewardsStyles.podiumBase, { height: 112, backgroundColor: '#EAB308' }]}>
              <Text style={rewardsStyles.podiumRank}>1</Text>
              <Text style={rewardsStyles.podiumPts}>{first.safety_score} pts</Text>
            </View>
            <Text style={[rewardsStyles.podiumName, { color: text }]} numberOfLines={1}>{first.name}</Text>
          </View>
          <View style={rewardsStyles.podiumCol}>
            {third ? (
              <>
                <View style={[rewardsStyles.podiumAvatar, { backgroundColor: '#B45309' }]}><Text style={rewardsStyles.podiumLetter}>{third.name.charAt(0).toUpperCase()}</Text></View>
                <View style={[rewardsStyles.podiumBase, { height: 72, backgroundColor: '#B45309' }]}>
                  <Text style={rewardsStyles.podiumRank}>3</Text>
                </View>
                <Text style={[rewardsStyles.podiumName, { color: text }]} numberOfLines={1}>{third.name}</Text>
              </>
            ) : <View />}
          </View>
        </View>
      )}
      {rest.slice(0, 4).map((e) => (
        <View key={`${e.id}-${e.rank}`} style={[rewardsStyles.leaderboardItem, { backgroundColor: cardBg, borderWidth: 1, borderColor: border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ minWidth: 36, height: 36, borderRadius: 10, backgroundColor: `${primary}18`, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: primary, fontSize: 15, fontWeight: '900' }}>{e.rank}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[rewardsStyles.leaderboardName, { color: text }]}>{e.name}</Text>
              <Text style={[rewardsStyles.leaderboardMeta, { color: sub }]}>
                {e.safety_score} safety · Lvl {e.level}{e.state ? ` · ${e.state}` : ''}
              </Text>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: gemsAccent, fontSize: 16, fontWeight: '900' }}>{formatCompactGems(e.gems)}</Text>
            <Text style={{ color: sub, fontSize: 10, fontWeight: '700' }}>gems</Text>
          </View>
        </View>
      ))}
    </>
  );
}

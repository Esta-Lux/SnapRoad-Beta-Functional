import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
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
};

export function ViewAllButton({
  title,
  onPress,
  cardBg,
  text,
  sub,
}: ThemeProps & { title: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={[rewardsStyles.viewAllBtn, { backgroundColor: cardBg }]} onPress={onPress}>
      <Text style={[rewardsStyles.viewAllBtnText, { color: text }]}>{title}</Text>
      <Ionicons name="chevron-forward" size={16} color={sub} />
    </TouchableOpacity>
  );
}

export function SectionTitle({ title, text }: { title: string; text: string }) {
  return <Text style={[rewardsStyles.sectionTitle, { color: text }]}>{title}</Text>;
}

export function ChallengesPreview({
  loading,
  challenges,
  claimingChallengeId,
  onClaim,
  cardBg,
  text,
  sub,
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
    return <View style={[rewardsStyles.emptyCard, { backgroundColor: cardBg }]}><Text style={{ color: sub }}>No active challenges</Text></View>;
  }
  return (
    <>
      {challenges.slice(0, 6).map((c) => {
        const goal = Number(c.goal ?? c.target ?? 1);
        const claimed = Boolean(c.claimed);
        return (
          <View key={c.id} style={[rewardsStyles.challengeCard, { backgroundColor: cardBg }]}>
            <View style={{ flex: 1 }}>
              <Text style={[rewardsStyles.challengeTitle, { color: text }]}>{c.title}</Text>
              <View style={rewardsStyles.progressTrack}>
                <View style={[rewardsStyles.progressBar, { width: `${Math.min(100, (c.progress / goal) * 100)}%` }]} />
              </View>
              <Text style={{ color: sub, fontSize: 11 }}>{c.progress}/{goal} · +{c.gems} gems</Text>
            </View>
            {c.completed && !claimed ? (
              <TouchableOpacity
                style={[rewardsStyles.claimBtn, claimingChallengeId === c.id && { opacity: 0.6 }]}
                disabled={claimingChallengeId === c.id}
                onPress={() => onClaim(c)}
              >
                <Text style={rewardsStyles.claimBtnText}>{claimingChallengeId === c.id ? 'Claiming...' : 'Claim'}</Text>
              </TouchableOpacity>
            ) : claimed ? (
              <Text style={{ color: '#22C55E', fontSize: 12, fontWeight: '700' }}>Claimed</Text>
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
}: {
  loading: boolean;
  badges: Badge[];
  onPressBadge: (badge: Badge) => void;
} & Pick<ThemeProps, 'cardBg' | 'text'>) {
  if (loading) {
    return <View style={{ paddingHorizontal: 16, flexDirection: 'row', gap: 8 }}>{[1, 2, 3].map((i) => <Skeleton key={i} width={100} height={100} borderRadius={12} />)}</View>;
  }
  return (
    <View style={rewardsStyles.badgesGrid}>
      {badges.slice(0, 12).map((b) => (
        <TouchableOpacity key={b.id} style={[rewardsStyles.badgeItem, { backgroundColor: cardBg, opacity: b.earned ? 1 : 0.4 }]} onPress={() => onPressBadge(b)}>
          <Text style={{ fontSize: 28 }}>{b.earned ? '🏆' : '🔒'}</Text>
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
}: ThemeProps & {
  loading: boolean;
  offers: Offer[];
  onPressOffer: (offer: Offer) => void;
}) {
  if (loading) {
    return <View style={{ paddingHorizontal: 16, gap: 8 }}>{[1, 2].map((i) => <Skeleton key={i} width="100%" height={70} borderRadius={12} />)}</View>;
  }
  if (offers.length === 0) {
    return <View style={[rewardsStyles.emptyCard, { backgroundColor: cardBg }]}><Text style={{ color: sub }}>No offers nearby</Text></View>;
  }
  return (
    <>
      {offers.slice(0, 6).map((o) => (
        <TouchableOpacity key={o.id} style={[rewardsStyles.offerCard, { backgroundColor: cardBg }]} onPress={() => onPressOffer(o)}>
          <View style={{ flex: 1 }}>
            <Text style={[rewardsStyles.offerBiz, { color: text }]}>{o.business_name}</Text>
            <Text style={{ color: sub, fontSize: 12 }}>{o.description ?? `${o.discount_percent}% off`}</Text>
            {o.distance_km != null && <Text style={{ color: sub, fontSize: 11, marginTop: 2 }}>{o.distance_km} km away</Text>}
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <Text style={{ color: '#16A34A', fontSize: 12, fontWeight: '700' }}>+{o.gems_reward ?? 0} gems</Text>
            <Text style={{ color: o.redeemed ? '#22C55E' : sub, fontSize: 11 }}>{o.redeemed ? 'Redeemed' : 'Tap to view'}</Text>
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
}: ThemeProps & {
  loading: boolean;
  gemTx: GemTx[];
}) {
  if (loading) {
    return <View style={{ paddingHorizontal: 16, gap: 8 }}>{[1, 2].map((i) => <Skeleton key={i} width="100%" height={56} borderRadius={12} />)}</View>;
  }
  if (gemTx.length === 0) {
    return <View style={[rewardsStyles.emptyCard, { backgroundColor: cardBg }]}><Text style={{ color: sub }}>No gem activity yet</Text></View>;
  }
  return (
    <>
      {gemTx.map((tx) => (
        <View key={tx.id} style={[rewardsStyles.tripCard, { backgroundColor: cardBg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
          <View>
            <Text style={[rewardsStyles.tripRoute, { color: text }]} numberOfLines={1}>{tx.source}</Text>
            <Text style={{ color: sub, fontSize: 11 }}>{tx.date ? new Date(tx.date).toLocaleString() : 'Recently'}</Text>
          </View>
          <Text style={{ color: tx.type === 'spent' ? '#EF4444' : '#16A34A', fontWeight: '800' }}>
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
}: ThemeProps & {
  loading: boolean;
  trips: Trip[];
}) {
  if (loading) {
    return <View style={{ paddingHorizontal: 16, gap: 8 }}>{[1, 2].map((i) => <Skeleton key={i} width="100%" height={60} borderRadius={12} />)}</View>;
  }
  if (trips.length === 0) {
    return <View style={[rewardsStyles.emptyCard, { backgroundColor: cardBg }]}><Text style={{ color: sub }}>No trips yet</Text></View>;
  }
  return (
    <>
      {trips.slice(0, 5).map((t) => (
        <View key={t.id} style={[rewardsStyles.tripCard, { backgroundColor: cardBg }]}>
          <Text style={[rewardsStyles.tripRoute, { color: text }]}>{t.origin} {'→'} {t.destination}</Text>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
            <Text style={{ color: sub, fontSize: 11 }}>{t.distance_miles?.toFixed(1)} mi</Text>
            <Text style={{ color: sub, fontSize: 11 }}>{t.duration_minutes} min</Text>
            <Text style={{ color: '#22C55E', fontSize: 11, fontWeight: '700' }}>{t.safety_score}</Text>
            <Text style={{ color: '#F59E0B', fontSize: 11 }}>+{t.gems_earned}</Text>
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
}: ThemeProps & {
  insights: WeeklyInsights;
}) {
  return (
    <View style={[rewardsStyles.insightsCard, { backgroundColor: cardBg }]}>
      <View style={rewardsStyles.insightsRow}>
        <View style={rewardsStyles.insightItem}><Text style={[rewardsStyles.insightVal, { color: text }]}>{insights.total_trips}</Text><Text style={{ color: sub, fontSize: 10 }}>Trips</Text></View>
        <View style={rewardsStyles.insightItem}><Text style={[rewardsStyles.insightVal, { color: text }]}>{Math.round(insights.total_miles ?? 0)}</Text><Text style={{ color: sub, fontSize: 10 }}>Miles</Text></View>
        <View style={rewardsStyles.insightItem}><Text style={[rewardsStyles.insightVal, { color: '#F59E0B' }]}>{insights.gems_earned_week}</Text><Text style={{ color: sub, fontSize: 10 }}>Gems</Text></View>
        <View style={rewardsStyles.insightItem}><Text style={[rewardsStyles.insightVal, { color: '#22C55E' }]}>{insights.safety_score_avg}</Text><Text style={{ color: sub, fontSize: 10 }}>Safety</Text></View>
      </View>
      {insights.ai_tip && <Text style={{ color: sub, fontSize: 12, marginTop: 10 }}>{insights.ai_tip}</Text>}
    </View>
  );
}

export function LeaderboardPreview({
  loading,
  entries,
  myRank,
  myGems,
  text,
  sub,
  cardBg,
}: {
  loading: boolean;
  entries: LeaderboardEntry[];
  myRank: number;
  myGems: number;
} & ThemeProps) {
  if (loading) {
    return <View style={{ paddingHorizontal: 16, gap: 8 }}>{[1, 2].map((i) => <Skeleton key={i} width="100%" height={68} borderRadius={14} />)}</View>;
  }
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3, 10);
  const first = top3.find((e) => e.rank === 1) || top3[0];
  const second = top3.find((e) => e.rank === 2);
  const third = top3.find((e) => e.rank === 3);

  return (
    <>
      <LinearGradient colors={['#10B981', '#0F766E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={rewardsStyles.leaderboardHeader}>
        <Text style={rewardsStyles.leaderboardHeaderTitle}>Leaderboard</Text>
        <Text style={rewardsStyles.leaderboardSub}>Top 10 by state · Weekly</Text>
        <View style={rewardsStyles.leaderboardChipRow}>
          <View style={rewardsStyles.leaderboardChip}><Text style={rewardsStyles.leaderboardChipText}>All Time</Text></View>
          <View style={rewardsStyles.leaderboardChipActive}><Text style={rewardsStyles.leaderboardChipText}>Week</Text></View>
          <View style={rewardsStyles.leaderboardChip}><Text style={rewardsStyles.leaderboardChipText}>Month</Text></View>
          <View style={rewardsStyles.leaderboardChip}><Text style={rewardsStyles.leaderboardChipText}>All</Text></View>
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
        <View key={`${e.id}-${e.rank}`} style={[rewardsStyles.leaderboardItem, { backgroundColor: cardBg }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ color: sub, fontSize: 18, fontWeight: '800' }}>#{e.rank}</Text>
            <View>
              <Text style={[rewardsStyles.leaderboardName, { color: text }]}>{e.name}</Text>
              <Text style={[rewardsStyles.leaderboardMeta, { color: sub }]}>
                {e.safety_score} safety · Lvl {e.level}{e.state ? ` · ${e.state}` : ''}
              </Text>
            </View>
          </View>
          <Text style={{ color: '#22D3EE', fontSize: 16, fontWeight: '800' }}>{Math.round(e.gems / 1000)}.{Math.abs(Math.round((e.gems % 1000) / 100))}k</Text>
        </View>
      ))}
    </>
  );
}

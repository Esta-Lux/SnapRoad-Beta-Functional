import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../hooks/useLocation';
import { api } from '../api/client';
import type { Challenge, Badge, Offer, Trip, WeeklyInsights } from '../types';
import RewardsHeader from '../components/rewards/RewardsHeader';
import RewardsTabs from '../components/rewards/RewardsTabs';
import {
  ViewAllButton,
  SectionTitle,
  ChallengesPreview,
  BadgesPreview,
  OffersPreview,
  GemActivityList,
  TripsList,
  WeeklyInsightsSection,
  LeaderboardPreview,
} from '../components/rewards/RewardsSections';
import {
  BadgeDetailModal,
  OfferDetailModal,
  AllOffersModal,
  ChallengeHistoryModal,
} from '../components/rewards/RewardsModals';
import { rewardsStyles } from '../components/rewards/styles';
import TripAnalytics from '../components/gamification/TripAnalytics';
import RouteHistory from '../components/gamification/RouteHistory';
import ChallengeModal from '../components/gamification/ChallengeModal';
import type {
  RewardsTab,
  GemTx,
  ChallengeHistoryItem,
  ChallengeHistoryStats,
  ChallengeModalTab,
  LeaderboardEntry,
} from '../components/rewards/types';

export default function RewardsScreen() {
  const { colors } = useTheme();
  const { user, updateUser } = useAuth();
  const { location } = useLocation();
  const insets = useSafeAreaInsets();
  const bg = colors.background;
  const cardBg = colors.card;
  const text = colors.text;
  const sub = colors.textSecondary;

  const [loading, setLoading] = useState(true);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [insights, setInsights] = useState<WeeklyInsights | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [rewardsTab, setRewardsTab] = useState<RewardsTab>('offers');
  const [claimingChallengeId, setClaimingChallengeId] = useState<string | null>(null);
  const [redeemingOfferId, setRedeemingOfferId] = useState<number | null>(null);
  const [gemTx, setGemTx] = useState<GemTx[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showAllOffers, setShowAllOffers] = useState(false);
  const [showChallengeHistory, setShowChallengeHistory] = useState(false);
  const [challengeModalTab, setChallengeModalTab] = useState<ChallengeModalTab>('history');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [challengeHistoryItems, setChallengeHistoryItems] = useState<ChallengeHistoryItem[]>([]);
  const [challengeHistoryStats, setChallengeHistoryStats] = useState<ChallengeHistoryStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState(0);
  const [showTripAnalytics, setShowTripAnalytics] = useState(false);
  const [showRouteHistory, setShowRouteHistory] = useState(false);
  const [challengeTarget, setChallengeTarget] = useState<{ id: string; name: string } | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [profileRes, cRes, bRes, oRes, tRes, iRes, gRes, lRes] = await Promise.all([
        api.getProfile(),
        api.get<any>('/api/challenges'),
        api.get<any>('/api/badges'),
        api.get<any>(`/api/offers/nearby?lat=${location.lat}&lng=${location.lng}&radius=5`),
        api.get<any>('/api/trips?limit=10'),
        api.get<any>('/api/trips/weekly-insights'),
        api.get<any>('/api/gems/history'),
        api.get<any>('/api/leaderboard?time_filter=weekly&limit=10'),
      ]);
      const unwrap = (r: any) => r?.data?.data ?? r?.data ?? [];
      const profilePayload = (profileRes?.data as any)?.data ?? profileRes?.data ?? {};
      updateUser({
        gems: Number(profilePayload.gems ?? 0),
        level: Number(profilePayload.level ?? 1),
        totalMiles: Number(profilePayload.total_miles ?? 0),
        totalTrips: Number(profilePayload.total_trips ?? 0),
      });
      const rawChallenges = Array.isArray(unwrap(cRes)) ? unwrap(cRes) : [];
      setChallenges(rawChallenges.map((c: any) => ({
        ...c,
        id: String(c.id),
        goal: Number(c.goal ?? c.target ?? 1),
        progress: Number(c.progress ?? 0),
        gems: Number(c.gems ?? 0),
        completed: Boolean(c.completed),
        claimed: Boolean(c.claimed),
      })));
      const bData = unwrap(bRes);
      setBadges(Array.isArray(bData) ? bData : (bData?.badges ?? []));
      setOffers(Array.isArray(unwrap(oRes)) ? unwrap(oRes) : []);
      setTrips(Array.isArray(unwrap(tRes)) ? unwrap(tRes) : []);
      const iData = iRes?.data?.data ?? iRes?.data;
      setInsights(iData && typeof iData === 'object' ? iData as WeeklyInsights : null);
      const gData = gRes?.data?.data ?? gRes?.data;
      const tx = Array.isArray(gData?.recent_transactions) ? gData.recent_transactions : [];
      setGemTx(tx.slice(0, 6).map((t: any, i: number) => ({
        id: String(t.id ?? i),
        type: t.type === 'earned' || t.type === 'spent' ? t.type : 'unknown',
        amount: Number(t.amount ?? 0),
        source: String(t.source ?? 'Transaction'),
        date: String(t.date ?? ''),
      })));
      const lData = lRes?.data?.data ?? lRes?.data ?? {};
      const rows = Array.isArray(lData?.leaderboard) ? lData.leaderboard : [];
      setLeaderboard(rows.map((r: any, idx: number) => ({
        rank: Number(r.rank ?? idx + 1),
        id: String(r.id ?? idx),
        name: String(r.name ?? 'Driver'),
        safety_score: Number(r.safety_score ?? 0),
        level: Number(r.level ?? 1),
        gems: Number(r.gems ?? 0),
        state: String(r.state ?? ''),
        is_premium: Boolean(r.is_premium),
      })));
      setMyRank(Number(lData?.my_rank ?? 0));
      updateUser({ rank: Number(lData?.my_rank ?? 0) });
    } catch {
      setErrorMsg('Could not refresh rewards data. Pull to retry.');
    } finally { setLoading(false); }
  }, [location.lat, location.lng, updateUser]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const earnedBadges = badges.filter((b) => b.earned).length;
  const multiplier = user?.isPremium ? '2x' : '1x';

  const handleClaimChallenge = useCallback(async (challenge: Challenge) => {
    setClaimingChallengeId(challenge.id);
    setErrorMsg(null);
    try {
      const res = await api.post<any>(`/api/challenges/${challenge.id}/claim`);
      if (!res.success) {
        setErrorMsg(res.error || 'Could not claim challenge reward.');
        return;
      }
      const earned = Number((res.data as any)?.data?.gems_earned ?? challenge.gems ?? 0);
      setChallenges((prev) => prev.map((c) => (c.id === challenge.id ? { ...c, claimed: true } : c)));
      if (user) updateUser({ gems: user.gems + earned });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } finally {
      setClaimingChallengeId(null);
    }
  }, [updateUser, user]);

  const handleRedeemOffer = useCallback(async (offer: Offer) => {
    setRedeemingOfferId(offer.id);
    setErrorMsg(null);
    try {
      const res = await api.post<any>(`/api/offers/${offer.id}/redeem`);
      if (!res.success) {
        setErrorMsg(res.error || 'Could not redeem this offer right now.');
        return;
      }
      const gemsEarned = Number((res.data as any)?.data?.gems_earned ?? 0);
      setOffers((prev) => prev.map((o) => (o.id === offer.id ? { ...o, redeemed: true } : o)));
      if (user) updateUser({ gems: user.gems + gemsEarned });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSelectedOffer(null);
    } finally {
      setRedeemingOfferId(null);
    }
  }, [updateUser, user]);

  const loadChallengeHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await api.get<any>('/api/challenges/history');
      if (!res.success) {
        setErrorMsg(res.error || 'Could not load challenge history.');
        return;
      }
      const payload = (res.data as any)?.data ?? res.data ?? {};
      const list = Array.isArray(payload?.challenges) ? payload.challenges : [];
      setChallengeHistoryItems(list.map((c: any) => ({
        id: String(c.id),
        opponent_name: String(c.opponent_name ?? 'Driver'),
        status: String(c.status ?? 'pending'),
        your_score: Number(c.your_score ?? 0),
        opponent_score: Number(c.opponent_score ?? 0),
        stake: Number(c.stake ?? 0),
        duration_hours: Number(c.duration_hours ?? 0),
      })));
      const stats = payload?.stats;
      setChallengeHistoryStats(stats ? {
        wins: Number(stats.wins ?? 0),
        losses: Number(stats.losses ?? 0),
        win_rate: Number(stats.win_rate ?? 0),
        total_gems_won: Number(stats.total_gems_won ?? 0),
        total_gems_lost: Number(stats.total_gems_lost ?? 0),
        current_streak: Number(stats.current_streak ?? 0),
        best_streak: Number(stats.best_streak ?? 0),
      } : null);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['top']}>
      <ScrollView style={{ flex: 1, backgroundColor: bg }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadAll} tintColor="#3B82F6" />}>
      <RewardsHeader
        colors={colors}
        gems={user?.gems ?? 0}
        level={user?.level ?? 1}
        multiplier={multiplier}
        miles={user?.totalMiles?.toFixed(0) ?? 0}
      />
      {errorMsg && (
        <View style={[rewardsStyles.errorBanner, { backgroundColor: cardBg }]}>
          <Ionicons name="alert-circle-outline" size={14} color="#EF4444" />
          <Text style={{ color: '#EF4444', fontSize: 12, flex: 1 }}>{errorMsg}</Text>
        </View>
      )}

      <RewardsTabs cardBg={cardBg} subText={sub} rewardsTab={rewardsTab} onTabChange={setRewardsTab} />

      {rewardsTab === 'challenges' && (
        <>
          <ViewAllButton
            title="View all challenges"
            onPress={() => {
              setChallengeModalTab('history');
              setShowChallengeHistory(true);
              loadChallengeHistory();
            }}
            cardBg={cardBg}
            text={text}
            sub={sub}
          />
          <SectionTitle title="Active Challenges" text={text} />
          <ChallengesPreview
            loading={loading}
            challenges={challenges}
            claimingChallengeId={claimingChallengeId}
            onClaim={handleClaimChallenge}
            cardBg={cardBg}
            text={text}
            sub={sub}
          />
        </>
      )}

      {rewardsTab === 'badges' && (
        <>
          <ViewAllButton
            title="View all badges"
            onPress={() => {
              setChallengeModalTab('badges');
              setShowChallengeHistory(true);
              loadChallengeHistory();
            }}
            cardBg={cardBg}
            text={text}
            sub={sub}
          />
          <SectionTitle title={`Badges · ${earnedBadges}/${badges.length}`} text={text} />
          <BadgesPreview loading={loading} badges={badges} onPressBadge={setSelectedBadge} cardBg={cardBg} text={text} />
        </>
      )}

      {rewardsTab === 'offers' && (
        <>
          <ViewAllButton title="View all offers" onPress={() => setShowAllOffers(true)} cardBg={cardBg} text={text} sub={sub} />
          <SectionTitle title="Nearby Offers" text={text} />
          <OffersPreview loading={loading} offers={offers} onPressOffer={setSelectedOffer} cardBg={cardBg} text={text} sub={sub} />
        </>
      )}

      <SectionTitle title="Recent Gem Activity" text={text} />
      <GemActivityList loading={loading} gemTx={gemTx} cardBg={cardBg} text={text} sub={sub} />

      <SectionTitle title="Recent Trips" text={text} />
      <TripsList loading={loading} trips={trips} cardBg={cardBg} text={text} sub={sub} />

      {insights && (
        <>
          <SectionTitle title="This Week" text={text} />
          <WeeklyInsightsSection insights={insights} cardBg={cardBg} text={text} sub={sub} />
        </>
      )}

      <SectionTitle title="Rank & Leaderboard" text={text} />
      <LeaderboardPreview
        loading={loading}
        entries={leaderboard}
        myRank={myRank}
        myGems={user?.gems ?? 0}
        text={text}
        sub={sub}
        cardBg={cardBg}
      />

      <View style={{ height: insets.bottom + 20 }} />

      <BadgeDetailModal selectedBadge={selectedBadge} cardBg={cardBg} text={text} sub={sub} onClose={() => setSelectedBadge(null)} />
      <OfferDetailModal
        selectedOffer={selectedOffer}
        redeemingOfferId={redeemingOfferId}
        cardBg={cardBg}
        text={text}
        sub={sub}
        onClose={() => setSelectedOffer(null)}
        onRedeem={handleRedeemOffer}
      />
      <AllOffersModal
        visible={showAllOffers}
        offers={offers}
        bg={bg}
        cardBg={cardBg}
        text={text}
        sub={sub}
        onClose={() => setShowAllOffers(false)}
        onSelectOffer={setSelectedOffer}
      />
      <ChallengeHistoryModal
        visible={showChallengeHistory}
        historyLoading={historyLoading}
        challengeHistoryStats={challengeHistoryStats}
        challengeHistoryItems={challengeHistoryItems}
        badges={badges}
        activeTab={challengeModalTab}
        bg={bg}
        cardBg={cardBg}
        text={text}
        sub={sub}
        onClose={() => setShowChallengeHistory(false)}
        onTabChange={setChallengeModalTab}
        onSelectBadge={setSelectedBadge}
      />
      </ScrollView>

      <TripAnalytics visible={showTripAnalytics} onClose={() => setShowTripAnalytics(false)} />
      <RouteHistory visible={showRouteHistory} onClose={() => setShowRouteHistory(false)} />
      <ChallengeModal visible={!!challengeTarget} onClose={() => setChallengeTarget(null)} targetFriend={challengeTarget} />
    </SafeAreaView>
  );
}

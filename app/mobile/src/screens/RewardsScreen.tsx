import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, Alert } from 'react-native';
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
  const [leaderboardTf, setLeaderboardTf] = useState<'all_time' | 'weekly' | 'monthly' | 'all'>('weekly');
  const [showTripAnalytics, setShowTripAnalytics] = useState(false);
  const [showRouteHistory, setShowRouteHistory] = useState(false);
  const [challengeTarget, setChallengeTarget] = useState<{ id: string; name: string } | null>(null);

  const loadAll = useCallback(async (coords?: { lat: number; lng: number }) => {
    setLoading(true);
    setErrorMsg(null);
    const lat = coords?.lat ?? location.lat;
    const lng = coords?.lng ?? location.lng;
    try {
      const safeGet = async (url: string) => {
        try { return await api.get<any>(url); } catch { return { success: false, data: null }; }
      };
      const [profileRes, cRes, bRes, oRes, tRes, iRes, gRes, lRes] = await Promise.all([
        api.getProfile().catch(() => ({ success: false, data: null })),
        safeGet('/api/challenges'),
        safeGet('/api/badges'),
        safeGet(`/api/offers/nearby?lat=${lat}&lng=${lng}&radius=5`),
        safeGet('/api/trips?limit=10'),
        safeGet('/api/trips/weekly-insights'),
        safeGet('/api/gems/history'),
        safeGet('/api/leaderboard?time_filter=weekly&limit=10'),
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
  }, [updateUser, location.lat, location.lng, leaderboardTf]);

  useEffect(() => {
    loadAll({ lat: location.lat, lng: location.lng });
  }, [loadAll, location.lat, location.lng]);

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
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => loadAll({ lat: location.lat, lng: location.lng })}
            tintColor="#3B82F6"
          />
        }>
      <RewardsHeader
        colors={colors}
        gems={user?.gems ?? 0}
        level={user?.level ?? 1}
        multiplier={multiplier}
        miles={String(Math.round(user?.totalMiles ?? 0))}
      />
      {errorMsg && (
        <View style={[rewardsStyles.errorBanner, { backgroundColor: cardBg }]}>
          <Ionicons name="alert-circle-outline" size={14} color="#EF4444" />
          <Text style={{ color: '#EF4444', fontSize: 12, flex: 1 }}>{errorMsg}</Text>
        </View>
      )}

      {/* Daily streak & quick stats */}
      <View style={{ flexDirection: 'row', gap: 10, marginHorizontal: 16, marginBottom: 14 }}>
        <View style={{ flex: 1, backgroundColor: cardBg, borderRadius: 16, padding: 14, alignItems: 'center' }}>
          <Ionicons name="flame" size={22} color="#F59E0B" />
          <Text style={{ color: text, fontSize: 20, fontWeight: '900', marginTop: 4 }}>{user?.totalTrips ?? 0}</Text>
          <Text style={{ color: sub, fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>Trips</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: cardBg, borderRadius: 16, padding: 14, alignItems: 'center' }}>
          <Ionicons name="trophy" size={22} color="#3B82F6" />
          <Text style={{ color: text, fontSize: 20, fontWeight: '900', marginTop: 4 }}>#{myRank || '—'}</Text>
          <Text style={{ color: sub, fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>Rank</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: cardBg, borderRadius: 16, padding: 14, alignItems: 'center' }}>
          <Ionicons name="ribbon" size={22} color="#10B981" />
          <Text style={{ color: text, fontSize: 20, fontWeight: '900', marginTop: 4 }}>{earnedBadges}</Text>
          <Text style={{ color: sub, fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>Badges</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: cardBg, borderRadius: 16, padding: 14, alignItems: 'center' }}>
          <Ionicons name="diamond" size={22} color="#8B5CF6" />
          <Text style={{ color: text, fontSize: 20, fontWeight: '900', marginTop: 4 }}>{multiplier}</Text>
          <Text style={{ color: sub, fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>Gems</Text>
        </View>
      </View>

      {!user?.isPremium && (
        <View style={{ marginHorizontal: 16, marginBottom: 14, backgroundColor: 'rgba(59,130,246,0.08)', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(59,130,246,0.2)' }}>
          <Ionicons name="diamond" size={20} color="#3B82F6" style={{ marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: text, fontSize: 14, fontWeight: '700' }}>Upgrade to Premium</Text>
            <Text style={{ color: sub, fontSize: 12 }}>2x gems, advanced offers, analytics & more</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#3B82F6" />
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
          <SectionTitle title="Nearby Partner Offers" text={text} />
          <OffersPreview loading={loading} offers={offers.filter((o: any) => !o.is_admin_offer)} onPressOffer={setSelectedOffer} cardBg={cardBg} text={text} sub={sub} />
          {offers.some((o: any) => o.is_admin_offer) && (
            <>
              <SectionTitle title="Featured Deals" text={text} />
              <OffersPreview loading={loading} offers={offers.filter((o: any) => o.is_admin_offer)} onPressOffer={setSelectedOffer} cardBg={cardBg} text={text} sub={sub} />
            </>
          )}
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

      {/* Quick action buttons */}
      <View style={{ flexDirection: 'row', gap: 12, marginHorizontal: 16, marginBottom: 16, marginTop: 8 }}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: cardBg, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(59,130,246,0.15)' }}
          onPress={() => setShowTripAnalytics(true)}
          activeOpacity={0.7}
        >
          <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(59,130,246,0.12)', justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
            <Ionicons name="analytics-outline" size={18} color="#3B82F6" />
          </View>
          <Text style={{ color: text, fontSize: 14, fontWeight: '700', flex: 1 }}>Trip Analytics</Text>
          <Ionicons name="chevron-forward" size={16} color={sub} />
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: cardBg, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(16,185,129,0.15)' }}
          onPress={() => setShowRouteHistory(true)}
          activeOpacity={0.7}
        >
          <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(16,185,129,0.12)', justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
            <Ionicons name="time-outline" size={18} color="#10B981" />
          </View>
          <Text style={{ color: text, fontSize: 14, fontWeight: '700', flex: 1 }}>Route History</Text>
          <Ionicons name="chevron-forward" size={16} color={sub} />
        </TouchableOpacity>
      </View>

      <SectionTitle title="Rank & Leaderboard" text={text} />
      <LeaderboardPreview
        loading={loading}
        entries={leaderboard}
        myRank={myRank}
        myGems={user?.gems ?? 0}
        text={text}
        sub={sub}
        cardBg={cardBg}
        timeFilter={leaderboardTf}
        onTimeFilterChange={setLeaderboardTf}
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

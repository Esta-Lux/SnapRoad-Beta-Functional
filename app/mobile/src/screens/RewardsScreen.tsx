import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useFocusEffect, useIsFocused, useNavigation } from '@react-navigation/native';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../hooks/useLocation';
import { api } from '../api/client';
import type { Challenge, Badge, Offer } from '../types';
import RewardsHeader from '../components/rewards/RewardsHeader';
import RewardsTabs from '../components/rewards/RewardsTabs';
import {
  ViewAllButton,
  SectionTitle,
  ChallengesPreview,
  BadgesPreview,
  OffersPreview,
  GemActivityList,
  LeaderboardPreview,
} from '../components/rewards/RewardsSections';
import {
  BadgeDetailModal,
  OfferDetailModal,
  AllOffersModal,
  ChallengeHistoryModal,
} from '../components/rewards/RewardsModals';
import { rewardsStyles } from '../components/rewards/styles';
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
  const navigation = useNavigation();
  const rewardsFocused = useIsFocused();
  const { colors, isLight, shadow } = useTheme();
  const { user, updateUser, statsVersion } = useAuth();
  const { location } = useLocation(false, { paused: !rewardsFocused });
  const insets = useSafeAreaInsets();
  const bg = colors.background;
  const cardBg = colors.card;
  const text = colors.text;
  const sub = colors.textSecondary;
  const rt = {
    cardBg,
    text,
    sub,
    border: colors.border,
    primary: colors.primary,
    success: colors.success,
    danger: colors.danger,
    warning: colors.warning,
  };

  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
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
  const [challengeTarget, setChallengeTarget] = useState<{ id: string; name: string } | null>(null);

  const leaderboardTfRef = useRef(leaderboardTf);
  leaderboardTfRef.current = leaderboardTf;

  const loadFull = useCallback(async (mode: 'initial' | 'refresh' | 'silent', lat: number, lng: number) => {
    if (mode === 'initial') setInitialLoading(true);
    else if (mode === 'refresh') setRefreshing(true);
    setErrorMsg(null);
    try {
      const isPremium = Boolean(user?.isPremium);
      const safeGet = async (url: string) => {
        try { return await api.get<any>(url); } catch { return { success: false, data: null }; }
      };
      const insightsPromise = isPremium ? safeGet('/api/trips/weekly-insights') : Promise.resolve({ success: false, data: null });
      const leaderboardPromise = isPremium
        ? safeGet(`/api/leaderboard?time_filter=${encodeURIComponent(leaderboardTfRef.current)}&limit=10`)
        : Promise.resolve({ success: false, data: null });
      const [profileRes, cRes, bRes, oRes, tRes, _iRes, gRes, lRes] = await Promise.all([
        api.getProfile().catch(() => ({ success: false, data: null })),
        safeGet('/api/challenges'),
        safeGet('/api/badges'),
        safeGet(`/api/offers/nearby?lat=${lat}&lng=${lng}&radius=40`),
        safeGet('/api/trips?limit=10'),
        insightsPromise,
        safeGet('/api/gems/history'),
        leaderboardPromise,
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
      const gData = gRes?.data?.data ?? gRes?.data;
      const tx = Array.isArray(gData?.recent_transactions) ? gData.recent_transactions : [];
      setGemTx(tx.slice(0, 6).map((t: any, i: number) => ({
        id: String(t.id ?? i),
        type: t.type === 'earned' || t.type === 'spent' ? t.type : 'unknown',
        amount: Number(t.amount ?? 0),
        source: String(t.source ?? 'Transaction'),
        date: String(t.date ?? ''),
      })));
      if (!isPremium) {
        setLeaderboard([]);
        setMyRank(0);
        updateUser({ rank: 0 });
      } else {
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
        const mr = Number(lData?.my_rank ?? 0);
        setMyRank(mr);
        updateUser({ rank: mr });
      }
    } catch {
      setErrorMsg('Could not refresh rewards data. Pull to retry.');
    } finally {
      if (mode === 'initial') setInitialLoading(false);
      else setRefreshing(false);
    }
  }, [updateUser, user?.isPremium]);

  const fetchLeaderboardOnly = useCallback(async (tf: typeof leaderboardTf) => {
    if (!user?.isPremium) {
      setLeaderboard([]);
      setMyRank(0);
      return;
    }
    try {
      const res = await api.get<any>(`/api/leaderboard?time_filter=${encodeURIComponent(tf)}&limit=10`);
      if (!res.success) return;
      const lData = (res.data as any)?.data ?? res.data ?? {};
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
      const mr = Number(lData?.my_rank ?? 0);
      setMyRank(mr);
      updateUser({ rank: mr });
    } catch {
      /* keep prior leaderboard */
    }
  }, [updateUser, user?.isPremium]);

  const skipLeaderboardChipEffect = useRef(true);
  useEffect(() => {
    if (skipLeaderboardChipEffect.current) {
      skipLeaderboardChipEffect.current = false;
      return;
    }
    void fetchLeaderboardOnly(leaderboardTf);
  }, [leaderboardTf, fetchLeaderboardOnly]);

  const refreshNearbyOffers = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await api.get<any>(`/api/offers/nearby?lat=${lat}&lng=${lng}&radius=40`);
      const raw = res?.data?.data ?? res?.data ?? [];
      setOffers(Array.isArray(raw) ? raw : []);
    } catch {
      /* keep existing offers */
    }
  }, []);

  const rewardsLocGrid = useMemo(
    () => `${Math.round(location.lat * 200) / 200}_${Math.round(location.lng * 200) / 200}`,
    [location.lat, location.lng],
  );
  const rewardsBootstrapped = useRef(false);
  const lastOfferGrid = useRef<string | null>(null);
  /** Skip first tab focus — initial `useEffect` already loads; avoids double fetch. */
  const skipRewardsFocusSilentRef = useRef(true);
  /** Avoid refiring 8 parallel API calls on every tab focus (reduces jank / freezes). */
  const lastSilentRewardsFetchAt = useRef(0);

  useEffect(() => {
    if (!rewardsBootstrapped.current) {
      rewardsBootstrapped.current = true;
      lastOfferGrid.current = rewardsLocGrid;
      void loadFull('initial', location.lat, location.lng);
      return;
    }
    if (lastOfferGrid.current === rewardsLocGrid) return;
    lastOfferGrid.current = rewardsLocGrid;
    void refreshNearbyOffers(location.lat, location.lng);
  }, [rewardsLocGrid, location.lat, location.lng, loadFull, refreshNearbyOffers]);

  useFocusEffect(
    useCallback(() => {
      if (skipRewardsFocusSilentRef.current) {
        skipRewardsFocusSilentRef.current = false;
        return;
      }
      if (!rewardsBootstrapped.current) return;
      const now = Date.now();
      if (now - lastSilentRewardsFetchAt.current < 45_000) return;
      lastSilentRewardsFetchAt.current = now;
      void loadFull('silent', location.lat, location.lng);
    }, [loadFull, location.lat, location.lng]),
  );

  useEffect(() => {
    if (!statsVersion) return;
    if (!rewardsBootstrapped.current) return;
    void loadFull('silent', location.lat, location.lng);
  }, [statsVersion, loadFull, location.lat, location.lng]);

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
      const gemCost = Number((res.data as any)?.data?.gem_cost ?? offer.gem_cost ?? offer.gems_reward ?? 0);
      const newGemTotal = Number((res.data as any)?.data?.new_gem_total ?? NaN);
      setOffers((prev) => prev.map((o) => (o.id === offer.id ? { ...o, redeemed: true } : o)));
      if (user) updateUser({ gems: Number.isFinite(newGemTotal) ? newGemTotal : Math.max(0, user.gems - gemCost) });
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
            refreshing={refreshing}
            onRefresh={() => void loadFull('refresh', location.lat, location.lng)}
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
        <View style={[rewardsStyles.errorBanner, { backgroundColor: `${colors.danger}12`, borderWidth: 1, borderColor: `${colors.danger}35` }]}>
          <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
          <Text style={{ color: colors.danger, fontSize: 13, flex: 1, fontWeight: '600' }}>{errorMsg}</Text>
        </View>
      )}

      <View style={{ marginHorizontal: 16, marginBottom: 14, gap: 10 }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: cardBg, ...shadow(6) }}>
            <LinearGradient colors={[`${colors.warning}28`, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 14 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: `${colors.warning}22`, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                <Ionicons name="flame" size={22} color={colors.warning} />
              </View>
              <Text style={{ color: text, fontSize: 22, fontWeight: '900' }}>{user?.totalTrips ?? 0}</Text>
              <Text style={{ color: sub, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 }}>Trips</Text>
            </LinearGradient>
          </View>
          <View style={{ flex: 1, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: cardBg, ...shadow(6) }}>
            <LinearGradient colors={[`${colors.primary}28`, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 14 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: `${colors.primary}22`, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                <Ionicons name="trophy" size={22} color={colors.primary} />
              </View>
              <Text style={{ color: text, fontSize: 22, fontWeight: '900' }}>
                {user?.isPremium ? (myRank ? `#${myRank}` : '—') : '—'}
              </Text>
              <Text style={{ color: sub, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 }}>
                {user?.isPremium ? 'Rank' : 'Rank · Premium'}
              </Text>
            </LinearGradient>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: cardBg, ...shadow(6) }}>
            <LinearGradient colors={[`${colors.success}28`, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 14 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: `${colors.success}22`, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                <Ionicons name="ribbon" size={22} color={colors.success} />
              </View>
              <Text style={{ color: text, fontSize: 22, fontWeight: '900' }}>{earnedBadges}</Text>
              <Text style={{ color: sub, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 }}>Badges</Text>
            </LinearGradient>
          </View>
          <View style={{ flex: 1, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: cardBg, ...shadow(6) }}>
            <LinearGradient colors={[`${colors.leaderboardGradientStart}33`, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 14 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: `${colors.leaderboardGradientStart}22`, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                <Ionicons name="diamond" size={22} color={colors.leaderboardGradientStart} />
              </View>
              <Text style={{ color: text, fontSize: 22, fontWeight: '900' }}>{multiplier}</Text>
              <Text style={{ color: sub, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 }}>Gem mult.</Text>
            </LinearGradient>
          </View>
        </View>
      </View>

      {!user?.isPremium && (
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); (navigation as { navigate: (n: string) => void }).navigate('Profile'); }}
          style={{ marginHorizontal: 16, marginBottom: 14, borderRadius: 18, overflow: 'hidden', ...shadow(8) }}
        >
          <LinearGradient
            colors={isLight ? ['#eef2ff', '#ede9fe'] : ['rgba(99,102,241,0.45)', 'rgba(139,92,246,0.28)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderWidth: 1, borderColor: isLight ? 'rgba(79,70,229,0.22)' : 'rgba(167,139,250,0.35)' }}
          >
            <LinearGradient colors={[colors.ctaGradientStart, colors.ctaGradientEnd]} style={{ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <Ionicons name="sparkles" size={22} color="#fff" />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={{ color: text, fontSize: 15, fontWeight: '800' }}>Upgrade to Premium</Text>
              <Text style={{ color: sub, fontSize: 12, marginTop: 3, lineHeight: 17 }}>2× gems, richer offers, deeper insights in Profile, and priority perks.</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.primary} />
          </LinearGradient>
        </TouchableOpacity>
      )}

      <RewardsTabs
        colors={colors}
        rewardsTab={rewardsTab}
        onTabChange={(t) => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setRewardsTab(t);
        }}
      />

      {rewardsTab === 'challenges' && (
        <>
          <ViewAllButton
            title="View all challenges"
            onPress={() => {
              setChallengeModalTab('history');
              setShowChallengeHistory(true);
              loadChallengeHistory();
            }}
            {...rt}
          />
          <SectionTitle title="Active Challenges" text={text} accent={colors.primary} />
          <ChallengesPreview
            loading={initialLoading}
            challenges={challenges}
            claimingChallengeId={claimingChallengeId}
            onClaim={handleClaimChallenge}
            {...rt}
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
            {...rt}
          />
          <SectionTitle title={`Badges · ${earnedBadges}/${badges.length}`} text={text} accent={colors.primary} />
          <BadgesPreview loading={initialLoading} badges={badges} onPressBadge={setSelectedBadge} {...rt} />
        </>
      )}

      {rewardsTab === 'offers' && (
        <>
          <ViewAllButton title="View all offers" onPress={() => setShowAllOffers(true)} {...rt} />
          <SectionTitle title="Nearby Partner Offers" text={text} accent={colors.primary} />
          <OffersPreview loading={initialLoading} offers={offers.filter((o: any) => !o.is_admin_offer)} onPressOffer={setSelectedOffer} {...rt} />
          {offers.some((o: any) => o.is_admin_offer) && (
            <>
              <SectionTitle title="Featured Deals" text={text} accent={colors.primary} />
              <OffersPreview loading={initialLoading} offers={offers.filter((o: any) => o.is_admin_offer)} onPressOffer={setSelectedOffer} {...rt} />
            </>
          )}
        </>
      )}

      <SectionTitle title="Recent Gem Activity" text={text} accent={colors.primary} />
      <GemActivityList loading={initialLoading} gemTx={gemTx} {...rt} />

      <SectionTitle title="Rank & Leaderboard" text={text} accent={colors.primary} />
      {user?.isPremium ? (
        <LeaderboardPreview
          loading={initialLoading}
          entries={leaderboard}
          myRank={myRank}
          myGems={user?.gems ?? 0}
          text={text}
          sub={sub}
          cardBg={cardBg}
          border={colors.border}
          primary={colors.primary}
          success={colors.success}
          danger={colors.danger}
          warning={colors.warning}
          headerGradient={[colors.leaderboardGradientStart, colors.leaderboardGradientEnd]}
          gemsAccent={colors.primary}
          timeFilter={leaderboardTf}
          onTimeFilterChange={(t) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setLeaderboardTf(t);
          }}
        />
      ) : (
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            (navigation as { navigate: (n: string) => void }).navigate('Profile');
          }}
          style={{
            marginHorizontal: 16,
            marginBottom: 12,
            padding: 18,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: cardBg,
            ...shadow(6),
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: `${colors.primary}18`, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="lock-closed" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: text, fontSize: 15, fontWeight: '800' }}>Leaderboard is Premium-only</Text>
              <Text style={{ color: sub, fontSize: 12, marginTop: 4, lineHeight: 17 }}>
                See how you rank against other drivers with SnapRoad Premium.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.primary} />
          </View>
        </TouchableOpacity>
      )}

      <View style={{ height: insets.bottom + 20 }} />

      <BadgeDetailModal selectedBadge={selectedBadge} cardBg={cardBg} text={text} sub={sub} primary={colors.primary} isLight={isLight} onClose={() => setSelectedBadge(null)} />
      <OfferDetailModal
        selectedOffer={selectedOffer}
        redeemingOfferId={redeemingOfferId}
        cardBg={cardBg}
        text={text}
        sub={sub}
        primary={colors.primary}
        success={colors.success}
        isLight={isLight}
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
        border={colors.border}
        primary={colors.primary}
        success={colors.success}
        isLight={isLight}
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
        primary={colors.primary}
        heroGradient={[colors.rewardsGradientStart, colors.rewardsGradientEnd]}
        isLight={isLight}
        onClose={() => setShowChallengeHistory(false)}
        onTabChange={setChallengeModalTab}
        onSelectBadge={setSelectedBadge}
      />
      </ScrollView>

      <ChallengeModal visible={!!challengeTarget} onClose={() => setChallengeTarget(null)} targetFriend={challengeTarget} />
    </SafeAreaView>
  );
}

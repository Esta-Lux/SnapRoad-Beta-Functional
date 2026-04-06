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
  OffersRewardsSegment,
  MyRedemptionsSection,
  GemActivityList,
  OfferCategoryChips,
} from '../components/rewards/RewardsSections';
import {
  BadgeDetailModal,
  OfferDetailModal,
  RedemptionDetailModal,
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
  UserOfferRedemption,
  OffersRewardsView,
} from '../components/rewards/types';

function parseMyRedemptionsResponse(raw: unknown): UserOfferRedemption[] {
  const arr = Array.isArray(raw) ? raw : [];
  const out: UserOfferRedemption[] = [];
  for (const row of arr) {
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    const redemption_id = String(o.redemption_id ?? '');
    if (!redemption_id) continue;
    out.push({
      redemption_id,
      offer_id: String(o.offer_id ?? ''),
      redeemed_at: o.redeemed_at != null ? String(o.redeemed_at) : null,
      status: String(o.status ?? 'verified'),
      used_in_store: Boolean(o.used_in_store),
      gem_cost: Number(o.gem_cost ?? 0),
      discount_applied: Number(o.discount_applied ?? 0),
      business_name: String(o.business_name ?? 'Partner offer'),
      title: o.title != null ? String(o.title) : null,
      description: o.description != null ? String(o.description) : null,
      image_url: o.image_url != null ? String(o.image_url) : null,
      address: o.address != null ? String(o.address) : null,
      discount_percent: Number(o.discount_percent ?? o.discount_applied ?? 0),
      lat: o.lat != null ? Number(o.lat) : null,
      lng: o.lng != null ? Number(o.lng) : null,
      is_free_item: Boolean(o.is_free_item),
      business_type: o.business_type != null ? String(o.business_type) : undefined,
      category_label: o.category_label != null ? String(o.category_label) : undefined,
    });
  }
  return out;
}

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
  const [offerCategoryFilter, setOfferCategoryFilter] = useState<string | null>(null);
  const [challengeTarget, setChallengeTarget] = useState<{ id: string; name: string } | null>(null);
  const [offersRewardsView, setOffersRewardsView] = useState<OffersRewardsView>('nearby');
  const [myRedemptions, setMyRedemptions] = useState<UserOfferRedemption[]>([]);
  const [selectedRedemption, setSelectedRedemption] = useState<UserOfferRedemption | null>(null);

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
      const [profileRes, cRes, bRes, oRes, tRes, _iRes, gRes, mineRes] = await Promise.all([
        api.getProfile().catch(() => ({ success: false, data: null })),
        safeGet('/api/challenges'),
        safeGet('/api/badges'),
        safeGet(`/api/offers/nearby?lat=${lat}&lng=${lng}&radius=40`),
        safeGet('/api/trips?limit=10'),
        insightsPromise,
        safeGet('/api/gems/history'),
        safeGet('/api/offers/my-redemptions'),
      ]);
      const unwrap = (r: any) => r?.data?.data ?? r?.data ?? [];
      const profilePayload = (profileRes?.data as any)?.data ?? profileRes?.data ?? {};
      updateUser({
        gems: Number(profilePayload.gems ?? 0),
        level: Number(profilePayload.level ?? 1),
        totalMiles: Number(profilePayload.total_miles ?? 0),
        totalTrips: Number(profilePayload.total_trips ?? 0),
        safetyScore: Number(profilePayload.safety_score ?? 0),
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
      if (mineRes?.success) {
        setMyRedemptions(parseMyRedemptionsResponse(unwrap(mineRes)));
      }
      const gData = gRes?.data?.data ?? gRes?.data;
      const tx = Array.isArray(gData?.recent_transactions) ? gData.recent_transactions : [];
      setGemTx(tx.slice(0, 6).map((t: any, i: number) => ({
        id: String(t.id ?? i),
        type: t.type === 'earned' || t.type === 'spent' ? t.type : 'unknown',
        amount: Number(t.amount ?? 0),
        source: String(t.source ?? 'Transaction'),
        date: String(t.date ?? ''),
      })));
    } catch {
      setErrorMsg('Could not refresh rewards data. Pull to retry.');
    } finally {
      if (mode === 'initial') setInitialLoading(false);
      else setRefreshing(false);
    }
  }, [updateUser, user?.isPremium]);

  const refreshNearbyOffers = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await api.get<any>(`/api/offers/nearby?lat=${lat}&lng=${lng}&radius=40`);
      const raw = res?.data?.data ?? res?.data ?? [];
      setOffers(Array.isArray(raw) ? raw : []);
    } catch {
      /* keep existing offers */
    }
  }, []);

  const refreshMyRedemptions = useCallback(async () => {
    try {
      const res = await api.get<any>('/api/offers/my-redemptions');
      if (!res.success) return;
      const raw = (res.data as any)?.data ?? res.data;
      setMyRedemptions(parseMyRedemptionsResponse(raw));
    } catch {
      /* keep list */
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

  const offerCategoryChoices = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of offers) {
      const slug = String((o as Offer).business_type || 'other');
      const rawLabel = (o as Offer).category_label?.trim();
      const lbl = rawLabel || slug.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      if (!m.has(slug)) m.set(slug, lbl);
    }
    const rest = [...m.entries()].map(([slug, label]) => ({ slug, label })).sort((a, b) => a.label.localeCompare(b.label));
    return [{ slug: null as string | null, label: 'All' }, ...rest];
  }, [offers]);

  const redemptionCategoryChoices = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of myRedemptions) {
      const slug = String(r.business_type || 'other');
      const rawLabel = r.category_label?.trim();
      const lbl = rawLabel || slug.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      if (!m.has(slug)) m.set(slug, lbl);
    }
    const rest = [...m.entries()].map(([slug, label]) => ({ slug, label })).sort((a, b) => a.label.localeCompare(b.label));
    return [{ slug: null as string | null, label: 'All' }, ...rest];
  }, [myRedemptions]);

  const [redemptionCategoryFilter, setRedemptionCategoryFilter] = useState<string | null>(null);

  const filteredNearbyOffers = useMemo(() => {
    const base = offers.filter((o) => !o.is_admin_offer);
    if (!offerCategoryFilter) return base;
    return base.filter((o) => String(o.business_type || 'other') === offerCategoryFilter);
  }, [offers, offerCategoryFilter]);

  const filteredFeaturedOffers = useMemo(() => {
    const base = offers.filter((o) => Boolean(o.is_admin_offer));
    if (!offerCategoryFilter) return base;
    return base.filter((o) => String(o.business_type || 'other') === offerCategoryFilter);
  }, [offers, offerCategoryFilter]);

  const filteredRedemptions = useMemo(() => {
    if (!redemptionCategoryFilter) return myRedemptions;
    return myRedemptions.filter((r) => String(r.business_type || 'other') === redemptionCategoryFilter);
  }, [myRedemptions, redemptionCategoryFilter]);

  const allOffersForModal = useMemo(() => {
    if (!offerCategoryFilter) return offers;
    return offers.filter((o) => String(o.business_type || 'other') === offerCategoryFilter);
  }, [offers, offerCategoryFilter]);

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
      void refreshMyRedemptions();
    } finally {
      setRedeemingOfferId(null);
    }
  }, [updateUser, user, refreshMyRedemptions]);

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
                <Ionicons name="shield-checkmark" size={22} color={colors.primary} />
              </View>
              <Text style={{ color: text, fontSize: 22, fontWeight: '900' }}>
                {user ? Math.round(user.safetyScore ?? 0) : '—'}
              </Text>
              <Text style={{ color: sub, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 }}>Safety</Text>
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
            <LinearGradient colors={[`${colors.rewardsGradientEnd}33`, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 14 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: `${colors.rewardsGradientEnd}22`, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                <Ionicons name="diamond" size={22} color={colors.rewardsGradientEnd} />
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
              <Text style={{ color: sub, fontSize: 12, marginTop: 3, lineHeight: 17 }}>2× gems, richer offers, traffic cameras, more place alerts, and deeper Profile insights.</Text>
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
          <OffersRewardsSegment
            view={offersRewardsView}
            myCount={myRedemptions.length}
            onChange={(v) => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setOffersRewardsView(v);
            }}
            {...rt}
          />
          {offersRewardsView === 'nearby' ? (
            <>
              <OfferCategoryChips
                choices={offerCategoryChoices}
                selectedSlug={offerCategoryFilter}
                onSelect={setOfferCategoryFilter}
                {...rt}
              />
              <ViewAllButton title="View all offers" onPress={() => setShowAllOffers(true)} {...rt} />
              <SectionTitle title="Nearby Partner Offers" text={text} accent={colors.primary} />
              <OffersPreview loading={initialLoading} offers={filteredNearbyOffers} onPressOffer={setSelectedOffer} {...rt} />
              {offers.some((o) => o.is_admin_offer) && (
                <>
                  <SectionTitle title="Featured Deals" text={text} accent={colors.primary} />
                  <OffersPreview loading={initialLoading} offers={filteredFeaturedOffers} onPressOffer={setSelectedOffer} {...rt} />
                </>
              )}
            </>
          ) : (
            <>
              <OfferCategoryChips
                choices={redemptionCategoryChoices}
                selectedSlug={redemptionCategoryFilter}
                onSelect={setRedemptionCategoryFilter}
                {...rt}
              />
              <SectionTitle title="Your redemptions" text={text} accent={colors.primary} />
              <MyRedemptionsSection
                loading={initialLoading}
                redemptions={filteredRedemptions}
                onOpen={(r) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedRedemption(r);
                }}
                {...rt}
              />
            </>
          )}
        </>
      )}

      <SectionTitle title="Recent Gem Activity" text={text} accent={colors.primary} />
      <GemActivityList loading={initialLoading} gemTx={gemTx} {...rt} />

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
      <RedemptionDetailModal
        redemption={selectedRedemption}
        cardBg={cardBg}
        text={text}
        sub={sub}
        primary={colors.primary}
        success={colors.success}
        warning={colors.warning}
        danger={colors.danger}
        isLight={isLight}
        onClose={() => setSelectedRedemption(null)}
      />
      <AllOffersModal
        visible={showAllOffers}
        offers={allOffersForModal}
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

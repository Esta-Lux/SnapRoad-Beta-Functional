import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useFocusEffect, useIsFocused, useNavigation } from '@react-navigation/native';
import type { RewardsStackScreenNavigationProp } from '../navigation/types';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../hooks/useLocation';
import { api } from '../api/client';
import {
  parseNearbyOffers,
  parseRedeemOfferPayload,
  unwrapApiData as unwrapOffersApiData,
} from '../api/dto/offers';
import {
  parseProfilePatch,
  unwrapApiData as unwrapProfileApiData,
} from '../api/dto/profileWallet';
import type { Badge, Offer } from '../types';
import RewardsHeader from '../components/rewards/RewardsHeader';
import RewardsTabs from '../components/rewards/RewardsTabs';
import {
  ViewAllButton,
  SectionTitle,
  BadgesPreview,
  OffersPreview,
  MyRedemptionsSection,
  GemActivityList,
  OfferCategoryChips,
} from '../components/rewards/RewardsSections';
import {
  BadgeDetailModal,
  OfferDetailModal,
  RedemptionDetailModal,
  AllOffersModal,
  AllBadgesModal,
} from '../components/rewards/RewardsModals';
import GemActivityDetailModal from '../components/rewards/GemActivityDetailModal';
import { rewardsStyles } from '../components/rewards/styles';
import type { WalletTab, GemTx, UserOfferRedemption } from '../components/rewards/types';

/** Product filter chips. `nearby` = ≤ ~20 mi (~32 km) to match map recommendations. */
const REWARDS_OFFER_FILTER_DEFS: { slug: string | null; label: string }[] = [
  { slug: null, label: 'All' },
  { slug: 'nearby', label: 'Nearby' },
  { slug: 'gas', label: 'Gas' },
  { slug: 'food', label: 'Food' },
  { slug: 'coffee', label: 'Coffee' },
  { slug: 'restaurants', label: 'Restaurants' },
  { slug: 'retail', label: 'Retail' },
  { slug: 'services', label: 'Services' },
];

function offerMatchesCategory(o: Offer, slug: string | null): boolean {
  if (slug == null) return true;
  const bt = String(o.business_type || 'other');
  if (slug === 'nearby') return Number(o.distance_km ?? 999) <= 32.2;
  if (slug === 'food' || slug === 'restaurants') return bt === 'restaurant';
  return bt === slug;
}

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
  const navigation = useNavigation<RewardsStackScreenNavigationProp>();
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
  const [badges, setBadges] = useState<Badge[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [walletTab, setWalletTab] = useState<WalletTab>('balance');
  const [redeemingOfferId, setRedeemingOfferId] = useState<string | null>(null);
  const [gemTx, setGemTx] = useState<GemTx[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showAllOffers, setShowAllOffers] = useState(false);
  const [showAllBadges, setShowAllBadges] = useState(false);
  const [offerCategoryFilter, setOfferCategoryFilter] = useState<string | null>(null);
  const [myRedemptions, setMyRedemptions] = useState<UserOfferRedemption[]>([]);
  const [selectedRedemption, setSelectedRedemption] = useState<UserOfferRedemption | null>(null);
  const [selectedGemTx, setSelectedGemTx] = useState<GemTx | null>(null);
  const [redeemQrByOfferId, setRedeemQrByOfferId] = useState<
    Record<string, { qr_token?: string; claim_code?: string; expires_at?: string }>
  >({});
  /** Populated from GET /api/rewards/summary — drives the 2×2 stat cards (trips, badges, multiplier label). */
  const [rewardsSummary, setRewardsSummary] = useState<{
    totalTrips: number;
    badgesEarned: number;
    badgesTotal: number;
    gemMultiplierLabel: string;
  } | null>(null);

  const loadFull = useCallback(async (mode: 'initial' | 'refresh' | 'silent', lat: number, lng: number) => {
    if (mode === 'initial') setInitialLoading(true);
    else if (mode === 'refresh') setRefreshing(true);
    setErrorMsg(null);
    try {
      const safeGet = async (url: string) => {
        try { return await api.get(url); } catch { return { success: false, data: null }; }
      };
      const [profileRes, bRes, oRes, gRes, mineRes, sumRes] = await Promise.all([
        api.getProfile().catch(() => ({ success: false, data: null })),
        safeGet('/api/badges'),
        safeGet(`/api/offers/nearby?lat=${lat}&lng=${lng}&radius=32.2`),
        safeGet('/api/gems/history'),
        safeGet('/api/offers/my-redemptions'),
        safeGet('/api/rewards/summary'),
      ]);
      const unwrap = (r: { data?: unknown } | undefined) => unwrapProfileApiData(r?.data);
      if (profileRes?.success) {
        const patch = parseProfilePatch(profileRes?.data);
        if (Object.keys(patch).length > 0) updateUser(patch);
      }
      const bData = unwrap(bRes);
      const bRoot = bData && typeof bData === 'object' ? (bData as Record<string, unknown>) : null;
      setBadges(Array.isArray(bData) ? bData : (Array.isArray(bRoot?.badges) ? (bRoot?.badges as Badge[]) : []));
      setOffers(parseNearbyOffers(oRes?.data));
      if (mineRes?.success) {
        setMyRedemptions(parseMyRedemptionsResponse(unwrap(mineRes)));
      }
      const gDataRaw = unwrapProfileApiData(gRes?.data);
      const gData = gDataRaw && typeof gDataRaw === 'object' ? (gDataRaw as Record<string, unknown>) : {};
      const ledgerBal = gData.current_balance;
      if (ledgerBal != null && ledgerBal !== '' && Number.isFinite(Number(ledgerBal))) {
        updateUser({ gems: Number(ledgerBal) });
      }
      const tx = Array.isArray(gData.recent_transactions) ? (gData.recent_transactions as Record<string, unknown>[]) : [];
      setGemTx(
        tx.slice(0, 20).map((t: Record<string, unknown>, i: number) => ({
          id: String(t.id ?? `tx-${i}`),
          type: t.type === 'earned' || t.type === 'spent' ? t.type : 'unknown',
          amount: Number(t.amount ?? 0),
          source: String(t.source ?? 'Transaction'),
          date: String(t.date ?? ''),
          tx_type: t.tx_type != null ? String(t.tx_type) : undefined,
          reference_type: t.reference_type != null ? String(t.reference_type) : null,
          reference_id: t.reference_id != null ? String(t.reference_id) : null,
          balance_after: t.balance_after != null && t.balance_after !== '' ? Number(t.balance_after) : null,
          metadata: t.metadata && typeof t.metadata === 'object' ? (t.metadata as Record<string, unknown>) : undefined,
        })),
      );
      if (sumRes?.success) {
        const raw = (sumRes as { data?: { data?: Record<string, unknown> } }).data?.data ?? (sumRes as { data?: Record<string, unknown> }).data;
        if (raw && typeof raw === 'object') {
          setRewardsSummary({
            totalTrips: Number(raw.total_trips ?? 0),
            badgesEarned: Number(raw.badges_earned ?? 0),
            badgesTotal: Math.max(0, Number(raw.badges_total ?? 0)),
            gemMultiplierLabel: String(raw.gem_multiplier_label ?? '1x'),
          });
        } else {
          setRewardsSummary(null);
        }
      } else {
        setRewardsSummary(null);
      }
    } catch {
      setErrorMsg('Could not refresh wallet data. Pull to retry.');
    } finally {
      if (mode === 'initial') setInitialLoading(false);
      else setRefreshing(false);
    }
  }, [updateUser]);

  const refreshNearbyOffers = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await api.get(`/api/offers/nearby?lat=${lat}&lng=${lng}&radius=32.2`);
      setOffers(parseNearbyOffers(res?.data));
    } catch {
      /* keep existing offers */
    }
  }, []);

  const refreshMyRedemptions = useCallback(async () => {
    try {
      const res = await api.get('/api/offers/my-redemptions');
      if (!res.success) return;
      const raw = unwrapOffersApiData(res.data);
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
  const headerMultiplier = rewardsSummary?.gemMultiplierLabel ?? multiplier;
  const tripsCardValue = rewardsSummary != null ? rewardsSummary.totalTrips : (user?.totalTrips ?? 0);
  const badgesCardLabel =
    rewardsSummary != null && rewardsSummary.badgesTotal > 0
      ? `${rewardsSummary.badgesEarned}/${rewardsSummary.badgesTotal}`
      : String(earnedBadges);

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
    return base.filter((o) => offerMatchesCategory(o, offerCategoryFilter));
  }, [offers, offerCategoryFilter]);

  const filteredFeaturedOffers = useMemo(() => {
    const base = offers.filter((o) => Boolean(o.is_admin_offer));
    return base.filter((o) => offerMatchesCategory(o, offerCategoryFilter));
  }, [offers, offerCategoryFilter]);

  const filteredRedemptions = useMemo(() => {
    if (!redemptionCategoryFilter) return myRedemptions;
    return myRedemptions.filter((r) => String(r.business_type || 'other') === redemptionCategoryFilter);
  }, [myRedemptions, redemptionCategoryFilter]);

  const allOffersForModal = useMemo(
    () => offers.filter((o) => offerMatchesCategory(o, offerCategoryFilter)),
    [offers, offerCategoryFilter],
  );

  const handleRedeemOffer = useCallback(async (offer: Offer) => {
    setRedeemingOfferId(String(offer.id));
    setErrorMsg(null);
    try {
      const res = await api.post(`/api/offers/${offer.id}/redeem`);
      if (!res.success) {
        setErrorMsg(res.error || 'Could not redeem this offer right now.');
        return;
      }
      const inner = parseRedeemOfferPayload(res.data);
      const gemCost = Number.isFinite(inner.gem_cost ?? NaN)
        ? Number(inner.gem_cost)
        : Number(offer.gem_cost ?? offer.gems_reward ?? 0);
      const newGemTotal = Number(inner.new_gem_total ?? NaN);
      const oid = String(offer.id);
      setRedeemQrByOfferId((prev) => ({
        ...prev,
        [oid]: {
          qr_token: inner.qr_token,
          claim_code: inner.claim_code,
          expires_at: inner.expires_at,
        },
      }));
      setOffers((prev) =>
        prev.map((o) =>
          String(o.id) === oid
            ? {
                ...o,
                redeemed: true,
                redemption_id: inner.redemption_id ?? o.redemption_id,
                redemption: { status: 'verified', redeemed_at: inner.redeemed_at },
              }
            : o,
        ),
      );
      setSelectedOffer((prev) =>
        prev && String(prev.id) === oid
          ? {
              ...prev,
              redeemed: true,
              redemption_id: inner.redemption_id ?? prev.redemption_id,
              redemption: { status: 'verified', redeemed_at: inner.redeemed_at },
            }
          : prev,
      );
      if (user) {
        const fallbackTotal = Math.max(0, user.gems - gemCost);
        const safeTotal = Number.isFinite(newGemTotal) ? Math.max(0, Math.floor(newGemTotal)) : fallbackTotal;
        updateUser({ gems: safeTotal });
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void refreshMyRedemptions();
      void loadFull('silent', location.lat, location.lng);
    } finally {
      setRedeemingOfferId(null);
    }
  }, [updateUser, user, refreshMyRedemptions, loadFull, location.lat, location.lng]);

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
      <RewardsHeader colors={colors} gems={user?.gems ?? 0} multiplier={headerMultiplier} />
      {errorMsg && (
        <View style={[rewardsStyles.errorBanner, { backgroundColor: `${colors.danger}12`, borderWidth: 1, borderColor: `${colors.danger}35` }]}>
          <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
          <Text style={{ color: colors.danger, fontSize: 13, flex: 1, fontWeight: '600' }}>{errorMsg}</Text>
        </View>
      )}

      <RewardsTabs
        colors={colors}
        walletTab={walletTab}
        onTabChange={(t) => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setWalletTab(t);
        }}
      />

      {walletTab === 'balance' && (
        <>
          <View style={{ marginHorizontal: 16, marginBottom: 14, marginTop: 6, gap: 10 }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: cardBg, ...shadow(6) }}>
                <LinearGradient colors={[`${colors.warning}28`, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 14 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: `${colors.warning}22`, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                    <Ionicons name="flame" size={22} color={colors.warning} />
                  </View>
                  <Text style={{ color: text, fontSize: 22, fontWeight: '900' }}>{tripsCardValue}</Text>
                  <Text style={{ color: sub, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 }}>Trips</Text>
                </LinearGradient>
              </View>
              <View style={{ flex: 1, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: cardBg, ...shadow(6) }}>
                <LinearGradient colors={[`${colors.rewardsGradientEnd}33`, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 14 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: `${colors.rewardsGradientEnd}22`, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                    <Ionicons name="diamond" size={22} color={colors.rewardsGradientEnd} />
                  </View>
                  <Text style={{ color: text, fontSize: 22, fontWeight: '900' }}>{user ? Math.round(user.gems ?? 0) : '—'}</Text>
                  <Text style={{ color: sub, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 }}>Gem balance</Text>
                </LinearGradient>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: cardBg, ...shadow(6) }}>
                <LinearGradient colors={[`${colors.success}28`, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 14 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: `${colors.success}22`, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                    <Ionicons name="ribbon" size={22} color={colors.success} />
                  </View>
                  <Text style={{ color: text, fontSize: 22, fontWeight: '900' }}>{badgesCardLabel}</Text>
                  <Text style={{ color: sub, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 }}>Badges</Text>
                </LinearGradient>
              </View>
              <View style={{ flex: 1, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: cardBg, ...shadow(6) }}>
                <LinearGradient colors={[`${colors.rewardsGradientEnd}33`, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 14 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: `${colors.rewardsGradientEnd}22`, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                    <Ionicons name="diamond" size={22} color={colors.rewardsGradientEnd} />
                  </View>
                  <Text style={{ color: text, fontSize: 22, fontWeight: '900' }}>{headerMultiplier}</Text>
                  <Text style={{ color: sub, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 }}>Gem mult.</Text>
                </LinearGradient>
              </View>
            </View>
          </View>

          <View
            style={{
              marginHorizontal: 16,
              marginBottom: 14,
              paddingVertical: 12,
              paddingHorizontal: 14,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: cardBg,
              ...shadow(4),
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: `${colors.primary}18`, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="layers-outline" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: text, fontSize: 13, fontWeight: '900' }}>Unified wallet</Text>
                <Text style={{ color: sub, fontSize: 12, marginTop: 3, lineHeight: 17 }}>
                  Gems move only through your ledger. Use Activity for history, Offers to redeem, Redemptions for partner proof.
                </Text>
              </View>
            </View>
          </View>

          {!user?.isPremium && (
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('Profile', { screen: 'ProfileMain' }); }}
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
        </>
      )}

      {walletTab === 'activity' && (
        <>
          <SectionTitle title="Activity" text={text} accent={colors.primary} />
          <Text style={{ color: sub, fontSize: 12, lineHeight: 17, paddingHorizontal: 16, marginTop: -6, marginBottom: 12, fontWeight: '600' }}>
            Ledger entries from wallet_transactions (trips, redemptions, and more). Tap a row for details.
          </Text>
          <GemActivityList
            loading={initialLoading}
            gemTx={gemTx}
            onPressTx={(tx) => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedGemTx(tx);
            }}
            {...rt}
          />
        </>
      )}

      {walletTab === 'offers' && (
        <>
          <OfferCategoryChips
            choices={REWARDS_OFFER_FILTER_DEFS}
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
      )}

      {walletTab === 'redemptions' && (
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

      {walletTab === 'badges' && (
        <>
          <ViewAllButton title="View all badges" onPress={() => setShowAllBadges(true)} {...rt} />
          <SectionTitle title={`Badges · ${earnedBadges}/${badges.length}`} text={text} accent={colors.primary} />
          <BadgesPreview loading={initialLoading} badges={badges} onPressBadge={setSelectedBadge} {...rt} />
        </>
      )}

      <View style={{ height: insets.bottom + 20 }} />

      <BadgeDetailModal selectedBadge={selectedBadge} cardBg={cardBg} text={text} sub={sub} primary={colors.primary} isLight={isLight} onClose={() => setSelectedBadge(null)} />
      <OfferDetailModal
        selectedOffer={selectedOffer}
        redeemingOfferId={redeemingOfferId}
        redeemExtras={selectedOffer ? redeemQrByOfferId[String(selectedOffer.id)] : null}
        cardBg={cardBg}
        text={text}
        sub={sub}
        primary={colors.primary}
        success={colors.success}
        isLight={isLight}
        onClose={() => setSelectedOffer(null)}
        onRedeem={handleRedeemOffer}
      />
      <GemActivityDetailModal
        visible={!!selectedGemTx}
        tx={selectedGemTx}
        cardBg={cardBg}
        text={text}
        sub={sub}
        primary={colors.primary}
        success={colors.success}
        danger={colors.danger}
        warning={colors.warning}
        isLight={isLight}
        onClose={() => setSelectedGemTx(null)}
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
      <AllBadgesModal
        visible={showAllBadges}
        badges={badges}
        bg={bg}
        cardBg={cardBg}
        text={text}
        sub={sub}
        onClose={() => setShowAllBadges(false)}
        onSelectBadge={(b) => {
          setShowAllBadges(false);
          setSelectedBadge(b);
        }}
      />
      </ScrollView>
    </SafeAreaView>
  );
}

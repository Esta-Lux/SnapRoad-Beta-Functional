import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../hooks/useLocation';
import { api } from '../api/client';
import {
  parseNearbyOffers,
  parseOfferCategories,
  parseOnlineOffersCatalog,
  parseRedeemOfferPayload,
} from '../api/dto/offers';
import type { OnlineOfferItem } from '../api/dto/offers';
import type { Offer } from '../types';
import { SocialScreenHeader } from '../components/social/SocialScreenHeader';
import { OfferDetailModal } from '../components/rewards/RewardsModals';
import { OfferCategoryChips } from '../components/rewards/RewardsSections';
import { displayOfferCategory } from '../lib/offerCategories';
import { offerHeroUri } from '../lib/offerHeroImage';

type HubSection = 'local' | 'online';

function headlineTitle(o: Offer): string {
  const t = o.title?.trim();
  if (t) return t;
  const first = o.description?.split(/[.!?\n]/)[0]?.trim();
  if (first) return first;
  return `${o.discount_percent ?? 0}% off`;
}

function formatExpiryShort(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  try {
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return null;
  }
}

async function safeOpenAffiliate(url: string) {
  const u = url.trim();
  if (!/^https?:\/\//i.test(u)) return;
  try {
    await WebBrowser.openBrowserAsync(u);
  } catch {
    /* ignore */
  }
}

export default function OffersScreen() {
  const skipFirstFocusRef = useRef(true);
  const lastSilentOffersFetchAt = useRef(0);
  const bootstrapped = useRef(false);
  const locationGridRef = useRef('');
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const { colors, isLight, shadow } = useTheme();
  const { user, updateUser, statsVersion } = useAuth();
  const { location } = useLocation(false, { paused: !isFocused });

  const bg = colors.background;
  const cardBg = colors.card;
  const text = colors.text;
  const sub = colors.textSecondary;
  const rt = useMemo(
    () => ({
      cardBg,
      text,
      sub,
      border: colors.border,
      primary: colors.primary,
      success: colors.success,
      danger: colors.danger,
      warning: colors.warning,
    }),
    [
      cardBg,
      colors.border,
      colors.danger,
      colors.primary,
      colors.success,
      colors.warning,
      sub,
      text,
    ],
  );

  const [section, setSection] = useState<HubSection>('local');

  const [refreshingLocal, setRefreshingLocal] = useState(false);
  const [refreshingOnline, setRefreshingOnline] = useState(false);
  const [loadingLocalBootstrap, setLoadingLocalBootstrap] = useState(true);
  const [localOffers, setLocalOffers] = useState<Offer[]>([]);
  const [offerCategories, setOfferCategories] = useState<{ slug: string; label: string }[]>([]);
  const [localCategorySlug, setLocalCategorySlug] = useState<string | null>(null);
  const [localBanner, setLocalBanner] = useState<string | null>(null);

  const [onlineItems, setOnlineItems] = useState<OnlineOfferItem[]>([]);
  const [onlineCategories, setOnlineCategories] = useState<{ slug: string; label: string }[]>([]);
  const [onlineNextCursor, setOnlineNextCursor] = useState<string | null>(null);
  const [onlineSlug, setOnlineSlug] = useState<string | null>(null);
  const [onlineLoadingMore, setOnlineLoadingMore] = useState(false);
  const [onlineBanner, setOnlineBanner] = useState<string | null>(null);
  const [onlineProviderLabel, setOnlineProviderLabel] = useState<string | null>(null);

  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [redeemingOfferId, setRedeemingOfferId] = useState<string | null>(null);
  const [redeemQrByOfferId, setRedeemQrByOfferId] = useState<
    Record<string, { qr_token?: string; claim_code?: string; expires_at?: string }>
  >({});

  const locGridKey = `${Math.round(location.lat * 200) / 200}_${Math.round(location.lng * 200) / 200}`;

  const refreshLocalOffers = useCallback(async (lat: number, lng: number) => {
    setLocalBanner(null);
    try {
      const [nearRes, catRes] = await Promise.all([
        api.get(`/api/offers/nearby?lat=${lat}&lng=${lng}&radius=32.2`),
        api.get('/api/offers/categories'),
      ]);
      setLocalOffers(parseNearbyOffers(nearRes.data));
      if (catRes.success) {
        setOfferCategories(parseOfferCategories(catRes.data));
      }
      if (!nearRes.success) {
        setLocalBanner(nearRes.error ?? 'Nearby offers unavailable. Pull to retry.');
      }
    } catch {
      setLocalBanner('Could not load nearby offers.');
    }
  }, []);

  const loadLocalBootstrap = useCallback(
    async (mode: 'initial' | 'refresh' | 'silent') => {
      if (mode === 'initial') setLoadingLocalBootstrap(true);
      else if (mode === 'refresh') setRefreshingLocal(true);
      setLocalBanner(null);
      try {
        await refreshLocalOffers(location.lat, location.lng);
      } finally {
        if (mode === 'initial') setLoadingLocalBootstrap(false);
        if (mode === 'refresh') setRefreshingLocal(false);
      }
    },
    [location.lat, location.lng, refreshLocalOffers],
  );

  const fetchOnlinePage = useCallback(
    async (cursor: string | null, slug: string | null, mode: 'reset' | 'more') => {
      if (mode === 'reset') {
        setOnlineBanner(null);
        setRefreshingOnline(true);
        setOnlineLoadingMore(false);
      } else {
        setOnlineLoadingMore(true);
      }
      try {
        const qs = new URLSearchParams();
        if (slug) qs.set('category_slug', slug);
        if (cursor) qs.set('cursor', cursor);
        const q = qs.toString();
        const res = await api.get(`/api/offers/online${q ? `?${q}` : ''}`);
        if (!res.success) {
          if (mode === 'reset') {
            setOnlineItems([]);
            setOnlineNextCursor(null);
            setOnlineCategories([]);
          }
          setOnlineBanner(res.error ?? 'Online offers unavailable.');
          return;
        }
        const parsed = parseOnlineOffersCatalog(res.data);
        setOnlineCategories(parsed.categories ?? []);
        setOnlineNextCursor(parsed.next_cursor);
        setOnlineProviderLabel(parsed.provider ?? null);
        if (mode === 'reset') setOnlineItems(parsed.items);
        else setOnlineItems((prev) => {
          const seen = new Set(prev.map((x) => x.id));
          const merged = [...prev];
          for (const row of parsed.items) {
            if (!seen.has(row.id)) merged.push(row);
          }
          return merged;
        });
      } catch {
        if (mode === 'reset') {
          setOnlineItems([]);
          setOnlineNextCursor(null);
        }
        setOnlineBanner('Could not load online offers.');
      } finally {
        if (mode === 'reset') setRefreshingOnline(false);
        setOnlineLoadingMore(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!isFocused) return;
    if (!bootstrapped.current) {
      bootstrapped.current = true;
      locationGridRef.current = locGridKey;
      void loadLocalBootstrap('initial');
      return;
    }
    if (locationGridRef.current === locGridKey) return;
    locationGridRef.current = locGridKey;
    void refreshLocalOffers(location.lat, location.lng);
  }, [isFocused, locGridKey, location.lat, location.lng, loadLocalBootstrap, refreshLocalOffers]);

  useFocusEffect(
    useCallback(() => {
      if (skipFirstFocusRef.current) {
        skipFirstFocusRef.current = false;
        return;
      }
      const now = Date.now();
      if (now - lastSilentOffersFetchAt.current < 45_000) return;
      lastSilentOffersFetchAt.current = now;
      void loadLocalBootstrap('silent');
    }, [loadLocalBootstrap]),
  );

  useEffect(() => {
    if (!statsVersion) return;
    if (!bootstrapped.current) return;
    void loadLocalBootstrap('silent');
  }, [statsVersion, loadLocalBootstrap]);

  useEffect(() => {
    if (section !== 'online') return;
    void fetchOnlinePage(null, onlineSlug, 'reset');
  }, [section, onlineSlug, fetchOnlinePage]);

  const localCategoryChoices = useMemo(() => [{ slug: null as string | null, label: 'All' }, ...offerCategories.map((c) => ({ slug: c.slug, label: c.label }))], [offerCategories]);

  const filteredLocal = useMemo(() => {
    if (!localCategorySlug) return localOffers;
    return localOffers.filter((o) => String(o.business_type || 'other') === localCategorySlug);
  }, [localOffers, localCategorySlug]);

  const partnerLocal = useMemo(() => filteredLocal.filter((o) => !o.is_admin_offer), [filteredLocal]);
  const featuredLocal = useMemo(() => filteredLocal.filter((o) => Boolean(o.is_admin_offer)), [filteredLocal]);

  const onlineFeatured = useMemo(() => onlineItems.filter((x) => x.featured), [onlineItems]);
  const onlineRegular = useMemo(() => onlineItems.filter((x) => !x.featured), [onlineItems]);

  const onlineChipChoices = useMemo(
    () => [{ slug: null as string | null, label: 'All' }, ...onlineCategories.map((c) => ({ slug: c.slug, label: c.label }))],
    [onlineCategories],
  );

  const handleRedeemOffer = useCallback(
    async (offer: Offer) => {
      setRedeemingOfferId(String(offer.id));
      setLocalBanner(null);
      try {
        const res = await api.post(`/api/offers/${offer.id}/redeem`);
        if (!res.success) {
          const msg =
            typeof (res as { error?: unknown }).error === 'string' ? (res as { error?: string }).error : null;
          setLocalBanner(msg ?? 'Could not redeem this offer right now.');
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
        setLocalOffers((prev) =>
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
      } finally {
        setRedeemingOfferId(null);
      }
    },
    [updateUser, user],
  );

  const renderLocalCard = (o: Offer) => {
    const hero = offerHeroUri(o);
    const mi = o.distance_km != null ? (Number(o.distance_km) * 0.621371).toFixed(1) : null;
    const expiry = formatExpiryShort(o.expires_at);
    return (
      <TouchableOpacity
        key={String(o.id)}
        activeOpacity={0.86}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setSelectedOffer(o);
        }}
        style={[
          {
            marginHorizontal: 16,
            marginBottom: 12,
            borderRadius: 18,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: cardBg,
            ...shadow(6),
          },
        ]}
      >
        <View style={{ height: 140, backgroundColor: `${colors.primary}12` }}>
          {hero ? (
            <Image source={{ uri: hero }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : (
            <LinearGradient colors={[`${colors.primary}66`, `${colors.ctaGradientEnd}33`]} style={{ flex: 1 }} />
          )}
          <View
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              backgroundColor: 'rgba(0,0,0,0.45)',
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 10,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '900' }}>{o.discount_percent ?? 0}% off</Text>
          </View>
        </View>
        <View style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
          <Text style={{ color: sub, fontSize: 12, fontWeight: '900' }} numberOfLines={1}>
            {o.business_name?.trim() || 'Partner'}
          </Text>
          <Text style={{ color: text, fontSize: 17, fontWeight: '900', marginTop: 6 }} numberOfLines={2}>
            {headlineTitle(o)}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10, alignItems: 'center' }}>
            <View style={{ backgroundColor: `${sub}16`, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 }}>
              <Text style={{ color: sub, fontSize: 10, fontWeight: '900' }}>{displayOfferCategory(o)}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${colors.success}18`, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 }}>
              <Ionicons name="diamond-outline" size={14} color={colors.success} />
              <Text style={{ color: colors.success, fontSize: 13, fontWeight: '900' }}>{o.gem_cost ?? o.gems_reward ?? 0}</Text>
            </View>
            {mi != null ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="navigate-outline" size={13} color={sub} />
                <Text style={{ color: sub, fontSize: 11, fontWeight: '900' }}>{mi} mi</Text>
              </View>
            ) : null}
            {expiry ? (
              <Text style={{ color: sub, fontSize: 10, fontWeight: '700' }}>{expiry}</Text>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderOnlineCard = (row: OnlineOfferItem) => {
    const expiry = formatExpiryShort(row.expires_at);
    return (
      <TouchableOpacity
        key={row.id}
        activeOpacity={0.86}
        onPress={() => void safeOpenAffiliate(row.affiliate_url || '')}
        style={{
          flex: 1,
          marginHorizontal: 6,
          marginBottom: 12,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: cardBg,
          overflow: 'hidden',
          ...shadow(4),
        }}
      >
        <View style={{ height: 110, backgroundColor: `${colors.primary}10` }}>
          {row.image_url ? (
            <Image source={{ uri: row.image_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : (
            <LinearGradient colors={[`${colors.rewardsGradientStart}66`, `${colors.primary}22`]} style={{ flex: 1 }} />
          )}
          {row.featured ? (
            <View style={{ position: 'absolute', left: 8, top: 8, backgroundColor: `${colors.primary}E6`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
              <Text style={{ color: '#fff', fontSize: 9, fontWeight: '900', textTransform: 'uppercase' }}>Featured</Text>
            </View>
          ) : null}
          {row.discount_label ? (
            <View style={{ position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
              <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900' }}>{row.discount_label}</Text>
            </View>
          ) : null}
        </View>
        <View style={{ padding: 12 }}>
          <Text style={{ color: sub, fontSize: 10, fontWeight: '900' }} numberOfLines={1}>
            {row.merchant_name || row.merchant_domain || 'Retailer'}
          </Text>
          <Text style={{ color: text, fontSize: 14, fontWeight: '900', marginTop: 6 }} numberOfLines={3}>
            {row.title}
          </Text>
          {expiry ? <Text style={{ color: sub, fontSize: 10, marginTop: 8, fontWeight: '700' }}>Ends {expiry}</Text> : null}
        </View>
      </TouchableOpacity>
    );
  };



  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['top']}>
      <View style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 6 }}>
        <SocialScreenHeader
          title="Offers"
          subtitle={
            section === 'local' ? 'Local partners redeem with gems · Online deals open securely in your browser.' : 'Browse cashback-style deals • tap a card to open the partner link.'
          }
          accentColor={colors.primary}
          textColor={text}
          subColor={sub}
        />
      </View>

      <Animated.View entering={FadeInDown.duration(280).delay(40)} style={[styles.toggleRow, {
        backgroundColor: isLight ? 'rgba(15,23,42,0.04)' : 'rgba(255,255,255,0.06)',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: isLight ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.08)',
      }]}>
        {(['local', 'online'] as HubSection[]).map((s) => (
          <TouchableOpacity
            key={s}
            style={[
              styles.togglePill,
              section === s && {
                backgroundColor: s === 'online' ? '#1D4ED8' : colors.primary,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.12,
                shadowRadius: 3,
                elevation: 2,
              },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSection(s);
            }}
            activeOpacity={0.88}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Ionicons
                name={s === 'local' ? 'location-outline' : 'globe-outline'}
                size={13}
                color={section === s ? '#fff' : colors.textSecondary}
              />
              <Text style={[styles.toggleText, { color: section === s ? '#fff' : colors.textSecondary }]}>
                {s === 'local' ? 'Local' : 'Online'}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </Animated.View>

      {section === 'local' ? (
        <ScrollView
          style={{ flex: 1 }}
          refreshControl={<RefreshControl refreshing={refreshingLocal} onRefresh={() => void loadLocalBootstrap('refresh')} tintColor="#3B82F6" />}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        >
          {localBanner ? (
            <View style={{ marginHorizontal: 16, marginTop: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: `${colors.danger}38`, backgroundColor: `${colors.danger}10` }}>
              <Text style={{ color: colors.danger, fontSize: 13, fontWeight: '700' }}>{localBanner}</Text>
            </View>
          ) : null}

          <View style={{ marginTop: 8 }}>
            <OfferCategoryChips choices={localCategoryChoices} selectedSlug={localCategorySlug} onSelect={setLocalCategorySlug} {...rt} />
          </View>

          {loadingLocalBootstrap ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : featuredLocal.length > 0 ? (
            <>
              <Text style={{ color: text, fontSize: 13, fontWeight: '900', marginHorizontal: 16, marginTop: 14, marginBottom: 8 }}>Featured</Text>
              {featuredLocal.map(renderLocalCard)}
            </>
          ) : null}

          {!loadingLocalBootstrap && partnerLocal.length > 0 ? (
            <>
              <Text style={{ color: text, fontSize: 13, fontWeight: '900', marginHorizontal: 16, marginTop: 8, marginBottom: 8 }}>Nearby</Text>
              {partnerLocal.map(renderLocalCard)}
            </>
          ) : null}

          {!loadingLocalBootstrap && filteredLocal.length === 0 ? (
            <View style={{ marginHorizontal: 16, marginTop: 20, alignItems: 'center', padding: 24 }}>
              <Ionicons name="ticket-outline" size={40} color={sub} style={{ opacity: 0.5 }} />
              <Text style={{ color: text, fontWeight: '800', marginTop: 14 }}>No offers in this area</Text>
              <Text style={{ color: sub, textAlign: 'center', marginTop: 10, fontWeight: '600', lineHeight: 18 }}>
                Try another category chip or widen your travels — listings update from partner locations nearby.
              </Text>
            </View>
          ) : null}
        </ScrollView>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          refreshControl={<RefreshControl refreshing={refreshingOnline} onRefresh={() => void fetchOnlinePage(null, onlineSlug, 'reset')} tintColor="#3B82F6" />}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        >
          {onlineBanner ? (
            <View style={{ marginHorizontal: 16, marginTop: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: `${colors.warning}42`, backgroundColor: `${colors.warning}10` }}>
              <Text style={{ color: colors.warning, fontSize: 13, fontWeight: '700' }}>{onlineBanner}</Text>
            </View>
          ) : null}
          <Text style={{ color: sub, fontSize: 11, marginHorizontal: 18, marginTop: onlineBanner ? 10 : 10, marginBottom: 4, fontWeight: '700' }}>
            {onlineProviderLabel ? `Source · ${onlineProviderLabel}` : 'Authenticated feed • opens partner sites in Safari'}
          </Text>
          <OfferCategoryChips
            choices={onlineChipChoices}
            selectedSlug={onlineSlug}
            onSelect={(s) => {
              setOnlineSlug(s);
              setOnlineItems([]);
            }}
            {...rt}
          />

          {onlineFeatured.length > 0 ? (
            <>
              <Text style={{ color: text, fontSize: 13, fontWeight: '900', marginHorizontal: 16, marginTop: 14, marginBottom: 10 }}>Featured row</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 10, paddingBottom: 12 }}>
                {onlineFeatured.map((row) => (
                  <TouchableOpacity
                    key={row.id}
                    activeOpacity={0.88}
                    onPress={() => void safeOpenAffiliate(row.affiliate_url || '')}
                    style={{ width: 200, marginHorizontal: 4, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: cardBg, overflow: 'hidden', ...shadow(6) }}
                  >
                    <View style={{ height: 120, backgroundColor: `${colors.primary}10` }}>
                      {row.image_url ? (
                        <Image source={{ uri: row.image_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      ) : (
                        <LinearGradient colors={[`${colors.primary}77`, `${colors.ctaGradientEnd}33`]} style={{ flex: 1 }} />
                      )}
                    </View>
                    <View style={{ padding: 12 }}>
                      <Text style={{ color: sub, fontSize: 10 }} numberOfLines={1}>{row.merchant_domain}</Text>
                      <Text style={{ color: text, fontSize: 14, fontWeight: '900' }} numberOfLines={2}>{row.title}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          ) : null}

          <Text style={{ color: text, fontSize: 13, fontWeight: '900', marginHorizontal: 16, marginTop: 8, marginBottom: 12 }}>All deals</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10 }}>
            {onlineRegular.map((row) => (
              <View key={row.id} style={{ width: '50%' }}>
                {renderOnlineCard(row)}
              </View>
            ))}
          </View>

          {onlineLoadingMore ? (
            <ActivityIndicator style={{ marginTop: 8 }} color={colors.primary} />
          ) : null}

          {onlineNextCursor ? (
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => void fetchOnlinePage(onlineNextCursor, onlineSlug, 'more')}
              style={{ alignSelf: 'center', marginTop: 14, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 999, backgroundColor: `${colors.primary}18`, borderWidth: 1, borderColor: `${colors.primary}45` }}
            >
              <Text style={{ color: colors.primary, fontWeight: '900' }}>Load more</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      )}

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  toggleRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 2,
    borderRadius: 12,
    padding: 3,
  },
  togglePill: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
  toggleText: { fontSize: 13, fontWeight: '600' },
});

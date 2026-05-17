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
  TextInput,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  type ViewStyle,
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

const winW = Dimensions.get('window').width;
const ONLINE_CARD_W = Math.min(292, Math.round(winW * 0.78));
const LOCAL_CARD_W = Math.min(300, Math.round(winW * 0.82));
const MARKET_ROW_MIN_H = Math.min(440, Math.round(Dimensions.get('window').height * 0.5));

const LOCAL_SHELF_CHOICES = [
  { key: 'all', label: 'All' },
  { key: 'featured', label: 'Featured picks' },
  { key: 'partners', label: 'Nearby partners' },
] as const;

const ONLINE_SHELF_CHOICES = [
  { key: 'all', label: 'All deals' },
  { key: 'featured', label: 'Featured' },
  { key: 'ending', label: 'Ending soon' },
] as const;

const ONLINE_CATEGORY_LABELS: Record<string, string> = {
  fashion: 'Fashion',
  electronics: 'Electronics',
  travel: 'Travel',
  beauty: 'Beauty',
  home: 'Home',
  food_kit: 'Food & pantry',
  food: 'Food',
  sports: 'Sports',
  automotive: 'Auto',
  grocery: 'Grocery',
  pharmacy: 'Pharmacy',
  retail: 'Retail',
  services: 'Services',
  other: 'Other',
};

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

function isUnexpired(iso?: string): boolean {
  if (!iso) return true;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) || d.getTime() > Date.now();
}

function titleCaseLabel(slug: string): string {
  const key = slug.trim().toLowerCase();
  return ONLINE_CATEGORY_LABELS[key] ?? key.replace(/[^a-z0-9]+/g, ' ').trim().replace(/\b\w/g, (c) => c.toUpperCase());
}

function inferOnlineCategory(row: OnlineOfferItem): { slug: string; label: string } {
  const explicit = row.category_slug?.trim().toLowerCase();
  if (explicit) return { slug: explicit, label: row.category_label?.trim() || titleCaseLabel(explicit) };
  const hay = `${row.category_label || ''} ${row.title || ''} ${row.description || ''} ${row.merchant_name || ''} ${row.merchant_domain || ''}`.toLowerCase();
  if (/gas|fuel|auto|car|tire|oil|parts|garage/.test(hay)) return { slug: 'automotive', label: 'Auto' };
  if (/grocery|market|pantry|snack|coffee|restaurant|meal|food/.test(hay)) return { slug: 'food', label: 'Food' };
  if (/hotel|flight|travel|trip|luggage|stay|resort/.test(hay)) return { slug: 'travel', label: 'Travel' };
  if (/shoe|shirt|jean|coat|fashion|apparel|clothing|watch|jewelry/.test(hay)) return { slug: 'fashion', label: 'Fashion' };
  if (/phone|laptop|earbud|headphone|gaming|charger|tech|camera/.test(hay)) return { slug: 'electronics', label: 'Electronics' };
  if (/skin|beauty|makeup|serum|fragrance|hair/.test(hay)) return { slug: 'beauty', label: 'Beauty' };
  if (/home|furniture|kitchen|mattress|decor|garden/.test(hay)) return { slug: 'home', label: 'Home' };
  if (/sport|fitness|outdoor|running|bike|gym/.test(hay)) return { slug: 'sports', label: 'Sports' };
  return { slug: 'other', label: 'Other' };
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

function normalizeOnlineGallery(row: OnlineOfferItem): string[] {
  const primary = row.image_url?.trim();
  const extras = row.image_urls ?? [];
  const out: string[] = [];
  if (primary?.startsWith('http://') || primary?.startsWith('https://')) out.push(primary);
  for (const u of extras) {
    const s = typeof u === 'string' ? u.trim() : '';
    if ((s.startsWith('http://') || s.startsWith('https://')) && !out.includes(s)) out.push(s);
  }
  return out;
}

function OffersSearchField(props: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  cardBg: string;
  border: string;
  text: string;
  sub: string;
}) {
  const { value, onChangeText, placeholder, cardBg, border, text, sub } = props;
  return (
    <View
      style={{
        marginHorizontal: 16,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 14,
        paddingVertical: 11,
        borderRadius: 14,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: border,
        backgroundColor: cardBg,
      }}
    >
      <Ionicons name="search" size={18} color={sub} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={sub}
        style={{ flex: 1, color: text, fontSize: 15, fontWeight: '600', paddingVertical: 0 }}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="never"
      />
      {value.trim().length > 0 ? (
        <TouchableOpacity onPress={() => onChangeText('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close-circle" size={20} color={sub} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function ShelfQuickChips(props: {
  choices: { key: string; label: string }[];
  activeKey: string;
  onSelect: (key: string) => void;
  cardBg: string;
  text: string;
  border: string;
  primary: string;
}) {
  const { choices, activeKey, onSelect, cardBg, text, border, primary } = props;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 12 }}
    >
      {choices.map((c) => {
        const active = c.key === activeKey;
        return (
          <TouchableOpacity
            key={c.key}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelect(c.key);
            }}
            activeOpacity={0.85}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 9,
              borderRadius: 999,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: active ? primary : border,
              backgroundColor: active ? `${primary}18` : cardBg,
            }}
          >
            <Text style={{ color: active ? primary : text, fontSize: 12, fontWeight: '800' }}>{c.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

function OnlineDealCarouselCard(props: {
  row: OnlineOfferItem;
  colors: { border: string; primary: string; rewardsGradientStart: string };
  cardBg: string;
  text: string;
  sub: string;
  shadow: (elevation?: number) => ViewStyle;
}) {
  const { row, colors, cardBg, text, sub, shadow } = props;
  const [heroIdx, setHeroIdx] = useState(0);
  const imgs = useMemo(() => normalizeOnlineGallery(row), [row]);

  useEffect(() => {
    setHeroIdx(0);
  }, [row.id]);
  const expiry = formatExpiryShort(row.expires_at);
  const currency = (row.currency || 'USD').toUpperCase();
  const fmtPrice = (n: number) => {
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(n);
    } catch {
      return `${currency} ${n.toFixed(2)}`;
    }
  };
  const hasSale =
    typeof row.sale_price === 'number' &&
    row.sale_price > 0 &&
    typeof row.regular_price === 'number' &&
    row.regular_price > row.sale_price;
  const showSinglePrice = !hasSale && typeof row.sale_price === 'number' && row.sale_price > 0;
  const outboundUrl = row.source_url || row.affiliate_url || row.affiliate_tracking_url || '';

  const onHeroScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const next = Math.round(x / ONLINE_CARD_W);
    setHeroIdx(Math.max(0, Math.min(Math.max(imgs.length - 1, 0), next)));
  };

  return (
    <TouchableOpacity
      activeOpacity={0.86}
      onPress={() => void safeOpenAffiliate(outboundUrl)}
      style={{
        width: ONLINE_CARD_W,
        marginHorizontal: 8,
        marginBottom: 4,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: cardBg,
        overflow: 'hidden',
        ...shadow(6),
      }}
    >
      <View style={{ height: 136, backgroundColor: `${colors.primary}10` }}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onHeroScroll}
          scrollEventThrottle={16}
          style={{ width: ONLINE_CARD_W, height: 136 }}
        >
          {(imgs.length ? imgs : [null]).map((uri, i) => (
            <View key={`${uri ?? 'ph'}-${i}`} style={{ width: ONLINE_CARD_W, height: 136 }}>
              {uri ? (
                <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              ) : (
                <LinearGradient colors={[`${colors.rewardsGradientStart}77`, `${colors.primary}33`]} style={{ flex: 1 }} />
              )}
            </View>
          ))}
        </ScrollView>
        {row.featured ? (
          <View
            style={{
              position: 'absolute',
              left: 10,
              top: 10,
              backgroundColor: `${colors.primary}E6`,
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 9, fontWeight: '900', textTransform: 'uppercase' }}>Featured</Text>
          </View>
        ) : null}
        {row.discount_label ? (
          <View
            style={{
              position: 'absolute',
              bottom: 10,
              right: 10,
              backgroundColor: 'rgba(0,0,0,0.52)',
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900' }}>{row.discount_label}</Text>
          </View>
        ) : null}
        {imgs.length > 1 ? (
          <View style={{ position: 'absolute', bottom: 8, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 5 }}>
            {imgs.map((_, i) => (
              <View
                key={`dot-${row.id}-${i}`}
                style={{
                  width: i === heroIdx ? 14 : 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: i === heroIdx ? '#fff' : 'rgba(255,255,255,0.45)',
                }}
              />
            ))}
          </View>
        ) : null}
      </View>
      <View style={{ paddingHorizontal: 13, paddingVertical: 12 }}>
        <Text style={{ color: sub, fontSize: 10, fontWeight: '900' }} numberOfLines={1}>
          {row.merchant_name || row.merchant_domain || 'Retailer'}
        </Text>
        <Text style={{ color: text, fontSize: 15, fontWeight: '900', marginTop: 6 }} numberOfLines={3}>
          {row.title}
        </Text>
        {hasSale ? (
          <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 8, gap: 6 }}>
            <Text style={{ color: text, fontSize: 14, fontWeight: '900' }}>{fmtPrice(row.sale_price as number)}</Text>
            <Text style={{ color: sub, fontSize: 11, fontWeight: '700', textDecorationLine: 'line-through' }}>
              {fmtPrice(row.regular_price as number)}
            </Text>
          </View>
        ) : showSinglePrice ? (
          <Text style={{ color: text, fontSize: 14, fontWeight: '900', marginTop: 8 }}>
            {fmtPrice(row.sale_price as number)}
          </Text>
        ) : null}
        {expiry ? <Text style={{ color: sub, fontSize: 10, marginTop: 8, fontWeight: '700' }}>Ends {expiry}</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

export default function OffersScreen() {
  const skipFirstFocusRef = useRef(true);
  const lastSilentOffersFetchAt = useRef(0);
  const bootstrapped = useRef(false);
  const onlineBootstrapped = useRef(false);
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

  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [onlineSearchQuery, setOnlineSearchQuery] = useState('');
  const [localShelfFilter, setLocalShelfFilter] = useState<'all' | 'featured' | 'partners'>('all');
  const [onlineQuickFilter, setOnlineQuickFilter] = useState<'all' | 'featured' | 'ending'>('all');

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
      setLocalOffers(parseNearbyOffers(nearRes.data).filter((offer) => isUnexpired(offer.expires_at)));
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
    async (cursor: string | null, mode: 'reset' | 'more') => {
      if (mode === 'reset') {
        setOnlineBanner(null);
        setRefreshingOnline(true);
        setOnlineLoadingMore(false);
      } else {
        setOnlineLoadingMore(true);
      }
      try {
        const qs = new URLSearchParams();
        // Keep the feed broad. The app classifies uploaded offers into chips
        // client-side so admin-pasted rows do not disappear because a source
        // page lacked category metadata.
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
        const parsedItems = parsed.items.filter((item) => isUnexpired(item.expires_at)).map((item) => {
          const inferred = inferOnlineCategory(item);
          return {
            ...item,
            category_slug: item.category_slug?.trim() || inferred.slug,
            category_label: item.category_label?.trim() || inferred.label,
          };
        });
        const categoriesFromItems = new Map<string, string>();
        for (const item of parsedItems) {
          const inferred = inferOnlineCategory(item);
          categoriesFromItems.set(inferred.slug, inferred.label);
        }
        const serverCategories = parsed.categories ?? [];
        const mergedCategories = new Map<string, string>();
        for (const cat of serverCategories) mergedCategories.set(cat.slug, cat.label);
        for (const [slug, label] of categoriesFromItems) mergedCategories.set(slug, label);
        setOnlineCategories(
          [...mergedCategories.entries()]
            .map(([slug, label]) => ({ slug, label }))
            .sort((a, b) => a.label.localeCompare(b.label)),
        );
        setOnlineNextCursor(parsed.next_cursor);
        if (mode === 'reset') setOnlineItems(parsedItems);
        else setOnlineItems((prev) => {
          const seen = new Set(prev.map((x) => x.id));
          const merged = [...prev];
          for (const row of parsedItems) {
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
    if (section !== 'online' || onlineBootstrapped.current) return;
    onlineBootstrapped.current = true;
    void fetchOnlinePage(null, 'reset');
  }, [section, fetchOnlinePage]);

  useEffect(() => {
    if (!isFocused || onlineBootstrapped.current) return;
    onlineBootstrapped.current = true;
    void fetchOnlinePage(null, 'reset');
  }, [isFocused, fetchOnlinePage]);

  const localCategoryChoices = useMemo(() => [{ slug: null as string | null, label: 'All' }, ...offerCategories.map((c) => ({ slug: c.slug, label: c.label }))], [offerCategories]);

  const filteredLocalByCategory = useMemo(() => {
    if (!localCategorySlug) return localOffers;
    return localOffers.filter((o) => String(o.business_type || 'other') === localCategorySlug);
  }, [localOffers, localCategorySlug]);

  const filteredLocalByShelf = useMemo(() => {
    if (localShelfFilter === 'featured') return filteredLocalByCategory.filter((o) => Boolean(o.is_admin_offer));
    if (localShelfFilter === 'partners') return filteredLocalByCategory.filter((o) => !o.is_admin_offer);
    return filteredLocalByCategory;
  }, [filteredLocalByCategory, localShelfFilter]);

  const filteredLocal = useMemo(() => {
    const q = localSearchQuery.trim().toLowerCase();
    if (!q) return filteredLocalByShelf;
    return filteredLocalByShelf.filter((o) => {
      const blob = `${o.title ?? ''} ${o.business_name ?? ''} ${o.description ?? ''} ${o.address ?? ''}`.toLowerCase();
      return blob.includes(q);
    });
  }, [filteredLocalByShelf, localSearchQuery]);

  const featuredLocal = useMemo(() => filteredLocal.filter((o) => Boolean(o.is_admin_offer)), [filteredLocal]);
  const partnerLocal = useMemo(() => filteredLocal.filter((o) => !o.is_admin_offer), [filteredLocal]);

  const filteredOnlineByCategory = useMemo(
    () => (onlineSlug ? onlineItems.filter((x) => inferOnlineCategory(x).slug === onlineSlug) : onlineItems),
    [onlineItems, onlineSlug],
  );

  const filteredOnlineByQuick = useMemo(() => {
    let rows = filteredOnlineByCategory;
    if (onlineQuickFilter === 'featured') rows = rows.filter((x) => x.featured);
    if (onlineQuickFilter === 'ending') {
      const weekAhead = Date.now() + 7 * 86400000;
      rows = rows.filter((x) => {
        if (!x.expires_at) return false;
        const t = new Date(x.expires_at).getTime();
        return Number.isFinite(t) && t <= weekAhead && t > Date.now();
      });
    }
    return rows;
  }, [filteredOnlineByCategory, onlineQuickFilter]);

  const filteredOnlineItems = useMemo(() => {
    const q = onlineSearchQuery.trim().toLowerCase();
    if (!q) return filteredOnlineByQuick;
    return filteredOnlineByQuick.filter((row) => {
      const blob = `${row.title} ${row.description ?? ''} ${row.merchant_name ?? ''} ${row.merchant_domain ?? ''} ${row.discount_label ?? ''}`.toLowerCase();
      return blob.includes(q);
    });
  }, [filteredOnlineByQuick, onlineSearchQuery]);

  const onlineFeaturedRows = useMemo(() => filteredOnlineItems.filter((x) => x.featured), [filteredOnlineItems]);
  const onlineFeaturedIds = useMemo(() => new Set(onlineFeaturedRows.map((x) => x.id)), [onlineFeaturedRows]);
  const onlineBrowseRows = useMemo(() => {
    if (onlineFeaturedRows.length === 0) return filteredOnlineItems;
    return filteredOnlineItems.filter((x) => !onlineFeaturedIds.has(x.id));
  }, [filteredOnlineItems, onlineFeaturedIds, onlineFeaturedRows.length]);

  const onlineCarouselColors = useMemo(
    () => ({
      border: colors.border,
      primary: colors.primary,
      rewardsGradientStart: colors.rewardsGradientStart,
    }),
    [colors.border, colors.primary, colors.rewardsGradientStart],
  );

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
    const isAffiliate = String(o.offer_source || '').toLowerCase() === 'fmtc' || Boolean(o.affiliate_tracking_url || o.offer_url);
    const discountLabel = Number(o.discount_percent || 0) > 0 ? `${o.discount_percent ?? 0}% off` : isAffiliate ? 'Partner deal' : '0% off';
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
            width: LOCAL_CARD_W,
            marginBottom: 4,
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
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '900' }}>{discountLabel}</Text>
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
              <Ionicons name={isAffiliate ? 'open-outline' : 'diamond-outline'} size={14} color={colors.success} />
              <Text style={{ color: colors.success, fontSize: 13, fontWeight: '900' }}>{isAffiliate ? 'Open' : (o.gem_cost ?? o.gems_reward ?? 0)}</Text>
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

          <OffersSearchField
            value={localSearchQuery}
            onChangeText={setLocalSearchQuery}
            placeholder="Search local offers…"
            cardBg={cardBg}
            border={colors.border}
            text={text}
            sub={sub}
          />

          <View style={{ marginTop: 4 }}>
            <OfferCategoryChips choices={localCategoryChoices} selectedSlug={localCategorySlug} onSelect={setLocalCategorySlug} {...rt} />
          </View>

          <ShelfQuickChips
            choices={[...LOCAL_SHELF_CHOICES]}
            activeKey={localShelfFilter}
            onSelect={(k) => setLocalShelfFilter(k as 'all' | 'featured' | 'partners')}
            cardBg={cardBg}
            text={text}
            border={colors.border}
            primary={colors.primary}
          />

          {loadingLocalBootstrap ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : featuredLocal.length > 0 ? (
            <>
              <Text style={{ color: text, fontSize: 13, fontWeight: '900', marginHorizontal: 16, marginTop: 14, marginBottom: 8 }}>Featured</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ minHeight: MARKET_ROW_MIN_H }}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 12, alignItems: 'stretch', paddingVertical: 10 }}
              >
                {featuredLocal.map(renderLocalCard)}
              </ScrollView>
            </>
          ) : null}

          {!loadingLocalBootstrap && partnerLocal.length > 0 ? (
            <>
              <Text style={{ color: text, fontSize: 13, fontWeight: '900', marginHorizontal: 16, marginTop: 8, marginBottom: 8 }}>Nearby</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ minHeight: MARKET_ROW_MIN_H }}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 12, alignItems: 'stretch', paddingVertical: 10 }}
              >
                {partnerLocal.map(renderLocalCard)}
              </ScrollView>
            </>
          ) : null}

          {!loadingLocalBootstrap && filteredLocal.length === 0 ? (
            <View style={{ marginHorizontal: 16, marginTop: 20, alignItems: 'center', padding: 24 }}>
              <Ionicons name="ticket-outline" size={40} color={sub} style={{ opacity: 0.5 }} />
              <Text style={{ color: text, fontWeight: '800', marginTop: 14 }}>No offers in this area</Text>
              <Text style={{ color: sub, textAlign: 'center', marginTop: 10, fontWeight: '600', lineHeight: 18 }}>
                Try search, category chips, or shelf filters — listings update from partner locations nearby.
              </Text>
            </View>
          ) : null}
        </ScrollView>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          refreshControl={<RefreshControl refreshing={refreshingOnline} onRefresh={() => void fetchOnlinePage(null, 'reset')} tintColor="#3B82F6" />}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        >
          {onlineBanner ? (
            <View style={{ marginHorizontal: 16, marginTop: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: `${colors.warning}42`, backgroundColor: `${colors.warning}10` }}>
              <Text style={{ color: colors.warning, fontSize: 13, fontWeight: '700' }}>{onlineBanner}</Text>
            </View>
          ) : null}

          <OffersSearchField
            value={onlineSearchQuery}
            onChangeText={setOnlineSearchQuery}
            placeholder="Search online deals…"
            cardBg={cardBg}
            border={colors.border}
            text={text}
            sub={sub}
          />

          <OfferCategoryChips choices={onlineChipChoices} selectedSlug={onlineSlug} onSelect={setOnlineSlug} {...rt} />

          <ShelfQuickChips
            choices={[...ONLINE_SHELF_CHOICES]}
            activeKey={onlineQuickFilter}
            onSelect={(k) => setOnlineQuickFilter(k as 'all' | 'featured' | 'ending')}
            cardBg={cardBg}
            text={text}
            border={colors.border}
            primary={colors.primary}
          />

          {refreshingOnline && onlineItems.length === 0 ? (
            <View style={{ paddingVertical: 28, alignItems: 'center' }}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : null}

          {!refreshingOnline && onlineItems.length === 0 ? (
            <View style={{ marginHorizontal: 16, marginTop: 16, alignItems: 'center', padding: 24 }}>
              <Ionicons name="globe-outline" size={40} color={sub} style={{ opacity: 0.5 }} />
              <Text style={{ color: text, fontWeight: '800', marginTop: 14 }}>No online deals yet</Text>
              <Text style={{ color: sub, textAlign: 'center', marginTop: 10, fontWeight: '600', lineHeight: 18 }}>
                Pull to refresh — deals load from our partner catalog when available.
              </Text>
            </View>
          ) : null}

          {!refreshingOnline && onlineItems.length > 0 && filteredOnlineItems.length === 0 ? (
            <View style={{ marginHorizontal: 16, marginTop: 12, alignItems: 'center', padding: 20 }}>
              <Ionicons name="search-outline" size={36} color={sub} style={{ opacity: 0.55 }} />
              <Text style={{ color: text, fontWeight: '800', marginTop: 12 }}>No matches</Text>
              <Text style={{ color: sub, textAlign: 'center', marginTop: 8, fontWeight: '600', lineHeight: 18 }}>
                Adjust search or chips — broad filters usually surface more listings.
              </Text>
            </View>
          ) : null}

          {onlineFeaturedRows.length > 0 ? (
            <>
              <Text style={{ color: text, fontSize: 13, fontWeight: '900', marginHorizontal: 16, marginTop: 14, marginBottom: 10 }}>Featured</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ minHeight: MARKET_ROW_MIN_H }}
                contentContainerStyle={{ paddingHorizontal: 8, alignItems: 'stretch', paddingVertical: 10 }}
              >
                {onlineFeaturedRows.map((row) => (
                  <OnlineDealCarouselCard
                    key={row.id}
                    row={row}
                    colors={onlineCarouselColors}
                    cardBg={cardBg}
                    text={text}
                    sub={sub}
                    shadow={shadow}
                  />
                ))}
              </ScrollView>
            </>
          ) : null}

          {onlineBrowseRows.length > 0 ? (
            <>
              <Text style={{ color: text, fontSize: 13, fontWeight: '900', marginHorizontal: 16, marginTop: 8, marginBottom: 12 }}>
                {onlineFeaturedRows.length > 0 ? 'More deals' : 'Deals'}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ minHeight: MARKET_ROW_MIN_H }}
                contentContainerStyle={{ paddingHorizontal: 8, alignItems: 'stretch', paddingVertical: 10 }}
              >
                {onlineBrowseRows.map((row) => (
                  <OnlineDealCarouselCard
                    key={row.id}
                    row={row}
                    colors={onlineCarouselColors}
                    cardBg={cardBg}
                    text={text}
                    sub={sub}
                    shadow={shadow}
                  />
                ))}
              </ScrollView>
            </>
          ) : null}

          {onlineLoadingMore ? (
            <ActivityIndicator style={{ marginTop: 8 }} color={colors.primary} />
          ) : null}

          {onlineNextCursor ? (
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => void fetchOnlinePage(onlineNextCursor, 'more')}
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

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Skeleton from '../common/Skeleton';
import type { Badge, Challenge, Offer, Trip, WeeklyInsights } from '../../types';
import type { GemTx, OffersRewardsView, UserOfferRedemption } from './types';
import { displayOfferCategory } from '../../lib/offerCategories';
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

export function OfferCategoryChips({
  choices,
  selectedSlug,
  onSelect,
  cardBg,
  text,
  sub: _sub,
  border,
  primary,
  success: _s,
  danger: _d,
  warning: _w,
}: ThemeProps & {
  choices: { slug: string | null; label: string }[];
  selectedSlug: string | null;
  onSelect: (slug: string | null) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 10, flexDirection: 'row', alignItems: 'center' }}
    >
      {choices.map((c) => {
        const active =
          (c.slug === null && selectedSlug === null) || (c.slug !== null && c.slug === selectedSlug);
        return (
          <TouchableOpacity
            key={c.slug === null ? '__all__' : `${c.slug}-${c.label}`}
            onPress={() => onSelect(c.slug)}
            activeOpacity={0.82}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 12,
              backgroundColor: active ? `${primary}22` : cardBg,
              borderWidth: 1,
              borderColor: active ? `${primary}50` : border,
            }}
          >
            <Text style={{ color: active ? primary : text, fontSize: 12, fontWeight: '800' }}>{c.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

export function OffersRewardsSegment({
  view,
  onChange,
  myCount,
  cardBg,
  text,
  sub,
  border,
  primary,
  success: _success,
  danger: _d,
  warning: _w,
}: ThemeProps & {
  view: OffersRewardsView;
  onChange: (v: OffersRewardsView) => void;
  myCount: number;
}) {
  const Tab = ({ id, label, icon, count }: { id: OffersRewardsView; label: string; icon: keyof typeof Ionicons.glyphMap; count?: number }) => {
    const active = view === id;
    return (
      <TouchableOpacity
        onPress={() => onChange(id)}
        activeOpacity={0.85}
        style={{
          flex: 1,
          borderRadius: 14,
          paddingVertical: 11,
          paddingHorizontal: 10,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          backgroundColor: active ? `${primary}22` : 'transparent',
          borderWidth: 1,
          borderColor: active ? `${primary}55` : border,
        }}
      >
        <Ionicons name={icon} size={16} color={active ? primary : sub} />
        <Text style={{ color: active ? primary : sub, fontSize: 12, fontWeight: '800' }} numberOfLines={1}>
          {label}
          {count != null && count > 0 ? ` (${count})` : ''}
        </Text>
      </TouchableOpacity>
    );
  };
  return (
    <View style={{ paddingHorizontal: 16, marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', gap: 10, backgroundColor: cardBg, borderRadius: 16, padding: 6, borderWidth: 1, borderColor: border }}>
        <Tab id="nearby" label="Browse nearby" icon="navigate-outline" />
        <Tab id="my_redemptions" label="My redemptions" icon="receipt-outline" count={myCount} />
      </View>
      <Text style={{ color: sub, fontSize: 11, fontWeight: '600', marginTop: 10, lineHeight: 15, paddingHorizontal: 2 }}>
        {view === 'nearby'
          ? 'Partner offers near your last location. Redeem with gems, then show your QR at the store when you check out.'
          : 'Every offer you redeemed and whether the partner scanned your code — gems spent, discount, and date in one place.'}
      </Text>
    </View>
  );
}

function formatRedemptionWhen(iso: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch {
    return iso;
  }
}

export function MyRedemptionsSection({
  loading,
  redemptions,
  onOpen,
  cardBg,
  text,
  sub,
  border,
  primary,
  success,
  danger,
  warning,
}: ThemeProps & {
  loading: boolean;
  redemptions: UserOfferRedemption[];
  onOpen: (r: UserOfferRedemption) => void;
}) {
  if (loading) {
    return <View style={{ paddingHorizontal: 16, gap: 8 }}>{[1, 2, 3].map((i) => <Skeleton key={i} width="100%" height={92} borderRadius={16} />)}</View>;
  }
  if (redemptions.length === 0) {
    return (
      <View style={[rewardsStyles.emptyCard, { backgroundColor: cardBg, borderWidth: 1, borderColor: border, marginHorizontal: 16 }]}>
        <Ionicons name="receipt-outline" size={40} color={sub} style={{ marginBottom: 8 }} />
        <Text style={{ color: text, fontSize: 15, fontWeight: '800' }}>No redemptions yet</Text>
        <Text style={{ color: sub, fontSize: 13, marginTop: 6, textAlign: 'center', lineHeight: 18 }}>
          When you redeem an offer with gems, it appears here. After you visit the store, status updates when staff scans your QR.
        </Text>
      </View>
    );
  }
  return (
    <>
      {redemptions.map((r) => (
        <TouchableOpacity
          key={r.redemption_id || r.offer_id}
          style={[
            rewardsStyles.offerCard,
            {
              marginHorizontal: 16,
              borderRadius: 18,
              backgroundColor: cardBg,
              borderWidth: 1,
              borderColor: border,
              overflow: 'hidden',
              padding: 14,
            },
          ]}
          onPress={() => onOpen(r)}
          activeOpacity={0.82}
        >
          <LinearGradient
            colors={r.used_in_store ? [`${success}40`, `${success}10`] : [`${warning}38`, `${warning}0c`]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: 4,
              borderTopLeftRadius: 18,
              borderBottomLeftRadius: 18,
            }}
          />
          {r.image_url ? (
            <View style={{ width: 64, height: 64, borderRadius: 16, overflow: 'hidden', marginRight: 12, backgroundColor: border }}>
              <Image source={{ uri: r.image_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            </View>
          ) : (
            <View style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: `${primary}18`, marginRight: 12, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="storefront-outline" size={28} color={primary} />
            </View>
          )}
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
              <View style={{ backgroundColor: `${primary}18`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                <Text style={{ color: primary, fontSize: 11, fontWeight: '900' }}>{r.discount_percent ?? r.discount_applied ?? 0}%</Text>
              </View>
              <View style={{ backgroundColor: `${sub}16`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                <Text style={{ color: sub, fontSize: 10, fontWeight: '800' }} numberOfLines={1}>
                  {displayOfferCategory(r)}
                </Text>
              </View>
              <View
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 8,
                  backgroundColor: r.used_in_store ? `${success}22` : `${warning}20`,
                }}
              >
                <Text style={{ color: r.used_in_store ? success : warning, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.3 }}>
                  {r.used_in_store ? 'Used in store' : 'Not scanned yet'}
                </Text>
              </View>
            </View>
            <Text style={[rewardsStyles.offerBiz, { color: text }]} numberOfLines={1}>{r.business_name}</Text>
            {r.address ? (
              <Text style={{ color: sub, fontSize: 11, marginTop: 3 }} numberOfLines={1}>
                {r.address}
              </Text>
            ) : null}
            <Text style={{ color: sub, fontSize: 11, marginTop: 4, fontWeight: '600' }}>{formatRedemptionWhen(r.redeemed_at)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${danger}14`, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10 }}>
              <Ionicons name="diamond-outline" size={14} color={danger} />
              <Text style={{ color: danger, fontSize: 13, fontWeight: '800' }}>−{r.gem_cost}</Text>
            </View>
            <Text style={{ color: sub, fontSize: 10, fontWeight: '700', marginTop: 6 }}>gems</Text>
          </View>
        </TouchableOpacity>
      ))}
    </>
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
          style={[
            rewardsStyles.offerCard,
            {
              backgroundColor: cardBg,
              borderWidth: 1,
              borderColor: border,
              borderRadius: 18,
              overflow: 'hidden',
            },
          ]}
          onPress={() => onPressOffer(o)}
          activeOpacity={0.82}
        >
          <LinearGradient colors={[`${success}35`, `${success}08`]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, borderTopLeftRadius: 18, borderBottomLeftRadius: 18 }} />
          {o.image_url ? (
            <View style={{ width: 80, height: 80, borderRadius: 18, overflow: 'hidden', marginRight: 12, backgroundColor: border, borderWidth: 1, borderColor: `${border}88` }}>
              <Image source={{ uri: o.image_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            </View>
          ) : (
            <View style={{ width: 80, height: 80, borderRadius: 18, backgroundColor: `${primary}14`, marginRight: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: `${primary}28` }}>
              <Ionicons name="storefront-outline" size={30} color={primary} />
            </View>
          )}
          <View style={{ flex: 1, paddingLeft: 4 }}>
            <Text style={{ color: sub, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 }} numberOfLines={1}>
              {o.business_name}
            </Text>
            <Text style={[rewardsStyles.offerBiz, { color: text, marginTop: 2 }]} numberOfLines={2}>
              {o.title?.trim() || o.description || `${o.discount_percent}% off at partner`}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              <View style={{ backgroundColor: `${primary}20`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                <Text style={{ color: primary, fontSize: 11, fontWeight: '900' }}>{o.discount_percent ?? 0}% off</Text>
              </View>
              <View style={{ backgroundColor: `${sub}14`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                <Text style={{ color: sub, fontSize: 10, fontWeight: '800' }} numberOfLines={1}>{displayOfferCategory(o)}</Text>
              </View>
            </View>
            {o.address ? <Text style={{ color: sub, fontSize: 11, marginTop: 6 }} numberOfLines={1}>{o.address}</Text> : null}
            {o.distance_km != null && (
              <Text style={{ color: sub, fontSize: 11, marginTop: 4, fontWeight: '600' }}>
                {(Number(o.distance_km) * 0.621371).toFixed(1)} mi away
              </Text>
            )}
          </View>
          <View style={{ alignItems: 'flex-end', gap: 6, justifyContent: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${success}18`, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 }}>
              <Ionicons name="diamond-outline" size={14} color={success} />
              <Text style={{ color: success, fontSize: 13, fontWeight: '800' }}>{o.gem_cost ?? o.gems_reward ?? 0}</Text>
            </View>
            <Text style={{ color: o.redeemed ? success : primary, fontSize: 11, fontWeight: '800' }}>
              {o.redeemed ? 'Redeemed' : 'Available'}
            </Text>
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
  onPressTx,
}: ThemeProps & {
  loading: boolean;
  gemTx: GemTx[];
  onPressTx: (tx: GemTx) => void;
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
        <TouchableOpacity
          key={tx.id}
          activeOpacity={0.82}
          onPress={() => onPressTx(tx)}
          style={[rewardsStyles.tripCard, { backgroundColor: cardBg, borderWidth: 1, borderColor: border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: tx.type === 'spent' ? `${danger}15` : `${success}15`, justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name={tx.type === 'spent' ? 'arrow-down' : 'arrow-up'} size={20} color={tx.type === 'spent' ? danger : success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[rewardsStyles.tripRoute, { color: text }]} numberOfLines={1}>{tx.source}</Text>
              <Text style={{ color: sub, fontSize: 11, fontWeight: '600' }}>{tx.date ? new Date(tx.date).toLocaleString() : 'Recently'}</Text>
              {tx.reference_type && tx.reference_id ? (
                <Text style={{ color: sub, fontSize: 10, fontWeight: '600', marginTop: 3 }} numberOfLines={1}>
                  {tx.reference_type} · {tx.reference_id.slice(0, 8)}
                  {tx.reference_id.length > 8 ? '…' : ''}
                </Text>
              ) : null}
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ color: tx.type === 'spent' ? danger : success, fontWeight: '900', fontSize: 16 }}>
              {tx.type === 'spent' ? '-' : '+'}{tx.amount}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={sub} />
          </View>
        </TouchableOpacity>
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


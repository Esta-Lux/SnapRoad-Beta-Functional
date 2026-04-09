import React from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Skeleton from '../common/Skeleton';
import type { Badge, Offer } from '../../types';
import { badgeCategoryAccent, badgeIoniconsName } from '../../lib/badgeIcons';
import type { GemTx, OffersRewardsView, UserOfferRedemption } from './types';
import { displayOfferCategory } from '../../lib/offerCategories';
import { rewardsStyles } from './styles';
import { BadgeTileIcon } from './BadgeTileIcon';

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

function truncateText(s: string, max: number): string {
  const t = s.trim();
  if (!t) return '';
  return t.length <= max ? t : `${t.slice(0, max).trim()}…`;
}

function offerHeadlineTitle(o: Offer): string {
  const t = o.title?.trim();
  if (t) return t;
  const first = o.description?.split(/[.!?\n]/)[0]?.trim();
  if (first) return first;
  return `${o.discount_percent ?? 0}% off`;
}

function offerDescriptionShort(o: Offer): string {
  const raw = (o.description || '').trim();
  if (!raw) return '';
  const title = offerHeadlineTitle(o);
  if (raw.startsWith(title)) return truncateText(raw.slice(title.length).replace(/^[\s.,-]+/, ''), 120);
  return truncateText(raw, 120);
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
      {badges.slice(0, 12).map((b) => {
        const accent = badgeCategoryAccent(b.category);
        const iconName = badgeIoniconsName(b.icon);
        const prog = Math.max(0, Math.min(100, Number(b.progress) || 0));
        return (
          <TouchableOpacity
            key={b.id}
            style={[
              rewardsStyles.badgeItem,
              {
                backgroundColor: cardBg,
                opacity: b.earned ? 1 : 0.58,
                borderColor: b.earned ? accent : border,
                borderWidth: b.earned ? 2 : 1,
              },
            ]}
            onPress={() => onPressBadge(b)}
            activeOpacity={0.8}
          >
            <BadgeTileIcon
              earned={b.earned}
              iconName={iconName}
              accent={accent}
              sub={sub}
              surfaceBg={cardBg}
              progress={prog}
              ringSize={52}
              iconCell={44}
              iconRadius={14}
              iconSize={24}
            />
            {!b.earned && prog > 0 && prog < 100 ? (
              <View style={[rewardsStyles.progressTrack, { width: '100%', marginTop: 6 }]}>
                <View style={[rewardsStyles.progressBar, { width: `${prog}%`, backgroundColor: accent }]} />
              </View>
            ) : null}
            <Text style={[rewardsStyles.badgeName, { color: text }]} numberOfLines={1}>{b.name}</Text>
          </TouchableOpacity>
        );
      })}
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
    return <View style={{ paddingHorizontal: 16, gap: 8 }}>{[1, 2].map((i) => <Skeleton key={i} width="100%" height={118} borderRadius={16} />)}</View>;
  }
  if (offers.length === 0) {
    return (
      <View style={[rewardsStyles.emptyCard, { backgroundColor: cardBg, borderWidth: 1, borderColor: border }]}>
        <Ionicons name="pricetag-outline" size={36} color={sub} style={{ marginBottom: 8 }} />
        <Text style={{ color: sub, fontSize: 14, fontWeight: '600' }}>No offers nearby</Text>
        <Text style={{ color: sub, fontSize: 12, marginTop: 4, opacity: 0.85 }}>Move around or pull to refresh — offers use your last known area.</Text>
      </View>
    );
  }
  return (
    <>
      {offers.slice(0, 6).map((o) => {
        const desc = offerDescriptionShort(o);
        const mi = o.distance_km != null ? (Number(o.distance_km) * 0.621371).toFixed(1) : null;
        return (
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
                alignItems: 'stretch',
              },
            ]}
            onPress={() => onPressOffer(o)}
            activeOpacity={0.82}
          >
            <LinearGradient
              colors={[`${success}38`, `${success}08`]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, borderTopLeftRadius: 18, borderBottomLeftRadius: 18 }}
            />
            {o.image_url ? (
              <View style={{ width: 88, height: 88, borderRadius: 16, overflow: 'hidden', marginRight: 12, backgroundColor: border, borderWidth: 1, borderColor: `${border}99` }}>
                <Image source={{ uri: o.image_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              </View>
            ) : (
              <View style={{ width: 88, height: 88, borderRadius: 16, backgroundColor: `${primary}12`, marginRight: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: `${primary}25` }}>
                <Ionicons name="storefront-outline" size={32} color={primary} />
              </View>
            )}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: sub, fontSize: 12, fontWeight: '800' }} numberOfLines={1}>
                {o.business_name || 'Partner'}
              </Text>
              <Text style={{ color: text, fontSize: 16, fontWeight: '900', marginTop: 4 }} numberOfLines={2}>
                {offerHeadlineTitle(o)}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                <View style={{ backgroundColor: `${sub}16`, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                  <Text style={{ color: sub, fontSize: 10, fontWeight: '900' }} numberOfLines={1}>
                    {displayOfferCategory(o)}
                  </Text>
                </View>
                <View style={{ backgroundColor: `${primary}18`, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                  <Text style={{ color: primary, fontSize: 10, fontWeight: '900' }}>{o.discount_percent ?? 0}% off</Text>
                </View>
              </View>
              {desc ? (
                <Text style={{ color: sub, fontSize: 12, lineHeight: 17, marginTop: 8 }} numberOfLines={2}>
                  {desc}
                </Text>
              ) : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                {o.address ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1, minWidth: 0 }}>
                    <Ionicons name="location-outline" size={14} color={sub} />
                    <Text style={{ color: sub, fontSize: 11, flex: 1 }} numberOfLines={1}>
                      {o.address}
                    </Text>
                  </View>
                ) : null}
                {mi != null ? <Text style={{ color: sub, fontSize: 11, fontWeight: '700' }}>{mi} mi</Text> : null}
              </View>
            </View>
            <View style={{ alignItems: 'flex-end', justifyContent: 'space-between', paddingLeft: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${success}20`, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 }}>
                <Ionicons name="diamond" size={15} color={success} />
                <Text style={{ color: success, fontSize: 15, fontWeight: '900' }}>{o.gem_cost ?? o.gems_reward ?? 0}</Text>
              </View>
              <Text style={{ color: o.redeemed ? success : primary, fontSize: 11, fontWeight: '900', marginTop: 8 }}>
                {o.redeemed ? 'Redeemed' : 'Tap for details'}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
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
  primary,
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
    return <View style={{ paddingHorizontal: 16, gap: 8 }}>{[1, 2].map((i) => <Skeleton key={i} width="100%" height={64} borderRadius={14} />)}</View>;
  }
  if (gemTx.length === 0) {
    return (
      <View style={[rewardsStyles.emptyCard, { backgroundColor: cardBg, borderWidth: 1, borderColor: border }]}>
        <Ionicons name="wallet-outline" size={32} color={sub} style={{ marginBottom: 8 }} />
        <Text style={{ color: text, fontWeight: '800' }}>No gem activity yet</Text>
        <Text style={{ color: sub, fontSize: 13, marginTop: 6, textAlign: 'center', lineHeight: 18 }}>
          Drive and complete trips — credits and partner redemptions will show here from the same wallet ledger.
        </Text>
      </View>
    );
  }
  return (
    <>
      {gemTx.map((tx) => {
        const kindLabel =
          tx.tx_type === 'trip_drive'
            ? 'Trip'
            : tx.tx_type === 'offer_redemption' || tx.reference_type === 'redemption'
              ? 'Redemption'
              : tx.tx_type
                ? String(tx.tx_type).replace(/_/g, ' ')
                : null;
        return (
          <TouchableOpacity
            key={tx.id}
            activeOpacity={0.82}
            onPress={() => onPressTx(tx)}
            style={{
              marginHorizontal: 16,
              marginBottom: 10,
              padding: 14,
              borderRadius: 16,
              backgroundColor: cardBg,
              borderWidth: 1,
              borderColor: border,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  backgroundColor: tx.type === 'spent' ? `${danger}14` : `${success}14`,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Ionicons name={tx.type === 'spent' ? 'arrow-down-circle' : 'arrow-up-circle'} size={22} color={tx.type === 'spent' ? danger : success} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <Text style={[rewardsStyles.tripRoute, { color: text, flexShrink: 1 }]} numberOfLines={1}>
                    {tx.source}
                  </Text>
                  {kindLabel ? (
                    <View style={{ backgroundColor: `${primary}16`, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                      <Text style={{ color: primary, fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.3 }}>{kindLabel}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={{ color: sub, fontSize: 11, fontWeight: '600', marginTop: 3 }}>
                  {tx.date ? new Date(tx.date).toLocaleString() : 'Recently'}
                </Text>
                {tx.balance_after != null && Number.isFinite(tx.balance_after) ? (
                  <Text style={{ color: sub, fontSize: 10, fontWeight: '600', marginTop: 4 }}>Balance after · {formatCompactGems(tx.balance_after)}</Text>
                ) : null}
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ color: tx.type === 'spent' ? danger : success, fontWeight: '900', fontSize: 17 }}>
                {tx.type === 'spent' ? '−' : '+'}
                {tx.amount}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={sub} />
            </View>
          </TouchableOpacity>
        );
      })}
    </>
  );
}

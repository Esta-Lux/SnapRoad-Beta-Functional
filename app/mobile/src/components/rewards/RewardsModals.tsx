import React, { useEffect, useState } from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Skeleton from '../common/Skeleton';
import type { Badge, Offer } from '../../types';
import type { UserOfferRedemption } from './types';
import { displayOfferCategory } from '../../lib/offerCategories';
import { openMapsSearch } from '../../lib/mapsLinks';
import { api } from '../../api/client';
import { rewardsStyles } from './styles';
import { badgeCategoryAccent, badgeIoniconsName } from '../../lib/badgeIcons';
import { BadgeTileIcon } from './BadgeTileIcon';

let QRCode: React.ComponentType<{ value: string; size: number; backgroundColor: string; color: string }> | null = null;
try {
  QRCode = require('react-native-qrcode-svg').default;
} catch {
  QRCode = null;
}

type ThemeProps = {
  bg: string;
  cardBg: string;
  text: string;
  sub: string;
};

export function BadgeDetailModal({
  selectedBadge,
  cardBg,
  text,
  sub,
  primary,
  isLight,
  onClose,
}: {
  selectedBadge: Badge | null;
  onClose: () => void;
  primary: string;
  isLight: boolean;
} & Pick<ThemeProps, 'cardBg' | 'text' | 'sub'>) {
  const overlay = isLight ? 'rgba(15,23,42,0.45)' : 'rgba(2,6,23,0.72)';
  const accent = selectedBadge ? badgeCategoryAccent(selectedBadge.category) : primary;
  const iconName = selectedBadge ? badgeIoniconsName(selectedBadge.icon) : 'ribbon-outline';
  const prog = selectedBadge ? Math.max(0, Math.min(100, Number(selectedBadge.progress) || 0)) : 0;
  return (
    <Modal visible={!!selectedBadge} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={[rewardsStyles.modalOverlay, { backgroundColor: overlay }]} activeOpacity={1} onPress={onClose}>
        <View
          style={[rewardsStyles.modalCard, { backgroundColor: cardBg, borderWidth: 2, borderColor: selectedBadge?.earned ? `${accent}55` : `${primary}18` }]}
          onStartShouldSetResponder={() => true}
        >
          <View style={{ alignSelf: 'center', marginBottom: 12 }}>
            {selectedBadge ? (
              <BadgeTileIcon
                earned={selectedBadge.earned}
                iconName={iconName}
                accent={accent}
                sub={sub}
                surfaceBg={cardBg}
                progress={prog}
                ringSize={88}
                iconCell={72}
                iconRadius={22}
                iconSize={34}
              />
            ) : null}
          </View>
          <Text style={[rewardsStyles.modalTitle, { color: text }]}>{selectedBadge?.name}</Text>
          {selectedBadge?.category ? (
            <Text style={{ color: accent, textAlign: 'center', fontSize: 11, fontWeight: '800', textTransform: 'capitalize', marginBottom: 6 }}>
              {selectedBadge.category}
            </Text>
          ) : null}
          <Text style={{ color: sub, textAlign: 'center', fontSize: 13 }}>{selectedBadge?.description}</Text>
          {!selectedBadge?.earned && (
            <View style={{ width: '100%', marginTop: 14 }}>
              <View style={rewardsStyles.nativeProgressTrack}>
                <View style={[rewardsStyles.nativeProgressFill, { width: `${prog}%`, backgroundColor: accent }]} />
              </View>
              <Text style={[rewardsStyles.nativeProgressText, { color: primary }]}>Progress: {prog}%</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

export function OfferDetailModal({
  selectedOffer,
  redeemingOfferId,
  redeemExtras,
  cardBg,
  text,
  sub,
  primary,
  success,
  isLight,
  onClose,
  onRedeem,
}: {
  selectedOffer: Offer | null;
  redeemingOfferId: string | null;
  /** QR / claim code returned immediately after POST /offers/:id/redeem */
  redeemExtras?: { qr_token?: string; claim_code?: string; expires_at?: string } | null;
  onClose: () => void;
  onRedeem: (offer: Offer) => void;
  primary: string;
  success: string;
  isLight: boolean;
} & Pick<ThemeProps, 'cardBg' | 'text' | 'sub'>) {
  const overlay = isLight ? 'rgba(15,23,42,0.45)' : 'rgba(2,6,23,0.72)';
  const [remote, setRemote] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedOffer?.id) {
      setRemote(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const res = await api.get<Record<string, unknown>>(`/api/offers/${encodeURIComponent(String(selectedOffer.id))}`);
        if (cancelled) return;
        const payload = (res.data as { data?: Offer })?.data ?? res.data;
        if (payload && typeof payload === 'object' && 'id' in (payload as object)) {
          setRemote(payload as Offer);
        }
      } catch {
        if (!cancelled) setRemote(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedOffer?.id]);

  const offer = remote ?? selectedOffer;
  const redeemed = Boolean(offer?.redeemed);
  const cost = offer?.gem_cost ?? offer?.gems_reward ?? 0;
  const initials = String(offer?.business_name || '?')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const titleLine = offer?.title?.trim() || offer?.description?.split(/[.!?]/)[0]?.trim() || `${offer?.discount_percent ?? 0}% off`;
  const mi = offer?.distance_km != null ? (Number(offer.distance_km) * 0.621371).toFixed(1) : null;

  return (
    <Modal visible={!!selectedOffer} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={[rewardsStyles.modalOverlay, { backgroundColor: overlay }]} activeOpacity={1} onPress={onClose}>
        <View style={[rewardsStyles.modalSheet, { backgroundColor: cardBg, borderTopWidth: 1, borderColor: `${primary}22`, maxHeight: '92%' }]} onStartShouldSetResponder={() => true}>
          <View style={[rewardsStyles.modalHandle, { backgroundColor: sub }]} />
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }}>
            {offer?.image_url ? (
              <View style={{ width: '100%', height: 176, borderRadius: 16, overflow: 'hidden', marginBottom: 14 }}>
                <Image source={{ uri: offer.image_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              </View>
            ) : (
              <View
                style={{
                  width: '100%',
                  height: 140,
                  borderRadius: 16,
                  marginBottom: 14,
                  backgroundColor: `${primary}18`,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: `${primary}35`,
                }}
              >
                <Text style={{ color: primary, fontSize: 40, fontWeight: '900' }}>{initials}</Text>
              </View>
            )}

            <Text style={{ color: sub, fontSize: 12, fontWeight: '900', letterSpacing: 0.4 }}>{offer?.business_name}</Text>
            <Text style={[rewardsStyles.modalTitle, { color: text, marginTop: 6, textAlign: 'left', fontSize: 22 }]}>
              {titleLine}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: `${sub}16` }}>
                <Text style={{ color: sub, fontSize: 11, fontWeight: '900' }}>{displayOfferCategory(offer ?? {})}</Text>
              </View>
              <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: `${primary}18` }}>
                <Text style={{ color: primary, fontSize: 11, fontWeight: '900' }}>{offer?.discount_percent ?? 0}% off</Text>
              </View>
            </View>
            <Text style={{ color: sub, fontSize: 14, marginTop: 12, lineHeight: 21 }}>{offer?.description ?? `${offer?.discount_percent ?? 0}% off at this partner.`}</Text>

            {!redeemed ? (
              <>
                <View style={{ marginTop: 14, padding: 12, borderRadius: 14, backgroundColor: `${sub}0d`, borderWidth: 1, borderColor: `${sub}22` }}>
                  {offer?.address ? (
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: mi ? 8 : 0 }}>
                      <Ionicons name="location-outline" size={18} color={sub} style={{ marginTop: 1 }} />
                      <Text style={{ color: text, fontSize: 13, flex: 1, lineHeight: 19, fontWeight: '600' }}>{offer.address}</Text>
                    </View>
                  ) : null}
                  {mi != null ? (
                    <Text style={{ color: sub, fontSize: 12, fontWeight: '800' }}>{mi} mi from your last location</Text>
                  ) : null}
                </View>
                <View style={{ paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, backgroundColor: `${sub}0a`, marginTop: 14 }}>
                  <Text style={{ color: sub, fontSize: 10, fontWeight: '900', marginBottom: 6, letterSpacing: 0.5 }}>TERMS</Text>
                  <Text style={{ color: sub, fontSize: 11, lineHeight: 17 }}>
                    {offer?.expires_at ? `Expires ${new Date(String(offer.expires_at)).toLocaleString()}. ` : ''}
                    Valid at participating location. Partner policies apply. Gems are non-transferable.
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 18, marginBottom: 8 }}>
                  <Text style={{ color: sub, fontSize: 13, fontWeight: '800' }}>Redeem for</Text>
                  <Text style={{ color: primary, fontSize: 26, fontWeight: '900' }}>{cost} gems</Text>
                </View>
                {loading ? <Skeleton width="100%" height={48} borderRadius={14} /> : null}
                {!loading && (
                  <TouchableOpacity
                    disabled={redeemingOfferId === selectedOffer?.id}
                    onPress={() => selectedOffer && onRedeem({ ...selectedOffer, ...offer })}
                    activeOpacity={0.85}
                    style={{ opacity: redeemingOfferId !== null && redeemingOfferId === String(selectedOffer?.id) ? 0.65 : 1 }}
                  >
                    <LinearGradient
                      colors={[primary, `${primary}cc`]}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={{ borderRadius: 16, paddingVertical: 16, alignItems: 'center' }}
                    >
                      <Text style={rewardsStyles.navBtnText}>
                        {redeemingOfferId !== null && redeemingOfferId === String(selectedOffer?.id) ? 'Redeeming…' : `Redeem for ${cost} gems`}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <View style={{ marginTop: 16, gap: 16 }}>
                <View style={{ padding: 14, borderRadius: 16, backgroundColor: `${success}12`, borderWidth: 1, borderColor: `${success}35` }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Ionicons name="checkmark-circle" size={26} color={success} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: success, fontSize: 16, fontWeight: '900' }}>Redeemed</Text>
                      <Text style={{ color: sub, fontSize: 12, marginTop: 2 }}>
                        {offer?.redemption?.redeemed_at
                          ? new Date(String(offer.redemption.redeemed_at)).toLocaleString()
                          : 'Saved to your wallet'}
                      </Text>
                      <Text style={{ color: sub, fontSize: 11, marginTop: 6, fontWeight: '700' }}>
                        Status · {String(offer?.redemption?.status ?? 'verified')}
                      </Text>
                    </View>
                  </View>
                </View>

                {(redeemExtras?.qr_token || redeemExtras?.claim_code) ? (
                  <View style={{ padding: 16, borderRadius: 16, borderWidth: 1, borderColor: `${sub}28`, backgroundColor: isLight ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.04)', alignItems: 'center', gap: 12 }}>
                    <Text style={{ color: text, fontWeight: '900', fontSize: 15 }}>Show at checkout</Text>
                    {redeemExtras?.claim_code ? (
                      <Text style={{ color: text, fontSize: 26, fontWeight: '900', letterSpacing: 3 }}>{redeemExtras.claim_code}</Text>
                    ) : null}
                    {QRCode && redeemExtras?.qr_token ? (
                      <View style={{ padding: 14, borderRadius: 18, backgroundColor: isLight ? '#fff' : 'rgba(255,255,255,0.07)' }}>
                        <QRCode value={redeemExtras.qr_token} size={200} backgroundColor="transparent" color={text} />
                      </View>
                    ) : redeemExtras?.qr_token ? (
                      <Text style={{ color: sub, fontSize: 11 }} selectable>
                        {redeemExtras.qr_token}
                      </Text>
                    ) : null}
                    {redeemExtras?.expires_at ? (
                      <Text style={{ color: sub, fontSize: 11 }}>Code expires · {new Date(redeemExtras.expires_at).toLocaleString()}</Text>
                    ) : null}
                  </View>
                ) : (
                  <Text style={{ color: sub, fontSize: 13, lineHeight: 19 }}>
                    Your redemption is on file. Open My redemptions for the full receipt, or ask staff to scan your code from there.
                  </Text>
                )}

                {offer?.address ? (
                  <TouchableOpacity
                    onPress={() => openMapsSearch(offer.address || '', offer.lat, offer.lng)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      paddingVertical: 14,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: `${primary}44`,
                      backgroundColor: `${primary}12`,
                    }}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="navigate" size={20} color={primary} />
                    <Text style={{ color: primary, fontWeight: '900', fontSize: 16 }}>Directions to store</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            )}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

function redemptionWhenLabel(iso: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function RedemptionDetailModal({
  redemption,
  cardBg,
  text,
  sub,
  primary,
  success,
  warning,
  danger,
  isLight,
  onClose,
}: {
  redemption: UserOfferRedemption | null;
  onClose: () => void;
  primary: string;
  success: string;
  warning: string;
  danger: string;
  isLight: boolean;
} & Pick<ThemeProps, 'cardBg' | 'text' | 'sub'>) {
  const overlay = isLight ? 'rgba(15,23,42,0.45)' : 'rgba(2,6,23,0.72)';
  const r = redemption;
  return (
    <Modal visible={!!r} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={[rewardsStyles.modalOverlay, { backgroundColor: overlay }]} activeOpacity={1} onPress={onClose}>
        <View
          style={[rewardsStyles.modalSheet, { backgroundColor: cardBg, borderTopWidth: 1, borderColor: `${primary}22`, maxHeight: '88%' }]}
          onStartShouldSetResponder={() => true}
        >
          <View style={[rewardsStyles.modalHandle, { backgroundColor: sub }]} />
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {r?.image_url ? (
              <View style={{ width: '100%', height: 160, borderRadius: 16, overflow: 'hidden', marginBottom: 14 }}>
                <Image source={{ uri: r.image_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              </View>
            ) : null}
            <Text style={[rewardsStyles.modalTitle, { color: text, textAlign: 'left' }]}>{r?.business_name ?? 'Offer'}</Text>
            <View style={{ alignSelf: 'flex-start', marginTop: 8, marginBottom: 10, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: `${sub}18` }}>
              <Text style={{ color: sub, fontSize: 12, fontWeight: '800' }}>{r ? displayOfferCategory(r) : '—'}</Text>
            </View>
            <View
              style={{
                alignSelf: 'flex-start',
                marginTop: 8,
                marginBottom: 12,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 12,
                backgroundColor: r?.used_in_store ? `${success}22` : `${warning}20`,
              }}
            >
              <Text style={{ color: r?.used_in_store ? success : warning, fontSize: 12, fontWeight: '900', letterSpacing: 0.3 }}>
                {r?.used_in_store ? 'Used in store — partner scanned your QR' : 'Not scanned yet — show your QR at checkout'}
              </Text>
            </View>
            {r?.description ? <Text style={{ color: sub, fontSize: 14, lineHeight: 20, marginBottom: 12 }}>{r.description}</Text> : null}
            {r?.address ? (
              <>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                  <Ionicons name="location-outline" size={18} color={primary} />
                  <Text style={{ color: sub, fontSize: 13, flex: 1, lineHeight: 18 }}>{r.address}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => openMapsSearch(r.address || '', r.lat, r.lng)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    marginBottom: 14,
                    paddingVertical: 12,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: `${primary}44`,
                    backgroundColor: `${primary}14`,
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="navigate" size={18} color={primary} />
                  <Text style={{ color: primary, fontWeight: '800' }}>Directions</Text>
                </TouchableOpacity>
              </>
            ) : null}
            <View style={{ borderRadius: 14, borderWidth: 1, borderColor: `${sub}35`, padding: 14, gap: 10, marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: sub, fontSize: 13, fontWeight: '700' }}>Redeemed</Text>
                <Text style={{ color: text, fontSize: 13, fontWeight: '800' }}>{redemptionWhenLabel(r?.redeemed_at ?? null)}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: sub, fontSize: 13, fontWeight: '700' }}>Gems spent</Text>
                <Text style={{ color: danger, fontSize: 13, fontWeight: '900' }}>−{r?.gem_cost ?? 0}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: sub, fontSize: 13, fontWeight: '700' }}>Your discount</Text>
                <Text style={{ color: text, fontSize: 13, fontWeight: '800' }}>
                  {r?.discount_percent ?? r?.discount_applied ?? 0}%
                  {r?.is_free_item ? ' · Free item' : ''}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: sub, fontSize: 13, fontWeight: '700' }}>Status</Text>
                <Text style={{ color: text, fontSize: 13, fontWeight: '800', textTransform: 'capitalize' }}>{r?.status ?? '—'}</Text>
              </View>
            </View>
            <Text style={{ color: sub, fontSize: 12, lineHeight: 17, marginBottom: 20 }}>
              SnapRoad records when you redeem with gems. When the business scans your code, this list shows “Used in store.” If you redeemed in the app only, complete your visit and ask staff to scan your QR.
            </Text>
          </ScrollView>
          <TouchableOpacity onPress={onClose} activeOpacity={0.85} style={{ marginBottom: 8 }}>
            <LinearGradient colors={[primary, `${primary}dd`]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}>
              <Text style={rewardsStyles.navBtnText}>Done</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

export function AllOffersModal({
  visible,
  offers,
  bg,
  cardBg,
  text,
  sub,
  border,
  primary,
  success,
  isLight,
  onClose,
  onSelectOffer,
}: {
  visible: boolean;
  offers: Offer[];
  onClose: () => void;
  onSelectOffer: (offer: Offer) => void;
  border: string;
  primary: string;
  success: string;
  isLight: boolean;
} & ThemeProps) {
  const overlay = isLight ? 'rgba(15,23,42,0.4)' : 'rgba(2,6,23,0.65)';
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[rewardsStyles.modalOverlay, { backgroundColor: overlay }]}>
        <View style={[rewardsStyles.fullSheet, { backgroundColor: bg, borderTopWidth: 1, borderColor: border }]}>
          <View style={[rewardsStyles.sheetHeader, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: border }]}>
            <Text style={[rewardsStyles.sheetTitle, { color: text }]}>All Offers</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}><Ionicons name="close" size={24} color={sub} /></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ paddingBottom: 24, paddingTop: 8 }}>
            {offers.length === 0 && (
              <Text style={[rewardsStyles.offerBiz, { color: sub, textAlign: 'center', paddingVertical: 28, paddingHorizontal: 16 }]}>
                No offers in range yet. Pull to refresh on Wallet, or move closer to a partner location (offers use your last known area).
              </Text>
            )}
            {offers.map((o) => (
              <TouchableOpacity
                key={o.id}
                style={[rewardsStyles.offerCard, { backgroundColor: cardBg, borderWidth: 1, borderColor: border, borderRadius: 16, padding: 12 }]}
                onPress={() => onSelectOffer(o)}
                activeOpacity={0.82}
              >
                {o.image_url ? (
                  <View style={{ width: 72, height: 72, borderRadius: 14, overflow: 'hidden', marginRight: 12, backgroundColor: border }}>
                    <Image source={{ uri: o.image_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  </View>
                ) : (
                  <View style={{ width: 72, height: 72, borderRadius: 14, marginRight: 12, backgroundColor: `${primary}14`, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: `${primary}28` }}>
                    <Ionicons name="storefront-outline" size={28} color={primary} />
                  </View>
                )}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: sub, fontSize: 11, fontWeight: '800' }} numberOfLines={1}>{o.business_name}</Text>
                  <Text style={[rewardsStyles.offerBiz, { color: text, marginTop: 2 }]} numberOfLines={2}>
                    {o.title?.trim() || o.description?.split('.')[0] || `${o.discount_percent}% off`}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                    <Text style={{ color: sub, fontSize: 10, fontWeight: '800', backgroundColor: `${sub}14`, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>{displayOfferCategory(o)}</Text>
                    <Text style={{ color: primary, fontSize: 10, fontWeight: '900', backgroundColor: `${primary}16`, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>{o.discount_percent ?? 0}% off</Text>
                  </View>
                  {o.description ? <Text style={{ color: sub, fontSize: 11, marginTop: 6 }} numberOfLines={2}>{o.description}</Text> : null}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                    {o.address ? <Text style={{ color: sub, fontSize: 10 }} numberOfLines={1}>{o.address}</Text> : null}
                    {o.distance_km != null ? (
                      <Text style={{ color: sub, fontSize: 10, fontWeight: '800' }}>{(Number(o.distance_km) * 0.621371).toFixed(1)} mi</Text>
                    ) : null}
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end', justifyContent: 'center', gap: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${success}18`, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10 }}>
                    <Ionicons name="diamond-outline" size={14} color={success} />
                    <Text style={{ color: success, fontSize: 14, fontWeight: '900' }}>{o.gem_cost ?? o.gems_reward ?? 0}</Text>
                  </View>
                  <Text style={{ color: o.redeemed ? success : primary, fontSize: 11, fontWeight: '800' }}>{o.redeemed ? 'Redeemed' : 'Open'}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export function AllBadgesModal({
  visible,
  badges,
  bg,
  cardBg,
  text,
  sub,
  onClose,
  onSelectBadge,
}: {
  visible: boolean;
  badges: Badge[];
  onClose: () => void;
  onSelectBadge: (badge: Badge) => void;
} & ThemeProps) {
  const earnedCount = badges.filter((b) => b.earned).length;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={rewardsStyles.modalOverlay}>
        <View style={[rewardsStyles.fullSheet, { backgroundColor: bg }]}>
          <LinearGradient
            colors={['#1D4ED8', '#2563EB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={rewardsStyles.modalHero}
          >
            <View style={rewardsStyles.sheetHeader}>
              <Text style={rewardsStyles.modalHeroTitle}>All Badges</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={26} color="rgba(255,255,255,0.9)" />
              </TouchableOpacity>
            </View>
            <View style={rewardsStyles.modalHeroStatsRow}>
              <View style={rewardsStyles.modalHeroStatCard}>
                <Text style={rewardsStyles.modalHeroStatValue}>{earnedCount}</Text>
                <Text style={rewardsStyles.modalHeroStatLabel}>Earned</Text>
              </View>
              <View style={rewardsStyles.modalHeroStatCard}>
                <Text style={rewardsStyles.modalHeroStatValue}>{badges.length - earnedCount}</Text>
                <Text style={rewardsStyles.modalHeroStatLabel}>Locked</Text>
              </View>
              <View style={rewardsStyles.modalHeroStatCard}>
                <Text style={rewardsStyles.modalHeroStatValue}>{badges.length}</Text>
                <Text style={rewardsStyles.modalHeroStatLabel}>Total</Text>
              </View>
            </View>
          </LinearGradient>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
            <View style={rewardsStyles.badgesGrid}>
              {badges.map((b) => {
                const accent = badgeCategoryAccent(b.category);
                const iconName = badgeIoniconsName(b.icon);
                const prog = Math.max(0, Math.min(100, Number(b.progress) || 0));
                return (
                  <TouchableOpacity
                    key={`all-${b.id}`}
                    style={[
                      rewardsStyles.badgeItem,
                      {
                        backgroundColor: cardBg,
                        opacity: b.earned ? 1 : 0.48,
                        borderColor: b.earned ? accent : `${sub}44`,
                        borderWidth: b.earned ? 2 : 1,
                      },
                    ]}
                    onPress={() => onSelectBadge(b)}
                  >
                    <BadgeTileIcon
                      earned={b.earned}
                      iconName={iconName}
                      accent={accent}
                      sub={sub}
                      surfaceBg={cardBg}
                      progress={prog}
                      ringSize={56}
                      iconCell={48}
                      iconRadius={16}
                      iconSize={28}
                    />
                    {!b.earned && prog > 0 ? (
                      <View style={[rewardsStyles.progressTrack, { width: '100%', marginTop: 6 }]}>
                        <View style={[rewardsStyles.progressBar, { width: `${prog}%`, backgroundColor: accent }]} />
                      </View>
                    ) : null}
                    <Text style={[rewardsStyles.badgeName, { color: text }]} numberOfLines={1}>{b.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

import React, { useEffect, useState } from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../api/client';
import type { GemTx } from './types';
import { displayOfferCategory } from '../../lib/offerCategories';
import { openMapsSearch } from '../../lib/mapsLinks';
import { rewardsStyles } from './styles';

function isWalletUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id.trim());
}

type Props = {
  visible: boolean;
  tx: GemTx | null;
  cardBg: string;
  text: string;
  sub: string;
  primary: string;
  success: string;
  danger: string;
  warning: string;
  isLight: boolean;
  onClose: () => void;
};

export default function GemActivityDetailModal({
  visible,
  tx,
  cardBg,
  text,
  sub,
  primary,
  success,
  danger,
  warning,
  isLight,
  onClose,
}: Props) {
  const navigation = useNavigation();
  const overlay = isLight ? 'rgba(15,23,42,0.45)' : 'rgba(2,6,23,0.72)';
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !tx) {
      setDetail(null);
      setErr(null);
      return;
    }
    if (!isWalletUuid(tx.id)) {
      setDetail(null);
      setErr(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setErr(null);
    void (async () => {
      try {
        const res = await api.get<Record<string, unknown>>(`/api/gems/activity/${encodeURIComponent(tx.id)}`);
        if (cancelled) return;
        if (!res.success) {
          setErr(res.error || 'Could not load details');
          setDetail(null);
          return;
        }
        const body = res.data as { success?: boolean; data?: Record<string, unknown> } | undefined;
        const payload = body?.data ?? body;
        setDetail(typeof payload === 'object' && payload !== null ? payload : null);
      } catch {
        if (!cancelled) setErr('Could not load details');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, tx?.id]);

  if (!tx) return null;

  const kind = typeof detail?.kind === 'string' ? detail.kind : null;
  const base = (detail?.base as Record<string, unknown> | undefined) || {};
  const meta = (base.metadata as Record<string, unknown> | undefined) || tx.metadata || {};

  const directions = (address: string, lat?: number | null, lng?: number | null) => (
    <TouchableOpacity
      onPress={() => openMapsSearch(address, lat, lng)}
      style={[styles.dirBtn, { backgroundColor: `${primary}22`, borderColor: `${primary}44` }]}
      activeOpacity={0.85}
    >
      <Ionicons name="navigate" size={18} color={primary} />
      <Text style={{ color: primary, fontWeight: '800', fontSize: 14 }}>Directions</Text>
    </TouchableOpacity>
  );

  let body: React.ReactNode = null;

  if (!isWalletUuid(tx.id)) {
    body = (
      <View style={{ gap: 10 }}>
        <Text style={{ color: sub, fontSize: 13, lineHeight: 20 }}>
          This activity was recorded before the gem wallet synced. You still earned or spent gems, but line-item details are not available for this entry.
        </Text>
        <View style={[styles.rowCard, { borderColor: `${sub}33` }]}>
          <Text style={{ color: sub, fontSize: 12 }}>Source</Text>
          <Text style={{ color: text, fontWeight: '700' }}>{tx.source}</Text>
          <Text style={{ color: sub, fontSize: 12, marginTop: 8 }}>Amount</Text>
          <Text style={{ color: tx.type === 'spent' ? danger : success, fontWeight: '900', fontSize: 18 }}>
            {tx.type === 'spent' ? '−' : '+'}
            {tx.amount}
          </Text>
          {tx.date ? (
            <>
              <Text style={{ color: sub, fontSize: 12, marginTop: 8 }}>When</Text>
              <Text style={{ color: text }}>{new Date(tx.date).toLocaleString()}</Text>
            </>
          ) : null}
        </View>
      </View>
    );
  } else if (loading) {
    body = (
      <View style={{ paddingVertical: 24, alignItems: 'center' }}>
        <ActivityIndicator color={primary} />
        <Text style={{ color: sub, marginTop: 12 }}>Loading details…</Text>
      </View>
    );
  } else if (err) {
    body = <Text style={{ color: warning }}>{err}</Text>;
  } else if (kind === 'offer_redemption') {
    const offer = (detail?.offer as Record<string, unknown>) || {};
    const redemption = (detail?.redemption as Record<string, unknown>) || {};
    const img = offer.image_url != null ? String(offer.image_url) : '';
    const biz = String(offer.business_name || offer.title || 'Partner');
    const title = String(offer.title || biz);
    const addr = offer.address != null ? String(offer.address) : '';
    const lat = offer.lat != null ? Number(offer.lat) : null;
    const lng = offer.lng != null ? Number(offer.lng) : null;
    const status = String(redemption.status || 'verified');
    const when = redemption.redeemed_at != null ? String(redemption.redeemed_at) : tx.date;
    body = (
      <View style={{ gap: 12 }}>
        {img ? (
          <Image source={{ uri: img }} style={{ width: '100%', height: 140, borderRadius: 14 }} resizeMode="cover" />
        ) : (
          <View style={[styles.ph, { backgroundColor: `${primary}18` }]}>
            <Ionicons name="storefront" size={40} color={primary} />
          </View>
        )}
        <Text style={{ color: sub, fontSize: 12, fontWeight: '800' }}>{biz}</Text>
        <Text style={{ color: text, fontSize: 20, fontWeight: '900' }}>{title}</Text>
        <View style={{ alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: `${sub}18` }}>
          <Text style={{ color: sub, fontSize: 12, fontWeight: '800' }}>{displayOfferCategory(offer as { category_label?: string; business_type?: string })}</Text>
        </View>
        <Text style={{ color: danger, fontSize: 18, fontWeight: '900' }}>−{tx.amount} gems</Text>
        <Text style={{ color: sub }}>Status: {status}</Text>
        <Text style={{ color: sub }}>Redeemed: {when ? new Date(when).toLocaleString() : '—'}</Text>
        {addr ? <Text style={{ color: text }}>{addr}</Text> : null}
        {addr ? directions(addr, lat, lng) : null}
        <Text style={{ color: sub, fontSize: 12, lineHeight: 18 }}>
          Show your QR or claim code at checkout. Partner staff can scan to mark “used in store.”
        </Text>
      </View>
    );
  } else if (kind === 'trip_reward') {
    const trip = (detail?.trip as Record<string, unknown> | null) || null;
    const lm = (detail?.ledger_metadata as Record<string, unknown>) || meta;
    const formula = typeof lm.formula_summary === 'string' ? lm.formula_summary : '';
    const dist = trip?.distance_miles != null ? Number(trip.distance_miles) : null;
    const durSec = trip?.duration_seconds != null ? Number(trip.duration_seconds) : null;
    const gems = trip?.gems_earned != null ? Number(trip.gems_earned) : tx.amount;
    const started = trip?.started_at != null ? String(trip.started_at) : tx.date;
    body = (
      <View style={{ gap: 12 }}>
        <Text style={{ color: text, fontSize: 18, fontWeight: '900' }}>Trip reward</Text>
        <Text style={{ color: sub }}>Started: {started ? new Date(started).toLocaleString() : '—'}</Text>
        {dist != null ? <Text style={{ color: text }}>Distance: {dist.toFixed(1)} mi</Text> : null}
        {durSec != null ? <Text style={{ color: text }}>Duration: {Math.round(durSec / 60)} min</Text> : null}
        <Text style={{ color: success, fontSize: 20, fontWeight: '900' }}>+{gems} gems</Text>
        {formula ? (
          <View style={[styles.rowCard, { borderColor: `${sub}33` }]}>
            <Text style={{ color: sub, fontSize: 11, fontWeight: '800', marginBottom: 6 }}>Breakdown</Text>
            <Text style={{ color: text, fontSize: 13, lineHeight: 20 }}>{formula}</Text>
          </View>
        ) : null}
        <TouchableOpacity
          style={[styles.dirBtn, { backgroundColor: `${primary}22`, borderColor: `${primary}44` }]}
          onPress={() => (navigation as { navigate: (n: string) => void }).navigate('Profile')}
          activeOpacity={0.85}
        >
          <Ionicons name="analytics-outline" size={18} color={primary} />
          <Text style={{ color: primary, fontWeight: '800', fontSize: 14 }}>Open Profile insights</Text>
        </TouchableOpacity>
      </View>
    );
  } else {
    body = (
      <View style={{ gap: 10 }}>
        <Text style={{ color: text, fontWeight: '800', fontSize: 16 }}>{tx.source}</Text>
        <Text style={{ color: tx.type === 'spent' ? danger : success, fontSize: 22, fontWeight: '900' }}>
          {tx.type === 'spent' ? '−' : '+'}
          {tx.amount} gems
        </Text>
        {tx.date ? <Text style={{ color: sub }}>{new Date(tx.date).toLocaleString()}</Text> : null}
        {Object.keys(meta).length > 0 ? (
          <View style={[styles.rowCard, { borderColor: `${sub}33` }]}>
            <Text style={{ color: sub, fontSize: 12 }}>{JSON.stringify(meta, null, 2)}</Text>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={[rewardsStyles.modalOverlay, { backgroundColor: overlay }]} activeOpacity={1} onPress={onClose}>
        <View style={[rewardsStyles.modalSheet, { backgroundColor: cardBg, borderTopWidth: 1, borderColor: `${primary}22`, maxHeight: '88%' }]} onStartShouldSetResponder={() => true}>
          <View style={[rewardsStyles.modalHandle, { backgroundColor: sub }]} />
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={[rewardsStyles.modalTitle, { color: text, marginBottom: 12 }]}>Gem activity</Text>
            {body}
          </ScrollView>
          <TouchableOpacity onPress={onClose} activeOpacity={0.85} style={{ marginTop: 8 }}>
            <View style={{ borderRadius: 14, paddingVertical: 14, alignItems: 'center', backgroundColor: primary }}>
              <Text style={rewardsStyles.navBtnText}>Done</Text>
            </View>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  rowCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  dirBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  ph: {
    height: 140,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

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

function formatMetaRows(meta: Record<string, unknown>): { label: string; value: string }[] {
  const skip = new Set(['formula_summary', 'ledger_metadata']);
  const rows: { label: string; value: string }[] = [];
  const preferred = ['trip_id', 'offer_id', 'redemption_id', 'route_label', 'miles', 'duration_minutes'];
  for (const key of preferred) {
    if (key in meta && meta[key] != null && String(meta[key]).trim() !== '') {
      rows.push({ label: humanizeKey(key), value: String(meta[key]) });
    }
  }
  for (const [k, v] of Object.entries(meta)) {
    if (skip.has(k) || preferred.includes(k)) continue;
    if (v == null || typeof v === 'object') continue;
    const s = String(v).trim();
    if (!s) continue;
    rows.push({ label: humanizeKey(k), value: s.length > 120 ? `${s.slice(0, 120)}…` : s });
  }
  return rows.slice(0, 12);
}

function humanizeKey(k: string): string {
  return k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
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
  const metaRows = formatMetaRows(typeof meta === 'object' && meta !== null ? (meta as Record<string, unknown>) : {});

  const directions = (address: string, lat?: number | null, lng?: number | null) => (
    <TouchableOpacity
      onPress={() => openMapsSearch(address, lat, lng)}
      style={[styles.dirBtn, { backgroundColor: `${primary}18`, borderColor: `${primary}40` }]}
      activeOpacity={0.85}
    >
      <Ionicons name="navigate" size={18} color={primary} />
      <Text style={{ color: primary, fontWeight: '900', fontSize: 15 }}>Directions</Text>
    </TouchableOpacity>
  );

  let body: React.ReactNode = null;

  if (!isWalletUuid(tx.id)) {
    body = (
      <View style={{ gap: 12 }}>
        <View style={[styles.pill, { backgroundColor: `${warning}18`, borderColor: `${warning}35` }]}>
          <Ionicons name="time-outline" size={16} color={warning} />
          <Text style={{ color: text, fontSize: 12, fontWeight: '700', flex: 1 }}>
            Legacy entry — full wallet details were not stored for this line.
          </Text>
        </View>
        <View style={[styles.card, { borderColor: `${sub}28` }]}>
          <Row label="Source" value={tx.source} text={text} sub={sub} />
          <Row
            label="Amount"
            value={`${tx.type === 'spent' ? '−' : '+'}${tx.amount} gems`}
            text={text}
            sub={sub}
            valueColor={tx.type === 'spent' ? danger : success}
          />
          {tx.date ? <Row label="When" value={new Date(tx.date).toLocaleString()} text={text} sub={sub} /> : null}
        </View>
      </View>
    );
  } else if (loading) {
    body = (
      <View style={{ paddingVertical: 28, alignItems: 'center' }}>
        <ActivityIndicator color={primary} size="large" />
        <Text style={{ color: sub, marginTop: 14, fontWeight: '600' }}>Loading ledger details…</Text>
      </View>
    );
  } else if (err) {
    body = <Text style={{ color: warning, fontWeight: '700' }}>{err}</Text>;
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
      <View style={{ gap: 14 }}>
        <View style={[styles.kindPill, { backgroundColor: `${danger}14`, borderColor: `${danger}30` }]}>
          <Ionicons name="bag-remove-outline" size={16} color={danger} />
          <Text style={{ color: danger, fontSize: 11, fontWeight: '900', letterSpacing: 0.6 }}>OFFER REDEMPTION</Text>
        </View>
        {img ? (
          <Image source={{ uri: img }} style={{ width: '100%', height: 150, borderRadius: 16 }} resizeMode="cover" />
        ) : (
          <View style={[styles.ph, { backgroundColor: `${primary}14` }]}>
            <Ionicons name="storefront" size={44} color={primary} />
          </View>
        )}
        <Text style={{ color: sub, fontSize: 12, fontWeight: '900' }}>{biz}</Text>
        <Text style={{ color: text, fontSize: 20, fontWeight: '900' }}>{title}</Text>
        <View style={{ alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: `${sub}14` }}>
          <Text style={{ color: sub, fontSize: 12, fontWeight: '800' }}>{displayOfferCategory(offer as { category_label?: string; business_type?: string })}</Text>
        </View>
        <View style={[styles.card, { borderColor: `${danger}22` }]}>
          <Text style={{ color: danger, fontSize: 22, fontWeight: '900' }}>−{tx.amount} gems</Text>
          <Text style={{ color: sub, fontSize: 12, marginTop: 10, fontWeight: '700' }}>Status · {status}</Text>
          <Text style={{ color: sub, fontSize: 12, marginTop: 4 }}>Redeemed · {when ? new Date(when).toLocaleString() : '—'}</Text>
        </View>
        {addr ? <Text style={{ color: text, fontSize: 14, lineHeight: 20, fontWeight: '600' }}>{addr}</Text> : null}
        {addr ? directions(addr, lat, lng) : null}
        <Text style={{ color: sub, fontSize: 12, lineHeight: 18 }}>
          Show your QR or claim code at checkout. Staff can scan to mark “used in store” on your redemption list.
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
      <View style={{ gap: 14 }}>
        <View style={[styles.kindPill, { backgroundColor: `${success}14`, borderColor: `${success}30` }]}>
          <Ionicons name="car-sport-outline" size={16} color={success} />
          <Text style={{ color: success, fontSize: 11, fontWeight: '900', letterSpacing: 0.6 }}>TRIP REWARD</Text>
        </View>
        <Text style={{ color: text, fontSize: 19, fontWeight: '900' }}>Trip credit</Text>
        <View style={[styles.card, { borderColor: `${success}25` }]}>
          <Text style={{ color: success, fontSize: 26, fontWeight: '900' }}>+{gems} gems</Text>
          <Text style={{ color: sub, fontSize: 12, marginTop: 8 }}>Started · {started ? new Date(started).toLocaleString() : '—'}</Text>
          {dist != null ? <Text style={{ color: text, marginTop: 6, fontWeight: '700' }}>{dist.toFixed(1)} mi</Text> : null}
          {durSec != null ? <Text style={{ color: text, marginTop: 4, fontWeight: '700' }}>{Math.round(durSec / 60)} min</Text> : null}
        </View>
        {formula ? (
          <View style={[styles.card, { borderColor: `${sub}22` }]}>
            <Text style={{ color: sub, fontSize: 10, fontWeight: '900', marginBottom: 8, letterSpacing: 0.4 }}>BREAKDOWN</Text>
            <Text style={{ color: text, fontSize: 14, lineHeight: 21 }}>{formula}</Text>
          </View>
        ) : null}
        {metaRows.length > 0 ? (
          <View style={[styles.card, { borderColor: `${sub}22` }]}>
            <Text style={{ color: sub, fontSize: 10, fontWeight: '900', marginBottom: 10, letterSpacing: 0.4 }}>DETAILS</Text>
            {metaRows.map((r) => (
              <View key={r.label} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                <Text style={{ color: sub, fontSize: 12, fontWeight: '700', flex: 0.4 }}>{r.label}</Text>
                <Text style={{ color: text, fontSize: 12, fontWeight: '600', flex: 0.6, textAlign: 'right' }} numberOfLines={3}>
                  {r.value}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
        <TouchableOpacity
          style={[styles.dirBtn, { backgroundColor: `${primary}14`, borderColor: `${primary}35` }]}
          onPress={() => (navigation as { navigate: (n: string) => void }).navigate('Profile')}
          activeOpacity={0.85}
        >
          <Ionicons name="analytics-outline" size={18} color={primary} />
          <Text style={{ color: primary, fontWeight: '900', fontSize: 15 }}>Profile insights</Text>
        </TouchableOpacity>
      </View>
    );
  } else {
    body = (
      <View style={{ gap: 12 }}>
        <View style={[styles.kindPill, { backgroundColor: `${primary}12`, borderColor: `${primary}28` }]}>
          <Ionicons name="receipt-outline" size={16} color={primary} />
          <Text style={{ color: primary, fontSize: 11, fontWeight: '900', letterSpacing: 0.6 }}>WALLET ENTRY</Text>
        </View>
        <Text style={{ color: text, fontWeight: '900', fontSize: 18 }}>{tx.source}</Text>
        <Text style={{ color: tx.type === 'spent' ? danger : success, fontSize: 28, fontWeight: '900' }}>
          {tx.type === 'spent' ? '−' : '+'}
          {tx.amount} gems
        </Text>
        {tx.date ? <Text style={{ color: sub, fontSize: 13 }}>{new Date(tx.date).toLocaleString()}</Text> : null}
        {metaRows.length > 0 ? (
          <View style={[styles.card, { borderColor: `${sub}22` }]}>
            {metaRows.map((r) => (
              <View key={r.label} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                <Text style={{ color: sub, fontSize: 12, fontWeight: '700', flex: 0.35 }}>{r.label}</Text>
                <Text style={{ color: text, fontSize: 12, fontWeight: '600', flex: 0.65, textAlign: 'right' }} numberOfLines={4}>
                  {r.value}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={[rewardsStyles.modalOverlay, { backgroundColor: overlay }]} activeOpacity={1} onPress={onClose}>
        <View style={[rewardsStyles.modalSheet, { backgroundColor: cardBg, borderTopWidth: 1, borderColor: `${primary}22`, maxHeight: '90%' }]} onStartShouldSetResponder={() => true}>
          <View style={[rewardsStyles.modalHandle, { backgroundColor: sub }]} />
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 8 }}>
            <Text style={[rewardsStyles.modalTitle, { color: text, marginBottom: 14, fontSize: 20 }]}>Activity detail</Text>
            {body}
          </ScrollView>
          <TouchableOpacity onPress={onClose} activeOpacity={0.85} style={{ marginTop: 10 }}>
            <View style={{ borderRadius: 16, paddingVertical: 15, alignItems: 'center', backgroundColor: primary }}>
              <Text style={rewardsStyles.navBtnText}>Done</Text>
            </View>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

function Row({
  label,
  value,
  text,
  sub,
  valueColor,
}: {
  label: string;
  value: string;
  text: string;
  sub: string;
  valueColor?: string;
}) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ color: sub, fontSize: 11, fontWeight: '800', marginBottom: 4 }}>{label}</Text>
      <Text style={{ color: valueColor ?? text, fontSize: valueColor ? 20 : 15, fontWeight: '900' }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  kindPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  dirBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  ph: {
    height: 140,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

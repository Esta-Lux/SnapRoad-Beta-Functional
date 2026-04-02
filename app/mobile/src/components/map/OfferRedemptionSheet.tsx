import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import * as ScreenCapture from 'expo-screen-capture';
import { api } from '../../api/client';
import type { Offer } from '../../types';

let QRCode: any = null;
try { QRCode = require('react-native-qrcode-svg').default; } catch {}

interface Props {
  offer: Offer;
  onDismiss: () => void;
  onRedeem: (offer: Offer) => void;
  onNavigate?: (offer: Offer) => void;
  userLocation?: { lat: number; lng: number } | null;
}

function gemColor(discount: number): string {
  if (discount >= 20) return '#F59E0B';
  if (discount >= 10) return '#8B5CF6';
  if (discount >= 5) return '#3B82F6';
  return '#22C55E';
}

export default function OfferRedemptionSheet({ offer, onDismiss, onRedeem, onNavigate, userLocation }: Props) {
  const color = gemColor(offer.discount_percent);
  const [showQR, setShowQR] = useState(false);
  const [qrToken, setQrToken] = useState('');
  const [qrExpiresAt, setQrExpiresAt] = useState('');
  const [qrError, setQrError] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [nowTs, setNowTs] = useState(Date.now());

  useEffect(() => {
    if (!showQR) return;

    let active = true;
    setQrLoading(true);
    setQrError(null);
    setQrToken('');
    setQrExpiresAt('');

    const lat = userLocation?.lat;
    const lng = userLocation?.lng;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setQrError('Current location is unavailable. Move closer to the offer and try again.');
      setQrLoading(false);
      return;
    }

    ScreenCapture.preventScreenCaptureAsync().catch(() => {});
    api.post<any>(`/api/offers/${offer.id}/generate-qr`, { lat, lng })
      .then((res) => {
        if (!active) return;
        if (!res.success) {
          setQrError(res.error || 'Could not generate a secure QR code right now.');
          return;
        }
        const payload = (res.data as any)?.data ?? res.data ?? {};
        setQrToken(String(payload.qr_token ?? ''));
        setQrExpiresAt(String(payload.expires_at ?? ''));
      })
      .catch(() => {
        if (active) setQrError('Could not generate a secure QR code right now.');
      })
      .finally(() => {
        if (active) setQrLoading(false);
      });

    return () => {
      active = false;
      ScreenCapture.allowScreenCaptureAsync().catch(() => {});
    };
  }, [offer.id, showQR, userLocation?.lat, userLocation?.lng]);

  useEffect(() => {
    if (!showQR || !qrExpiresAt) return;
    const id = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [qrExpiresAt, showQR]);

  const countdownText = (() => {
    if (!qrExpiresAt) return '';
    const remainingMs = new Date(qrExpiresAt).getTime() - nowTs;
    if (remainingMs <= 0) return 'Expired';
    const totalSeconds = Math.floor(remainingMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')} remaining`;
  })();

  return (
    <Animated.View entering={SlideInDown.springify().damping(18)} exiting={SlideOutDown.duration(200)} style={styles.container}>
      <View style={styles.handle} />
      {showQR ? (
        <View style={styles.qrSection}>
          <Text style={styles.qrTitle}>Show this to redeem</Text>
          <Text style={styles.qrCountdown}>{countdownText || 'Generating secure QR...'}</Text>
          <View style={styles.qrBox}>
            {qrLoading ? (
              <ActivityIndicator color="#f8fafc" />
            ) : qrError ? (
              <Text style={styles.qrFallback}>{qrError}</Text>
            ) : QRCode && qrToken ? (
              <QRCode value={qrToken} size={180} backgroundColor="transparent" color="#f8fafc" />
            ) : (
              <Text style={styles.qrFallback}>{qrToken || 'QR unavailable right now.'}</Text>
            )}
          </View>
          <Text style={styles.qrBusiness}>{offer.business_name}</Text>
          <Text style={styles.qrDiscount}>{offer.discount_percent > 0 ? `${offer.discount_percent}% off` : 'Free item'}</Text>
          <TouchableOpacity style={styles.qrDone} onPress={() => { setShowQR(false); onDismiss(); }}>
            <Text style={styles.qrDoneText}>Done</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.header}>
            <View style={[styles.gemBadge, { backgroundColor: color }]}>
              <Text style={styles.gemIcon}>💎</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.business}>{offer.business_name}</Text>
              <Text style={styles.discount}>{offer.discount_percent > 0 ? `${offer.discount_percent}% off` : 'Free item'}</Text>
              {offer.description ? <Text style={styles.desc} numberOfLines={2}>{offer.description}</Text> : null}
            </View>
            <TouchableOpacity onPress={onDismiss} style={styles.closeBtn}>
              <Ionicons name="close" size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>
          <View style={styles.rewardRow}>
            <Text style={styles.rewardIcon}>✨</Text>
            <Text style={styles.rewardText}>Earn {offer.gems_reward ?? 0} gems</Text>
          </View>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.redeemBtn} onPress={() => onRedeem(offer)}>
              <Text style={styles.redeemText}>Redeem Now</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.qrBtn} onPress={() => setShowQR(true)}>
              <Ionicons name="qr-code-outline" size={16} color="#f8fafc" />
              <Text style={styles.qrBtnText}>Show QR</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dirBtn} onPress={() => (onNavigate ? onNavigate(offer) : onDismiss())}>
              <Ionicons name="navigate" size={16} color="#60a5fa" />
              <Text style={styles.dirText}>Directions</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(15,23,42,0.94)',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    zIndex: 35,
    borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.35, shadowRadius: 20 },
      android: { elevation: 16 },
    }),
  },
  handle: { width: 40, height: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, alignSelf: 'center', marginBottom: 18 },
  header: { flexDirection: 'row', alignItems: 'flex-start' },
  gemBadge: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  gemIcon: { fontSize: 24 },
  business: { fontSize: 18, fontWeight: '800', color: '#f8fafc', letterSpacing: -0.3 },
  discount: { fontSize: 15, fontWeight: '700', color: '#F59E0B', marginTop: 2 },
  desc: { fontSize: 13, color: '#94a3b8', marginTop: 4, lineHeight: 18 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, backgroundColor: 'rgba(245,158,11,0.1)', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  rewardIcon: { fontSize: 16 },
  rewardText: { color: '#fbbf24', fontSize: 14, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  redeemBtn: {
    flex: 2, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F59E0B', borderRadius: 16, paddingVertical: 15,
    ...Platform.select({ ios: { shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12 }, android: { elevation: 6 } }),
  },
  redeemText: { color: '#1a1a1a', fontSize: 16, fontWeight: '800' },
  dirBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: 'rgba(59,130,246,0.12)', borderRadius: 16, paddingVertical: 15,
    borderWidth: 1, borderColor: 'rgba(59,130,246,0.2)',
  },
  qrBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  qrBtnText: { color: '#f8fafc', fontSize: 14, fontWeight: '700' },
  dirText: { color: '#60a5fa', fontSize: 14, fontWeight: '700' },
  qrSection: { alignItems: 'center', paddingVertical: 8 },
  qrTitle: { color: '#f8fafc', fontSize: 18, fontWeight: '800', marginBottom: 20 },
  qrCountdown: { color: '#93c5fd', fontSize: 12, fontWeight: '700', marginTop: -12, marginBottom: 16 },
  qrBox: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 20, padding: 24, marginBottom: 16 },
  qrFallback: { color: '#94a3b8', fontSize: 12, textAlign: 'center' },
  qrBusiness: { color: '#f8fafc', fontSize: 16, fontWeight: '700' },
  qrDiscount: { color: '#F59E0B', fontSize: 14, fontWeight: '600', marginTop: 4 },
  qrDone: { marginTop: 20, backgroundColor: '#3B82F6', borderRadius: 14, paddingHorizontal: 40, paddingVertical: 14 },
  qrDoneText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

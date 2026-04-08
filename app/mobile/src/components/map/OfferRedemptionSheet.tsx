import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import * as ScreenCapture from 'expo-screen-capture';
import { api } from '../../api/client';
import type { Offer } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';
import { haversineMeters, formatDistance } from '../../utils/distance';

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
  const { colors, isLight } = useTheme();
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

  const distanceLine = (() => {
    const ulat = userLocation?.lat;
    const ulng = userLocation?.lng;
    const olat = offer.lat;
    const olng = offer.lng;
    if (
      !Number.isFinite(ulat) ||
      !Number.isFinite(ulng) ||
      !Number.isFinite(olat) ||
      !Number.isFinite(olng)
    ) {
      return null;
    }
    const mi = haversineMeters(ulat!, ulng!, olat!, olng!) / 1609.34;
    return formatDistance(mi);
  })();

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
    <Animated.View
      entering={SlideInDown.duration(260)}
      exiting={SlideOutDown.duration(200)}
      style={[styles.container, {
      backgroundColor: isLight ? 'rgba(255,255,255,0.98)' : 'rgba(15,23,42,0.94)',
      borderColor: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)',
    }]}
    >
      <View style={[styles.handle, { backgroundColor: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' }]} />
      {showQR ? (
        <View style={styles.qrSection}>
          <Text style={[styles.qrTitle, { color: colors.text }]}>Show this to redeem</Text>
          <Text style={[styles.qrCountdown, { color: colors.primary }]}>{countdownText || 'Generating secure QR...'}</Text>
          <View style={[styles.qrBox, { backgroundColor: isLight ? colors.surfaceSecondary : 'rgba(255,255,255,0.06)' }]}>
            {qrLoading ? (
              <ActivityIndicator color={colors.text} />
            ) : qrError ? (
              <Text style={[styles.qrFallback, { color: colors.textSecondary }]}>{qrError}</Text>
            ) : QRCode && qrToken ? (
              <QRCode value={qrToken} size={180} backgroundColor="transparent" color={colors.text} />
            ) : (
              <Text style={[styles.qrFallback, { color: colors.textSecondary }]}>{qrToken || 'QR unavailable right now.'}</Text>
            )}
          </View>
          <Text style={[styles.qrBusiness, { color: colors.text }]}>{offer.business_name}</Text>
          <Text style={[styles.qrDiscount, { color }]}>{offer.discount_percent > 0 ? `${offer.discount_percent}% off` : 'Free item'}</Text>
          <TouchableOpacity style={[styles.qrDone, { backgroundColor: colors.primary }]} onPress={() => { setShowQR(false); onDismiss(); }}>
            <Text style={styles.qrDoneText}>Done</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {offer.image_url ? (
            <View style={styles.heroImageWrap}>
              <Image source={{ uri: offer.image_url }} style={styles.heroImage} resizeMode="cover" />
            </View>
          ) : null}
          <View>
            <View style={styles.header}>
              <View
                style={[
                  styles.gemBadge,
                  {
                    backgroundColor: isLight ? `${color}18` : `${color}22`,
                    borderColor: isLight ? `${color}55` : `${color}66`,
                  },
                ]}
              >
                <Ionicons name="diamond-outline" size={22} color={color} />
              </View>
              <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
                <Text style={[styles.business, { color: colors.text }]} numberOfLines={2}>
                  {offer.business_name}
                </Text>
                {offer.title && String(offer.title).trim() && String(offer.title).trim() !== String(offer.business_name || '').trim() ? (
                  <Text style={[styles.offerTitleLine, { color: colors.textSecondary }]} numberOfLines={2}>
                    {offer.title}
                  </Text>
                ) : null}
                <Text style={[styles.discount, { color }]}>{offer.discount_percent > 0 ? `${offer.discount_percent}% off` : 'Free item'}</Text>
                {offer.address ? <Text style={[styles.address, { color: colors.textSecondary }]} numberOfLines={2}>{offer.address}</Text> : null}
                {offer.description ? <Text style={[styles.desc, { color: colors.textSecondary }]} numberOfLines={2}>{offer.description}</Text> : null}
              </View>
              <TouchableOpacity onPress={onDismiss} style={[styles.closeBtn, { backgroundColor: isLight ? colors.surfaceSecondary : 'rgba(255,255,255,0.08)' }]}>
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {distanceLine ? (
              <View style={styles.distanceBlock}>
                <View style={[styles.distanceRule, { backgroundColor: colors.border }]} />
                <View style={styles.distanceRow}>
                  <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                  <Text style={[styles.distanceText, { color: colors.textSecondary }]}>
                    {distanceLine} away · straight-line
                  </Text>
                </View>
              </View>
            ) : null}
            <View
              style={[
                styles.rewardRow,
                {
                  borderColor: isLight ? `${color}40` : `${color}35`,
                  backgroundColor: isLight ? `${color}0D` : `${color}14`,
                },
              ]}
            >
              <Ionicons name="sparkles-outline" size={16} color={color} />
              <Text style={[styles.rewardText, { color: colors.text, flex: 1 }]} numberOfLines={2}>
                {offer.gem_cost ?? offer.gems_reward ?? 0} gem redeem cost
              </Text>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity
                style={[
                  styles.redeemBtn,
                  {
                    backgroundColor: color,
                    borderColor: isLight ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.2)',
                  },
                ]}
                onPress={() => onRedeem(offer)}
              >
                <Text style={styles.redeemText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                  Redeem with gems
                </Text>
              </TouchableOpacity>
              <View style={styles.secondaryActions}>
                <TouchableOpacity
                  style={[styles.secondaryBtn, { backgroundColor: isLight ? colors.surfaceSecondary : 'rgba(255,255,255,0.06)', borderColor: isLight ? colors.border : 'rgba(255,255,255,0.1)' }]}
                  onPress={() => setShowQR(true)}
                >
                  <Ionicons name="qr-code-outline" size={17} color={colors.text} />
                  <Text style={[styles.secondaryBtnLabel, { color: colors.text }]} numberOfLines={1}>
                    QR code
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.secondaryBtn, { backgroundColor: isLight ? colors.surfaceSecondary : 'rgba(255,255,255,0.06)', borderColor: isLight ? colors.border : 'rgba(255,255,255,0.1)' }]}
                  onPress={() => (onNavigate ? onNavigate(offer) : onDismiss())}
                >
                  <Ionicons name="navigate-outline" size={17} color={colors.primary} />
                  <Text style={[styles.secondaryBtnLabelPrimary, { color: colors.primary }]} numberOfLines={1}>
                    Directions
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
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
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 12 },
      android: { elevation: 10 },
    }),
  },
  handle: { width: 40, height: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, alignSelf: 'center', marginBottom: 18 },
  heroImageWrap: { width: '100%', height: 140, borderRadius: 18, overflow: 'hidden', marginBottom: 16 },
  heroImage: { width: '100%', height: '100%' },
  header: { flexDirection: 'row', alignItems: 'flex-start' },
  gemBadge: { width: 48, height: 48, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5 },
  business: { fontSize: 17, fontWeight: '800', color: '#f8fafc', letterSpacing: -0.3 },
  offerTitleLine: { fontSize: 14, fontWeight: '600', marginTop: 4, lineHeight: 19 },
  discount: { fontSize: 15, fontWeight: '700', color: '#F59E0B', marginTop: 2 },
  address: { fontSize: 12, marginTop: 3, lineHeight: 17 },
  desc: { fontSize: 13, color: '#94a3b8', marginTop: 4, lineHeight: 18 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' },
  distanceBlock: { marginTop: 14 },
  distanceRule: { height: StyleSheet.hairlineWidth, width: '100%', marginBottom: 10 },
  distanceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  distanceText: { fontSize: 13, fontWeight: '600', letterSpacing: -0.2 },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  rewardText: { fontSize: 14, fontWeight: '600' },
  actions: { flexDirection: 'column', gap: 10, marginTop: 16, width: '100%' },
  redeemBtn: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  redeemText: { color: '#1a1a1a', fontSize: 15, fontWeight: '800', textAlign: 'center' },
  secondaryActions: { flexDirection: 'row', gap: 10, width: '100%', alignItems: 'stretch' },
  secondaryBtn: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderWidth: 1,
  },
  secondaryBtnLabel: { fontSize: 13, fontWeight: '700' },
  secondaryBtnLabelPrimary: { fontSize: 13, fontWeight: '700' },
  qrSection: { alignItems: 'center', paddingVertical: 8 },
  qrTitle: { color: '#f8fafc', fontSize: 18, fontWeight: '800', marginBottom: 20 },
  qrCountdown: { color: '#93c5fd', fontSize: 12, fontWeight: '700', marginTop: -12, marginBottom: 16 },
  qrBox: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 20, padding: 24, marginBottom: 16 },
  qrFallback: { color: '#94a3b8', fontSize: 12, textAlign: 'center' },
  qrBusiness: { color: '#f8fafc', fontSize: 16, fontWeight: '700' },
  qrDiscount: { color: '#F59E0B', fontSize: 14, fontWeight: '600', marginTop: 4 },
  qrDone: { marginTop: 20, backgroundColor: '#3B82F6', borderRadius: 12, paddingHorizontal: 40, paddingVertical: 14, borderWidth: 1, borderColor: 'rgba(0,0,0,0.12)' },
  qrDoneText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

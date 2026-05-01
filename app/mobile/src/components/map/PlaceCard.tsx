import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, Pressable, TouchableOpacity, StyleSheet, Platform,
  Dimensions, ScrollView, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  SlideInDown, SlideOutDown, FadeIn,
  useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../api/client';

interface Props {
  name: string;
  address?: string;
  category?: string;
  maki?: string;
  /** e.g. fuel / price disclosure for gas stations */
  detailHint?: string;
  distanceMeters?: number;
  /** Google Places photo_reference. When present we render a fitted hero strip via /api/places/photo. */
  photoRef?: string | null;
  /** Direct image URL (e.g. previously cached). Wins over photoRef when both supplied. */
  photoUrl?: string | null;
  /** 0–5; renders a star + numeric chip. */
  rating?: number | null;
  /** Google price level 1–4 → $..$$$$ */
  priceLevel?: number | null;
  /** Open / closed badge — green dot when true, red when false, hidden when null/undefined. */
  openNow?: boolean | null;
  onDirections: () => void;
  /** Favorites: heart toggle (preferred over onSave). */
  isFavorite?: boolean;
  onToggleFavorite?: () => void | Promise<void>;
  /** @deprecated use onToggleFavorite + isFavorite */
  onSave?: () => void;
  onDismiss: () => void;
  isLight?: boolean;
  /**
   * Optional theme-token palette so the card stays visually cohesive with
   * the rest of the app (search bar, profile insights). When omitted the
   * legacy slate/blue scheme is used as a safe default.
   */
  accent?: {
    primary: string;
    gradientStart: string;
    gradientEnd: string;
  };
}

function categoryIcon(maki?: string, category?: string): keyof typeof Ionicons.glyphMap {
  if (maki === 'restaurant' || maki === 'cafe' || category?.includes('food') || category?.includes('restaurant')) return 'restaurant-outline';
  if (maki === 'fuel' || maki === 'charging-station' || category?.includes('fuel')) return 'flash-outline';
  if (maki === 'lodging' || maki === 'hotel' || category?.includes('hotel')) return 'bed-outline';
  if (maki === 'shop' || maki === 'grocery' || category?.includes('shop')) return 'cart-outline';
  if (maki === 'park' || category?.includes('park')) return 'leaf-outline';
  if (maki === 'hospital' || maki === 'pharmacy' || category?.includes('medical')) return 'medkit-outline';
  if (maki === 'school' || category?.includes('school')) return 'school-outline';
  if (maki === 'bar' || category?.includes('bar') || category?.includes('nightlife')) return 'wine-outline';
  if (maki === 'bank' || category?.includes('bank')) return 'cash-outline';
  if (maki === 'cinema' || category?.includes('entertainment')) return 'film-outline';
  if (maki === 'gym' || maki === 'fitness' || category?.includes('fitness')) return 'barbell-outline';
  return 'location';
}

function formatDist(meters?: number): string | null {
  if (meters == null || !isFinite(meters)) return null;
  if (meters < 160) return `${Math.round(meters * 3.281)} ft`;
  const miles = meters / 1609.344;
  return miles < 10 ? `${miles.toFixed(1)} mi` : `${Math.round(miles)} mi`;
}

function categoryLabel(category?: string): string | null {
  if (!category) return null;
  return category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function priceLabel(level?: number | null): string | null {
  if (!level || level < 1) return null;
  return '$'.repeat(Math.min(4, Math.max(1, Math.round(level))));
}

export default function PlaceCard({
  name,
  address,
  category,
  maki,
  detailHint,
  distanceMeters,
  photoRef,
  photoUrl,
  rating,
  priceLevel,
  openNow,
  onDirections,
  isFavorite = false,
  onToggleFavorite,
  onSave,
  onDismiss,
  isLight = false,
  accent,
}: Props) {
  const insets = useSafeAreaInsets();
  const accentPrimary = accent?.primary ?? '#3B82F6';
  const ctaStart = accent?.gradientStart ?? '#1D4ED8';
  const ctaEnd = accent?.gradientEnd ?? '#3B82F6';
  const bg = isLight ? '#ffffff' : '#0F1118';
  const nameColor = isLight ? '#0F172A' : '#F8FAFC';
  const addrColor = isLight ? '#64748B' : '#94A3B8';
  const metaColor = isLight ? '#475569' : '#94A3B8';
  const borderColor = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)';
  const chipBg = isLight ? '#F1F5F9' : 'rgba(255,255,255,0.06)';
  const chipText = isLight ? '#334155' : '#CBD5E1';
  const heroFallback = isLight ? '#EEF2FF' : 'rgba(255,255,255,0.04)';

  // Resolve photo URL via backend proxy when only a Google photo_reference is provided.
  const resolvedPhotoUrl = useMemo<string | null>(() => {
    if (photoUrl) return photoUrl;
    if (!photoRef) return null;
    try {
      return `${api.getBaseUrl()}/api/places/photo?ref=${encodeURIComponent(photoRef)}&maxwidth=800`;
    } catch {
      return null;
    }
  }, [photoRef, photoUrl]);

  const [photoLoaded, setPhotoLoaded] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
  useEffect(() => {
    setPhotoLoaded(false);
    setPhotoFailed(false);
  }, [resolvedPhotoUrl]);

  const dist = formatDist(distanceMeters);
  const catLabel = categoryLabel(category);
  const icon = categoryIcon(maki, category);
  const price = priceLabel(priceLevel ?? undefined);
  const ratingText = typeof rating === 'number' && rating > 0 ? rating.toFixed(1) : null;

  const showPhoto = Boolean(resolvedPhotoUrl) && !photoFailed;
  const heroVisible = showPhoto || true; // always show a hero block (photo or gradient)

  const translateY = useSharedValue(0);
  const dirScale = useSharedValue(1);
  const saveScale = useSharedValue(1);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) translateY.value = e.translationY;
    })
    .onEnd((e) => {
      if (e.translationY > 80 || e.velocityY > 400) {
        translateY.value = withTiming(360, { duration: 220 }, () => { runOnJS(onDismiss)(); });
      } else {
        translateY.value = withSpring(0, { damping: 22, stiffness: 320 });
      }
    });

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  const dirAnim = useAnimatedStyle(() => ({ transform: [{ scale: dirScale.value }] }));
  const saveAnim = useAnimatedStyle(() => ({ transform: [{ scale: saveScale.value }] }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        entering={SlideInDown.duration(320).damping(20).stiffness(220)}
        exiting={SlideOutDown.duration(200)}
        style={[
          styles.container,
          {
            backgroundColor: bg,
            borderColor,
            paddingBottom: Math.max(insets.bottom, 20) + 12,
          },
          animStyle,
        ]}
      >
        <View style={[styles.handle, { backgroundColor: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.18)' }]} />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 6 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          {/* ── Hero: photo when available, else themed gradient with category mark ── */}
          {heroVisible ? (
            <View style={styles.hero}>
              {showPhoto && resolvedPhotoUrl ? (
                <>
                  {/* Skeleton fill while the network image arrives. */}
                  <View style={[StyleSheet.absoluteFillObject, { backgroundColor: heroFallback }]} />
                  <Image
                    source={{ uri: resolvedPhotoUrl }}
                    style={StyleSheet.absoluteFillObject}
                    resizeMode="cover"
                    onLoad={() => setPhotoLoaded(true)}
                    onError={() => setPhotoFailed(true)}
                  />
                  {photoLoaded ? (
                    <Animated.View
                      entering={FadeIn.duration(260)}
                      style={[StyleSheet.absoluteFillObject, { backgroundColor: 'transparent' }]}
                    />
                  ) : null}
                  <LinearGradient
                    colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.55)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={StyleSheet.absoluteFillObject}
                  />
                </>
              ) : (
                <LinearGradient
                  colors={[ctaStart, ctaEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFillObject}
                />
              )}

              {/* Floating close pill — always reachable, even when photo is loading. */}
              <TouchableOpacity
                onPress={onDismiss}
                style={[styles.closeFloat, { backgroundColor: 'rgba(0,0,0,0.42)' }]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={16} color="#fff" />
              </TouchableOpacity>

              {!showPhoto ? (
                <View style={styles.heroIconWrap} pointerEvents="none">
                  <Ionicons name={icon} size={42} color="rgba(255,255,255,0.94)" />
                </View>
              ) : null}

              {/* Bottom overlay chip row sits inside the hero so the photo "frames" the meta. */}
              <View style={styles.heroBottomRow} pointerEvents="none">
                {ratingText ? (
                  <View style={styles.heroChip}>
                    <Ionicons name="star" size={12} color="#FBBF24" />
                    <Text style={styles.heroChipText}>{ratingText}</Text>
                  </View>
                ) : null}
                {price ? (
                  <View style={styles.heroChip}>
                    <Text style={styles.heroChipText}>{price}</Text>
                  </View>
                ) : null}
                {typeof openNow === 'boolean' ? (
                  <View style={[styles.heroChip, styles.heroChipOpen]}>
                    <View style={[styles.openDot, { backgroundColor: openNow ? '#22C55E' : '#EF4444' }]} />
                    <Text style={styles.heroChipText}>{openNow ? 'Open' : 'Closed'}</Text>
                  </View>
                ) : null}
                {dist ? (
                  <View style={styles.heroChip}>
                    <Ionicons name="navigate-outline" size={11} color="#fff" />
                    <Text style={styles.heroChipText}>{dist}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          ) : null}

          {/* ── Body: name / address / category chip / fuel hint ── */}
          <View style={styles.body}>
            <View style={styles.titleRow}>
              <View style={[styles.iconCircle, { backgroundColor: `${accentPrimary}1A` }]}>
                <Ionicons name={icon} size={18} color={accentPrimary} />
              </View>
              <View style={styles.info}>
                <Text style={[styles.name, { color: nameColor }]} numberOfLines={3}>{name}</Text>
                {address ? (
                  <Text style={[styles.address, { color: addrColor }]} numberOfLines={3}>{address}</Text>
                ) : null}
              </View>
            </View>

            {(catLabel || dist || price || ratingText || typeof openNow === 'boolean') ? (
              <View style={styles.metaRow}>
                {catLabel ? (
                  <View style={[styles.metaChip, { backgroundColor: chipBg }]}>
                    <Text style={[styles.metaText, { color: chipText }]}>{catLabel}</Text>
                  </View>
                ) : null}
                {/* When the hero shows photo chips, hide the duplicate inline chip set so the body stays calm. */}
                {!showPhoto && ratingText ? (
                  <View style={[styles.metaChip, { backgroundColor: chipBg }]}>
                    <Ionicons name="star" size={11} color="#F59E0B" />
                    <Text style={[styles.metaText, { color: chipText }]}>{ratingText}</Text>
                  </View>
                ) : null}
                {!showPhoto && price ? (
                  <View style={[styles.metaChip, { backgroundColor: chipBg }]}>
                    <Text style={[styles.metaText, { color: chipText }]}>{price}</Text>
                  </View>
                ) : null}
                {!showPhoto && typeof openNow === 'boolean' ? (
                  <View style={[styles.metaChip, { backgroundColor: chipBg }]}>
                    <View style={[styles.openDot, { backgroundColor: openNow ? '#22C55E' : '#EF4444' }]} />
                    <Text style={[styles.metaText, { color: chipText }]}>{openNow ? 'Open' : 'Closed'}</Text>
                  </View>
                ) : null}
                {!showPhoto && dist ? (
                  <View style={[styles.metaChip, { backgroundColor: chipBg }]}>
                    <Ionicons name="navigate-outline" size={11} color={metaColor} />
                    <Text style={[styles.metaText, { color: chipText }]}>{dist}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {detailHint ? (
              <Text style={[styles.detailHint, { color: metaColor }]}>{detailHint}</Text>
            ) : null}
          </View>
        </ScrollView>

        {/* ── Action row: gradient Directions + heart Save ── */}
        <View style={styles.actions}>
          <Animated.View style={[{ flex: 2 }, dirAnim]}>
            <Pressable
              onPressIn={() => { dirScale.value = withSpring(0.97, { damping: 18, stiffness: 320 }); }}
              onPressOut={() => { dirScale.value = withSpring(1, { damping: 16, stiffness: 240 }); }}
              onPress={onDirections}
              style={styles.dirBtnWrap}
            >
              <LinearGradient
                colors={[ctaStart, ctaEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.dirBtn}
              >
                <Ionicons name="navigate" size={16} color="#fff" />
                <Text style={styles.dirText}>Directions</Text>
                {dist ? <Text style={styles.dirSub}>· {dist}</Text> : null}
              </LinearGradient>
            </Pressable>
          </Animated.View>
          {(onToggleFavorite || onSave) ? (
            <Animated.View style={[{ flex: 1 }, saveAnim]}>
              <Pressable
                onPressIn={() => { saveScale.value = withSpring(0.97, { damping: 18, stiffness: 320 }); }}
                onPressOut={() => { saveScale.value = withSpring(1, { damping: 16, stiffness: 240 }); }}
                onPress={() => { void (onToggleFavorite?.() ?? onSave?.()); }}
                style={[
                  styles.saveBtn,
                  {
                    borderColor: isFavorite ? '#EF4444' : borderColor,
                    backgroundColor: isFavorite ? 'rgba(239,68,68,0.12)' : `${accentPrimary}14`,
                  },
                ]}
              >
                <Ionicons
                  name={isFavorite ? 'heart' : 'heart-outline'}
                  size={16}
                  color={isFavorite ? '#EF4444' : accentPrimary}
                />
                <Text style={[styles.saveText, { color: isFavorite ? '#EF4444' : accentPrimary }]}>
                  {isFavorite ? 'Saved' : 'Save'}
                </Text>
              </Pressable>
            </Animated.View>
          ) : null}
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const PLACE_CARD_MAX_H = Dimensions.get('window').height * 0.62;
const HERO_HEIGHT = 148;

const styles = StyleSheet.create({
  container: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    paddingTop: 8,
    zIndex: 30,
    borderTopWidth: 1,
    maxHeight: PLACE_CARD_MAX_H,
    flexDirection: 'column',
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.16, shadowRadius: 20 },
      android: { elevation: 14 },
    }),
  },
  handle: { width: 40, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 6, marginTop: 4 },

  scroll: { },
  scrollContent: { },

  hero: {
    width: '100%',
    height: HERO_HEIGHT,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    backgroundColor: '#0F172A',
  },
  heroIconWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeFloat: {
    position: 'absolute', top: 10, right: 12,
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  heroBottomRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
    paddingHorizontal: 14, paddingBottom: 10,
  },
  heroChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.42)',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999,
  },
  heroChipOpen: { backgroundColor: 'rgba(0,0,0,0.5)' },
  heroChipText: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 0.1 },
  openDot: { width: 7, height: 7, borderRadius: 3.5 },

  body: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start' },
  iconCircle: {
    width: 38, height: 38, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginRight: 12, marginTop: 1,
  },
  info: { flex: 1 },
  name: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3, lineHeight: 22 },
  address: { fontSize: 13, marginTop: 3, lineHeight: 17 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, flexWrap: 'wrap' },
  detailHint: { fontSize: 11, fontWeight: '600', marginTop: 10, lineHeight: 15 },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999,
  },
  metaText: { fontSize: 11, fontWeight: '700' },

  actions: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 20, paddingTop: 14,
    flexShrink: 0,
  },
  dirBtnWrap: { borderRadius: 14, overflow: 'hidden' },
  dirBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 14, paddingVertical: 14,
  },
  dirText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  dirSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderRadius: 14, paddingVertical: 14, borderWidth: 1,
  },
  saveText: { fontSize: 15, fontWeight: '700' },
});

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Platform,
  Modal as RNModal,
  Dimensions,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { api } from '../../api/client';
import type { CameraLocation, CameraViewFeed } from './CameraMarkers';

interface Props {
  visible: boolean;
  camera: CameraLocation | null;
  onClose: () => void;
}

const MARKER_BLUE = '#4A90D9';
const FEED_H = 220;
const SCREEN_H = Dimensions.get('window').height;
const SPRING = { damping: 28, stiffness: 260, mass: 0.9 };

function cacheBust(url: string, t: number): string {
  if (!url) return url;
  return `${url}${url.includes('?') ? '&' : '?'}t=${t}`;
}

function clock(): string {
  return new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
}

type FetchState = 'idle' | 'loading' | 'done' | 'error';

export default function TrafficCameraSheet({ visible, camera, onClose }: Props) {
  const { colors, isLight } = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(SCREEN_H);
  const backdropOpacity = useSharedValue(0);

  const open = visible && camera != null;

  useEffect(() => {
    if (open) {
      backdropOpacity.value = withTiming(1, { duration: 240 });
      translateY.value = withSpring(0, SPRING);
    } else {
      translateY.value = withTiming(SCREEN_H, { duration: 210 });
      backdropOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [open]);

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));

  const handleClose = useCallback(() => {
    translateY.value = withTiming(SCREEN_H, { duration: 210 });
    backdropOpacity.value = withTiming(0, { duration: 200 }, () => { runOnJS(onClose)(); });
  }, [onClose]);

  // ── Live views (from prop or lazily fetched) ──────────────────────────────
  const [fetchState, setFetchState] = useState<FetchState>('idle');
  const [fetchedViews, setFetchedViews] = useState<CameraViewFeed[] | null>(null);
  const fetchAttempted = useRef(false);

  // Reset per camera
  useEffect(() => {
    if (!camera?.id) return;
    setFetchState('idle');
    setFetchedViews(null);
    fetchAttempted.current = false;
    setViewIndex(0);
    setImgError(false);
    setImgTs(Date.now());
  }, [camera?.id]);

  // Use views from prop first, fall back to fetched
  const propViews = camera?.camera_views;
  const hasViews = propViews && propViews.length > 0;
  const views: CameraViewFeed[] | undefined = hasViews ? propViews : (fetchedViews ?? undefined);

  // Lazy-fetch when sheet opens and no views in prop
  useEffect(() => {
    if (!open || hasViews || fetchAttempted.current || !camera) return;
    fetchAttempted.current = true;
    setFetchState('loading');
    api.get<any>(`/api/map/camera-detail?lat=${camera.lat}&lng=${camera.lng}`)
      .then((r) => {
        if (!r.success || !r.data) { setFetchState('error'); return; }
        const detail = (r.data as any)?.data ?? r.data;
        const raw = detail?.camera_views;
        if (Array.isArray(raw) && raw.length > 0) {
          const parsed: CameraViewFeed[] = raw
            .map((v: any) => ({
              id: String(v?.id ?? ''),
              small_url: String(v?.small_url ?? v?.smallUrl ?? '').trim(),
              large_url: String(v?.large_url ?? v?.largeUrl ?? '').trim(),
              direction: String(v?.direction ?? '').trim(),
            }))
            .map((v) => ({ ...v, small_url: v.small_url || v.large_url, large_url: v.large_url || v.small_url }))
            .filter((v) => v.large_url.length > 0);
          setFetchedViews(parsed.length ? parsed : null);
          setFetchState(parsed.length ? 'done' : 'error');
        } else {
          setFetchState('error');
        }
      })
      .catch(() => setFetchState('error'));
  }, [open, hasViews, camera]);

  // ── Image cycling & auto-refresh ─────────────────────────────────────────
  const [viewIndex, setViewIndex] = useState(0);
  const [imgTs, setImgTs] = useState(Date.now());
  const [imgError, setImgError] = useState(false);
  const [imgLoading, setImgLoading] = useState(true);
  const [tick, setTick] = useState(() => clock());

  // Auto-refresh every 5s (same cadence as web OHGOCameraPopup)
  useEffect(() => {
    if (!open || !views?.length) return;
    const id = setInterval(() => { setImgTs(Date.now()); setImgError(false); }, 5000);
    return () => clearInterval(id);
  }, [open, views?.length]);

  // Clock tick
  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => setTick(clock()), 1000);
    return () => clearInterval(id);
  }, [open]);

  const current = views?.[viewIndex];
  const baseUrl = useMemo(() => (current?.large_url || current?.small_url || '').trim(), [current]);
  const imageUri = baseUrl ? cacheBust(baseUrl, imgTs) : '';

  const manualRefresh = useCallback(() => {
    setImgError(false);
    setImgLoading(true);
    setImgTs(Date.now());
  }, []);

  // ── Derived display ───────────────────────────────────────────────────────
  const title = camera?.name?.trim() || 'Traffic camera';
  const subtitle = camera?.description?.trim();

  // ────────────────────────────────────────────────────────────────────────
  return (
    <RNModal
      visible={open}
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.root}>
        {/* Backdrop */}
        <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
          <Pressable
            style={[StyleSheet.absoluteFill, { backgroundColor: isLight ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.65)' }]}
            onPress={handleClose}
          />
        </Animated.View>

        {/* Sheet */}
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              paddingBottom: Math.max(insets.bottom, 20) + 8,
            },
            sheetStyle,
          ]}
        >
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' }]} />

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 4 }}
          >
            {/* Header */}
            <View style={styles.headerRow}>
              <View style={styles.markerIcon}>
                <Ionicons name="videocam" size={20} color="#fff" />
              </View>
              <View style={styles.headerText}>
                <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
                  {title}
                </Text>
                {subtitle ? (
                  <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={2}>
                    {subtitle}
                  </Text>
                ) : null}
              </View>
              <TouchableOpacity
                onPress={handleClose}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Feed card */}
            <View style={styles.feedOuter}>
              {/* Dark background */}
              <View style={[styles.feedCard, { backgroundColor: '#000' }]}>
                {/* Case 1: image is available and loaded */}
                {imageUri && !imgError ? (
                  <Image
                    key={imageUri}
                    source={{ uri: imageUri }}
                    style={styles.feedImage}
                    resizeMode="cover"
                    onLoadStart={() => setImgLoading(true)}
                    onLoadEnd={() => setImgLoading(false)}
                    onError={() => { setImgLoading(false); setImgError(true); }}
                  />
                ) : null}

                {/* Loading spinner over image */}
                {(imgLoading && imageUri && !imgError) ? (
                  <View style={styles.feedOverlay}>
                    <ActivityIndicator color="#fff" size="large" />
                  </View>
                ) : null}

                {/* Fetching from OHGO */}
                {fetchState === 'loading' && !imageUri ? (
                  <View style={styles.feedPlaceholder}>
                    <ActivityIndicator color="#fff" size="large" />
                    <Text style={styles.feedPlaceholderText}>Loading camera feed…</Text>
                  </View>
                ) : null}

                {/* Error / no-feed state */}
                {((!imageUri && fetchState !== 'loading') || (imgError)) ? (
                  <View style={styles.feedPlaceholder}>
                    <Ionicons name="videocam-off-outline" size={44} color="rgba(255,255,255,0.3)" />
                    <Text style={styles.feedPlaceholderText}>
                      {imgError
                        ? 'Image failed to load'
                        : fetchState === 'error'
                          ? 'Feed unavailable (not an OHGO camera or outside Ohio)'
                          : 'No feed for this camera'}
                    </Text>
                  </View>
                ) : null}

                {/* Direction badge – bottom left, rendered OUTSIDE overflow:hidden */}
              </View>

              {/* Overlay badges live outside feedCard so they aren't clipped on Android */}
              {imageUri && !imgError && current?.direction ? (
                <View style={styles.badgeLeft} pointerEvents="none">
                  <Text style={styles.badgeText} numberOfLines={1}>{current.direction}</Text>
                </View>
              ) : null}
              {imageUri && !imgError ? (
                <View style={styles.badgeRight} pointerEvents="none">
                  <Text style={styles.badgeMuted}>{tick}</Text>
                </View>
              ) : null}

              {/* Refresh button lives at the top-right of feedOuter, outside overflow:hidden */}
              <TouchableOpacity
                style={styles.refreshFab}
                onPress={imgError || !imageUri ? () => { fetchAttempted.current = false; setFetchState('idle'); setFetchedViews(null); manualRefresh(); } : manualRefresh}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.8}
                accessibilityLabel="Refresh camera image"
              >
                <Ionicons name="refresh" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Angle thumbnails */}
            {views && views.length > 1 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.thumbRow}
              >
                {views.map((v, i) => {
                  const thumb = (v.small_url || v.large_url || '').trim();
                  const selected = i === viewIndex;
                  return (
                    <TouchableOpacity
                      key={`v-${i}`}
                      style={[styles.thumbWrap, selected && { borderColor: MARKER_BLUE }]}
                      onPress={() => { setViewIndex(i); setImgError(false); setImgLoading(true); setImgTs(Date.now()); }}
                      activeOpacity={0.8}
                    >
                      {thumb ? (
                        <Image source={{ uri: thumb }} style={styles.thumbImg} resizeMode="cover" />
                      ) : (
                        <View style={[styles.thumbImg, { alignItems: 'center', justifyContent: 'center' }]}>
                          <Ionicons name="videocam-outline" size={20} color="#64748b" />
                        </View>
                      )}
                      {v.direction ? (
                        <Text style={styles.thumbCaption} numberOfLines={1}>{v.direction}</Text>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : null}

            {/* Coordinates + source */}
            {camera ? (
              <>
                <Text style={[styles.coords, { color: colors.textTertiary }]}>
                  {camera.lat.toFixed(5)}, {camera.lng.toFixed(5)}
                </Text>
                <Text style={[styles.source, { color: colors.textTertiary }]}>
                  {views?.length ? 'Source: ODOT OHGO · refreshes every 5s' : 'Source: ODOT OHGO (OHGO cameras available in Ohio)'}
                </Text>
              </>
            ) : null}
          </ScrollView>
        </Animated.View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
    maxHeight: '90%',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.15)',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: -4 } },
      android: { elevation: 20 },
      default: {},
    }),
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  markerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: MARKER_BLUE,
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
      android: { elevation: 3 },
      default: {},
    }),
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 3,
    lineHeight: 17,
  },
  closeBtn: {
    paddingLeft: 8,
    paddingTop: 2,
    flexShrink: 0,
  },
  /* ── Feed area ── */
  feedOuter: {
    position: 'relative',
    borderRadius: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 6 },
      default: {},
    }),
  },
  feedCard: {
    borderRadius: 16,
    minHeight: FEED_H,
    overflow: 'hidden', // clips the image to rounded corners only; badges are outside
  },
  feedImage: {
    width: '100%',
    height: FEED_H,
  },
  feedOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  feedPlaceholder: {
    height: FEED_H,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    rowGap: 12,
  },
  feedPlaceholderText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  /* Badges – outside feedCard, position relative to feedOuter */
  badgeLeft: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.72)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    maxWidth: '65%',
  },
  badgeRight: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.72)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  badgeMuted: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontVariant: ['tabular-nums'] },
  /* Refresh FAB – outside feedCard for reliable touch */
  refreshFab: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* Thumbnails */
  thumbRow: {
    columnGap: 10,
    paddingBottom: 4,
  },
  thumbWrap: {
    width: 80,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: '#1e293b',
  },
  thumbImg: {
    width: '100%',
    height: 52,
    backgroundColor: '#1e293b',
  },
  thumbCaption: {
    fontSize: 10,
    color: '#64748b',
    paddingHorizontal: 4,
    paddingVertical: 4,
    textAlign: 'center',
  },
  coords: {
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    marginTop: 4,
  },
  source: {
    fontSize: 11,
    marginTop: 4,
    lineHeight: 16,
  },
});

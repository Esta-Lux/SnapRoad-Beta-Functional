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
  type NativeScrollEvent,
  type NativeSyntheticEvent,
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
const SCREEN_W = Dimensions.get('window').width;
const EXPANDED_FEED_H = Math.min(SCREEN_H * 0.56, 420);
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
  const expandedScrollRef = useRef<ScrollView | null>(null);
  const [expandedOpen, setExpandedOpen] = useState(false);
  const [expandedViewIndex, setExpandedViewIndex] = useState(0);

  useEffect(() => {
    if (open) {
      backdropOpacity.value = withTiming(1, { duration: 240 });
      translateY.value = withSpring(0, SPRING);
    } else {
      translateY.value = withTiming(SCREEN_H, { duration: 210 });
      backdropOpacity.value = withTiming(0, { duration: 200 });
      setExpandedOpen(false);
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
    setExpandedViewIndex(0);
    setExpandedOpen(false);
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

  const openExpanded = useCallback(() => {
    if (!views?.length) return;
    setExpandedViewIndex(viewIndex);
    setExpandedOpen(true);
  }, [viewIndex, views?.length]);

  useEffect(() => {
    if (!expandedOpen) return;
    const t = setTimeout(() => {
      expandedScrollRef.current?.scrollTo({ x: expandedViewIndex * SCREEN_W, animated: false });
    }, 0);
    return () => clearTimeout(t);
  }, [expandedOpen, expandedViewIndex]);

  const selectView = useCallback((nextIndex: number) => {
    setViewIndex(nextIndex);
    setExpandedViewIndex(nextIndex);
    setImgError(false);
    setImgLoading(true);
    setImgTs(Date.now());
  }, []);

  const handleExpandedMomentumEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.max(
      0,
      Math.min((views?.length ?? 1) - 1, Math.round(event.nativeEvent.contentOffset.x / SCREEN_W)),
    );
    selectView(nextIndex);
  }, [selectView, views?.length]);

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
              <TouchableOpacity
                activeOpacity={views?.length ? 0.92 : 1}
                disabled={!views?.length}
                onPress={openExpanded}
              >
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
              </TouchableOpacity>

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
              {views?.length ? (
                <TouchableOpacity
                  style={styles.expandFab}
                  onPress={openExpanded}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.82}
                  accessibilityLabel="Expand camera view"
                >
                  <Ionicons name="expand-outline" size={18} color="#fff" />
                </TouchableOpacity>
              ) : null}

              {/* Refresh button lives at the top-right of feedOuter, outside overflow:hidden */}
              <TouchableOpacity
                style={[styles.refreshFab, views?.length ? styles.refreshFabShifted : null]}
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
                      onPress={() => selectView(i)}
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

        <RNModal
          visible={expandedOpen}
          transparent
          statusBarTranslucent
          animationType="fade"
          onRequestClose={() => setExpandedOpen(false)}
        >
          <View style={styles.expandedRoot}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setExpandedOpen(false)} />
            <View style={styles.expandedChrome}>
              <Text style={styles.expandedTitle} numberOfLines={1}>{title}</Text>
              <Text style={styles.expandedMeta}>
                {views?.length ? `${expandedViewIndex + 1} of ${views.length}` : 'Live view'}
              </Text>
              <TouchableOpacity
                onPress={() => setExpandedOpen(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.expandedCloseBtn}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView
              ref={expandedScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={handleExpandedMomentumEnd}
              contentOffset={{ x: expandedViewIndex * SCREEN_W, y: 0 }}
            >
              {(views?.length ? views : [null]).map((view, index) => {
                const candidateUrl = view ? cacheBust((view.large_url || view.small_url || '').trim(), imgTs) : imageUri;
                const isActive = index === expandedViewIndex;
                return (
                  <View key={`expanded-${index}`} style={styles.expandedPage}>
                    <View style={styles.expandedFeedCard}>
                      {candidateUrl && !(imgError && isActive) ? (
                        <Image
                          source={{ uri: candidateUrl }}
                          style={styles.expandedFeedImage}
                          resizeMode="contain"
                        />
                      ) : (
                        <View style={styles.expandedPlaceholder}>
                          <Ionicons name="videocam-off-outline" size={52} color="rgba(255,255,255,0.35)" />
                          <Text style={styles.expandedPlaceholderText}>
                            {imgError && isActive ? 'Image failed to load' : 'No feed for this camera'}
                          </Text>
                        </View>
                      )}
                    </View>
                    {view?.direction ? (
                      <Text style={styles.expandedDirection}>{view.direction}</Text>
                    ) : null}
                  </View>
                );
              })}
            </ScrollView>

            {views && views.length > 1 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.expandedThumbRow}
              >
                {views.map((view, index) => {
                  const thumb = (view.small_url || view.large_url || '').trim();
                  const selected = index === expandedViewIndex;
                  return (
                    <TouchableOpacity
                      key={`expanded-thumb-${index}`}
                      style={[styles.expandedThumbWrap, selected && styles.expandedThumbWrapSelected]}
                      onPress={() => {
                        selectView(index);
                        expandedScrollRef.current?.scrollTo({ x: index * SCREEN_W, animated: true });
                      }}
                      activeOpacity={0.84}
                    >
                      {thumb ? (
                        <Image source={{ uri: thumb }} style={styles.expandedThumbImg} resizeMode="cover" />
                      ) : (
                        <View style={[styles.expandedThumbImg, styles.expandedThumbFallback]}>
                          <Ionicons name="videocam-outline" size={20} color="#94A3B8" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : null}
          </View>
        </RNModal>
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
  refreshFabShifted: {
    right: 56,
  },
  expandFab: {
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
  expandedRoot: {
    flex: 1,
    backgroundColor: 'rgba(3,7,18,0.96)',
    justifyContent: 'center',
  },
  expandedChrome: {
    position: 'absolute',
    top: 54,
    left: 18,
    right: 18,
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  expandedTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  expandedMeta: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    marginHorizontal: 12,
  },
  expandedCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedPage: {
    width: SCREEN_W,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  expandedFeedCard: {
    width: '100%',
    height: EXPANDED_FEED_H,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedFeedImage: {
    width: '100%',
    height: '100%',
  },
  expandedPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    rowGap: 14,
  },
  expandedPlaceholderText: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: 15,
    textAlign: 'center',
  },
  expandedDirection: {
    marginTop: 14,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '600',
  },
  expandedThumbRow: {
    columnGap: 10,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 28,
  },
  expandedThumbWrap: {
    width: 92,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: '#0F172A',
  },
  expandedThumbWrapSelected: {
    borderColor: MARKER_BLUE,
  },
  expandedThumbImg: {
    width: '100%',
    height: 62,
    backgroundColor: '#0F172A',
  },
  expandedThumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

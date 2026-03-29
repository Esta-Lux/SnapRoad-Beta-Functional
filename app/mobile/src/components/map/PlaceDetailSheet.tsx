import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Image,
  Platform, ActivityIndicator, Linking, Dimensions, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../api/client';

export interface PlaceDetailData {
  place_id: string;
  name: string;
  address: string;
  phone?: string;
  website?: string;
  maps_url?: string;
  lat?: number;
  lng?: number;
  rating?: number;
  total_reviews?: number;
  price_level?: number;
  types?: string[];
  open_now?: boolean;
  hours?: string[];
  photos?: { reference: string; width: number; height: number }[];
  reviews?: { author: string; rating: number; text: string; time: string; profile_photo: string }[];
}

interface Props {
  placeId: string;
  summary?: { name?: string; lat?: number; lng?: number };
  onClose: () => void;
  onDirections: (place: { name: string; address: string; lat: number; lng: number }) => void;
  isLight?: boolean;
}

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');
const SNAP_FULL = 60;           // near-full screen (top of sheet)
const SNAP_MID  = SCREEN_H * 0.42; // mid-height fallback after swipe down
const SNAP_DISMISS = SCREEN_H * 0.72;
const SPRING = { damping: 32, stiffness: 280, mass: 0.85 };
const PHOTO_W = SCREEN_W - 48; // full-width photos with side padding

function Stars({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.3;
  const stars: React.ReactNode[] = [];
  for (let i = 0; i < 5; i++) {
    if (i < full) stars.push(<Ionicons key={i} name="star" size={13} color="#F59E0B" />);
    else if (i === full && half) stars.push(<Ionicons key={i} name="star-half" size={13} color="#F59E0B" />);
    else stars.push(<Ionicons key={i} name="star-outline" size={13} color="#94a3b8" />);
  }
  return <View style={{ flexDirection: 'row', gap: 1 }}>{stars}</View>;
}

function typeLabel(types?: string[]): string | null {
  if (!types?.length) return null;
  const skip = new Set(['point_of_interest', 'establishment', 'political', 'geocode']);
  const t = types.find((x) => !skip.has(x));
  if (!t) return null;
  return t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function PlaceDetailSheet({ placeId, summary, onClose, onDirections, isLight = false }: Props) {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<PlaceDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [showAllReviews, setShowAllReviews] = useState(false);

  const bg = isLight ? '#ffffff' : '#0f172a';
  const card = isLight ? '#f8fafc' : '#1e293b';
  const text = isLight ? '#0f172a' : '#f8fafc';
  const sub = isLight ? '#64748b' : '#94a3b8';
  const border = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)';
  const handleColor = isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.2)';

  const translateY = useSharedValue(SNAP_MID);
  const backdropOpacity = useSharedValue(0);
  const startY = useSharedValue(0);

  // Open to near-full immediately so photos and reviews are visible without swiping
  useEffect(() => {
    translateY.value = withSpring(SNAP_FULL, SPRING);
    backdropOpacity.value = withTiming(0.5, { duration: 280 });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get<any>(`/api/places/details/${placeId}`);
        const d = res.data?.data ?? res.data;
        if (!cancelled && d) {
          setData(d);
          const baseUrl = api.getBaseUrl();
          if (d.photos?.length) {
            setPhotoUrls(
              d.photos.slice(0, 6).map((p: { reference: string }) => `${baseUrl}/api/places/photo?ref=${p.reference}&maxwidth=800`)
            );
          }
        }
      } catch {} finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [placeId]);

  const panGesture = Gesture.Pan()
    .onStart(() => { startY.value = translateY.value; })
    .onUpdate((e) => {
      const next = startY.value + e.translationY;
      translateY.value = Math.max(SNAP_FULL - 20, next);
    })
    .onEnd((e) => {
      if (e.velocityY > 600 || translateY.value > SNAP_DISMISS) {
        // Fast swipe down or dragged far enough — dismiss
        translateY.value = withTiming(SCREEN_H, { duration: 260 });
        backdropOpacity.value = withTiming(0, { duration: 220 }, () => { runOnJS(onClose)(); });
      } else if (translateY.value < SNAP_MID) {
        // Upper half — snap to full
        translateY.value = withSpring(SNAP_FULL, SPRING);
      } else {
        // Lower half — snap to mid
        translateY.value = withSpring(SNAP_MID, SPRING);
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const overlayStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));

  const place = data;
  const label = typeLabel(place?.types);
  const lat = place?.lat ?? summary?.lat;
  const lng = place?.lng ?? summary?.lng;

  const dismissSheet = () => {
    translateY.value = withTiming(SCREEN_H, { duration: 250 });
    backdropOpacity.value = withTiming(0, { duration: 200 }, () => { runOnJS(onClose)(); });
  };

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 45 }]} pointerEvents="box-none">
      <Animated.View style={[styles.backdrop, overlayStyle]} pointerEvents="auto">
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={dismissSheet} />
      </Animated.View>

      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.container, { backgroundColor: bg, paddingBottom: insets.bottom + 16 }, sheetStyle]}>
          <View style={[styles.handle, { backgroundColor: handleColor }]} />

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={{ color: sub, marginTop: 12, fontSize: 13 }}>Loading place details...</Text>
            </View>
          ) : !place ? (
            <View style={styles.loadingWrap}>
              <Ionicons name="alert-circle-outline" size={28} color={sub} />
              <Text style={{ color: sub, marginTop: 8, fontSize: 13 }}>Could not load details</Text>
              <TouchableOpacity onPress={onClose} style={{ marginTop: 16 }}><Text style={{ color: '#3B82F6', fontWeight: '700' }}>Close</Text></TouchableOpacity>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} bounces={true} nestedScrollEnabled contentContainerStyle={{ paddingBottom: 40 }}>
              {photoUrls.length > 0 && (
                <FlatList
                  data={photoUrls}
                  horizontal
                  pagingEnabled
                  snapToInterval={PHOTO_W + 12}
                  decelerationRate="fast"
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, gap: 12 }}
                  keyExtractor={(_, i) => String(i)}
                  renderItem={({ item }) => (
                    <Image source={{ uri: item }} style={styles.photoItem} resizeMode="cover" />
                  )}
                />
              )}

              <View style={styles.header}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: text }]} numberOfLines={2}>{place.name}</Text>
                  <View style={styles.ratingRow}>
                    {place.rating != null && (
                      <>
                        <Text style={[styles.ratingNum, { color: text }]}>{place.rating.toFixed(1)}</Text>
                        <Stars rating={place.rating} />
                        {place.total_reviews != null && <Text style={{ color: sub, fontSize: 12 }}>({place.total_reviews})</Text>}
                      </>
                    )}
                    {label && <View style={[styles.typeBadge, { backgroundColor: card }]}><Text style={{ color: sub, fontSize: 11, fontWeight: '600' }}>{label}</Text></View>}
                  </View>
                  <View style={styles.statusRow}>
                    {place.open_now != null && (
                      <Text style={{ color: place.open_now ? '#22C55E' : '#EF4444', fontSize: 13, fontWeight: '700' }}>
                        {place.open_now ? 'Open' : 'Closed'}
                      </Text>
                    )}
                    {place.price_level != null && <Text style={{ color: sub, fontSize: 13 }}>{'$'.repeat(place.price_level)}</Text>}
                  </View>
                  {place.address ? <Text style={[styles.address, { color: sub }]} numberOfLines={2}>{place.address}</Text> : null}
                </View>
                <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: card }]}>
                  <Ionicons name="close" size={18} color={sub} />
                </TouchableOpacity>
              </View>

              <View style={styles.actions}>
                <TouchableOpacity style={styles.dirBtn} activeOpacity={0.8}
                  onPress={() => { if (lat != null && lng != null) onDirections({ name: place.name, address: place.address, lat, lng }); }}>
                  <Ionicons name="navigate" size={16} color="#fff" />
                  <Text style={styles.dirText}>Directions</Text>
                </TouchableOpacity>
                {place.phone ? (
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: card }]} onPress={() => Linking.openURL(`tel:${place.phone}`)}>
                    <Ionicons name="call-outline" size={16} color="#3B82F6" />
                    <Text style={[styles.actionLabel, { color: text }]}>Call</Text>
                  </TouchableOpacity>
                ) : null}
                {place.website ? (
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: card }]} onPress={() => Linking.openURL(place.website!)}>
                    <Ionicons name="globe-outline" size={16} color="#3B82F6" />
                    <Text style={[styles.actionLabel, { color: text }]}>Web</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {place.hours && place.hours.length > 0 && (
                <View style={[styles.section, { borderTopColor: border }]}>
                  <Text style={[styles.sectionTitle, { color: text }]}>Hours</Text>
                  {place.hours.map((h, i) => (
                    <Text key={i} style={[styles.hourLine, { color: sub }]}>{h}</Text>
                  ))}
                </View>
              )}

              {place.reviews && place.reviews.length > 0 && (
                <View style={[styles.section, { borderTopColor: border }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <Text style={[styles.sectionTitle, { color: text, marginBottom: 0 }]}>
                      Reviews{place.total_reviews != null ? ` (${place.total_reviews})` : ''}
                    </Text>
                    {place.rating != null && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={{ color: text, fontSize: 15, fontWeight: '800' }}>{place.rating.toFixed(1)}</Text>
                        <Stars rating={place.rating} />
                      </View>
                    )}
                  </View>
                  {place.reviews.map((r, i) => (
                    <View key={i} style={[styles.reviewCard, { backgroundColor: card }]}>
                      <View style={styles.reviewHeader}>
                        {r.profile_photo ? (
                          <Image source={{ uri: r.profile_photo }} style={styles.reviewAvatar} />
                        ) : (
                          <View style={[styles.reviewAvatar, { backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center' }]}>
                            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>{(r.author || 'U')[0]}</Text>
                          </View>
                        )}
                        <View style={{ flex: 1, marginLeft: 8 }}>
                          <Text style={{ color: text, fontSize: 13, fontWeight: '700' }} numberOfLines={1}>{r.author}</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                            <Stars rating={r.rating} />
                            <Text style={{ color: sub, fontSize: 11 }}>{r.time}</Text>
                          </View>
                        </View>
                      </View>
                      {r.text ? <Text style={{ color: sub, fontSize: 13, lineHeight: 18, marginTop: 8 }}>{r.text}</Text> : null}
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          )}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000' },
  container: {
    position: 'absolute', left: 0, right: 0, top: 0, height: SCREEN_H,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.25, shadowRadius: 24 },
      android: { elevation: 20 },
    }),
  },
  handle: { width: 40, height: 5, borderRadius: 3, alignSelf: 'center', marginTop: 10, marginBottom: 8 },
  loadingWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  photoItem: { width: PHOTO_W, height: 220, borderRadius: 18 },
  header: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 8, alignItems: 'flex-start' },
  name: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  ratingNum: { fontSize: 14, fontWeight: '800' },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginLeft: 4 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  address: { fontSize: 13, marginTop: 6, lineHeight: 18 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
  actions: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginTop: 16 },
  dirBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#3B82F6', borderRadius: 14, paddingVertical: 13,
    ...Platform.select({
      ios: { shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  dirText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  actionBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 14, paddingVertical: 13 },
  actionLabel: { fontSize: 12, fontWeight: '700' },
  section: { paddingHorizontal: 20, paddingTop: 16, marginTop: 12, borderTopWidth: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 10 },
  hourLine: { fontSize: 13, lineHeight: 20 },
  reviewCard: { borderRadius: 14, padding: 14, marginBottom: 8 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center' },
  reviewAvatar: { width: 32, height: 32, borderRadius: 16 },
});

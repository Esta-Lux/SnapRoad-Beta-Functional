import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Image,
  Platform, ActivityIndicator, Linking, Dimensions, FlatList, Share, Alert,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { api } from '../../api/client';
import { getMapboxRouteOptions } from '../../lib/directions';
import { formatTime } from '../../utils/format';
import { haversineMeters } from '../../utils/distance';
import type { DrivingMode, SavedLocation } from '../../types';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PlaceAttributes {
  dine_in?: boolean;
  delivery?: boolean;
  takeout?: boolean;
  curbside_pickup?: boolean;
  reservable?: boolean;
  serves_beer?: boolean;
  serves_wine?: boolean;
  serves_breakfast?: boolean;
  serves_lunch?: boolean;
  serves_dinner?: boolean;
  wheelchair_accessible?: boolean;
  good_for_groups?: boolean;
  good_for_children?: boolean;
  outdoor_seating?: boolean;
  live_music?: boolean;
  accepts_credit_cards?: boolean;
  accepts_apple_pay?: boolean;
  accepts_contactless?: boolean;
  parking_lot?: boolean;
  free_parking?: boolean;
}

export interface PlaceReview {
  author: string;
  author_name: string;
  rating: number;
  text: string;
  time: string;
  profile_photo: string;
}

/** Normalized payload from `/api/places/details/:id` */
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
  open_now?: boolean | null;
  hours?: string[];
  opening_hours?: { open_now?: boolean; weekday_text?: string[] };
  photos?: { reference?: string; url?: string; width?: number; height?: number }[];
  reviews?: PlaceReview[];
  editorial_summary?: string;
  attributes?: PlaceAttributes;
}

export interface SavedPlacePayload {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

interface Props {
  placeId: string;
  summary?: { name?: string; lat?: number; lng?: number };
  userLocation?: { lat: number; lng: number };
  drivingMode?: DrivingMode;
  maxHeightMeters?: number;
  onClose: () => void;
  onDirections: (place: { name: string; address: string; lat: number; lng: number }) => void;
  onSave?: (place: SavedPlacePayload) => void | Promise<void>;
  savedPlaces?: SavedLocation[];
  onFavoritesChange?: () => void;
  isLight?: boolean;
}

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');
const SPRING = { damping: 34, stiffness: 320, mass: 0.82 };
const PHOTO_HEIGHT = 220;
/** Sticky Directions bar + home indicator — scroll must clear the overlay so favorites/share stay reachable. */
const SCROLL_BOTTOM_PAD_EXTRA = 148;

const FOOD_PLACE_TYPES = new Set([
  'restaurant', 'meal_delivery', 'meal_takeaway', 'cafe', 'bakery', 'bar', 'food',
]);

function priceLabel(level?: number): string {
  if (!level) return '';
  return '$'.repeat(level);
}

function categoryLabel(types?: string[]): string {
  if (!types?.length) return '';
  const map: Record<string, string> = {
    restaurant: 'Restaurant', cafe: 'Café', bar: 'Bar',
    bakery: 'Bakery', meal_delivery: 'Delivery', meal_takeaway: 'Takeaway',
    grocery_or_supermarket: 'Grocery', gas_station: 'Gas Station',
    shopping_mall: 'Shopping', pharmacy: 'Pharmacy', hospital: 'Hospital',
    gym: 'Gym', park: 'Park', museum: 'Museum', lodging: 'Hotel',
    car_repair: 'Auto Repair', car_wash: 'Car Wash',
  };
  const skip = new Set(['point_of_interest', 'establishment', 'political', 'geocode']);
  for (const t of types) {
    if (skip.has(t)) continue;
    if (map[t]) return map[t];
  }
  const first = types.find((t) => !skip.has(t));
  return first?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) ?? '';
}

function formatDistanceMeters(meters: number): string {
  if (meters < 160) return `${Math.round(meters * 3.281)} ft`;
  return `${(meters / 1609.34).toFixed(1)} mi`;
}

function estimateWalkTime(meters: number): string {
  const mins = Math.round(meters / 80);
  return mins < 1 ? '1 min walk' : `${mins} min walk`;
}

function estimateDriveTime(meters: number): string {
  const mins = Math.round(meters / 670);
  return mins < 1 ? '1 min' : `${mins} min`;
}

type RouteSummary = {
  durationText: string;
  distanceText: string;
  arrivalTimeText: string;
};

function todayHours(weekdayLines?: string[]): string | null {
  if (!weekdayLines?.length) return null;
  const dayIndex = new Date().getDay();
  const mappedIndex = dayIndex === 0 ? 6 : dayIndex - 1;
  const text = weekdayLines[mappedIndex];
  if (!text) return null;
  const colonIdx = text.indexOf(':');
  return colonIdx > -1 ? text.substring(colonIdx + 2) : text;
}

function StarRating({ rating, size = 14, color = '#F59E0B' }: { rating: number; size?: number; color?: string }) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    const fill = rating >= i ? 'star' : rating >= i - 0.5 ? 'star-half' : 'star-outline';
    stars.push(<Ionicons key={i} name={fill as 'star'} size={size} color={color} />);
  }
  return <View style={{ flexDirection: 'row', gap: 1 }}>{stars}</View>;
}

function isFoodPlace(types?: string[]): boolean {
  return types?.some((t) => FOOD_PLACE_TYPES.has(t)) ?? false;
}

function isGasStation(types?: string[]): boolean {
  return types?.some((t) => t === 'gas_station') ?? false;
}

function buildPhotoUrls(photos: unknown[], baseUrl: string): string[] {
  const out: string[] = [];
  for (const raw of photos.slice(0, 8)) {
    if (!raw || typeof raw !== 'object') continue;
    const p = raw as Record<string, unknown>;
    const direct = (p.url ?? p.photo_url ?? p.photo_reference_url) as string | undefined;
    if (direct) {
      out.push(direct);
      continue;
    }
    const ref = p.reference as string | undefined;
    if (ref) {
      out.push(`${baseUrl}/api/places/photo?ref=${encodeURIComponent(ref)}&maxwidth=800`);
    }
  }
  return out;
}

function normalizeDetail(placeId: string, d: Record<string, unknown>, summary?: Props['summary']): PlaceDetailData | null {
  if (!d || typeof d !== 'object') return null;
  const reviewsRaw = (d.reviews as Record<string, unknown>[]) ?? [];
  const opening = (d.opening_hours as Record<string, unknown>) || {};
  const hoursLines = (d.hours as string[]) ?? (opening.weekday_text as string[]) ?? [];
  const lat = (d.lat as number) ?? (d.geometry as { location?: { lat?: number } })?.location?.lat ?? summary?.lat;
  const lng = (d.lng as number) ?? (d.geometry as { location?: { lng?: number } })?.location?.lng ?? summary?.lng;

  const reviews: PlaceReview[] = reviewsRaw.map((r) => ({
    author: String(r.author_name ?? r.author ?? 'Anonymous'),
    author_name: String(r.author_name ?? r.author ?? 'Anonymous'),
    rating: Number(r.rating ?? 0),
    text: String(r.text ?? ''),
    time: String(r.relative_time_description ?? r.time ?? ''),
    profile_photo: String(r.profile_photo_url ?? r.profile_photo ?? ''),
  }));

  const attrs = d.attributes as PlaceAttributes | undefined;
  const pay = d.payment_options as Record<string, unknown> | undefined;
  const park = d.parking_options as Record<string, unknown> | undefined;
  const attributes: PlaceAttributes | undefined = attrs ?? {
    dine_in: d.dine_in as boolean | undefined,
    delivery: d.delivery as boolean | undefined,
    takeout: d.takeout as boolean | undefined,
    curbside_pickup: d.curbside_pickup as boolean | undefined,
    reservable: d.reservable as boolean | undefined,
    serves_beer: d.serves_beer as boolean | undefined,
    serves_wine: d.serves_wine as boolean | undefined,
    serves_breakfast: d.serves_breakfast as boolean | undefined,
    serves_lunch: d.serves_lunch as boolean | undefined,
    serves_dinner: d.serves_dinner as boolean | undefined,
    wheelchair_accessible: (d.wheelchair_accessible_entrance ?? d.wheelchair_accessible) as boolean | undefined,
    good_for_groups: d.good_for_groups as boolean | undefined,
    good_for_children: d.good_for_children as boolean | undefined,
    outdoor_seating: d.outdoor_seating as boolean | undefined,
    live_music: d.live_music as boolean | undefined,
    accepts_credit_cards: pay?.acceptsCreditCards as boolean | undefined,
    accepts_apple_pay: pay?.acceptsApplePay as boolean | undefined,
    accepts_contactless: pay?.acceptsNfc as boolean | undefined,
    parking_lot: Boolean(park?.paidParkingLot || park?.freeParkingLot),
    free_parking: Boolean(park?.freeParkingLot || park?.freeStreetParking),
  };

  let editorial = '';
  const es = d.editorial_summary;
  if (typeof es === 'string') editorial = es;
  else if (es && typeof es === 'object' && 'overview' in es) editorial = String((es as { overview?: string }).overview ?? '');

  return {
    place_id: String(d.place_id ?? placeId),
    name: String(d.name ?? summary?.name ?? 'Place'),
    address: String(d.address ?? d.formatted_address ?? d.vicinity ?? ''),
    phone: (d.phone ?? d.formatted_phone_number) as string | undefined,
    website: d.website as string | undefined,
    maps_url: d.maps_url as string | undefined,
    lat, lng,
    rating: d.rating as number | undefined,
    total_reviews: (d.total_reviews ?? d.user_ratings_total) as number | undefined,
    price_level: d.price_level as number | undefined,
    types: (d.types as string[]) ?? [],
    open_now: (d.open_now ?? opening.open_now) as boolean | null | undefined,
    hours: hoursLines,
    opening_hours: opening as PlaceDetailData['opening_hours'],
    reviews,
    editorial_summary: editorial,
    attributes,
  };
}

export default function PlaceDetailSheet({
  placeId,
  summary,
  userLocation,
  drivingMode = 'adaptive',
  maxHeightMeters,
  onClose,
  onDirections,
  onSave,
  savedPlaces = [],
  onFavoritesChange,
  isLight = false,
}: Props) {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<PlaceDetailData | null>(null);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllHours, setShowAllHours] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [saved, setSaved] = useState(false);
  const [routeSummary, setRouteSummary] = useState<RouteSummary | null>(null);

  const bg = isLight ? '#ffffff' : '#0F1118';
  const surface = isLight ? '#F5F5F7' : '#1A1B26';
  const text1 = isLight ? '#1A1A1A' : '#F1F5F9';
  const text2 = isLight ? '#6B7280' : '#94A3B8';
  const text3 = isLight ? '#9CA3AF' : '#64748B';
  const border = isLight ? '#E5E7EB' : '#1E2030';
  const accent = '#3B82F6';
  const green = '#22C55E';
  const handleColor = isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.2)';

  /**
   * translateY pushes the full-height sheet down. Smaller translateY = more sheet visible (expanded).
   * Drag handle only drives pan so vertical scroll does not fight the drawer.
   */
  const DETENTS = useMemo(
    () => ({
      expanded: Math.round(SCREEN_H * 0.2),
      half: Math.round(SCREEN_H * 0.46),
      dismiss: Math.round(SCREEN_H * 0.9),
    }),
    [],
  );

  const translateY = useSharedValue(DETENTS.expanded);
  const backdropOpacity = useSharedValue(0);
  const startY = useSharedValue(0);

  useEffect(() => {
    backdropOpacity.value = 0;
    translateY.value = withSpring(DETENTS.expanded, SPRING);
    backdropOpacity.value = withTiming(0.42, { duration: 300 });
  }, [placeId, DETENTS.expanded]);

  useEffect(() => {
    setSaved(false);
    setPhotoIndex(0);
    setShowAllHours(false);
    setShowAllReviews(false);
  }, [placeId]);

  useEffect(() => {
    setRouteSummary(null);
  }, [placeId, userLocation?.lat, userLocation?.lng, drivingMode, maxHeightMeters]);

  // Fetch once per placeId. Do not depend on `summary`: parent often passes a new object each
  // render; including it re-ran this on every GPS tick and toggled loading (sheet glitch).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get<Record<string, unknown>>(`/api/places/details/${placeId}`);
        if (!res.success || res.data == null) {
          if (!cancelled) {
            setData(null);
            setPhotoUrls([]);
          }
          return;
        }
        const outer = res.data as { data?: Record<string, unknown> };
        const d = outer.data ?? (res.data as Record<string, unknown>);
        if (!cancelled && d && typeof d === 'object') {
          const normalized = normalizeDetail(placeId, d, summary);
          if (normalized) {
            setData(normalized);
            setPhotoUrls(buildPhotoUrls((d.photos as unknown[]) ?? [], api.getBaseUrl()));
          } else {
            setData(null);
            setPhotoUrls([]);
          }
        }
      } catch (e) {
        console.warn('[PlaceDetailSheet] fetch error', e);
        if (!cancelled) {
          setData(null);
          setPhotoUrls([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [placeId]);

  const panGesture = Gesture.Pan()
    .onStart(() => { startY.value = translateY.value; })
    .onUpdate((e) => {
      const next = startY.value + e.translationY;
      const minY = DETENTS.expanded - 28;
      const maxY = SCREEN_H * 0.96;
      translateY.value = Math.min(maxY, Math.max(minY, next));
    })
    .onEnd((e) => {
      const { expanded, half, dismiss } = DETENTS;
      const mid = (expanded + half) / 2;
      if (e.velocityY > 720 || translateY.value > dismiss) {
        translateY.value = withTiming(SCREEN_H, { duration: 260 });
        backdropOpacity.value = withTiming(0, { duration: 220 }, () => { runOnJS(onClose)(); });
      } else if (translateY.value < mid) {
        translateY.value = withSpring(expanded, SPRING);
      } else {
        translateY.value = withSpring(half, SPRING);
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const overlayStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));

  const place = data;
  const lat = place?.lat ?? summary?.lat;
  const lng = place?.lng ?? summary?.lng;
  const category = categoryLabel(place?.types);
  const hasUserLoc = Boolean(
    userLocation && (userLocation.lat !== 0 || userLocation.lng !== 0),
  );
  const distMeters =
    place && lat != null && lng != null && hasUserLoc
      ? haversineMeters(userLocation!.lat, userLocation!.lng, lat, lng)
      : null;

  const favoriteMatch = useMemo((): SavedLocation | null => {
    if (lat == null || lng == null || !savedPlaces.length) return null;
    for (const p of savedPlaces) {
      if (p.lat == null || p.lng == null) continue;
      if (haversineMeters(lat, lng, p.lat, p.lng) < 85) {
        const c = (p.category || '').toLowerCase();
        if (c === 'favorite' || (c !== 'home' && c !== 'work')) return p;
      }
    }
    return null;
  }, [lat, lng, savedPlaces]);

  useEffect(() => {
    setSaved(!!favoriteMatch);
  }, [favoriteMatch]);

  const dismissSheet = () => {
    translateY.value = withTiming(SCREEN_H, { duration: 250 });
    backdropOpacity.value = withTiming(0, { duration: 200 }, () => { runOnJS(onClose)(); });
  };

  const handleCall = useCallback(() => {
    const p = place?.phone?.replace(/\s/g, '');
    if (p) Linking.openURL(`tel:${p}`);
  }, [place?.phone]);

  const handleWeb = useCallback(() => {
    if (place?.website) Linking.openURL(place.website);
  }, [place?.website]);

  const handleOrder = useCallback(() => {
    if (place?.name) {
      Linking.openURL(`https://www.doordash.com/search/store/${encodeURIComponent(place.name)}/`);
    }
  }, [place?.name]);

  const handleDirections = useCallback(() => {
    if (
      place &&
      lat != null &&
      lng != null &&
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      (Math.abs(lat) > 1e-5 || Math.abs(lng) > 1e-5)
    ) {
      onDirections({ name: place.name, address: place.address, lat, lng });
      return;
    }
    Alert.alert(
      'Directions unavailable',
      'This place does not have a map location yet. Pull to refresh or wait for details to finish loading, then try again.',
    );
  }, [place, lat, lng, onDirections]);

  const handleSave = useCallback(async () => {
    if (!place || !onSave || lat == null || lng == null) return;
    try {
      await onSave({ placeId: place.place_id, name: place.name, address: place.address, lat, lng });
      setSaved(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [place, onSave, lat, lng]);

  const handleFavorite = useCallback(async () => {
    if (!place || lat == null || lng == null) return;
    try {
      if (favoriteMatch?.id) {
        const res = await api.delete(`/api/locations/${favoriteMatch.id}`);
        if (!res.success) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          return;
        }
        setSaved(false);
        onFavoritesChange?.();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        return;
      }
      const res = await api.post('/api/locations', {
        name: place.name,
        address: place.address ?? '',
        category: 'favorite',
        lat,
        lng,
      });
      if (!res.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
      setSaved(true);
      onFavoritesChange?.();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [place, lat, lng, favoriteMatch, onFavoritesChange]);

  const handleShare = useCallback(async () => {
    if (!place || lat == null || lng == null) return;
    const url = `https://maps.apple.com/?q=${encodeURIComponent(place.name)}&ll=${lat},${lng}`;
    try {
      await Share.share(
        Platform.OS === 'ios'
          ? { message: `${place.name}`, url }
          : { message: `${place.name}\n${url}` },
      );
    } catch { /* user dismissed */ }
  }, [place, lat, lng]);

  const goodToKnow = useMemo(() => {
    const a = place?.attributes;
    if (!a) return [] as { icon: keyof typeof Ionicons.glyphMap; label: string }[];
    const items: { icon: keyof typeof Ionicons.glyphMap; label: string }[] = [];
    if (a.accepts_apple_pay) items.push({ icon: 'phone-portrait-outline', label: 'Accepts Apple Pay' });
    if (a.accepts_contactless) items.push({ icon: 'wifi-outline', label: 'Contactless Payments' });
    if (a.accepts_credit_cards) items.push({ icon: 'card-outline', label: 'Accepts Credit Cards' });
    if (a.takeout) items.push({ icon: 'bag-handle-outline', label: 'Takeout' });
    if (a.delivery) items.push({ icon: 'bicycle-outline', label: 'Delivery' });
    if (a.dine_in) items.push({ icon: 'restaurant-outline', label: 'Dine-in' });
    if (a.curbside_pickup) items.push({ icon: 'car-outline', label: 'Curbside Pickup' });
    if (a.reservable) items.push({ icon: 'calendar-outline', label: 'Reservations' });
    if (a.parking_lot) items.push({ icon: 'location-outline', label: a.free_parking ? 'Free Parking' : 'Parking Lot' });
    if (a.outdoor_seating) items.push({ icon: 'sunny-outline', label: 'Outdoor Seating' });
    if (a.serves_beer || a.serves_wine) {
      items.push({
        icon: 'beer-outline',
        label: a.serves_beer && a.serves_wine ? 'Full Bar' : a.serves_beer ? 'Serves Beer' : 'Serves Wine',
      });
    }
    if (a.serves_dinner) items.push({ icon: 'moon-outline', label: 'Dinner' });
    if (a.serves_lunch) items.push({ icon: 'partly-sunny-outline', label: 'Lunch' });
    if (a.serves_breakfast) items.push({ icon: 'cafe-outline', label: 'Breakfast' });
    if (a.good_for_groups) items.push({ icon: 'people-outline', label: 'Good for Groups' });
    if (a.good_for_children) items.push({ icon: 'happy-outline', label: 'Good for Kids' });
    if (a.wheelchair_accessible) items.push({ icon: 'accessibility-outline', label: 'Wheelchair Accessible' });
    if (a.live_music) items.push({ icon: 'musical-notes-outline', label: 'Live Music' });
    return items;
  }, [place?.attributes]);

  const showOrder = Boolean(
    place && (place.attributes?.delivery || place.attributes?.takeout || isFoodPlace(place.types)),
  );

  const weekdayLines = place?.hours?.length ? place.hours : place?.opening_hours?.weekday_text;

  useEffect(() => {
    if (
      !place ||
      lat == null ||
      lng == null ||
      !userLocation ||
      !Number.isFinite(userLocation.lat) ||
      !Number.isFinite(userLocation.lng)
    ) {
      setRouteSummary(null);
      return;
    }
    if (
      Math.abs(userLocation.lat) < 1e-5 &&
      Math.abs(userLocation.lng) < 1e-5
    ) {
      setRouteSummary(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const routes = await getMapboxRouteOptions(
          { lat: userLocation.lat, lng: userLocation.lng },
          { lat, lng },
          { mode: drivingMode, maxHeightMeters },
        );
        if (cancelled || !routes.length) return;
        const best = routes[0]!;
        const arrival = new Date(Date.now() + best.duration * 1000);
        setRouteSummary({
          durationText: best.durationText,
          distanceText: best.distanceText,
          arrivalTimeText: formatTime(arrival),
        });
      } catch {
        if (!cancelled) setRouteSummary(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [place, lat, lng, userLocation?.lat, userLocation?.lng, drivingMode, maxHeightMeters]);

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 50 }]} pointerEvents="box-none">
      <Animated.View style={[S.backdrop, overlayStyle]} pointerEvents="auto">
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={dismissSheet} />
      </Animated.View>

      <Animated.View style={[S.container, { backgroundColor: bg }, sheetStyle]}>
          <GestureDetector gesture={panGesture}>
            <View style={S.sheetDragHeader} collapsable={false}>
              <View style={[S.handleBar, { backgroundColor: handleColor }]} />
            </View>
          </GestureDetector>

          {loading ? (
            <View style={S.loadingWrap}>
              <ActivityIndicator size="large" color={accent} />
              <Text style={[S.loadingText, { color: text3 }]}>Loading place details...</Text>
            </View>
          ) : !place ? (
            <View style={S.loadingWrap}>
              <Ionicons name="alert-circle-outline" size={28} color={text3} />
              <Text style={[S.loadingText, { color: text3 }]}>Could not load details</Text>
              <TouchableOpacity onPress={onClose} style={{ marginTop: 16 }}>
                <Text style={{ color: accent, fontWeight: '700' }}>Close</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
            <View style={S.bodyFlex}>
              {photoUrls.length > 0 ? (
                <View style={S.photoWrap}>
                  <FlatList
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    data={photoUrls}
                    keyExtractor={(_, i) => `photo-${i}`}
                    onMomentumScrollEnd={(e) => {
                      const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
                      setPhotoIndex(idx);
                    }}
                    renderItem={({ item }) => (
                      <Image source={{ uri: item }} style={{ width: SCREEN_W, height: PHOTO_HEIGHT }} resizeMode="cover" />
                    )}
                  />
                  {photoUrls.length > 1 ? (
                    <View style={S.photoDots}>
                      {photoUrls.map((_, i) => (
                        <View
                          key={i}
                          style={[
                            S.photoDot,
                            { backgroundColor: i === photoIndex ? '#fff' : 'rgba(255,255,255,0.4)' },
                          ]}
                        />
                      ))}
                    </View>
                  ) : null}
                  <LinearGradient
                    colors={['transparent', isLight ? 'rgba(255,255,255,0.85)' : 'rgba(15,17,24,0.85)']}
                    style={S.photoGradient}
                  />
                </View>
              ) : null}

              <TouchableOpacity style={[S.closeBtn, { backgroundColor: surface }]} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
                <Ionicons name="close" size={18} color={text2} />
              </TouchableOpacity>

              <ScrollView
                style={S.scrollFlex}
                showsVerticalScrollIndicator
                bounces
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{
                  paddingBottom: insets.bottom + SCROLL_BOTTOM_PAD_EXTRA,
                }}
              >
                <View style={S.header}>
                  <Text style={[S.placeName, { color: text1 }]} numberOfLines={2}>{place.name}</Text>

                  <View style={S.metaRow}>
                    {place.rating != null ? (
                      <>
                        <Text style={[S.ratingNum, { color: text1 }]}>{place.rating.toFixed(1)}</Text>
                        <StarRating rating={place.rating} size={14} />
                        {place.total_reviews != null ? (
                          <Text style={[S.reviewCount, { color: text3 }]}>({place.total_reviews.toLocaleString()})</Text>
                        ) : null}
                      </>
                    ) : null}
                    {category ? (
                      <View style={[S.categoryBadge, { backgroundColor: surface, borderColor: border }]}>
                        <Text style={[S.categoryText, { color: text2 }]}>{category}</Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={S.statusRow}>
                    {place.open_now != null ? (
                      <Text style={[S.openStatus, { color: place.open_now ? green : '#EF4444' }]}>
                        {place.open_now ? 'Open' : 'Closed'}
                      </Text>
                    ) : null}
                    {place.price_level ? (
                      <Text style={[S.priceLevel, { color: text3 }]}> · {priceLabel(place.price_level)}</Text>
                    ) : null}
                    {distMeters != null ? (
                      <Text style={[S.distText, { color: text3 }]}> · {formatDistanceMeters(distMeters)}</Text>
                    ) : null}
                  </View>

                  {place.address ? <Text style={[S.address, { color: text2 }]}>{place.address}</Text> : null}
                  {place.editorial_summary ? (
                    <Text style={[S.summary, { color: text2 }]}>{place.editorial_summary}</Text>
                  ) : null}
                </View>

                <View style={S.actionsRow}>
                  <TouchableOpacity style={[S.actionBtn, S.actionPrimary]} onPress={handleDirections} activeOpacity={0.85}>
                    <Ionicons name="navigate" size={18} color="#fff" />
                    <Text style={S.actionPrimaryText}>
                      {routeSummary?.durationText ?? (distMeters != null ? estimateDriveTime(distMeters) : 'Directions')}
                    </Text>
                  </TouchableOpacity>

                  {place.phone ? (
                    <TouchableOpacity style={[S.actionBtn, { backgroundColor: surface, borderColor: border }]} onPress={handleCall}>
                      <Ionicons name="call-outline" size={18} color={accent} />
                      <Text style={[S.actionText, { color: text1 }]}>Call</Text>
                    </TouchableOpacity>
                  ) : null}

                  {place.website ? (
                    <TouchableOpacity style={[S.actionBtn, { backgroundColor: surface, borderColor: border }]} onPress={handleWeb}>
                      <Ionicons name="globe-outline" size={18} color={accent} />
                      <Text style={[S.actionText, { color: text1 }]}>Website</Text>
                    </TouchableOpacity>
                  ) : null}

                  {showOrder ? (
                    <TouchableOpacity style={[S.actionBtn, { backgroundColor: surface, borderColor: border }]} onPress={handleOrder}>
                      <Ionicons name="bag-outline" size={18} color={accent} />
                      <Text style={[S.actionText, { color: text1 }]}>Order</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                <View style={[S.quickStats, { backgroundColor: surface, borderColor: border }]}>
                  {place.open_now != null ? (
                    <View style={S.qsItem}>
                      <Text style={[S.qsLabel, { color: text3 }]}>Hours</Text>
                      <Text style={[S.qsValue, { color: place.open_now ? green : '#EF4444' }]}>
                        {place.open_now ? 'Open' : 'Closed'}
                      </Text>
                      {todayHours(weekdayLines ?? undefined) ? (
                        <Text style={[S.qsDetail, { color: text3 }]} numberOfLines={2}>
                          {todayHours(weekdayLines ?? undefined)}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}
                  {place.rating != null ? (
                    <View style={S.qsItem}>
                      <Text style={[S.qsLabel, { color: text3 }]}>{place.total_reviews ?? 0} ratings</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="star" size={14} color={green} />
                        <Text style={[S.qsValue, { color: text1 }]}>{Math.round((place.rating / 5) * 100)}%</Text>
                      </View>
                    </View>
                  ) : null}
                    {routeSummary?.distanceText || distMeters != null ? (
                    <View style={S.qsItem}>
                      <Text style={[S.qsLabel, { color: text3 }]}>Distance</Text>
                        <Text style={[S.qsValue, { color: text1 }]}>{routeSummary?.distanceText ?? formatDistanceMeters(distMeters!)}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="walk" size={12} color={text3} />
                          <Text style={[S.qsDetail, { color: text3 }]}>{estimateWalkTime(distMeters ?? 0)}</Text>
                      </View>
                    </View>
                  ) : null}
                  {routeSummary ? (
                    <View style={S.qsItem}>
                      <Text style={[S.qsLabel, { color: text3 }]}>Arrive</Text>
                      <Text style={[S.qsValue, { color: text1 }]}>{routeSummary.arrivalTimeText}</Text>
                      <Text style={[S.qsDetail, { color: text3 }]}>{routeSummary.durationText} drive</Text>
                    </View>
                  ) : null}
                </View>

                {goodToKnow.length > 0 ? (
                  <View style={S.section}>
                    <Text style={[S.sectionTitle, { color: text1 }]}>Good to know</Text>
                    <View style={[S.gtkGrid, { backgroundColor: surface, borderColor: border }]}>
                      {goodToKnow.map((item, i) => (
                        <View
                          key={`${item.label}-${i}`}
                          style={[
                            S.gtkItem,
                            { borderBottomColor: border },
                            i === goodToKnow.length - 1 && { borderBottomWidth: 0 },
                          ]}
                        >
                          <Ionicons name={item.icon} size={18} color={text2} style={{ width: 28 }} />
                          <Text style={[S.gtkLabel, { color: text1 }]}>{item.label}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}

                {weekdayLines && weekdayLines.length > 0 ? (
                  <View style={S.section}>
                    <View style={S.sectionHeader}>
                      <Text style={[S.sectionTitle, { color: text1 }]}>Hours</Text>
                      <TouchableOpacity onPress={() => setShowAllHours(!showAllHours)} hitSlop={8}>
                        <Text style={[S.sectionAction, { color: accent }]}>{showAllHours ? 'Less' : 'Show all'}</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={[S.hoursCard, { backgroundColor: surface, borderColor: border }]}>
                      <View style={S.hoursTodayRow}>
                        <Text
                          style={[
                            S.hoursTodayLabel,
                            {
                              color:
                                place.open_now == null ? text3 : place.open_now ? green : '#EF4444',
                            },
                          ]}
                        >
                          {place.open_now == null ? '—' : place.open_now ? 'Open' : 'Closed'}
                        </Text>
                        <Text style={[S.hoursTodayTime, { color: text1 }]} numberOfLines={2}>
                          {todayHours(weekdayLines) ?? '—'}
                        </Text>
                      </View>

                      {showAllHours ? (
                        <View style={{ marginTop: 8 }}>
                          {weekdayLines.map((line, i) => {
                            const dayIndex = new Date().getDay();
                            const jsToGoogleDay = dayIndex === 0 ? 6 : dayIndex - 1;
                            const isToday = i === jsToGoogleDay;
                            const parts = line.split(': ');
                            return (
                              <View
                                key={i}
                                style={[
                                  S.hoursLine,
                                  isToday && { backgroundColor: isLight ? '#EFF6FF' : '#172554' },
                                ]}
                              >
                                <Text style={[S.hourDay, { color: isToday ? accent : text2 }]}>{parts[0]}</Text>
                                <Text style={[S.hourTime, { color: isToday ? text1 : text2 }]}>{parts[1] ?? '—'}</Text>
                              </View>
                            );
                          })}
                        </View>
                      ) : null}
                    </View>
                  </View>
                ) : null}

                <View style={S.section}>
                  <Text style={[S.sectionTitle, { color: text1 }]}>Details</Text>
                  <View style={[S.detailsCard, { backgroundColor: surface, borderColor: border }]}>
                    {place.phone ? (
                      <TouchableOpacity style={[S.detailRow, { borderBottomColor: border }]} onPress={handleCall}>
                        <Text style={[S.detailLabel, { color: text3 }]}>Phone</Text>
                        <Text style={[S.detailValue, { color: accent }]}>{place.phone}</Text>
                      </TouchableOpacity>
                    ) : null}
                    {place.website ? (
                      <TouchableOpacity style={[S.detailRow, { borderBottomColor: border }]} onPress={handleWeb}>
                        <Text style={[S.detailLabel, { color: text3 }]}>Website</Text>
                        <Text style={[S.detailValue, { color: accent }]} numberOfLines={1}>
                          {place.website.replace(/^https?:\/\/(www\.)?/, '')}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                    {place.address ? (
                      <View style={[S.detailRow, !place.phone && !place.website ? {} : { borderBottomWidth: 0 }]}>
                        <Text style={[S.detailLabel, { color: text3 }]}>Address</Text>
                        <Text style={[S.detailValue, { color: text1 }]}>{place.address}</Text>
                      </View>
                    ) : (!place.phone && !place.website ? (
                      <Text style={[S.detailValue, { color: text3, padding: 16 }]}>No extra details</Text>
                    ) : null)}
                  </View>
                </View>

                {place.reviews && place.reviews.length > 0 ? (
                  <View style={S.section}>
                    <View style={S.sectionHeader}>
                      <Text style={[S.sectionTitle, { color: text1 }]}>
                        Reviews ({place.total_reviews ?? place.reviews.length})
                      </Text>
                      {place.rating != null ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Text style={[S.reviewAvg, { color: text1 }]}>{place.rating.toFixed(1)}</Text>
                          <StarRating rating={place.rating} size={14} />
                        </View>
                      ) : null}
                    </View>

                    {(showAllReviews ? place.reviews : place.reviews.slice(0, 3)).map((review, i) => (
                      <View key={i} style={[S.reviewCard, { backgroundColor: surface, borderColor: border }]}>
                        <View style={S.reviewHeader}>
                          {review.profile_photo ? (
                            <Image source={{ uri: review.profile_photo }} style={S.reviewAvatar} />
                          ) : (
                            <View style={[S.reviewAvatarFallback, { backgroundColor: border }]}>
                              <Text style={[S.reviewAvatarLetter, { color: text2 }]}>
                                {review.author_name.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                          )}
                          <View style={{ flex: 1 }}>
                            <Text style={[S.reviewAuthor, { color: text1 }]} numberOfLines={1}>{review.author_name}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                              <StarRating rating={review.rating} size={12} />
                              <Text style={[S.reviewTime, { color: text3 }]}>{review.time}</Text>
                            </View>
                          </View>
                        </View>
                        {review.text ? (
                          <Text
                            style={[S.reviewText, { color: text2 }]}
                            numberOfLines={showAllReviews ? undefined : 4}
                          >
                            {review.text}
                          </Text>
                        ) : null}
                      </View>
                    ))}

                    {place.reviews.length > 3 ? (
                      <TouchableOpacity
                        style={[S.showMoreBtn, { borderColor: border }]}
                        onPress={() => setShowAllReviews(!showAllReviews)}
                      >
                        <Text style={[S.showMoreText, { color: accent }]}>
                          {showAllReviews ? 'Show less' : `Show all ${place.reviews.length} reviews`}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ) : null}

                <View style={S.bottomActions}>
                  {onSave ? (
                    <TouchableOpacity
                      style={[S.bottomBtn, { backgroundColor: surface, borderColor: saved ? '#FECACA' : border }]}
                      onPress={handleFavorite}
                    >
                      <Ionicons name={saved ? 'heart' : 'heart-outline'} size={18} color={saved ? '#EF4444' : text2} />
                      <Text style={[S.bottomBtnText, { color: saved ? '#EF4444' : text1 }]}>
                        {saved ? 'Favorites' : 'Add to Favorites'}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity
                    style={[S.bottomBtn, { backgroundColor: surface, borderColor: border }]}
                    onPress={handleShare}
                  >
                    <Ionicons name="share-outline" size={18} color={text2} />
                    <Text style={[S.bottomBtnText, { color: text1 }]}>Share</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
            <View style={[S.stickyBottom, { paddingBottom: Math.max(insets.bottom, 8), backgroundColor: bg, borderTopColor: border }]}>
              <TouchableOpacity style={S.directionsBtn} onPress={handleDirections} activeOpacity={0.85}>
                <LinearGradient colors={['#2563EB', '#1D4ED8']} style={S.directionsBtnGrad}>
                  <Ionicons name="navigate" size={18} color="#fff" />
                  <Text style={S.directionsBtnText}>Directions</Text>
                  {distMeters != null ? (
                    <Text style={S.directionsBtnDist}>· {formatDistanceMeters(distMeters)}</Text>
                  ) : null}
                </LinearGradient>
              </TouchableOpacity>
            </View>
            </>
          )}
      </Animated.View>
    </View>
  );
}

const S = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000' },
  bodyFlex: { flex: 1, minHeight: 0 },
  scrollFlex: { flex: 1, minHeight: 0 },
  container: {
    position: 'absolute', left: 0, right: 0, top: 0, height: SCREEN_H,
    flexDirection: 'column',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.25, shadowRadius: 24 },
      android: { elevation: 20 },
    }),
  },
  sheetDragHeader: {
    paddingTop: 10,
    paddingBottom: 12,
    alignItems: 'center',
    width: '100%',
  },
  handleBar: { width: 40, height: 5, borderRadius: 3, alignSelf: 'center' },
  loadingWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
  loadingText: { fontSize: 14, fontWeight: '500' },

  photoWrap: { position: 'relative' },
  photoDots: { position: 'absolute', bottom: 12, alignSelf: 'center', flexDirection: 'row', gap: 5 },
  photoDot: { width: 6, height: 6, borderRadius: 3 },
  photoGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 48 },

  closeBtn: {
    position: 'absolute', top: 12, right: 16, zIndex: 12,
    width: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },

  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
  placeName: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  ratingNum: { fontSize: 15, fontWeight: '700' },
  reviewCount: { fontSize: 13 },
  categoryBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  categoryText: { fontSize: 12, fontWeight: '600' },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, flexWrap: 'wrap' },
  openStatus: { fontSize: 14, fontWeight: '700' },
  priceLevel: { fontSize: 14 },
  distText: { fontSize: 14 },
  address: { fontSize: 13, marginTop: 6, lineHeight: 18 },
  summary: { fontSize: 13, marginTop: 6, lineHeight: 20, fontStyle: 'italic' },

  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20, marginTop: 12, marginBottom: 8 },
  actionBtn: {
    minWidth: 72,
    flexGrow: 1,
    flexBasis: '22%',
    borderRadius: 14, paddingVertical: 12, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, gap: 4,
  },
  actionPrimary: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  actionPrimaryText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  actionText: { fontSize: 12, fontWeight: '600' },

  quickStats: {
    flexDirection: 'row', marginHorizontal: 20, marginTop: 8, borderRadius: 16,
    borderWidth: 1, overflow: 'hidden',
  },
  qsItem: { flex: 1, alignItems: 'center', paddingVertical: 12, gap: 2, minWidth: 90 },
  qsLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  qsValue: { fontSize: 15, fontWeight: '800', textAlign: 'center' },
  qsDetail: { fontSize: 10, textAlign: 'center' },

  section: { paddingHorizontal: 20, marginTop: 18 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '800' },
  sectionAction: { fontSize: 13, fontWeight: '600' },

  gtkGrid: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  gtkItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, gap: 10, borderBottomWidth: 1 },
  gtkLabel: { fontSize: 14, fontWeight: '500', flex: 1 },

  hoursCard: { borderRadius: 14, borderWidth: 1, padding: 14 },
  hoursTodayRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  hoursTodayLabel: { fontSize: 15, fontWeight: '700' },
  hoursTodayTime: { fontSize: 14, fontWeight: '600', flex: 1, textAlign: 'right' },
  hoursLine: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, paddingHorizontal: 6, borderRadius: 6 },
  hourDay: { fontSize: 13, fontWeight: '600' },
  hourTime: { fontSize: 13, flex: 1, textAlign: 'right' },

  detailsCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1 },
  detailLabel: { fontSize: 13, fontWeight: '500' },
  detailValue: { fontSize: 14, fontWeight: '600', textAlign: 'right', flex: 1, marginLeft: 16 },

  reviewAvg: { fontSize: 16, fontWeight: '800' },
  reviewCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 8 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  reviewAvatar: { width: 36, height: 36, borderRadius: 18 },
  reviewAvatarFallback: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  reviewAvatarLetter: { fontSize: 16, fontWeight: '700' },
  reviewAuthor: { fontSize: 14, fontWeight: '700' },
  reviewTime: { fontSize: 11 },
  reviewText: { fontSize: 13, lineHeight: 20 },
  fuelNote: { fontSize: 13, lineHeight: 20, padding: 16 },
  showMoreBtn: { borderRadius: 12, borderWidth: 1, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  showMoreText: { fontSize: 13, fontWeight: '700' },

  bottomActions: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginTop: 16 },
  bottomBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 14, borderWidth: 1, paddingVertical: 12 },
  bottomBtnText: { fontSize: 14, fontWeight: '600' },

  stickyBottom: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    paddingHorizontal: 20, paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  directionsBtn: { borderRadius: 16, overflow: 'hidden' },
  directionsBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 15,
  },
  directionsBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  directionsBtnDist: { color: 'rgba(255,255,255,0.75)', fontSize: 14, fontWeight: '600' },
});

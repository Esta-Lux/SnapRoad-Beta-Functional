import React from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Modal from '../common/Modal';
import { haversineMeters } from '../../utils/distance';
import { API_BASE_URL } from '../../api/client';

export type ExplorePlaceRow = {
  name: string;
  address: string;
  lat: number;
  lng: number;
  place_id?: string;
  rating?: number;
  placeType?: string;
  photo_reference?: string;
  open_now?: boolean | null;
  price_level?: number | null;
  /** Lowest nearby regular (/gal hint) matched from `/api/fuel/prices`; gas stations only. */
  gasRegularDisplay?: string | null;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  loading: boolean;
  error: string | null;
  results: ExplorePlaceRow[];
  onPick: (row: ExplorePlaceRow) => void;
  userLat: number;
  userLng: number;
  colors: {
    surface: string;
    surfaceSecondary?: string;
    text: string;
    textSecondary: string;
    textTertiary: string;
    border: string;
    primary: string;
    /** Gradient endpoints for the premium hero. Optional — falls back to primary alone. */
    rewardsGradientStart?: string;
    rewardsGradientEnd?: string;
  };
};

function formatDist(lat: number, lng: number, ulat: number, ulng: number): string {
  if (!lat || !lng || (!ulat && !ulng)) return '';
  const m = haversineMeters(ulat, ulng, lat, lng);
  if (m < 160) return `${Math.round(m * 3.281)} ft`;
  return `${(m / 1609.344).toFixed(1)} mi`;
}

function thumbUri(ref?: string): string | undefined {
  if (!ref || !API_BASE_URL) return undefined;
  return `${API_BASE_URL}/api/places/photo?ref=${encodeURIComponent(ref)}&maxwidth=128`;
}

function priceDots(level?: number | null): string | null {
  if (level == null || typeof level !== 'number') return null;
  const n = Math.min(Math.max(Math.round(level), 0), 4);
  if (n <= 0) return null;
  return ''.padEnd(n, '$');
}

function placeIcon(placeType?: string): keyof typeof Ionicons.glyphMap {
  const t = (placeType || '').toLowerCase();
  if (t.includes('gas')) return 'flash-outline';
  if (t.includes('restaurant') || t.includes('food') || t.includes('cafe')) return 'restaurant-outline';
  if (t.includes('grocery') || t.includes('supermarket')) return 'cart-outline';
  if (t.includes('parking')) return 'car-outline';
  if (t.includes('charger') || t.includes('electric')) return 'battery-charging-outline';
  return 'location-outline';
}

export default function MapCategoryExploreSheet({
  visible,
  onClose,
  title,
  subtitle,
  loading,
  error,
  results,
  onPick,
  userLat,
  userLng,
  colors,
}: Props) {
  const heroStart = colors.rewardsGradientStart ?? colors.primary;
  const heroEnd = colors.rewardsGradientEnd ?? colors.primary;
  const surfaceBg = colors.surfaceSecondary ?? colors.surface;
  return (
    <Modal visible={visible} onClose={onClose} scrollable={false}>
      <LinearGradient
        colors={[heroStart, heroEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Text style={styles.heroTitle}>{title}</Text>
        {subtitle ? <Text style={styles.heroSub}>{subtitle}</Text> : null}
        <View style={styles.heroBadges}>
          {!loading ? (
            <View style={styles.heroBadge}>
              <Ionicons name="location" size={11} color="#fff" />
              <Text style={styles.heroBadgeText}>{results.length} places</Text>
            </View>
          ) : null}
        </View>
      </LinearGradient>
      {error ? (
        <View style={[styles.banner, { borderColor: 'rgba(239,68,68,0.4)', backgroundColor: 'rgba(239,68,68,0.12)' }]}>
          <Ionicons name="warning-outline" size={18} color="#F87171" />
          <Text style={styles.bannerText}>{error}</Text>
        </View>
      ) : null}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.hint, { color: colors.textTertiary }]}>Loading places…</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item, i) => `${item.place_id || item.name}-${i}`}
          style={{ maxHeight: 420 }}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            !error ? (
              <Text style={[styles.empty, { color: colors.textTertiary }]}>No places found. Try again or move on the map.</Text>
            ) : null
          }
          renderItem={({ item, index }) => {
            const dist = formatDist(item.lat, item.lng, userLat, userLng);
            const uri = thumbUri(item.photo_reference);
            const openLabel =
              item.open_now === true ? 'Open now' : item.open_now === false ? 'Likely closed' : null;
            const price = priceDots(item.price_level);
            const icon = placeIcon(item.placeType);
            const isGas = (item.placeType || '').toLowerCase().includes('gas');
            return (
              <CategoryRow
                item={item}
                index={index}
                colors={colors}
                surfaceBg={surfaceBg}
                onPress={() => onPick(item)}
                dist={dist}
                uri={uri}
                openLabel={openLabel}
                price={price}
                icon={icon}
                isGas={isGas}
              />
            );
          }}
        />
      )}
    </Modal>
  );
}

function CategoryRow({
  item,
  index,
  colors,
  surfaceBg,
  onPress,
  dist,
  uri,
  openLabel,
  price,
  icon,
  isGas,
}: {
  item: ExplorePlaceRow;
  index: number;
  colors: Props['colors'];
  surfaceBg: string;
  onPress: () => void;
  dist: string;
  uri: string | undefined;
  openLabel: string | null;
  price: string | null;
  icon: keyof typeof Ionicons.glyphMap;
  isGas: boolean;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View entering={FadeIn.duration(180).delay(Math.min(index * 30, 180))} style={animStyle}>
      <Pressable
        style={[styles.row, { borderBottomColor: colors.border }]}
        onPressIn={() => {
          scale.value = withSpring(0.98, { damping: 18, stiffness: 320 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 16, stiffness: 240 });
        }}
        onPress={onPress}
      >
        <View style={[styles.iconWrap, { backgroundColor: surfaceBg }]}>
          {uri ? (
            <Image source={{ uri }} style={styles.thumb} resizeMode="cover" />
          ) : (
            <Ionicons name={icon} size={18} color={colors.primary} />
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.addr, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.address}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
            {typeof item.rating === 'number' ? (
              <View style={styles.metaPill}>
                <Ionicons name="star" size={10} color="#FBBF24" />
                <Text style={[styles.meta, { color: colors.textSecondary }]}>{item.rating.toFixed(1)}</Text>
              </View>
            ) : null}
            {dist ? (
              <View style={styles.metaPill}>
                <Ionicons name="navigate-outline" size={10} color={colors.textTertiary} />
                <Text style={[styles.meta, { color: colors.textTertiary }]}>{dist}</Text>
              </View>
            ) : null}
            {openLabel ? (
              <Text
                style={[
                  styles.meta,
                  { color: item.open_now === true ? '#22C55E' : colors.textTertiary },
                ]}
              >
                {openLabel}
              </Text>
            ) : null}
            {price ? (
              <Text style={[styles.meta, { color: colors.textSecondary }]}>{price}</Text>
            ) : null}
            {isGas && item.gasRegularDisplay ? (
              <Text style={[styles.meta, { color: colors.primary, fontWeight: '700' }]}>
                {item.gasRegularDisplay}
              </Text>
            ) : null}
            {isGas ? (
              <Text
                style={[styles.meta, { color: colors.textTertiary, flexBasis: '100%', marginTop: 2 }]}
                numberOfLines={2}
              >
                Pump prices can change quickly - verify at station
              </Text>
            ) : null}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 18,
    marginBottom: 14,
  },
  heroTitle: { color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  heroSub: { color: 'rgba(255,255,255,0.86)', fontSize: 13, lineHeight: 18, marginTop: 6 },
  heroBadges: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  heroBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  bannerText: { flex: 1, color: '#FCA5A5', fontSize: 13, lineHeight: 18 },
  centered: { paddingVertical: 32, alignItems: 'center', gap: 10 },
  hint: { fontSize: 13 },
  empty: { textAlign: 'center', paddingVertical: 24, fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  thumb: { width: 40, height: 40, borderRadius: 12 },
  name: { fontSize: 16, fontWeight: '700' },
  addr: { fontSize: 13, marginTop: 2 },
  metaPill: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  meta: { fontSize: 11, fontWeight: '600' },
});

import React from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  business_status?: string;
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
    text: string;
    textSecondary: string;
    textTertiary: string;
    border: string;
    primary: string;
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
  return (
    <Modal visible={visible} onClose={onClose} scrollable={false}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.sub, { color: colors.textSecondary }]}>{subtitle}</Text>
      ) : null}
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
          renderItem={({ item }) => {
            const dist = formatDist(item.lat, item.lng, userLat, userLng);
            const uri = thumbUri(item.photo_reference);
            const openLabel =
              item.open_now === true ? 'Open now' : item.open_now === false ? 'Likely closed' : null;
            const price = priceDots(item.price_level);
            const icon = placeIcon(item.placeType);
            const isGas = (item.placeType || '').toLowerCase().includes('gas');
            return (
              <TouchableOpacity
                style={[styles.row, { borderBottomColor: colors.border }]}
                onPress={() => onPick(item)}
                activeOpacity={0.75}
              >
                <View style={[styles.iconWrap, { backgroundColor: colors.surface }]}>
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
                      <Text style={[styles.meta, { color: colors.textTertiary }]}>
                        <Ionicons name="star" size={11} color="#FBBF24" /> {item.rating.toFixed(1)}
                      </Text>
                    ) : null}
                    {dist ? <Text style={[styles.meta, { color: colors.textTertiary }]}>{dist}</Text> : null}
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
                    {isGas ? (
                      <Text style={[styles.meta, { color: colors.textTertiary, flexBasis: '100%', marginTop: 2 }]} numberOfLines={2}>
                        $/gal not listed — verify at pump
                      </Text>
                    ) : null}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            );
          }}
        />
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 6 },
  sub: { fontSize: 12, textAlign: 'center', lineHeight: 16, marginBottom: 12 },
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
  meta: { fontSize: 11, fontWeight: '600' },
});

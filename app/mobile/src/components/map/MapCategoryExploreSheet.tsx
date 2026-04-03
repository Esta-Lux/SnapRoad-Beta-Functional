import React from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Modal from '../common/Modal';
import { haversineMeters } from '../../utils/distance';

export type ExplorePlaceRow = {
  name: string;
  address: string;
  lat: number;
  lng: number;
  place_id?: string;
  rating?: number;
  placeType?: string;
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
    <Modal visible={visible} onClose={onClose}>
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
            return (
              <TouchableOpacity
                style={[styles.row, { borderBottomColor: colors.border }]}
                onPress={() => onPick(item)}
                activeOpacity={0.75}
              >
                <View style={[styles.iconWrap, { backgroundColor: colors.surface }]}>
                  <Ionicons name="location-outline" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[styles.addr, { color: colors.textSecondary }]} numberOfLines={1}>
                    {item.address}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                    {typeof item.rating === 'number' ? (
                      <Text style={[styles.meta, { color: colors.textTertiary }]}>
                        <Ionicons name="star" size={11} color="#FBBF24" /> {item.rating.toFixed(1)}
                      </Text>
                    ) : null}
                    {dist ? <Text style={[styles.meta, { color: colors.textTertiary }]}>{dist}</Text> : null}
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
  iconWrap: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: '700' },
  addr: { fontSize: 13, marginTop: 2 },
  meta: { fontSize: 11, fontWeight: '600' },
});

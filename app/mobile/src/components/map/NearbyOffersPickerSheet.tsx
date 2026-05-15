import React, { useMemo, useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Pressable,
  StyleSheet,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import type { Offer } from '../../types';
import { haversineMeters } from '../../utils/distance';
import { displayOfferCategory, offerCategoryFilter, uniqueOfferCategoryFilters } from '../../lib/offerCategories';
import { offerHeroUri } from '../../lib/offerHeroImage';

type Props = {
  visible: boolean;
  offers: Offer[];
  userLat: number;
  userLng: number;
  onClose: () => void;
  onSelectOffer: (offer: Offer) => void;
};

export default function NearbyOffersPickerSheet({
  visible,
  offers,
  userLat,
  userLng,
  onClose,
  onSelectOffer,
}: Props) {
  const insets = useSafeAreaInsets();
  const { colors, isLight } = useTheme();

  const sorted = useMemo(() => {
    const valid = offers.filter((o) => Number.isFinite(o.lat) && Number.isFinite(o.lng));
    return [...valid].sort(
      (a, b) =>
        haversineMeters(userLat, userLng, a.lat ?? 0, a.lng ?? 0) -
        haversineMeters(userLat, userLng, b.lat ?? 0, b.lng ?? 0),
    );
  }, [offers, userLat, userLng]);

  const categoryFilters = useMemo(() => uniqueOfferCategoryFilters(sorted), [sorted]);
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) setSelectedCategoryKey(null);
  }, [visible]);

  const listData = useMemo(() => {
    if (!selectedCategoryKey) return sorted;
    return sorted.filter((o) => offerCategoryFilter(o).key === selectedCategoryKey);
  }, [sorted, selectedCategoryKey]);

  const cardBg = colors.card;
  const border = colors.border;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              paddingBottom: 16 + insets.bottom,
              backgroundColor: cardBg,
              borderColor: border,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.handleRow}>
            <View style={[styles.grab, { backgroundColor: isLight ? 'rgba(0,0,0,0.14)' : 'rgba(255,255,255,0.18)' }]} />
          </View>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Offers nearby</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12} accessibilityLabel="Close">
              <Ionicons name="close" size={26} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.sub, { color: colors.textSecondary }]}>
            {sorted.length === 0
              ? 'No partner offers within about 20 miles — zoom closer or check back after you move.'
              : `${sorted.length} partner ${sorted.length === 1 ? 'offer' : 'offers'} within ~20 miles — closest first.`}
          </Text>
          {categoryFilters.length > 1 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipScroll}
              contentContainerStyle={styles.chipRow}
              keyboardShouldPersistTaps="handled"
            >
              <TouchableOpacity
                onPress={() => setSelectedCategoryKey(null)}
                style={[
                  styles.chip,
                  {
                    borderColor: selectedCategoryKey === null ? colors.primary : border,
                    backgroundColor: selectedCategoryKey === null ? `${colors.primary}14` : colors.surfaceSecondary,
                  },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: selectedCategoryKey === null }}
              >
                <Text
                  style={[
                    styles.chipLabel,
                    { color: selectedCategoryKey === null ? colors.primary : colors.textSecondary },
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>
              {categoryFilters.map((f) => {
                const on = selectedCategoryKey === f.key;
                return (
                  <TouchableOpacity
                    key={f.key}
                    onPress={() => setSelectedCategoryKey(f.key)}
                    style={[
                      styles.chip,
                      {
                        borderColor: on ? colors.primary : border,
                        backgroundColor: on ? `${colors.primary}14` : colors.surfaceSecondary,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                  >
                    <Text style={[styles.chipLabel, { color: on ? colors.primary : colors.text }]}>{f.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : null}
          <FlatList
            data={listData}
            keyExtractor={(item) => String(item.id)}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cardTrack}
            style={styles.offerRail}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              listData.length === 0 && sorted.length > 0 ? (
                <Text style={[styles.emptyFilter, { color: colors.textSecondary }]}>
                  No offers in this category — try another filter or All.
                </Text>
              ) : null
            }
            renderItem={({ item: o }) => {
              const dM = haversineMeters(userLat, userLng, o.lat ?? 0, o.lng ?? 0);
              const mi = dM / 1609.34;
              const distLabel = mi < 0.1 ? '< 0.1 mi' : `${mi.toFixed(1)} mi`;
              const gemCost = Number(o.gem_cost ?? o.gems_reward ?? 0);
              const heroUri = offerHeroUri(o);
              return (
                <TouchableOpacity
                  style={[styles.offerCard, { borderColor: border, backgroundColor: colors.surfaceSecondary }]}
                  onPress={() => {
                    onSelectOffer(o);
                    onClose();
                  }}
                  activeOpacity={0.85}
                >
                  <View style={[styles.heroWrap, { borderColor: border, backgroundColor: cardBg }]}>
                    {heroUri ? (
                      <Image source={{ uri: heroUri }} style={styles.heroImage} resizeMode="cover" />
                    ) : (
                      <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}14` }]}>
                        <Ionicons name="pricetag-outline" size={24} color={colors.primary} />
                      </View>
                    )}
                    <View style={[styles.distancePill, { backgroundColor: isLight ? 'rgba(255,255,255,0.92)' : 'rgba(2,6,23,0.82)' }]}>
                      <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
                      <Text style={[styles.distText, { color: colors.textSecondary }]}>{distLabel}</Text>
                    </View>
                  </View>
                  <View style={styles.cardBody}>
                    <View style={styles.metaRow}>
                      <Text style={[styles.meta, { color: colors.primary }]} numberOfLines={1}>
                        {displayOfferCategory(o)}
                      </Text>
                      {gemCost > 0 ? (
                        <Text style={[styles.gemPill, { color: colors.textSecondary, backgroundColor: `${colors.textSecondary}10` }]}>
                          {gemCost} gems
                        </Text>
                      ) : null}
                    </View>
                    <Text style={[styles.biz, { color: colors.text }]} numberOfLines={1}>
                      {o.business_name || o.title || 'Partner offer'}
                    </Text>
                    <Text style={[styles.headline, { color: colors.textSecondary }]} numberOfLines={2}>
                      {o.title && o.title !== o.business_name ? o.title : o.description || 'Tap for redemption details'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      },
      android: { elevation: 10 },
      default: {},
    }),
  },
  handleRow: { alignItems: 'center', paddingVertical: 6 },
  grab: { width: 40, height: 4, borderRadius: 2 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  title: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  sub: { fontSize: 12, fontWeight: '600', marginBottom: 10, lineHeight: 17 },
  chipScroll: { marginBottom: 12, marginHorizontal: -4 },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4, paddingBottom: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipLabel: { fontSize: 13, fontWeight: '700', letterSpacing: -0.2 },
  emptyFilter: { fontSize: 13, fontWeight: '600', textAlign: 'center', paddingVertical: 20, lineHeight: 18 },
  offerRail: {
    marginHorizontal: -14,
  },
  cardTrack: {
    gap: 12,
    paddingHorizontal: 14,
    paddingBottom: 2,
  },
  offerCard: {
    width: 224,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  heroWrap: {
    height: 112,
    borderBottomWidth: 1,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  iconWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  distancePill: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardBody: { padding: 12, minHeight: 116 },
  biz: { fontSize: 15, fontWeight: '800' },
  headline: { fontSize: 12, marginTop: 3, lineHeight: 16, fontWeight: '600' },
  distText: { fontSize: 11, fontWeight: '800', letterSpacing: -0.2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 },
  meta: { flex: 1, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.3 },
  gemPill: { overflow: 'hidden', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, fontSize: 10, fontWeight: '900' },
});

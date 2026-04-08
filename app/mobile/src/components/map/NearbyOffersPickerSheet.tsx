import React, { useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import type { Offer } from '../../types';
import { haversineMeters } from '../../utils/distance';
import { displayOfferCategory } from '../../lib/offerCategories';

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
              : `${sorted.length} partner ${sorted.length === 1 ? 'offer' : 'offers'} within ~20 miles — tap for details.`}
          </Text>
          <FlatList
            data={sorted}
            keyExtractor={(item) => String(item.id)}
            style={{ maxHeight: 360 }}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item: o }) => {
              const dM = haversineMeters(userLat, userLng, o.lat ?? 0, o.lng ?? 0);
              const mi = dM / 1609.34;
              const distLabel = mi < 0.1 ? '< 0.1 mi' : `${mi.toFixed(1)} mi`;
              const gemCost = Number(o.gem_cost ?? o.gems_reward ?? 0);
              return (
                <TouchableOpacity
                  style={[styles.row, { borderColor: border }]}
                  onPress={() => {
                    onSelectOffer(o);
                    onClose();
                  }}
                  activeOpacity={0.82}
                >
                  <View style={[styles.iconWrap, { backgroundColor: `${colors.warning}22` }]}>
                    <Ionicons name="diamond-outline" size={22} color={colors.warning} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.biz, { color: colors.text }]} numberOfLines={1}>
                      {o.business_name || o.title || 'Partner offer'}
                    </Text>
                    {o.title && o.title !== o.business_name ? (
                      <Text style={[styles.headline, { color: colors.textSecondary }]} numberOfLines={2}>
                        {o.title}
                      </Text>
                    ) : null}
                    <View style={styles.metaRow}>
                      <Text style={[styles.meta, { color: colors.textSecondary }]}>{displayOfferCategory(o)}</Text>
                      <Text style={[styles.meta, { color: colors.textSecondary }]}> · {distLabel}</Text>
                      {gemCost > 0 ? (
                        <Text style={[styles.meta, { color: colors.warning, fontWeight: '800' }]}> · {gemCost} gems</Text>
                      ) : null}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
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
    paddingHorizontal: 16,
    paddingTop: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      android: { elevation: 16 },
      default: {},
    }),
  },
  handleRow: { alignItems: 'center', paddingVertical: 6 },
  grab: { width: 40, height: 4, borderRadius: 2 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  title: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  sub: { fontSize: 12, fontWeight: '600', marginBottom: 14, lineHeight: 17 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  biz: { fontSize: 15, fontWeight: '800' },
  headline: { fontSize: 12, marginTop: 3, lineHeight: 16, fontWeight: '600' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6, alignItems: 'center' },
  meta: { fontSize: 11, fontWeight: '700' },
});

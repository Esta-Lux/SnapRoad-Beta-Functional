import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Dimensions, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  SlideInDown, SlideOutDown,
  useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  name: string;
  address?: string;
  category?: string;
  maki?: string;
  distanceMeters?: number;
  onDirections: () => void;
  /** Favorites: heart toggle (preferred over onSave). */
  isFavorite?: boolean;
  onToggleFavorite?: () => void | Promise<void>;
  /** @deprecated use onToggleFavorite + isFavorite */
  onSave?: () => void;
  onDismiss: () => void;
  isLight?: boolean;
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

export default function PlaceCard({
  name,
  address,
  category,
  maki,
  distanceMeters,
  onDirections,
  isFavorite = false,
  onToggleFavorite,
  onSave,
  onDismiss,
  isLight = false,
}: Props) {
  const insets = useSafeAreaInsets();
  const bg = isLight ? '#ffffff' : '#111827';
  const nameColor = isLight ? '#111827' : '#f8fafc';
  const addrColor = isLight ? '#64748b' : '#94a3b8';
  const metaColor = isLight ? '#475569' : '#94a3b8';
  const borderColor = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)';
  const chipBg = isLight ? '#f1f5f9' : 'rgba(255,255,255,0.06)';
  const chipText = isLight ? '#334155' : '#cbd5e1';
  const iconBg = isLight ? '#eff6ff' : 'rgba(59,130,246,0.15)';
  const dist = formatDist(distanceMeters);
  const catLabel = categoryLabel(category);
  const icon = categoryIcon(maki, category);

  const translateY = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) translateY.value = e.translationY;
    })
    .onEnd((e) => {
      if (e.translationY > 80 || e.velocityY > 400) {
        translateY.value = withTiming(300, { duration: 200 }, () => { runOnJS(onDismiss)(); });
      } else {
        translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
      }
    });

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        entering={SlideInDown.duration(280).damping(22).stiffness(240)}
        exiting={SlideOutDown.duration(180)}
        style={[styles.container, { backgroundColor: bg, borderColor, paddingBottom: Math.max(insets.bottom, 20) + 12 }, animStyle]}
      >
        <View style={[styles.handle, { backgroundColor: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.15)' }]} />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          <View style={styles.row}>
            <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
              <Ionicons name={icon} size={20} color="#3B82F6" />
            </View>
            <View style={styles.info}>
              <Text style={[styles.name, { color: nameColor }]} numberOfLines={3}>{name}</Text>
              {address ? <Text style={[styles.address, { color: addrColor }]} numberOfLines={3}>{address}</Text> : null}
              <View style={styles.metaRow}>
                {dist && (
                  <View style={styles.metaChip}>
                    <Ionicons name="navigate-outline" size={11} color={metaColor} />
                    <Text style={[styles.metaText, { color: metaColor }]}>{dist}</Text>
                  </View>
                )}
                {catLabel && (
                  <View style={[styles.catChip, { backgroundColor: chipBg }]}>
                    <Text style={[styles.catText, { color: chipText }]}>{catLabel}</Text>
                  </View>
                )}
              </View>
            </View>
            <TouchableOpacity onPress={onDismiss} style={[styles.closeBtn, { backgroundColor: chipBg }]} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={16} color={addrColor} />
            </TouchableOpacity>
          </View>
        </ScrollView>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.dirBtn} onPress={onDirections} activeOpacity={0.8}>
            <Ionicons name="navigate" size={16} color="#fff" />
            <Text style={styles.dirText}>Directions</Text>
          </TouchableOpacity>
          {(onToggleFavorite || onSave) ? (
            <TouchableOpacity
              style={[styles.saveBtn, { borderColor: isFavorite ? '#EF4444' : borderColor, backgroundColor: isFavorite ? 'rgba(239,68,68,0.12)' : 'rgba(59,130,246,0.08)' }]}
              onPress={() => { void (onToggleFavorite?.() ?? onSave?.()); }}
              activeOpacity={0.8}
            >
              <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={16} color={isFavorite ? '#EF4444' : '#3B82F6'} />
              <Text style={[styles.saveText, { color: isFavorite ? '#EF4444' : '#3B82F6' }]}>
                {isFavorite ? 'Favorites' : 'Add to Favorites'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const PLACE_CARD_MAX_H = Dimensions.get('window').height * 0.52;

const styles = StyleSheet.create({
  container: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12,
    zIndex: 30,
    borderTopWidth: 1,
    maxHeight: PLACE_CARD_MAX_H,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.2, shadowRadius: 20 },
      android: { elevation: 16 },
    }),
  },
  handle: { width: 40, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 14 },
  scroll: { flexGrow: 0, maxHeight: Dimensions.get('window').height * 0.34 },
  scrollContent: { flexGrow: 0 },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  iconCircle: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 12, marginTop: 2 },
  info: { flex: 1 },
  name: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3, lineHeight: 22 },
  address: { fontSize: 13, marginTop: 3, lineHeight: 17 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, fontWeight: '600' },
  catChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  catText: { fontSize: 11, fontWeight: '600' },
  closeBtn: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16, flexShrink: 0 },
  dirBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#3B82F6', borderRadius: 14, paddingVertical: 14,
    ...Platform.select({
      ios: { shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  dirText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  saveBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: 'rgba(59,130,246,0.08)', borderRadius: 14, paddingVertical: 14, borderWidth: 1,
  },
  saveText: { color: '#3B82F6', fontSize: 15, fontWeight: '700' },
});

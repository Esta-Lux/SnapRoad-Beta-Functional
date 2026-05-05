import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOutUp,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { GeocodeResult } from '../../lib/directions';
import { formatRowDistance } from '../../lib/placeSearchRanking';
import { formatOpenLabelForSearchRow } from '../../utils/placeHours';
import type { SavedLocation } from '../../types';

type Chip = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

type SearchPanelTab = 'recent' | 'saved' | 'suggested';

type Props = {
  visible: boolean;
  topInset: number;
  colors: {
    text: string;
    textSecondary: string;
    textTertiary: string;
    surface: string;
    surfaceSecondary: string;
    border: string;
    primary: string;
  };
  styles: Record<string, unknown>;
  showMenu: boolean;
  setShowMenu: (v: boolean) => void;
  searchQuery: string;
  onSearchChange: (v: string) => void;
  isSearchFocused: boolean;
  setIsSearchFocused: (v: boolean) => void;
  onSubmitSearch: () => void;
  onClearSearch: () => void;
  /** When set, shows a compose entry in the search pill. Orion is anchored on the map tool stack instead. */
  onOpenOrion?: () => void;
  activeChip: string;
  onSelectChip: (key: string) => void;
  savedPlaces: SavedLocation[];
  onSelectSavedPlace: (place: SavedLocation) => void;
  isSearching: boolean;
  searchResults: GeocodeResult[];
  recentSearches: GeocodeResult[];
  location: { lat: number; lng: number };
  onSelectResult: (r: GeocodeResult) => void;
  /**
   * Kept for backwards compatibility with existing callers that supplied
   * a haversine util. The component now sources distance via
   * `formatRowDistance` which understands `distance_meters` as a fallback.
   */
  haversineMeters: (lat1: number, lng1: number, lat2: number, lng2: number) => number;
  placePhotoThumbUri: (photoRef?: string, maxWidth?: number) => string | undefined;
  searchResultPriceHint: (item: GeocodeResult) => string | null;
  /** Compact regular price for the Nearby Gas chip (CollectAPI / fuel feed). */
  gasChipAvgRegular?: string | null;
  /** Whether the chip price is from nearby station rows or a state index fallback. */
  gasChipPriceSource?: 'nearby_station' | 'state_index' | null;
  /** Map layers / compass / Orion — rendered under the category chips, right-aligned. */
  floatingMapTools?: React.ReactNode;
  /** Bottom reserve when sizing panel (typically tab bar height). */
  bottomChromeReserve?: number;
};

const CATEGORY_CHIPS: Chip[] = [
  { key: 'favorites', label: 'Favorites', icon: 'star-outline' },
  { key: 'nearbyGas', label: 'Nearby Gas', icon: 'flash-outline' },
  { key: 'food', label: 'Food', icon: 'restaurant-outline' },
  { key: 'coffee', label: 'Coffee', icon: 'cafe-outline' },
  { key: 'parking', label: 'Parking', icon: 'car-outline' },
  { key: 'ev', label: 'EV', icon: 'battery-charging-outline' },
  { key: 'grocery', label: 'Grocery', icon: 'cart-outline' },
];

function renderExploreChip(chip: Chip, props: Props, s: Record<string, any>): React.ReactElement {
  const sel = props.activeChip === chip.key;
  const gasShort = chip.key === 'nearbyGas' ? props.gasChipAvgRegular : null;
  const a11y =
    chip.key === 'nearbyGas' && gasShort
      ? props.gasChipPriceSource === 'nearby_station'
        ? `${chip.label}, regular ${gasShort} per gallon at nearby stations from CollectAPI`
        : props.gasChipPriceSource === 'state_index'
          ? `${chip.label}, statewide average regular about ${gasShort} per gallon from CollectAPI`
          : `${chip.label}, regular about ${gasShort} per gallon; opens nearby stations`
      : chip.label;
  return (
    <TouchableOpacity
      key={chip.key}
      style={[
        s.chip,
        { backgroundColor: sel ? props.colors.primary : props.colors.surface, borderColor: sel ? 'transparent' : props.colors.border },
      ]}
      onPress={() => props.onSelectChip(chip.key)}
      accessibilityRole="button"
      accessibilityLabel={a11y}
    >
      <Ionicons name={chip.icon} size={13} color={sel ? '#fff' : props.colors.textSecondary} style={{ marginRight: 4 }} />
      <Text style={{ color: sel ? '#fff' : props.colors.text, fontSize: 12, fontWeight: '600' }}>
        {chip.label}
        {gasShort ? (
          <Text
            style={{
              color: sel ? 'rgba(255,255,255,0.88)' : props.colors.textSecondary,
              fontSize: 12,
              fontWeight: '700',
            }}
          >
            {' · '}
            {gasShort}
          </Text>
        ) : null}
      </Text>
    </TouchableOpacity>
  );
}

/**
 * Premium search bar with animated dropdown and segmented tabs.
 *
 * Visual upgrades over the previous static panel:
 *   - Spring-eased focus highlight on the search pill (border glow + lift).
 *   - Slide+fade entry on the dropdown via `Reanimated.FadeInDown`.
 *   - Segmented Recent / Saved / Suggested tabs when the query is empty so
 *     the user has structured affordances instead of one collapsed list.
 *   - Pressable rows that scale slightly on press, giving tactile feedback.
 *   - Skeleton placeholder rows while autocomplete is in flight.
 *   - Always-visible distance (uses `distance_meters` server fallback).
 */
export default function MapSearchTopBar(props: Props) {
  if (!props.visible) return null;
  const s = props.styles as Record<string, any>;
  const { height: windowHeight } = useWindowDimensions();
  const safeInsets = useSafeAreaInsets();
  const [searchChromeH, setSearchChromeH] = useState(0);
  const [keyboardTopY, setKeyboardTopY] = useState<number | null>(null);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const subShow = Keyboard.addListener(showEvent, (e) => {
      const y =
        typeof e.endCoordinates.screenY === 'number' && e.endCoordinates.screenY > 0
          ? e.endCoordinates.screenY
          : windowHeight - e.endCoordinates.height;
      setKeyboardTopY(y - 10);
    });
    const subHide = Keyboard.addListener(hideEvent, () => setKeyboardTopY(null));
    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, [windowHeight]);

  const chromeReserve = props.bottomChromeReserve ?? safeInsets.bottom + 88;

  const resultsPanelHeight = useMemo(() => {
    if (!props.isSearchFocused) return undefined;
    const chromeH = searchChromeH > 8 ? searchChromeH : 120;
    const panelTopAbs = props.topInset + 8 + chromeH + 6;
    const bottomClamp = keyboardTopY != null ? keyboardTopY : windowHeight - chromeReserve;
    return Math.max(200, Math.min(Math.floor(bottomClamp - panelTopAbs - 6), Math.floor(windowHeight * 0.72)));
  }, [props.isSearchFocused, props.topInset, searchChromeH, keyboardTopY, windowHeight, chromeReserve]);

  const focusGlow = useSharedValue(props.isSearchFocused ? 1 : 0);
  React.useEffect(() => {
    focusGlow.value = withTiming(props.isSearchFocused ? 1 : 0, { duration: 220 });
  }, [props.isSearchFocused, focusGlow]);

  const pillAnim = useAnimatedStyle(() => ({
    borderColor: focusGlow.value > 0.5 ? props.colors.primary : props.colors.border,
    shadowOpacity: 0.04 + focusGlow.value * 0.12,
    transform: [{ translateY: -focusGlow.value * 1 }],
  }));

  const queryActive = props.searchQuery.trim().length > 0;
  const favoritesAndQuick = useMemo(
    () => props.savedPlaces.filter((p) => ['home', 'work', 'favorite'].includes(p.category)).slice(0, 8),
    [props.savedPlaces],
  );

  // Tab state lives locally — only meaningful when the panel is open AND
  // the query is empty (the active query branch shows a single results list).
  const [activeTab, setActiveTab] = useState<SearchPanelTab>('recent');

  return (
    <View style={[s.topBar, { top: props.topInset + 8, zIndex: 26 }]} pointerEvents="box-none">
      <View collapsable={false} onLayout={(e) => setSearchChromeH(e.nativeEvent.layout.height)}>
        <View style={s.searchRow}>
          <TouchableOpacity
            style={[s.menuBtn, { backgroundColor: props.colors.surface, borderColor: props.colors.border }]}
            onPress={() => props.setShowMenu(!props.showMenu)}
          >
            <Ionicons name="menu" size={18} color={props.colors.text} />
          </TouchableOpacity>
          <Animated.View
            style={[
              s.searchPill,
              { backgroundColor: props.colors.surface, borderColor: props.colors.border },
              pillAnim,
            ]}
          >
            <Ionicons name="search-outline" size={15} color={props.colors.textTertiary} />
            <TextInput
              style={[s.searchInput, { color: props.colors.text }]}
              placeholder="Where to?"
              placeholderTextColor={props.colors.textTertiary}
              value={props.searchQuery}
              onChangeText={props.onSearchChange}
              onFocus={() => props.setIsSearchFocused(true)}
              blurOnSubmit={false}
              returnKeyType="search"
              onSubmitEditing={props.onSubmitSearch}
              clearButtonMode="while-editing"
            />
            {props.searchQuery.length > 0 ? (
              <TouchableOpacity onPress={props.onClearSearch} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={18} color={props.colors.textTertiary} />
              </TouchableOpacity>
            ) : props.onOpenOrion ? (
              <TouchableOpacity
                onPress={props.onOpenOrion}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{ marginLeft: 10, paddingLeft: 4 }}
                accessibilityLabel="Open Orion chat"
              >
                <Ionicons name="chatbubbles-outline" size={16} color={props.colors.textTertiary} />
              </TouchableOpacity>
            ) : null}
          </Animated.View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          style={{ marginTop: 8, maxHeight: 48 }}
          contentContainerStyle={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingRight: 16,
          }}
        >
          {CATEGORY_CHIPS.map((chip) => renderExploreChip(chip, props, s))}
        </ScrollView>
      </View>

      {!props.isSearchFocused && props.floatingMapTools ? (
        <View style={{ marginTop: 6, width: '100%', alignItems: 'flex-end' }} pointerEvents="box-none">
          {props.floatingMapTools}
        </View>
      ) : null}

      {props.isSearchFocused && props.floatingMapTools ? (
        <View
          style={{
            position: 'absolute',
            right: 0,
            top: (searchChromeH > 8 ? searchChromeH : 118) + 4,
            zIndex: 5,
          }}
          pointerEvents="box-none"
        >
          {props.floatingMapTools}
        </View>
      ) : null}

      {!props.isSearchFocused && favoritesAndQuick.length > 0 && (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 8 }}
          data={favoritesAndQuick.slice(0, 5)}
          keyExtractor={(p) => String(p.id)}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[s.quickPlace, { backgroundColor: props.colors.surface, borderColor: props.colors.border }]}
              onPress={() => props.onSelectSavedPlace(item)}
            >
              <Ionicons
                name={item.category === 'home' ? 'home-outline' : item.category === 'work' ? 'briefcase-outline' : 'star-outline'}
                size={14}
                color={props.colors.textTertiary}
              />
              <View>
                <Text style={[s.qpTitle, { color: props.colors.text }]}>{item.name}</Text>
                <Text style={[s.qpSub, { color: props.colors.textSecondary }]} numberOfLines={1}>{item.address}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {props.isSearchFocused && (
        <Animated.View
          entering={FadeInDown.duration(180).damping(22).stiffness(220)}
          exiting={FadeOutUp.duration(140)}
          layout={Layout.springify().damping(20).stiffness(220)}
          style={[
            s.results,
            premiumStyles.panel,
            { backgroundColor: props.colors.surface, borderColor: props.colors.border },
            typeof resultsPanelHeight === 'number'
              ? { height: resultsPanelHeight, flexDirection: 'column' as const }
              : null,
          ]}
        >
          {!queryActive && (
            <SegmentedTabs
              active={activeTab}
              onChange={setActiveTab}
              colors={props.colors}
              counts={{
                recent: props.recentSearches.length,
                saved: props.savedPlaces.length,
                suggested: 0,
              }}
            />
          )}
          {props.isSearching && queryActive ? (
            <View style={{ flex: 1 }}>
              <SkeletonResults colors={props.colors} />
            </View>
          ) : queryActive && props.searchResults.length === 0 ? (
            <View style={{ flex: 1, justifyContent: 'center', paddingVertical: 24, alignItems: 'center' }}>
              <Ionicons name="search-outline" size={22} color={props.colors.textTertiary} />
              <Text style={{ color: props.colors.textTertiary, fontSize: 13, marginTop: 6 }}>
                {props.searchQuery.trim().length < 2 ? 'Keep typing to search...' : 'No results found'}
              </Text>
            </View>
          ) : (
            <FlatList
              style={{ flex: 1 }}
              contentContainerStyle={{
                flexGrow: 1,
                paddingBottom: 12,
                paddingRight: props.floatingMapTools ? 54 : 0,
              }}
              data={panelData(queryActive, activeTab, props)}
              keyExtractor={(item, i) => `${item.place_id || item.name}-${i}`}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              ListEmptyComponent={
                <View style={{ paddingVertical: 22, alignItems: 'center' }}>
                  <Ionicons
                    name={
                      activeTab === 'saved'
                        ? 'star-outline'
                        : activeTab === 'suggested'
                          ? 'compass-outline'
                          : 'time-outline'
                    }
                    size={20}
                    color={props.colors.textTertiary}
                  />
                  <Text style={{ color: props.colors.textTertiary, fontSize: 12, marginTop: 6 }}>
                    {activeTab === 'saved'
                      ? 'No saved places yet — heart a card to add it.'
                      : activeTab === 'suggested'
                        ? 'Tap a category chip below to explore.'
                        : 'No recent searches yet — find a place to get started.'}
                  </Text>
                </View>
              }
              renderItem={({ item }) => (
                <PremiumResultRow
                  item={item}
                  colors={props.colors}
                  styles={s}
                  location={props.location}
                  placePhotoThumbUri={props.placePhotoThumbUri}
                  searchResultPriceHint={props.searchResultPriceHint}
                  onPress={() => props.onSelectResult(item)}
                  isRecentList={!queryActive}
                />
              )}
            />
          )}
        </Animated.View>
      )}
    </View>
  );
}

function panelData(
  queryActive: boolean,
  tab: SearchPanelTab,
  props: Props,
): GeocodeResult[] {
  if (queryActive) return props.searchResults;
  if (tab === 'saved') {
    return props.savedPlaces
      .filter((p) => p.lat != null && p.lng != null)
      .map<GeocodeResult>((p) => ({
        name: p.name,
        address: p.address ?? '',
        lat: Number(p.lat),
        lng: Number(p.lng),
        placeType: p.category,
      }));
  }
  if (tab === 'suggested') return [];
  return props.recentSearches;
}

/* ─── Segmented tabs ──────────────────────────────────────────────────── */

function SegmentedTabs({
  active,
  onChange,
  colors,
  counts,
}: {
  active: SearchPanelTab;
  onChange: (next: SearchPanelTab) => void;
  colors: Props['colors'];
  counts: Record<SearchPanelTab, number>;
}) {
  const tabs: { key: SearchPanelTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'recent', label: 'Recent', icon: 'time-outline' },
    { key: 'saved', label: 'Saved', icon: 'star-outline' },
    { key: 'suggested', label: 'Discover', icon: 'compass-outline' },
  ];
  return (
    <View style={[premiumStyles.tabs, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
      {tabs.map((t) => {
        const sel = active === t.key;
        const count = counts[t.key];
        return (
          <Pressable
            key={t.key}
            onPress={() => onChange(t.key)}
            style={({ pressed }) => [
              premiumStyles.tab,
              sel && { backgroundColor: colors.surface, borderColor: colors.primary },
              pressed && !sel && { opacity: 0.65 },
            ]}
          >
            <Ionicons
              name={t.icon}
              size={13}
              color={sel ? colors.primary : colors.textSecondary}
              style={{ marginRight: 5 }}
            />
            <Text
              style={[
                premiumStyles.tabLabel,
                { color: sel ? colors.primary : colors.textSecondary },
              ]}
            >
              {t.label}
            </Text>
            {count > 0 ? (
              <Text style={[premiumStyles.tabCount, { color: sel ? colors.primary : colors.textTertiary }]}>
                {count}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

/* ─── Premium row with pressable-scale + rich meta ───────────────────── */

function PremiumResultRow({
  item,
  colors,
  styles: s,
  location,
  placePhotoThumbUri,
  searchResultPriceHint,
  onPress,
  isRecentList,
}: {
  item: GeocodeResult;
  colors: Props['colors'];
  styles: Record<string, any>;
  location: { lat: number; lng: number };
  placePhotoThumbUri: Props['placePhotoThumbUri'];
  searchResultPriceHint: Props['searchResultPriceHint'];
  onPress: () => void;
  isRecentList: boolean;
}) {
  const scale = useSharedValue(1);
  const pressedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const pt = item.placeType || '';
  const icon: keyof typeof Ionicons.glyphMap =
    pt.includes('restaurant') || pt.includes('food') || pt.includes('cafe')
      ? 'restaurant-outline'
      : pt.includes('gas') || pt.includes('fuel')
        ? 'flash-outline'
        : pt.includes('lodging') || pt.includes('hotel')
          ? 'bed-outline'
          : pt.includes('store') || pt.includes('shop') || pt.includes('grocery')
            ? 'cart-outline'
            : pt.includes('park')
              ? 'leaf-outline'
              : pt.includes('hospital') || pt.includes('pharmacy') || pt.includes('health')
                ? 'medkit-outline'
                : pt.includes('school') || pt.includes('university')
                  ? 'school-outline'
                  : item.place_id
                    ? 'business-outline'
                    : 'location-outline';

  const distText = formatRowDistance(item, location);
  const suri = placePhotoThumbUri(item.photo_reference, 128);
  const priceHint = searchResultPriceHint(item);
  const openRow = formatOpenLabelForSearchRow(item, isRecentList);
  const openColor =
    openRow.variant === 'open'
      ? '#22C55E'
      : openRow.variant === 'closed'
        ? '#EF4444'
        : colors.textTertiary;
  const ratingText =
    typeof item.rating === 'number' && Number.isFinite(item.rating) && item.rating > 0
      ? item.rating.toFixed(1)
      : null;

  return (
    <Animated.View entering={FadeIn.duration(160)} style={pressedStyle}>
      <Pressable
        style={[s.resultRow, { borderBottomColor: colors.border }]}
        onPressIn={() => {
          scale.value = withSpring(0.97, { damping: 18, stiffness: 320 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 16, stiffness: 240 });
        }}
        onPress={onPress}
      >
        <View
          style={[
            premiumStyles.thumb,
            { backgroundColor: colors.surfaceSecondary },
          ]}
        >
          {suri ? (
            <Image source={{ uri: suri }} style={premiumStyles.thumbImg} resizeMode="cover" />
          ) : (
            <Ionicons name={icon} size={18} color={colors.primary} />
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[s.resultName, { color: colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[s.resultAddr, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.address}
          </Text>
          <View style={premiumStyles.metaRow}>
            {ratingText ? (
              <View style={premiumStyles.metaPill}>
                <Ionicons name="star" size={10} color="#FBBF24" />
                <Text style={[premiumStyles.metaText, { color: colors.textSecondary }]}>
                  {ratingText}
                </Text>
              </View>
            ) : null}
            {openRow.label ? (
              <Text
                style={[premiumStyles.metaText, { color: openColor }]}
                numberOfLines={1}
              >
                {openRow.label}
              </Text>
            ) : null}
            {priceHint ? (
              <Text
                style={[premiumStyles.metaText, { color: colors.textTertiary }]}
                numberOfLines={1}
              >
                {priceHint}
              </Text>
            ) : null}
          </View>
        </View>
        {distText ? (
          <View style={premiumStyles.distChip}>
            <Ionicons name="navigate-outline" size={11} color={colors.textTertiary} />
            <Text style={[premiumStyles.distText, { color: colors.textTertiary }]}>{distText}</Text>
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

/* ─── Skeleton placeholders during search ────────────────────────────── */

function SkeletonResults({ colors }: { colors: Props['colors'] }) {
  return (
    <View style={{ paddingVertical: 6 }}>
      {[0, 1, 2].map((i) => (
        <SkeletonRow key={i} colors={colors} />
      ))}
    </View>
  );
}

function SkeletonRow({ colors }: { colors: Props['colors'] }) {
  const opacity = useSharedValue(0.3);
  React.useEffect(() => {
    opacity.value = withTiming(0.85, { duration: 700 });
    const id = setInterval(() => {
      opacity.value = withTiming(opacity.value > 0.5 ? 0.3 : 0.85, { duration: 700 });
    }, 720);
    return () => clearInterval(id);
  }, [opacity]);
  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View style={[premiumStyles.skelRow, animStyle]}>
      <View style={[premiumStyles.thumb, { backgroundColor: colors.surfaceSecondary }]} />
      <View style={{ flex: 1, gap: 6 }}>
        <View style={[premiumStyles.skelLine, { backgroundColor: colors.surfaceSecondary, width: '70%' }]} />
        <View style={[premiumStyles.skelLine, { backgroundColor: colors.surfaceSecondary, width: '45%' }]} />
      </View>
    </Animated.View>
  );
}

const premiumStyles = StyleSheet.create({
  panel: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 6,
  },
  tabs: {
    flexDirection: 'row',
    margin: 6,
    padding: 4,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.1 },
  tabCount: { fontSize: 10, fontWeight: '700', marginLeft: 6 },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    overflow: 'hidden',
  },
  thumbImg: { width: 44, height: 44 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: { fontSize: 11, fontWeight: '600' },
  distChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
  },
  distText: { fontSize: 11, fontWeight: '700' },
  skelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  skelLine: {
    height: 10,
    borderRadius: 6,
  },
});

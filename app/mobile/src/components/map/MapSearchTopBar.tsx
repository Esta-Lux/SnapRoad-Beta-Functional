import React from 'react';
import { FlatList, Image, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { GeocodeResult } from '../../lib/directions';
import { formatOpenLabelForSearchRow } from '../../utils/placeHours';
import type { SavedLocation } from '../../types';

type Chip = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

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
  onOpenOrion: () => void;
  activeChip: string;
  onSelectChip: (key: string) => void;
  savedPlaces: SavedLocation[];
  onSelectSavedPlace: (place: SavedLocation) => void;
  isSearching: boolean;
  searchResults: GeocodeResult[];
  recentSearches: GeocodeResult[];
  location: { lat: number; lng: number };
  onSelectResult: (r: GeocodeResult) => void;
  haversineMeters: (lat1: number, lng1: number, lat2: number, lng2: number) => number;
  placePhotoThumbUri: (photoRef?: string, maxWidth?: number) => string | undefined;
  searchResultPriceHint: (item: GeocodeResult) => string | null;
};

const CATEGORY_CHIPS: Chip[] = [
  { key: 'favorites', label: 'Favorites', icon: 'star-outline' },
  { key: 'nearby', label: 'Nearby', icon: 'location-outline' },
  { key: 'gas', label: 'Gas', icon: 'flash-outline' },
  { key: 'food', label: 'Food', icon: 'restaurant-outline' },
  { key: 'coffee', label: 'Coffee', icon: 'cafe-outline' },
  { key: 'parking', label: 'Parking', icon: 'car-outline' },
  { key: 'ev', label: 'EV', icon: 'battery-charging-outline' },
  { key: 'grocery', label: 'Grocery', icon: 'cart-outline' },
];

export default function MapSearchTopBar(props: Props) {
  if (!props.visible) return null;
  const s = props.styles as Record<string, any>;

  return (
    <View style={[s.topBar, { top: props.topInset + 8, zIndex: 15 }]} pointerEvents="box-none">
      <View style={s.searchRow}>
        <TouchableOpacity
          style={[s.menuBtn, { backgroundColor: props.colors.surface, borderColor: props.colors.border }]}
          onPress={() => props.setShowMenu(!props.showMenu)}
        >
          <Ionicons name="menu" size={18} color={props.colors.text} />
        </TouchableOpacity>
        <View style={[s.searchPill, { backgroundColor: props.colors.surface, borderColor: props.colors.border }]}>
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
          ) : (
            <TouchableOpacity
              onPress={props.onOpenOrion}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{ marginLeft: 10, paddingLeft: 4 }}
              accessibilityLabel="Open Orion chat"
            >
              <Ionicons name="chatbubbles-outline" size={16} color={props.colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {!props.isSearchFocused && (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 8 }}
          data={CATEGORY_CHIPS}
          keyExtractor={(c) => c.key}
          renderItem={({ item: chip }) => {
            const sel = props.activeChip === chip.key;
            return (
              <TouchableOpacity
                style={[s.chip, { backgroundColor: sel ? props.colors.primary : props.colors.surface, borderColor: sel ? 'transparent' : props.colors.border }]}
                onPress={() => props.onSelectChip(chip.key)}
              >
                <Ionicons name={chip.icon} size={13} color={sel ? '#fff' : props.colors.textSecondary} style={{ marginRight: 4 }} />
                <Text style={{ color: sel ? '#fff' : props.colors.text, fontSize: 12, fontWeight: '600' }}>{chip.label}</Text>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {!props.isSearchFocused && props.savedPlaces.length > 0 && (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 8 }}
          data={props.savedPlaces.filter((p) => ['home', 'work', 'favorite'].includes(p.category)).slice(0, 5)}
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
        <View style={[s.results, { backgroundColor: props.colors.surface, borderColor: props.colors.border }]}>
          {!props.searchQuery.trim() && props.recentSearches.length > 0 && <Text style={[s.recentHeader, { color: props.colors.textTertiary }]}>Recent</Text>}
          {props.isSearching && props.searchQuery.trim() ? (
            <View style={{ paddingVertical: 24, alignItems: 'center' }}>
              <Text style={{ color: props.colors.textTertiary, fontSize: 13 }}>Searching...</Text>
            </View>
          ) : props.searchQuery.trim() && props.searchResults.length === 0 ? (
            <View style={{ paddingVertical: 24, alignItems: 'center' }}>
              <Ionicons name="search-outline" size={22} color={props.colors.textTertiary} />
              <Text style={{ color: props.colors.textTertiary, fontSize: 13, marginTop: 6 }}>
                {props.searchQuery.trim().length < 2 ? 'Keep typing to search...' : 'No results found'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={props.searchQuery.trim() ? props.searchResults : props.recentSearches}
              keyExtractor={(item, i) => `${item.place_id || item.name}-${i}`}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const pt = item.placeType || '';
                const icon: keyof typeof Ionicons.glyphMap =
                  pt.includes('restaurant') || pt.includes('food') || pt.includes('cafe') ? 'restaurant-outline'
                  : pt.includes('gas') || pt.includes('fuel') ? 'flash-outline'
                  : pt.includes('lodging') || pt.includes('hotel') ? 'bed-outline'
                  : pt.includes('store') || pt.includes('shop') || pt.includes('grocery') ? 'cart-outline'
                  : pt.includes('park') ? 'leaf-outline'
                  : pt.includes('hospital') || pt.includes('pharmacy') || pt.includes('health') ? 'medkit-outline'
                  : pt.includes('school') || pt.includes('university') ? 'school-outline'
                  : item.place_id ? 'business-outline'
                  : 'location-outline';
                const hasCoords = item.lat !== 0 && item.lng !== 0;
                const dist = hasCoords ? props.haversineMeters(props.location.lat, props.location.lng, item.lat, item.lng) : null;
                const distText = dist != null ? (dist < 160 ? `${Math.round(dist * 3.281)} ft` : `${(dist / 1609.344).toFixed(1)} mi`) : '';
                const suri = props.placePhotoThumbUri(item.photo_reference, 128);
                const priceHint = props.searchResultPriceHint(item);
                const isRecentList = !props.searchQuery.trim();
                const openRow = formatOpenLabelForSearchRow(item, isRecentList);
                const openColor =
                  openRow.variant === 'open'
                    ? '#22C55E'
                    : openRow.variant === 'closed'
                      ? '#EF4444'
                      : props.colors.textTertiary;
                return (
                  <TouchableOpacity style={[s.resultRow, { borderBottomColor: props.colors.border }]} onPress={() => props.onSelectResult(item)}>
                    <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: props.colors.surfaceSecondary, justifyContent: 'center', alignItems: 'center', marginRight: 10, overflow: 'hidden' }}>
                      {suri ? <Image source={{ uri: suri }} style={{ width: 44, height: 44 }} resizeMode="cover" /> : <Ionicons name={icon} size={18} color={props.colors.primary} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.resultName, { color: props.colors.text }]} numberOfLines={1}>{item.name}</Text>
                      <Text style={[s.resultAddr, { color: props.colors.textSecondary }]} numberOfLines={1}>{item.address}</Text>
                      {priceHint ? <Text style={{ color: props.colors.textTertiary, fontSize: 11, fontWeight: '600', marginTop: 2 }} numberOfLines={2}>{priceHint}</Text> : null}
                      {openRow.label ? (
                        <Text style={{ color: openColor, fontSize: 11, fontWeight: '600', marginTop: 2 }}>{openRow.label}</Text>
                      ) : null}
                    </View>
                    {distText ? <Text style={{ color: props.colors.textTertiary, fontSize: 11, fontWeight: '600', marginLeft: 8 }}>{distText}</Text> : null}
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      )}
    </View>
  );
}

// SnapRoad Mobile - Search Destination Screen
// Place search with recents, favorites, and quick access

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadows, FontSizes, FontWeights, BorderRadius } from '../utils/theme';

const RECENTS = [
  { id: 1, name: 'Easton Town Center', address: '160 Easton Town Center, Columbus, OH', icon: 'time-outline' as const },
  { id: 2, name: 'Kroger Fuel Center', address: '1375 Chambers Rd, Columbus, OH', icon: 'time-outline' as const },
  { id: 3, name: 'Ohio State University', address: '281 W Lane Ave, Columbus, OH', icon: 'time-outline' as const },
];

const FAVORITES = [
  { id: 1, name: 'Home', address: '456 Oak Ave, Columbus, OH', icon: 'home-outline' as const, color: Colors.primaryLight },
  { id: 2, name: 'Work', address: '100 High St, Columbus, OH', icon: 'briefcase-outline' as const, color: Colors.secondary },
  { id: 3, name: "Mom's House", address: '789 Elm St, Westerville, OH', icon: 'heart-outline' as const, color: Colors.error },
];

const CATEGORIES = [
  { id: 'gas', icon: 'car-outline' as const, label: 'Gas', color: Colors.error },
  { id: 'food', icon: 'restaurant-outline' as const, label: 'Food', color: Colors.secondary },
  { id: 'coffee', icon: 'cafe-outline' as const, label: 'Coffee', color: '#F59E0B' },
  { id: 'parking', icon: 'car-sport-outline' as const, label: 'Parking', color: Colors.primaryLight },
];

const SEARCH_RESULTS = [
  { id: 1, name: 'Shell Gas Station', address: '2100 N High St', distance: '0.3 mi', type: 'gas' },
  { id: 2, name: 'Starbucks', address: '1490 Polaris Pkwy', distance: '1.2 mi', type: 'coffee' },
  { id: 3, name: "Raising Cane's", address: '1266 W Lane Ave', distance: '0.8 mi', type: 'food' },
];

export const SearchDestinationScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const hasQuery = query.trim().length > 0;

  const handleSelect = (name: string) => {
    navigation?.navigate('RoutePreview', { destination: name });
  };

  return (
    <KeyboardAvoidingView style={[s.container, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Search Header */}
      <View style={s.searchHeader}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={s.searchBox}>
          <Ionicons name="search" size={18} color={Colors.textMuted} />
          <TextInput
            style={s.searchInput}
            placeholder="Search places..."
            placeholderTextColor={Colors.textMuted}
            value={query}
            onChangeText={setQuery}
            autoFocus
            data-testid="search-destination-input"
          />
          {hasQuery && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={s.scroll}>
        {hasQuery ? (
          <>
            <Text style={s.sectionTitle}>RESULTS</Text>
            {SEARCH_RESULTS.filter(r => r.name.toLowerCase().includes(query.toLowerCase()) || true).map(r => (
              <TouchableOpacity key={r.id} style={s.resultRow} onPress={() => handleSelect(r.name)}>
                <View style={s.resultIcon}>
                  <Ionicons name="location-outline" size={18} color={Colors.primaryLight} />
                </View>
                <View style={s.resultBody}>
                  <Text style={s.resultName}>{r.name}</Text>
                  <Text style={s.resultAddr}>{r.address}</Text>
                </View>
                <Text style={s.resultDist}>{r.distance}</Text>
              </TouchableOpacity>
            ))}
          </>
        ) : (
          <>
            {/* Favorites */}
            <Text style={s.sectionTitle}>FAVORITES</Text>
            <View style={s.favRow}>
              {FAVORITES.map(f => (
                <TouchableOpacity key={f.id} style={s.favCard} onPress={() => handleSelect(f.name)}>
                  <View style={[s.favIcon, { backgroundColor: `${f.color}15` }]}>
                    <Ionicons name={f.icon} size={20} color={f.color} />
                  </View>
                  <Text style={s.favName}>{f.name}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={s.favCard}>
                <View style={[s.favIcon, { backgroundColor: 'rgba(255,255,255,0.04)' }]}>
                  <Ionicons name="add" size={20} color={Colors.textMuted} />
                </View>
                <Text style={s.favName}>Add</Text>
              </TouchableOpacity>
            </View>

            {/* Categories */}
            <Text style={s.sectionTitle}>EXPLORE NEARBY</Text>
            <View style={s.catRow}>
              {CATEGORIES.map(c => (
                <TouchableOpacity key={c.id} style={s.catChip}>
                  <Ionicons name={c.icon} size={18} color={c.color} />
                  <Text style={s.catLabel}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Recents */}
            <Text style={s.sectionTitle}>RECENT</Text>
            {RECENTS.map(r => (
              <TouchableOpacity key={r.id} style={s.resultRow} onPress={() => handleSelect(r.name)}>
                <View style={s.resultIcon}>
                  <Ionicons name={r.icon} size={18} color={Colors.textMuted} />
                </View>
                <View style={s.resultBody}>
                  <Text style={s.resultName}>{r.name}</Text>
                  <Text style={s.resultAddr}>{r.address}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  searchHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  searchBox: { flex: 1, height: 46, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.glassBorder, paddingHorizontal: 14 },
  searchInput: { flex: 1, color: Colors.text, fontSize: FontSizes.md, fontWeight: FontWeights.medium },
  scroll: { paddingHorizontal: 16 },
  sectionTitle: { color: Colors.textMuted, fontSize: FontSizes.xs, fontWeight: FontWeights.semibold, letterSpacing: 1.5, marginTop: 20, marginBottom: 12, paddingHorizontal: 4 },
  // Favorites
  favRow: { flexDirection: 'row', gap: 12 },
  favCard: { alignItems: 'center', gap: 8, width: 72 },
  favIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.glassBorder },
  favName: { color: Colors.text, fontSize: FontSizes.xs, fontWeight: FontWeights.medium },
  // Categories
  catRow: { flexDirection: 'row', gap: 10 },
  catChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.glassBorder },
  catLabel: { color: Colors.text, fontSize: FontSizes.sm, fontWeight: FontWeights.medium },
  // Results
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  resultIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.glassBorder },
  resultBody: { flex: 1 },
  resultName: { color: Colors.text, fontSize: FontSizes.md, fontWeight: FontWeights.medium, letterSpacing: 0.2 },
  resultAddr: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: 3 },
  resultDist: { color: Colors.primaryLight, fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
});

export default SearchDestinationScreen;

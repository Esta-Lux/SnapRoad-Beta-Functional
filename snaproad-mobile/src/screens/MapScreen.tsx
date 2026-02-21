// SnapRoad Mobile - Map Screen
// Aligned with Figma UI: /app/frontend/src/components/figma-ui/mobile/MapScreen.tsx
// Uses placeholder map compatible with Expo Go

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  ScrollView,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop, Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUserStore, useOffersStore } from '../store';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights } from '../utils/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const QUICK_LOCATIONS = [
  { id: 1, icon: 'home' as const, label: 'Home', subtitle: '2.3 mi' },
  { id: 2, icon: 'business' as const, label: 'Work', subtitle: '5.1 mi' },
  { id: 3, icon: 'heart' as const, label: "Mom's", subtitle: '8.7 mi' },
];

const NEARBY_OFFERS = [
  { id: 1, name: 'Coffee House', discount: '15% off', gems: 50, distance: '0.3 mi' },
  { id: 2, name: 'Auto Spa', discount: 'Free wash', gems: 100, distance: '0.8 mi' },
  { id: 3, name: 'Gas Station', discount: '$0.10/gal', gems: 25, distance: '0.2 mi' },
];

interface MapScreenProps {
  navigation: any;
}

export const MapScreen: React.FC<MapScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useUserStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const pulseAnim = useRef(new Animated.Value(0.4)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse animation for user location
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 1500, useNativeDriver: true }),
      ])
    ).start();

    // Bounce for gem markers
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: -8, duration: 800, useNativeDriver: true }),
        Animated.timing(bounceAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Map Background with Placeholder */}
      <View style={styles.mapBackground}>
        {/* Grid overlay to simulate map */}
        <View style={styles.gridOverlay}>
          {[...Array(16)].map((_, i) => (
            <View key={`h-${i}`} style={[styles.gridLineH, { top: (i * SCREEN_HEIGHT) / 16 }]} />
          ))}
          {[...Array(10)].map((_, i) => (
            <View key={`v-${i}`} style={[styles.gridLineV, { left: (i * SCREEN_WIDTH) / 10 }]} />
          ))}
        </View>

        {/* Simulated Route Path */}
        <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT} style={StyleSheet.absoluteFill}>
          <Defs>
            <SvgGradient id="routeGrad" x1="0" y1="1" x2="0" y2="0">
              <Stop offset="0" stopColor="#0084FF" />
              <Stop offset="1" stopColor="#00FFD7" />
            </SvgGradient>
          </Defs>
          <Path
            d={`M ${SCREEN_WIDTH * 0.5} ${SCREEN_HEIGHT * 0.85} Q ${SCREEN_WIDTH * 0.35} ${SCREEN_HEIGHT * 0.6} ${SCREEN_WIDTH * 0.5} ${SCREEN_HEIGHT * 0.5} Q ${SCREEN_WIDTH * 0.65} ${SCREEN_HEIGHT * 0.35} ${SCREEN_WIDTH * 0.5} ${SCREEN_HEIGHT * 0.2} Q ${SCREEN_WIDTH * 0.45} ${SCREEN_HEIGHT * 0.15} ${SCREEN_WIDTH * 0.5} ${SCREEN_HEIGHT * 0.1}`}
            fill="none"
            stroke="url(#routeGrad)"
            strokeWidth={4}
            strokeLinecap="round"
          />
          {/* Route glow */}
          <Path
            d={`M ${SCREEN_WIDTH * 0.5} ${SCREEN_HEIGHT * 0.85} Q ${SCREEN_WIDTH * 0.35} ${SCREEN_HEIGHT * 0.6} ${SCREEN_WIDTH * 0.5} ${SCREEN_HEIGHT * 0.5} Q ${SCREEN_WIDTH * 0.65} ${SCREEN_HEIGHT * 0.35} ${SCREEN_WIDTH * 0.5} ${SCREEN_HEIGHT * 0.2} Q ${SCREEN_WIDTH * 0.45} ${SCREEN_HEIGHT * 0.15} ${SCREEN_WIDTH * 0.5} ${SCREEN_HEIGHT * 0.1}`}
            fill="none"
            stroke="#0084FF"
            strokeWidth={12}
            strokeLinecap="round"
            opacity={0.15}
          />
        </Svg>

        {/* User Location Marker */}
        <View style={styles.userMarkerContainer}>
          <Animated.View style={[styles.userMarkerPulse, { opacity: pulseAnim }]} />
          <View style={styles.userMarkerOuter}>
            <LinearGradient
              colors={['#0084FF', '#00FFD7']}
              style={styles.userMarkerInner}
            >
              <Ionicons name="navigate" size={16} color="#fff" />
            </LinearGradient>
          </View>
        </View>

        {/* Gem Marker on Map */}
        <Animated.View style={[styles.gemMarker, { transform: [{ translateY: bounceAnim }] }]}>
          <LinearGradient
            colors={['#FFB800', '#FF6B00']}
            style={styles.gemMarkerInner}
          >
            <Ionicons name="diamond" size={18} color="#fff" />
          </LinearGradient>
        </Animated.View>

        {/* Destination Marker */}
        <View style={styles.destinationMarker}>
          <View style={styles.destinationDot}>
            <Ionicons name="flag" size={14} color="#fff" />
          </View>
        </View>
      </View>

      {/* Top Bar */}
      <View style={[styles.topBar, { top: insets.top + 8 }]}>
        {/* Menu & Search Row */}
        <View style={styles.topRow}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => navigation.navigate('Settings')}
            data-testid="map-menu-btn"
          >
            <Ionicons name="menu" size={20} color="#fff" />
          </TouchableOpacity>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="rgba(255,255,255,0.4)" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Where to?"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setShowSearch(true)}
              data-testid="map-search-input"
            />
          </View>
        </View>

        {/* Quick Location Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickLocations}>
          {QUICK_LOCATIONS.map((loc) => (
            <TouchableOpacity key={loc.id} style={styles.locationPill} data-testid={`quick-location-${loc.label.toLowerCase()}`}>
              <Ionicons name={loc.icon} size={16} color="#0084FF" />
              <Text style={styles.locationLabel}>{loc.label}</Text>
              <Text style={styles.locationSubtitle}>{loc.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Floating Action Buttons (Right Side) */}
      <View style={[styles.fabColumn, { top: SCREEN_HEIGHT * 0.3 }]}>
        <TouchableOpacity
          style={styles.fabButton}
          onPress={() => {/* Report incident */}}
          data-testid="map-report-btn"
        >
          <Ionicons name="alert-circle" size={22} color="#FFB800" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.fabButton}
          onPress={() => {/* Photo capture */}}
          data-testid="map-camera-btn"
        >
          <Ionicons name="camera" size={22} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.fabOrion}
          onPress={() => navigation.navigate('OrionCoach')}
          data-testid="map-orion-btn"
        >
          <LinearGradient
            colors={['#0084FF', '#00FFD7']}
            style={styles.fabOrionGradient}
          >
            <Ionicons name="mic" size={22} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Nearby Offers Card */}
      <View style={styles.nearbyOffersCard}>
        <View style={styles.nearbyHeader}>
          <Text style={styles.nearbyTitle}>Nearby Offers</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Offers')} style={styles.viewAllBtn}>
            <Text style={styles.viewAllText}>View all</Text>
            <Ionicons name="chevron-forward" size={14} color="#0084FF" />
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.offersRow}>
          {NEARBY_OFFERS.map((offer) => (
            <View key={offer.id} style={styles.offerChip}>
              <View style={styles.offerChipTop}>
                <Text style={styles.offerDiscount}>{offer.discount}</Text>
                <View style={styles.offerGemsRow}>
                  <Ionicons name="diamond" size={12} color="#FFB800" />
                  <Text style={styles.offerGems}>{offer.gems}</Text>
                </View>
              </View>
              <Text style={styles.offerName}>{offer.name}</Text>
              <Text style={styles.offerDistance}>{offer.distance}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E16' },
  mapBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#121822',
  },
  gridOverlay: { ...StyleSheet.absoluteFillObject },
  gridLineH: {
    position: 'absolute', left: 0, right: 0, height: 1,
    backgroundColor: 'rgba(0,132,255,0.06)',
  },
  gridLineV: {
    position: 'absolute', top: 0, bottom: 0, width: 1,
    backgroundColor: 'rgba(0,132,255,0.06)',
  },
  // User marker
  userMarkerContainer: {
    position: 'absolute', left: '50%', bottom: '30%',
    marginLeft: -32, alignItems: 'center', justifyContent: 'center',
  },
  userMarkerPulse: {
    position: 'absolute', width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(0,132,255,0.2)',
  },
  userMarkerOuter: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(0,132,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  userMarkerInner: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#0084FF', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  // Gem marker
  gemMarker: {
    position: 'absolute', left: '25%', top: '33%',
  },
  gemMarkerInner: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#FFB800', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4, shadowRadius: 6, elevation: 4,
  },
  // Destination marker
  destinationMarker: {
    position: 'absolute', left: '50%', top: '10%', marginLeft: -14,
  },
  destinationDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#00DFA2', alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#fff',
    shadowColor: '#00DFA2', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5, shadowRadius: 6, elevation: 4,
  },
  // Top bar
  topBar: { position: 'absolute', left: 0, right: 0, paddingHorizontal: 16, zIndex: 10 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuButton: {
    width: 48, height: 48, borderRadius: 16,
    backgroundColor: 'rgba(26,31,46,0.9)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  searchContainer: {
    flex: 1, height: 48, flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(26,31,46,0.9)', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: '#fff', fontSize: 15 },
  quickLocations: { marginTop: 12 },
  locationPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    height: 40, paddingHorizontal: 16,
    backgroundColor: 'rgba(26,31,46,0.9)', borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    marginRight: 8,
  },
  locationLabel: { color: '#fff', fontSize: 14 },
  locationSubtitle: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  // FABs
  fabColumn: { position: 'absolute', right: 16, gap: 12, zIndex: 20 },
  fabButton: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: 'rgba(26,31,46,0.9)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  fabOrion: { overflow: 'hidden', borderRadius: 16 },
  fabOrionGradient: {
    width: 56, height: 56, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#0084FF', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  // Nearby offers
  nearbyOffersCard: {
    position: 'absolute', left: 16, right: 16, bottom: 100,
    backgroundColor: 'rgba(26,31,46,0.95)', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    padding: 16, zIndex: 10,
  },
  nearbyHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  nearbyTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  viewAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewAllText: { color: '#0084FF', fontSize: 14 },
  offersRow: { gap: 12 },
  offerChip: {
    width: 160, backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12, padding: 12,
  },
  offerChipTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  offerDiscount: { color: '#00FFD7', fontSize: 12, fontWeight: '500' },
  offerGemsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  offerGems: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  offerName: { color: '#fff', fontSize: 14, fontWeight: '500' },
  offerDistance: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 },
});

export default MapScreen;

// SnapRoad Mobile - Premium Map Screen
// Neon blue glass-morphism, iPhone 17 optimized

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop, Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUserStore } from '../store';
import { Colors, Shadows, FontSizes, FontWeights, BorderRadius } from '../utils/theme';

const { width: W, height: H } = Dimensions.get('window');

const QUICK_LOCATIONS = [
  { id: 1, icon: 'home-outline' as const, label: 'Home', eta: '8 min' },
  { id: 2, icon: 'briefcase-outline' as const, label: 'Work', eta: '22 min' },
  { id: 3, icon: 'heart-outline' as const, label: "Mom's", eta: '34 min' },
];

const NEARBY_OFFERS = [
  { id: 1, name: 'Blue Bottle Coffee', discount: '15% off', gems: 50, distance: '0.3 mi', type: 'cafe' },
  { id: 2, name: 'Auto Spa Pro', discount: 'Free wash', gems: 100, distance: '0.8 mi', type: 'carwash' },
  { id: 3, name: 'Shell Station', discount: '$0.10/gal', gems: 25, distance: '0.2 mi', type: 'gas' },
];

const offerColors: Record<string, string> = {
  cafe: '#F59E0B', carwash: '#38BDF8', gas: '#EF4444', restaurant: '#10B981', retail: '#A855F7',
};

export const MapScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useUserStore();
  const pulseAnim = useRef(new Animated.Value(0.3)).current;
  const cardSlide = useRef(new Animated.Value(30)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
    Animated.parallel([
      Animated.spring(cardSlide, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      {/* Map Background */}
      <View style={styles.mapBg}>
        <LinearGradient colors={['#0A1628', '#070E1B', '#0D1830']} style={StyleSheet.absoluteFill} />
        {/* Grid */}
        {[...Array(20)].map((_, i) => (
          <View key={`h${i}`} style={[styles.gridH, { top: (i * H) / 20 }]} />
        ))}
        {[...Array(12)].map((_, i) => (
          <View key={`v${i}`} style={[styles.gridV, { left: (i * W) / 12 }]} />
        ))}

        {/* Route SVG */}
        <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
          <Defs>
            <SvgGradient id="rg" x1="0" y1="1" x2="0" y2="0">
              <Stop offset="0" stopColor="#2563EB" />
              <Stop offset="0.5" stopColor="#38BDF8" />
              <Stop offset="1" stopColor="#06D6A0" />
            </SvgGradient>
          </Defs>
          {/* Glow */}
          <Path
            d={`M${W*0.5} ${H*0.82} Q${W*0.32} ${H*0.6} ${W*0.5} ${H*0.48} Q${W*0.68} ${H*0.34} ${W*0.5} ${H*0.18}`}
            fill="none" stroke="#2563EB" strokeWidth={16} strokeLinecap="round" opacity={0.12}
          />
          {/* Route */}
          <Path
            d={`M${W*0.5} ${H*0.82} Q${W*0.32} ${H*0.6} ${W*0.5} ${H*0.48} Q${W*0.68} ${H*0.34} ${W*0.5} ${H*0.18}`}
            fill="none" stroke="url(#rg)" strokeWidth={4} strokeLinecap="round"
          />
          {/* Waypoints */}
          <Circle cx={W*0.5} cy={H*0.48} r={5} fill="#38BDF8" opacity={0.6} />
          <Circle cx={W*0.41} cy={H*0.58} r={4} fill="#2563EB" opacity={0.4} />
        </Svg>

        {/* User Marker */}
        <View style={styles.userMarkerWrap}>
          <Animated.View style={[styles.userPulseRing, { opacity: pulseAnim, transform: [{ scale: pulseAnim.interpolate({ inputRange: [0.3,1], outputRange: [1,1.8] }) }] }]} />
          <View style={styles.userMarkerOuter}>
            <LinearGradient colors={['#2563EB','#38BDF8']} style={styles.userMarkerCore}>
              <Ionicons name="navigate" size={15} color="#fff" />
            </LinearGradient>
          </View>
        </View>

        {/* Destination Marker */}
        <View style={styles.destMarker}>
          <LinearGradient colors={['#06D6A0','#10B981']} style={styles.destMarkerCore}>
            <Ionicons name="flag" size={12} color="#fff" />
          </LinearGradient>
        </View>
      </View>

      {/* Top Bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <View style={styles.topRow}>
          <TouchableOpacity style={styles.glassBtn} onPress={() => navigation.navigate('Profile')}>
            <Ionicons name="menu" size={20} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.searchBox} onPress={() => navigation.navigate('SearchDestination')} activeOpacity={0.8}>
            <Ionicons name="search" size={18} color={Colors.textMuted} />
            <Text style={styles.searchPlaceholder}>Where to?</Text>
            <Ionicons name="mic-outline" size={20} color={Colors.primaryLight} />
          </TouchableOpacity>
        </View>

        {/* Quick Destinations */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }} contentContainerStyle={{ gap: 8, paddingRight: 16 }}>
          {QUICK_LOCATIONS.map((loc) => (
            <TouchableOpacity key={loc.id} style={styles.quickPill} onPress={() => navigation.navigate('RoutePreview', { destination: loc.label })}>
              <Ionicons name={loc.icon} size={15} color={Colors.primaryLight} />
              <Text style={styles.quickLabel}>{loc.label}</Text>
              <Text style={styles.quickEta}>{loc.eta}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Safety Score Badge */}
      <View style={[styles.safetyBadge, { top: insets.top + 130 }]}>
        <LinearGradient colors={['rgba(17,29,50,0.92)','rgba(7,14,27,0.95)']} style={styles.safetyBadgeInner}>
          <View style={styles.safetyScore}>
            <Text style={styles.safetyScoreNum}>{user.safetyScore || 94}</Text>
          </View>
          <View>
            <Text style={styles.safetyLabel}>Safety</Text>
            <Text style={styles.safetyLevel}>Excellent</Text>
          </View>
        </LinearGradient>
      </View>

      {/* Right FABs */}
      <View style={[styles.fabCol, { bottom: H * 0.32 }]}>
        <TouchableOpacity style={styles.glassBtn} onPress={() => navigation.navigate('PhotoCapture')} data-testid="map-camera-btn">
          <Ionicons name="camera-outline" size={21} color={Colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.glassBtn} onPress={() => navigation.navigate('HazardFeed')} data-testid="map-report-btn">
          <Ionicons name="alert-circle-outline" size={21} color="#F59E0B" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.orionFab} onPress={() => navigation.navigate('OrionCoach')} data-testid="map-orion-btn">
          <LinearGradient colors={Colors.gradientPrimary} style={styles.orionFabGrad}>
            <Ionicons name="mic" size={22} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Nearby Offers */}
      <Animated.View style={[styles.offersCard, { transform: [{ translateY: cardSlide }], opacity: cardOpacity }]}>
        <View style={styles.offersHeader}>
          <Text style={styles.offersTitle}>Nearby</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Offers')} style={styles.viewAllRow}>
            <Text style={styles.viewAllText}>View all</Text>
            <Ionicons name="chevron-forward" size={14} color={Colors.primaryLight} />
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {NEARBY_OFFERS.map((o) => (
            <TouchableOpacity key={o.id} style={styles.offerChip} activeOpacity={0.8}>
              <View style={[styles.offerDot, { backgroundColor: offerColors[o.type] || Colors.primary }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.offerChipDiscount}>{o.discount}</Text>
                <Text style={styles.offerChipName} numberOfLines={1}>{o.name}</Text>
              </View>
              <View style={styles.offerChipRight}>
                <Ionicons name="diamond-outline" size={11} color={Colors.accent} />
                <Text style={styles.offerChipGems}>{o.gems}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  // Map
  mapBg: { ...StyleSheet.absoluteFillObject },
  gridH: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(37,99,235,0.06)' },
  gridV: { position: 'absolute', top: 0, bottom: 0, width: StyleSheet.hairlineWidth, backgroundColor: 'rgba(37,99,235,0.06)' },
  // User marker
  userMarkerWrap: { position: 'absolute', left: W/2-28, bottom: H*0.18, width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  userPulseRing: { position: 'absolute', width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(37,99,235,0.15)' },
  userMarkerOuter: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(37,99,235,0.12)', alignItems: 'center', justifyContent: 'center' },
  userMarkerCore: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', ...Shadows.neon },
  destMarker: { position: 'absolute', left: W/2-13, top: H*0.18-13 },
  destMarkerCore: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: '#fff', ...Shadows.glow },
  // Top bar
  topBar: { position: 'absolute', left: 0, right: 0, paddingHorizontal: 16, zIndex: 10 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  glassBtn: {
    width: 46, height: 46, borderRadius: BorderRadius.lg,
    backgroundColor: Colors.glass, borderWidth: 1, borderColor: Colors.glassBorder,
    alignItems: 'center', justifyContent: 'center', ...Shadows.md,
  },
  searchBox: {
    flex: 1, height: 46, flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.glass, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.glassBorder, paddingHorizontal: 14, ...Shadows.md,
  },
  searchInput: { flex: 1, color: Colors.text, fontSize: FontSizes.md, fontWeight: FontWeights.medium, letterSpacing: 0.2 },
  searchPlaceholder: { flex: 1, color: Colors.textMuted, fontSize: FontSizes.md, fontWeight: FontWeights.medium, letterSpacing: 0.2 },
  quickPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 14,
    backgroundColor: Colors.glass, borderRadius: BorderRadius.full,
    borderWidth: 1, borderColor: Colors.glassBorder,
  },
  quickLabel: { color: Colors.text, fontSize: FontSizes.sm, fontWeight: FontWeights.medium, letterSpacing: 0.3 },
  quickEta: { color: Colors.textMuted, fontSize: FontSizes.xs },
  // Safety
  safetyBadge: { position: 'absolute', left: 16, zIndex: 10 },
  safetyBadgeInner: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 12,
    borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.glassBorder,
  },
  safetyScore: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: Colors.secondary,
    alignItems: 'center', justifyContent: 'center',
  },
  safetyScoreNum: { color: Colors.secondary, fontSize: FontSizes.sm, fontWeight: FontWeights.bold },
  safetyLabel: { color: Colors.textMuted, fontSize: FontSizes.xs, letterSpacing: 0.8, textTransform: 'uppercase' },
  safetyLevel: { color: Colors.secondary, fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
  // FABs
  fabCol: { position: 'absolute', right: 16, gap: 10, zIndex: 20 },
  orionFab: { borderRadius: BorderRadius.lg, overflow: 'hidden', ...Shadows.neon },
  orionFabGrad: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  // Offers card
  offersCard: {
    position: 'absolute', left: 16, right: 16, bottom: 100,
    backgroundColor: Colors.glass, borderRadius: BorderRadius.xl,
    borderWidth: 1, borderColor: Colors.glassBorder, padding: 16, ...Shadows.lg,
  },
  offersHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  offersTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: FontWeights.bold, letterSpacing: 0.3 },
  viewAllRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewAllText: { color: Colors.primaryLight, fontSize: FontSizes.sm, fontWeight: FontWeights.medium },
  offerChip: {
    flexDirection: 'row', alignItems: 'center', gap: 10, width: 180,
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: BorderRadius.md, padding: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)',
  },
  offerDot: { width: 8, height: 8, borderRadius: 4 },
  offerChipDiscount: { color: Colors.secondary, fontSize: FontSizes.xs, fontWeight: FontWeights.semibold, letterSpacing: 0.5 },
  offerChipName: { color: Colors.text, fontSize: FontSizes.sm, fontWeight: FontWeights.medium, marginTop: 1 },
  offerChipRight: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  offerChipGems: { color: Colors.textMuted, fontSize: FontSizes.xs },
});

export default MapScreen;

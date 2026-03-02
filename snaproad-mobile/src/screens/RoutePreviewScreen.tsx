// SnapRoad Mobile - Route Preview Screen
// Shows route options before starting navigation

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Defs, LinearGradient as SvgGrad, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadows, FontSizes, FontWeights, BorderRadius } from '../utils/theme';

const { width: W, height: H } = Dimensions.get('window');

const ROUTES = [
  { id: 1, name: 'Fastest', eta: '14 min', distance: '4.8 mi', traffic: 'Light', color: Colors.secondary, gems: 12 },
  { id: 2, name: 'Fuel Saver', eta: '17 min', distance: '5.2 mi', traffic: 'None', color: Colors.primaryLight, gems: 18 },
  { id: 3, name: 'Scenic', eta: '22 min', distance: '6.1 mi', traffic: 'Moderate', color: Colors.accent, gems: 25 },
];

export const RoutePreviewScreen: React.FC<{ navigation?: any; route?: any }> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState(0);
  const dest = route?.params?.destination || 'Destination';

  const startNavigation = () => {
    navigation?.navigate('ActiveNavigation', { destination: dest, route: ROUTES[selected] });
  };

  return (
    <View style={s.container}>
      {/* Map Preview */}
      <View style={s.mapBg}>
        <LinearGradient colors={['#0A1628', '#070E1B']} style={StyleSheet.absoluteFill} />
        {[...Array(16)].map((_, i) => <View key={i} style={[s.gridH, { top: (i * H * 0.55) / 16 }]} />)}
        <Svg width={W} height={H * 0.55} style={StyleSheet.absoluteFill}>
          <Defs>
            <SvgGrad id="pr" x1="0" y1="1" x2="0" y2="0">
              <Stop offset="0" stopColor={ROUTES[selected].color} /><Stop offset="1" stopColor="#06D6A0" />
            </SvgGrad>
          </Defs>
          <Path d={`M${W*0.2} ${H*0.45} Q${W*0.3} ${H*0.3} ${W*0.5} ${H*0.25} Q${W*0.7} ${H*0.2} ${W*0.75} ${H*0.1}`} fill="none" stroke={ROUTES[selected].color} strokeWidth={12} strokeLinecap="round" opacity={0.1} />
          <Path d={`M${W*0.2} ${H*0.45} Q${W*0.3} ${H*0.3} ${W*0.5} ${H*0.25} Q${W*0.7} ${H*0.2} ${W*0.75} ${H*0.1}`} fill="none" stroke="url(#pr)" strokeWidth={4} strokeLinecap="round" />
        </Svg>
      </View>

      {/* Top Bar */}
      <View style={[s.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={s.destPill}>
          <Ionicons name="flag" size={14} color={Colors.secondary} />
          <Text style={s.destText} numberOfLines={1}>{dest}</Text>
        </View>
      </View>

      {/* Route Cards */}
      <View style={[s.bottomSheet, { paddingBottom: insets.bottom + 16 }]}>
        <Text style={s.routeTitle}>Choose Route</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 16 }}>
          {ROUTES.map((r, i) => (
            <TouchableOpacity key={r.id} style={[s.routeCard, selected === i && { borderColor: r.color }]} onPress={() => setSelected(i)}>
              <View style={s.routeHeader}>
                <Text style={[s.routeName, selected === i && { color: r.color }]}>{r.name}</Text>
                <View style={s.gemsRow}>
                  <Ionicons name="diamond-outline" size={12} color={Colors.accent} />
                  <Text style={s.gemsText}>+{r.gems}</Text>
                </View>
              </View>
              <Text style={s.routeEta}>{r.eta}</Text>
              <View style={s.routeMeta}>
                <Text style={s.routeDist}>{r.distance}</Text>
                <View style={[s.trafficDot, { backgroundColor: r.traffic === 'Light' ? Colors.secondary : r.traffic === 'None' ? Colors.primaryLight : '#F59E0B' }]} />
                <Text style={s.routeTraffic}>{r.traffic}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Start Button */}
        <TouchableOpacity style={s.startBtn} onPress={startNavigation}>
          <LinearGradient colors={Colors.gradientPrimary} style={s.startGrad}>
            <Ionicons name="navigate" size={20} color="#fff" />
            <Text style={s.startText}>Start Navigation</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  mapBg: { height: H * 0.55, position: 'relative' },
  gridH: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(37,99,235,0.05)' },
  topBar: { position: 'absolute', left: 0, right: 0, top: 0, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, zIndex: 10 },
  backBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.glass, borderWidth: 1, borderColor: Colors.glassBorder, alignItems: 'center', justifyContent: 'center' },
  destPill: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, height: 42, paddingHorizontal: 16, backgroundColor: Colors.glass, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.glassBorder },
  destText: { color: Colors.text, fontSize: FontSizes.md, fontWeight: FontWeights.medium, flex: 1 },
  bottomSheet: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: 16, paddingTop: 20, borderTopLeftRadius: BorderRadius.xxl, borderTopRightRadius: BorderRadius.xxl, marginTop: -24, zIndex: 10 },
  routeTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: FontWeights.bold, marginBottom: 16, letterSpacing: 0.3 },
  routeCard: { width: 160, backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, borderWidth: 1.5, borderColor: Colors.glassBorder, padding: 16 },
  routeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  routeName: { color: Colors.text, fontSize: FontSizes.sm, fontWeight: FontWeights.semibold, letterSpacing: 0.3 },
  gemsRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  gemsText: { color: Colors.accent, fontSize: FontSizes.xs, fontWeight: FontWeights.semibold },
  routeEta: { color: Colors.text, fontSize: FontSizes.xxl, fontWeight: FontWeights.bold, letterSpacing: -0.5 },
  routeMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  routeDist: { color: Colors.textMuted, fontSize: FontSizes.xs },
  trafficDot: { width: 6, height: 6, borderRadius: 3 },
  routeTraffic: { color: Colors.textMuted, fontSize: FontSizes.xs },
  startBtn: { marginTop: 20, borderRadius: BorderRadius.lg, overflow: 'hidden', ...Shadows.neon },
  startGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 56 },
  startText: { color: '#fff', fontSize: FontSizes.lg, fontWeight: FontWeights.bold, letterSpacing: 0.3 },
});

export default RoutePreviewScreen;

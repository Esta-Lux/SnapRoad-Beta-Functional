import React from 'react';
import { FlatList, Platform, Pressable, Switch, Text, TouchableOpacity, View } from 'react-native';
import Animated, { Easing, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { GestureDetector } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { RouteKind } from '../../lib/directions';

type TrafficSummary = { level: 'heavy' | 'moderate' | 'low'; delayMin: number } | null;

type PreviewRoute = {
  durationText: string;
  distanceText: string;
  routeType?: RouteKind;
  routeLabel?: string;
  routeReason?: string;
  congestion?: string[];
};

type NavData = {
  destination: { name?: string; lat: number; lng: number };
};

type Props = {
  visible: boolean;
  navData: NavData | null;
  availableRoutes: PreviewRoute[];
  selectedRouteIndex: number;
  onSelectRoute: (index: number) => void;
  detailsExpanded: boolean;
  onToggleDetails: () => void;
  handlePanGesture: any;
  onDismiss: () => void;
  onLayoutHeight: (height: number) => void;
  insetsBottom: number;
  colors: {
    text: string;
    textSecondary: string;
    textTertiary: string;
    border: string;
    surfaceSecondary: string;
    primary: string;
  };
  isLight: boolean;
  drivingMode: 'calm' | 'adaptive' | 'sport';
  modeConfig: { showTrafficBadge?: boolean };
  currentAddress: string;
  selectedDestinationAddress?: string;
  hasTallVehicle: boolean;
  vehicleHeight?: number;
  avoidLowClearances: boolean;
  setAvoidLowClearances: (v: boolean) => void;
  analyzeCongestion: (c?: string[]) => TrafficSummary;
  onStartNavigationPress: () => void;
  styles: Record<string, any>;
};

export default function RoutePreviewPanel(props: Props) {
  if (!props.visible || !props.navData) return null;
  const previewCompact = !props.detailsExpanded;
  const selectedRoute = props.availableRoutes[props.selectedRouteIndex];
  const selType = selectedRoute?.routeType ?? 'fastest';
  const s = props.styles;

  const routeLabel = (rt?: RouteKind, idx?: number): string => {
    if (rt === 'fastest') return 'Fastest';
    if (rt === 'no_highways') return 'No Highways';
    if (rt === 'avoid_tolls') return 'Avoid Tolls';
    if (rt === 'eco') return 'Eco';
    const i = idx ?? 1;
    return i <= 1 ? 'Alternate' : `Alternate ${i}`;
  };
  const routeIcon = (rt?: RouteKind): 'flash' | 'leaf' | 'navigate' | 'car-outline' | 'cash-outline' => {
    if (rt === 'fastest') return 'flash';
    if (rt === 'no_highways') return 'car-outline';
    if (rt === 'avoid_tolls') return 'cash-outline';
    if (rt === 'eco') return 'leaf';
    return 'navigate';
  };
  const routeAccent = (rt?: RouteKind): string => {
    if (rt === 'fastest') return '#2563EB';
    if (rt === 'no_highways') return '#16A34A';
    if (rt === 'avoid_tolls') return '#D4A843';
    if (rt === 'eco') return '#14B8A6';
    return '#8B5CF6';
  };
  const routeAccentBg = (rt?: RouteKind): string => {
    if (rt === 'fastest') return '#EFF6FF';
    if (rt === 'no_highways') return '#F0FDF4';
    if (rt === 'avoid_tolls') return '#FFFBEB';
    if (rt === 'eco') return '#F0FDFA';
    return '#F5F3FF';
  };

  const startGrad: [string, string] =
    selType === 'eco'
      ? ['#14B8A6', '#0D9488']
      : selType === 'fastest'
        ? ['#2563EB', '#1D4ED8']
        : selType === 'no_highways'
          ? ['#16A34A', '#15803D']
          : selType === 'avoid_tolls'
            ? ['#D4A843', '#B8860B']
            : ['#7C3AED', '#6D28D9'];

  return (
    <Animated.View
      entering={SlideInDown.duration(320).easing(Easing.out(Easing.cubic))}
      exiting={SlideOutDown.duration(220)}
      onLayout={(e) => props.onLayoutHeight(e.nativeEvent.layout.height)}
      style={[
        s.preview,
        {
          paddingBottom: Math.max(props.insetsBottom, 12) + (previewCompact ? 12 : 16),
          paddingTop: previewCompact ? 12 : 20,
          backgroundColor: props.isLight ? 'rgba(255,255,255,0.97)' : 'rgba(15,23,42,0.97)',
          borderColor: props.colors.border,
        },
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
        <GestureDetector gesture={props.handlePanGesture}>
          <Pressable
            onPress={props.onToggleDetails}
            style={{ flex: 1, alignItems: 'center', paddingVertical: 8 }}
            accessibilityRole="button"
            accessibilityLabel={props.detailsExpanded ? 'Collapse route details' : 'Expand route details'}
          >
            <View style={[s.handle, { backgroundColor: props.colors.border }]} />
            <Text style={{ fontSize: 11, fontWeight: '600', color: props.colors.textTertiary, marginTop: 4 }}>
              {props.detailsExpanded ? 'Hide details' : 'Details'}
            </Text>
          </Pressable>
        </GestureDetector>
        <TouchableOpacity
          onPress={props.onDismiss}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Close route preview"
          style={{ padding: 6, marginLeft: 4 }}
        >
          <Ionicons name="close" size={22} color={props.colors.textSecondary} />
        </TouchableOpacity>
      </View>
      <Text style={[s.previewTitle, { color: props.colors.text, marginBottom: props.drivingMode === 'calm' ? 4 : 8 }]} numberOfLines={1}>
        {props.navData.destination.name ?? 'Destination'}
      </Text>
      {!previewCompact ? (
        <View style={{ marginBottom: 14, gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            <Ionicons name="navigate-circle-outline" size={16} color={props.colors.primary} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={[s.previewRouteLbl, { color: props.colors.textTertiary }]}>From</Text>
              <Text style={[s.previewRouteVal, { color: props.colors.textSecondary }]} numberOfLines={2}>
                {props.currentAddress || 'Current location'}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            <Ionicons name="flag" size={16} color="#22C55E" style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={[s.previewRouteLbl, { color: props.colors.textTertiary }]}>To</Text>
              <Text style={[s.previewRouteVal, { color: props.colors.textSecondary }]} numberOfLines={3}>
                {props.navData.destination.name ?? 'Destination'}
                {props.selectedDestinationAddress ? ` · ${props.selectedDestinationAddress}` : ''}
              </Text>
            </View>
          </View>
        </View>
      ) : null}

      <FlatList
        horizontal
        data={props.availableRoutes}
        keyExtractor={(_r, i) => `rc-${i}`}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: previewCompact ? 8 : 10, paddingHorizontal: 2 }}
        style={{ marginBottom: previewCompact ? 10 : 14 }}
        renderItem={({ item: route, index: idx }) => {
          const isSel = idx === props.selectedRouteIndex;
          const accent = routeAccent(route.routeType);
          const traffic = props.modeConfig.showTrafficBadge ? props.analyzeCongestion(route.congestion) : null;
          return (
            <TouchableOpacity
              style={[
                s.routeCardNew,
                isSel && s.routeCardNewSel,
                {
                  backgroundColor: props.colors.surfaceSecondary,
                  borderColor: isSel ? accent : props.colors.border,
                  minWidth: previewCompact ? 108 : 140,
                  paddingVertical: previewCompact ? 10 : 14,
                  paddingHorizontal: previewCompact ? 11 : 14,
                  ...(previewCompact
                    ? Platform.select({ ios: { shadowOpacity: 0.04 }, android: { elevation: 1 }, default: {} })
                    : {}),
                },
              ]}
              onPress={() => props.onSelectRoute(idx)}
              activeOpacity={0.85}
            >
              <View style={[s.routeCardHeader, previewCompact && { marginBottom: 6 }]}>
                <View style={[s.routeCardIcon, { backgroundColor: routeAccentBg(route.routeType), width: previewCompact ? 26 : 28, height: previewCompact ? 26 : 28 }]}>
                  <Ionicons name={routeIcon(route.routeType)} size={previewCompact ? 14 : 16} color={accent} />
                </View>
                <Text style={[s.routeCardType, { color: isSel ? accent : props.colors.textSecondary, fontSize: previewCompact ? 11 : 12 }]}>
                  {route.routeLabel ?? routeLabel(route.routeType, idx)}
                </Text>
                {isSel && <View style={[s.routeCardCheck, { backgroundColor: accent }]}><Ionicons name="checkmark" size={12} color="#fff" /></View>}
              </View>
              <Text style={[s.routeCardDuration, { color: props.colors.text, fontSize: previewCompact ? 18 : 22, lineHeight: previewCompact ? 20 : 24 }]}>{route.durationText}</Text>
              <Text style={[s.routeCardDist, { color: props.colors.textSecondary, marginBottom: previewCompact ? 0 : 8 }]}>{route.distanceText}</Text>
              {!previewCompact && traffic && traffic.level !== 'low' && (
                <View style={[s.routeTrafficBadge, { backgroundColor: traffic.level === 'heavy' ? '#FEF2F2' : '#FFFBEB' }]}>
                  <Ionicons name="warning" size={10} color={traffic.level === 'heavy' ? '#DC2626' : '#D97706'} />
                  <Text style={[s.routeTrafficTxt, { color: traffic.level === 'heavy' ? '#DC2626' : '#D97706' }]}>
                    {traffic.level === 'heavy' ? 'Heavy' : 'Moderate'} traffic
                  </Text>
                </View>
              )}
              {!previewCompact && (!traffic || traffic.level === 'low') && (
                <View style={[s.routeTrafficBadge, { backgroundColor: '#F0FDF4' }]}>
                  <Ionicons name="checkmark-circle" size={10} color="#16A34A" />
                  <Text style={[s.routeTrafficTxt, { color: '#16A34A' }]}>Clear roads</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />

      {props.hasTallVehicle && (
        <View style={s.truckRow}>
          <Ionicons name="car-outline" size={16} color={props.colors.primary} />
          <Text style={[s.truckLbl, { color: props.colors.primary }]}>
            Avoid low clearances ({typeof props.vehicleHeight === 'number' ? props.vehicleHeight.toFixed(1) : props.vehicleHeight ?? '—'}m)
          </Text>
          <Switch value={props.avoidLowClearances} onValueChange={props.setAvoidLowClearances} trackColor={{ false: props.colors.border, true: props.colors.primary }} thumbColor="#fff" />
        </View>
      )}
      <TouchableOpacity onPress={props.onStartNavigationPress} activeOpacity={0.85}>
        <LinearGradient colors={startGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.startBtn}>
          <Ionicons
            name={
              routeIcon(selType) === 'flash'
                ? 'flash-outline'
                : routeIcon(selType) === 'leaf'
                  ? 'leaf-outline'
                  : routeIcon(selType) === 'car-outline'
                    ? 'car-outline'
                    : routeIcon(selType) === 'cash-outline'
                      ? 'cash-outline'
                      : 'navigate-outline'
            }
            size={18}
            color="#fff"
          />
          <Text style={s.startBtnT}>
            Start {selectedRoute?.routeLabel ?? routeLabel(selType, props.selectedRouteIndex)}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

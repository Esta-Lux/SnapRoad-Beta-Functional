import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapboxGL, { isMapAvailable } from '../../utils/mapbox';
import type { DrivingMode } from '../../types';
import { NAV_THEME } from '../../navigation/navTheme';

type Props = {
  lat: number;
  lng: number;
  heading: number;
  mode: DrivingMode;
};

/** Outer glow uses route/puck color at low alpha (RN supports `#RRGGBBAA`). */
function glowColor(hex: string, alphaByte: string): string {
  if (hex.startsWith('#') && hex.length === 7) return `${hex}${alphaByte}`;
  return hex;
}

/**
 * Navigation puck — primary visual: mode-colored arrow on a white disc + soft halo
 * (reference: blue/red chevron locked to route, not an inverted “white dot” puck).
 * Logic unchanged: {@link MarkerView}, `heading` rotation, {@link NAV_THEME} per mode.
 */
export default React.memo(function NavigationPuck({ lat, lng, heading, mode }: Props) {
  const puckColor = NAV_THEME[mode].puck;
  if (!isMapAvailable() || !MapboxGL || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const MB = MapboxGL;
  const h = Number.isFinite(heading) ? heading : 0;

  return (
    <MB.MarkerView id="sr-nav-puck" coordinate={[lng, lat]} anchor={{ x: 0.5, y: 0.5 }} allowOverlap>
      <View style={styles.stack} pointerEvents="none">
        <View style={[styles.glow, { backgroundColor: glowColor(puckColor, '44') }]} />
        <View style={styles.whiteDisc}>
          <Ionicons
            name="navigate"
            size={30}
            color={puckColor}
            style={[styles.arrow, { transform: [{ rotate: `${h}deg` }] }]}
          />
        </View>
      </View>
    </MB.MarkerView>
  );
});

const styles = StyleSheet.create({
  stack: {
    width: 78,
    height: 78,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  whiteDisc: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: 'rgba(15,23,42,0.08)',
    ...Platform.select({
      ios: {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
      },
      android: { elevation: 10 },
      default: {},
    }),
  },
  arrow: {
    marginTop: -2,
  },
});
